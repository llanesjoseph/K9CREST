import { InputSchema, OutputSchema, SpecialtyLabel, type GenerateScheduleInput, type GenerateScheduleOutput } from "./schedule-types";

// 30-minute end time
function add30(start: string) {
  const [h, m] = start.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m + 30);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

type Slot = {
  slotId: string;    // `${date}|${start}|${arenaId}`
  date: string;
  startTime: string;
  endTime: string;
  arenaId: string;
  arenaSpecialty: SpecialtyLabel;
};

function buildAllSlots(input: GenerateScheduleInput): Slot[] {
  const out: Slot[] = [];
  for (const date of input.eventDays) {
    for (const startTime of input.timeSlots) {
      const endTime = add30(startTime);
      for (const a of input.arenas) {
        out.push({
          slotId: `${date}|${startTime}|${a.id}`,
          date, startTime, endTime,
          arenaId: a.id,
          arenaSpecialty: a.specialtyType,
        });
      }
    }
  }
  return out;
}

function compat(run: SpecialtyLabel, arena: SpecialtyLabel) {
  if (run === "Any") return arena === "Any";
  if (run === "Bite Work") return arena === "Bite Work" || arena === "Any";
  if (run === "Detection (Narcotics)") return arena === "Detection (Narcotics)" || arena === "Any";
  if (run === "Detection (Explosives)") return arena === "Detection (Explosives)" || arena === "Any";
  return false;
}

function requiredRuns(input: GenerateScheduleInput) {
  const runs: { competitorId: string; specialtyType: SpecialtyLabel }[] = [];
  for (const c of input.competitors) {
    if (!c.specialties?.length) {
      runs.push({ competitorId: c.id, specialtyType: "Any" });
      continue;
    }
    for (const s of c.specialties) {
      if (s.type === "Bite Work") {
        runs.push({ competitorId: c.id, specialtyType: "Bite Work" });
      } else {
        const label = `Detection (${s.detectionType})` as SpecialtyLabel;
        runs.push({ competitorId: c.id, specialtyType: label });
      }
    }
  }
  return runs;
}

export function solveSchedule(inputRaw: unknown): GenerateScheduleOutput {
  const input = InputSchema.parse(inputRaw);
  const allSlots = buildAllSlots(input);
  const byId = new Map(allSlots.map(s => [s.slotId, s]));

  // Build domains for each required run (allowed slotIds)
  const req = requiredRuns(input);
  type Domain = { runKey: string; competitorId: string; specialtyType: SpecialtyLabel; allowed: string[] };

  const domains: Domain[] = req.map(r => ({
    runKey: `${r.competitorId}|${r.specialtyType}|${Math.random()}`,
    competitorId: r.competitorId,
    specialtyType: r.specialtyType,
    allowed: allSlots.filter(s => compat(r.specialtyType, s.arenaSpecialty)).map(s => s.slotId),
  }));

  // Fail reasons for any run with no legal slots
  const hardFailures = domains
    .filter(d => d.allowed.length === 0)
    .map(d => ({ competitorId: d.competitorId, specialtyType: d.specialtyType, reason: "No compatible arenas or no time capacity" }));

  if (hardFailures.length) {
    return OutputSchema.parse({
      schedule: [],
      diagnostics: {
        requiredRuns: req.length,
        placedRuns: 0,
        unplacedRuns: hardFailures,
      },
    });
  }

  // MRV heuristic: schedule the most constrained runs first
  domains.sort((a, b) => a.allowed.length - b.allowed.length);

  // Constraints
  const usedSlot = new Set<string>();               // each slotId at most once
  const usedCompTime = new Set<string>();           // `${competitorId}|${date}|${start}`
  const assignment = new Map<string, string>();     // runKey -> slotId

  function compTimeKey(cid: string, slotId: string) {
    const s = byId.get(slotId)!;
    return `${cid}|${s.date}|${s.startTime}`;
  }

  // Backtracking
  function place(i: number): boolean {
    if (i === domains.length) return true;
    const d = domains[i];

    // Try earlier slots first for stability
    const choices = d.allowed
      .filter(id => !usedSlot.has(id))
      .sort((x, y) => {
        const a = byId.get(x)!; const b = byId.get(y)!;
        return a.date.localeCompare(b.date)
          || a.startTime.localeCompare(b.startTime)
          || a.arenaId.localeCompare(b.arenaId);
      });

    for (const slotId of choices) {
      const tKey = compTimeKey(d.competitorId, slotId);
      if (usedCompTime.has(tKey)) continue;

      usedSlot.add(slotId);
      usedCompTime.add(tKey);
      assignment.set(d.runKey, slotId);

      if (place(i + 1)) return true;

      assignment.delete(d.runKey);
      usedSlot.delete(slotId);
      usedCompTime.delete(tKey);
    }
    return false;
  }

  const solved = place(0);

  if (!solved) {
    // Could be a capacity issue across time windows; try to explain by marking unsatisfied in order
    const greedyPlaced = new Set<string>();
    const unplaced: { competitorId: string; specialtyType: SpecialtyLabel; reason: string }[] = [];
    for (const d of domains) {
      const first = d.allowed.find(sid => !greedyPlaced.has(sid));
      if (first) {
        greedyPlaced.add(first);
      } else {
        unplaced.push({ competitorId: d.competitorId, specialtyType: d.specialtyType, reason: "All compatible slots conflict with other runs" });
      }
    }
    return OutputSchema.parse({
      schedule: [],
      diagnostics: {
        requiredRuns: req.length,
        placedRuns: 0,
        unplacedRuns: unplaced,
      },
    });
  }

  const schedule = Array.from(assignment.entries()).map(([runKey, slotId]) => {
    const [competitorId] = runKey.split("|");
    const s = byId.get(slotId)!;
    return {
      competitorId,
      arenaId: s.arenaId,
      startTime: s.startTime,
      endTime: s.endTime,
      date: s.date,
    };
  });

  return OutputSchema.parse({
    schedule,
    diagnostics: {
      requiredRuns: req.length,
      placedRuns: schedule.length,
      unplacedRuns: [],
    },
  });
}
