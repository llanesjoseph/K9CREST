
import type { Arena, Specialty } from './schedule-types';

export type Slot = {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  arenaId: string;
  arenaSpecialty: Specialty;
};

function add30(start: string) {
  const [h, m] = start.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m + 30);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

export function buildAllSlots(
  arenas: { id: string; specialtyType: Specialty }[],
  days: string[],
  times: string[]
): Slot[] {
  const out: Slot[] = [];
  for (const date of days)
    for (const t of times)
      for (const a of arenas)
        out.push({
          slotId: `${date}|${t}|${a.id}`,
          date,
          startTime: t,
          endTime: add30(t),
          arenaId: a.id,
          arenaSpecialty: a.specialtyType,
        });
  return out;
}

export function compat(runSpec: Specialty, arenaSpec: Specialty) {
  if (runSpec === 'Any') return arenaSpec === 'Any';
  if (runSpec === 'Bite Work')
    return arenaSpec === 'Bite Work' || arenaSpec === 'Any';
  if (runSpec === 'Detection (Narcotics)')
    return arenaSpec === 'Detection (Narcotics)' || arenaSpec === 'Any';
  if (runSpec === 'Detection (Explosives)')
    return arenaSpec === 'Detection (Explosives)' || arenaSpec === 'Any';
  return false;
}

export function allowlist(
  requiredRuns: { competitorId: string; specialtyType: Specialty }[],
  all: Slot[]
) {
  return requiredRuns.map(r => ({
    runKey: `${r.competitorId}|${r.specialtyType}|${Math.random()}`, // Add random to distinguish same competitor/specialty
    competitorId: r.competitorId,
    specialtyType: r.specialtyType,
    allowedSlotIds: all
      .filter((s) => compat(r.specialtyType, s.arenaSpecialty))
      .map((s) => s.slotId),
  }));
}

type RequiredRun = { competitorId: string; specialtyType: Specialty };
type Assignment = { [runKey: string]: string }; // runKey -> slotId

export function scheduleDeterministic(
  required: RequiredRun[],
  allSlots: Slot[]
) {
  const byId = new Map(allSlots.map((s) => [s.slotId, s]));
  const runAllowlist = allowlist(required, allSlots);

  // Order runs by fewest options (MRV)
  const ordered = [...runAllowlist].sort(
    (a, b) => a.allowedSlotIds.length - b.allowedSlotIds.length
  );

  const usedSlots = new Set<string>();
  const usedCompTime = new Set<string>(); // competitorId|date|start
  const assign: Assignment = {};

  function compTimeKey(cid: string, slotId: string) {
    const s = byId.get(slotId)!;
    return `${cid}|${s.date}|${s.startTime}`;
  }

  function tryPlace(i: number): boolean {
    if (i === ordered.length) return true;
    const r = ordered[i];

    // Heuristic: earliest time first
    const slotsSorted = r.allowedSlotIds
      .filter((id) => !usedSlots.has(id))
      .sort((x, y) => {
        const a = byId.get(x)!;
        const b = byId.get(y)!;
        return (
          a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
        );
      });

    for (const slotId of slotsSorted) {
      const tKey = compTimeKey(r.competitorId, slotId);
      if (usedCompTime.has(tKey)) continue;

      usedSlots.add(slotId);
      usedCompTime.add(tKey);
      assign[r.runKey] = slotId;

      if (tryPlace(i + 1)) return true;

      delete assign[r.runKey];
      usedSlots.delete(slotId);
      usedCompTime.delete(tKey);
    }
    return false;
  }

  const ok = tryPlace(0);
  if (!ok) return null;

  // Build schedule objects
  const schedule = Object.entries(assign).map(([runKey, slotId]) => {
    const [competitorId] = runKey.split('|');
    const s = byId.get(slotId)!;
    return {
      competitorId,
      arenaId: s.arenaId,
      startTime: s.startTime,
      endTime: s.endTime,
      date: s.date,
    };
  });
  return { schedule };
}
