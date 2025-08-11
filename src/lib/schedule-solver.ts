
import {
  InputSchema,
  OutputSchema,
  SpecialtyLabel,
  type GenerateScheduleInput,
  type GenerateScheduleOutput,
} from "./schedule-types";

// Options to control strictness
type SolveOptions = {
  runMinutes?: number;               // default 30
  slotMinutes?: number;              // default 15 (your grid)
  detectionSubtypesStrict?: boolean; // true: Narcotics only in Narcotics, etc.
  anyRunsFlexible?: boolean;         // true: "Any" can go in any arena
};

const DEFAULTS: Required<SolveOptions> = {
  runMinutes: 30,
  slotMinutes: 15,
  detectionSubtypesStrict: true, // your request: if Narcotics arena doesn't exist, don't force it
  anyRunsFlexible: true,          // allow Any onto any arena so one-per-competitor works
};

function addMinutes(start: string, minutes: number) {
  const [h, m] = start.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m + minutes);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export type Slot = {
  slotId: string; // `${date}|${start}|${arenaId}`
  date: string;
  startTime: string;
  endTime: string;
  arenaId: string;
  arenaSpecialty: SpecialtyLabel;
  timeIndex: number;
};

function isDetection(x: SpecialtyLabel) {
  return x.startsWith("Detection");
}

function compat(
  run: SpecialtyLabel,
  arena: SpecialtyLabel,
  opts: Required<SolveOptions>
) {
  if (run === "Any") return opts.anyRunsFlexible ? true : arena === "Any";
  if (run === "Bite Work") return arena === "Bite Work" || arena === "Any";
  if (run === "Detection (Narcotics)") {
    if (!opts.detectionSubtypesStrict) return isDetection(arena) || arena === "Any";
    return arena === "Detection (Narcotics)" || arena === "Any";
  }
  if (run === "Detection (Explosives)") {
    if (!opts.detectionSubtypesStrict) return isDetection(arena) || arena === "Any";
    return arena === "Detection (Explosives)" || arena === "Any";
  }
  return false;
}

export function buildAllSlots(input: GenerateScheduleInput, opts: Required<SolveOptions>): Slot[] {
  const slots: Slot[] = [];
  const span = Math.max(1, Math.ceil(opts.runMinutes / opts.slotMinutes)); // e.g. 30/15 => 2
  for (const date of input.eventDays) {
    for (let ti = 0; ti < input.timeSlots.length; ti++) {
      const start = input.timeSlots[ti];
      const end = addMinutes(start, opts.runMinutes);
      for (const a of input.arenas) {
        slots.push({
          slotId: `${date}|${start}|${a.id}`,
          date,
          startTime: start,
          endTime: end,
          arenaId: a.id,
          arenaSpecialty: a.specialtyType,
          timeIndex: ti,
        });
      }
    }
  }
  return slots;
}

type RunReq = { competitorId: string; specialtyType: SpecialtyLabel };
export function allRequestedRuns(input: GenerateScheduleInput): RunReq[] {
  const runs: RunReq[] = [];
  for (const c of input.competitors) {
    if (!c.specialties?.length) {
      runs.push({ competitorId: c.id, specialtyType: "Any" });
      continue;
    }
    for (const s of c.specialties) {
      if (s.type === "Bite Work") {
        runs.push({ competitorId: c.id, specialtyType: "Bite Work" });
      } else {
        runs.push({
          competitorId: c.id,
          specialtyType: `Detection (${s.detectionType})` as SpecialtyLabel,
        });
      }
    }
  }
  
  const arenaTypes = new Set(input.arenas.map(a => a.specialtyType));
  return runs.filter(r => {
    if (r.specialtyType === "Detection (Narcotics)")
      return arenaTypes.has("Detection (Narcotics)") || arenaTypes.has("Any");
    if (r.specialtyType === "Detection (Explosives)")
      return arenaTypes.has("Detection (Explosives)") || arenaTypes.has("Any");
    return true; // Bite Work, Any
  });
}

type Domain = {
  runKey: string;               // `${competitorId}|${specialty}`
  competitorId: string;
  specialtyType: SpecialtyLabel;
  allowed: string[];            // slotIds
};

function buildDomains(
  req: RunReq[],
  allSlots: Slot[],
  opts: Required<SolveOptions>
): Domain[] {
  return req.map(r => ({
    runKey: `${r.competitorId}|${r.specialtyType}`,
    competitorId: r.competitorId,
    specialtyType: r.specialtyType,
    allowed: allSlots
      .filter(s => compat(r.specialtyType, s.arenaSpecialty, opts))
      .map(s => s.slotId),
  }));
}

// occupancy helpers (block two 15-min ticks for a 30-min run on same date+arena and date+competitor)
function blockRange(store: Map<string, Set<number>>, key: string, startIdx: number, span: number) {
  let set = store.get(key);
  if (!set) { set = new Set(); store.set(key, set); }
  for (let k = 0; k < span; k++) set.add(startIdx + k);
}
function isFree(store: Map<string, Set<number>>, key: string, startIdx: number, span: number) {
  const set = store.get(key);
  if (!set) return true;
  for (let k = 0; k < span; k++) if (set.has(startIdx + k)) return false;
  return true;
}

function placeDomains(
  domains: Domain[],
  slotById: Map<string, Slot>,
  span: number,
  blockedArena: Map<string, Set<number>>,
  blockedComp: Map<string, Set<number>>,
  assignment: Map<string, string>
): { placed: string[] } {
  // Sort MRV
  const sorted = [...domains].sort((a, b) => a.allowed.length - b.allowed.length);

  function tryPlace(i: number): boolean {
    if (i === sorted.length) return true;

    const d = sorted[i];

    // Earliest-first choice ordering
    const choices = d.allowed
      .filter(id => {
        const s = slotById.get(id)!;
        const aKey = `${s.date}|${s.arenaId}`;
        const cKey = `${s.date}|${d.competitorId}`;
        return isFree(blockedArena, aKey, s.timeIndex, span)
            && isFree(blockedComp,  cKey, s.timeIndex, span);
      })
      .sort((x, y) => {
        const a = slotById.get(x)!; const b = slotById.get(y)!;
        return a.date.localeCompare(b.date)
          || a.startTime.localeCompare(b.startTime)
          || a.arenaId.localeCompare(b.arenaId);
      });

    for (const id of choices) {
      const s = slotById.get(id)!;
      const aKey = `${s.date}|${s.arenaId}`;
      const cKey = `${s.date}|${d.competitorId}`;

      blockRange(blockedArena, aKey, s.timeIndex, span);
      blockRange(blockedComp,  cKey, s.timeIndex, span);
      assignment.set(d.runKey, id);

      if (tryPlace(i + 1)) return true;

      // backtrack: rebuild occupancy from assignment for simplicity
      assignment.delete(d.runKey);
      blockedArena.clear(); blockedComp.clear();
      for (const [rk, sid] of assignment) {
        const s2 = slotById.get(sid)!;
        blockRange(blockedArena, `${s2.date}|${s2.arenaId}`, s2.timeIndex, span);
        const [compId] = rk.split("|");
        blockRange(blockedComp, `${s2.date}|${compId}`, s2.timeIndex, span);
      }
    }
    return false;
  }

  const ok = tryPlace(0);
  return { placed: ok ? sorted.map(d => d.runKey) : [] };
}

export function solveSchedule(inputRaw: unknown, optsIn: SolveOptions = {}): GenerateScheduleOutput {
  const opts = { ...DEFAULTS, ...optsIn };
  const input = InputSchema.parse(inputRaw);

  // Build slots and indices
  const span = Math.max(1, Math.ceil(opts.runMinutes / opts.slotMinutes));
  const allSlots = buildAllSlots(input, opts);
  const slotById = new Map(allSlots.map(s => [s.slotId, s]));

  // Build all requested runs, then domains
  const requested = allRequestedRuns(input);
  const domains = buildDomains(requested, allSlots, opts);

  // Drop specialties that have zero legal slots (your rule: don't try to place Narcotics if no arena)
  const viable = domains.filter(d => d.allowed.length > 0);

  // Group by competitor
  const byCompetitor = new Map<string, Domain[]>();
  for (const d of viable) {
    const arr = byCompetitor.get(d.competitorId) || [];
    arr.push(d);
    byCompetitor.set(d.competitorId, arr);
  }

  // Phase 1: one run per competitor if possible
  const primaryDomains: Domain[] = [];
  for (const [cid, list] of byCompetitor) {
    if (!list.length) continue; // no viable specialty for this competitor
    // pick the specialty with the fewest choices (MRV) so we maximize success
    list.sort((a, b) => a.allowed.length - b.allowed.length);
    primaryDomains.push(list[0]);
  }

  const blockedArena = new Map<string, Set<number>>();
  const blockedComp  = new Map<string, Set<number>>();
  const assignment   = new Map<string, string>();

  const p1 = placeDomains(primaryDomains, slotById, span, blockedArena, blockedComp, assignment);

  // Phase 2: try remaining specialties for those competitors, if capacity allows
  const placedSet = new Set(p1.placed);
  const secondaryDomains: Domain[] = [];

  for (const [cid, list] of byCompetitor) {
    // push all that were not chosen as primary
    for (const d of list) {
      if (!placedSet.has(d.runKey)) secondaryDomains.push(d);
    }
  }

  if (secondaryDomains.length) {
    placeDomains(secondaryDomains, slotById, span, blockedArena, blockedComp, assignment);
  }

  // Build final schedule
  const schedule = Array.from(assignment.entries()).map(([runKey, slotId]) => {
    const [competitorId, specialtyLabel] = runKey.split("|");
    const s = slotById.get(slotId)!;
    return {
      competitorId,
      arenaId: s.arenaId,
      startTime: s.startTime,
      endTime: s.endTime,
      date: s.date,
    };
  }).sort((a, b) =>
    a.date.localeCompare(b.date)
    || a.startTime.localeCompare(b.startTime)
    || a.arenaId.localeCompare(b.arenaId)
    || a.competitorId.localeCompare(b.competitorId)
  );

  // Diagnostics for anything we didn’t or couldn’t place
  const requiredRuns = requested.length;
  const placedRuns = schedule.length;
  const placedKeys = new Set(Array.from(assignment.keys()));
  const unplaced: { competitorId: string; specialtyType: SpecialtyLabel; reason: string }[] = [];

  for (const d of domains) {
    if (placedKeys.has(d.runKey)) continue;
    if (d.allowed.length === 0) {
      unplaced.push({ competitorId: d.competitorId, specialtyType: d.specialtyType, reason: "No compatible arena type available" });
    } else {
      unplaced.push({ competitorId: d.competitorId, specialtyType: d.specialtyType, reason: "All compatible times conflicted" });
    }
  }

  return OutputSchema.parse({
    schedule,
    diagnostics: {
      requiredRuns,
      placedRuns,
      unplacedRuns: unplaced,
    },
  });
}

export function validateNoSubtypeCrossing(schedule: {competitorId:string; date:string; startTime:string; arenaId:string}[],
                                   input: GenerateScheduleInput) {
  const arenaById = new Map(input.arenas.map(a => [a.id, a.specialtyType]));
  const compById  = new Map(input.competitors.map(c => [c.id, c]));

  for (const r of schedule) {
    const arenaType = arenaById.get(r.arenaId);
    const comp = compById.get(r.competitorId);
    const compLabels = new Set((comp?.specialties || []).map(s =>
      s.type === "Bite Work" ? "Bite Work" : `Detection (${s.detectionType})`
    ));

    // If arena is Explosives, competitor must have Explosives; same for Narcotics
    if (arenaType === "Detection (Explosives)" && !compLabels.has("Detection (Explosives)"))
      throw new Error(`Invalid placement: ${r.competitorId} into Explosives`);

    if (arenaType === "Detection (Narcotics)" && !compLabels.has("Detection (Narcotics)"))
      throw new Error(`Invalid placement: ${r.competitorId} into Narcotics`);
  }
}
