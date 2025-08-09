
import { generateScheduleAI, repairIfNeeded } from '@/ai/flows/generate-schedule';
import {
  allowlist,
  buildAllSlots,
  scheduleDeterministic,
} from '@/lib/schedule-solver';
import type {
  GenerateScheduleInput,
  GenerateScheduleOutput,
  Specialty,
} from '@/lib/schedule-types';

export async function generateScheduleService(
  input: GenerateScheduleInput
): Promise<GenerateScheduleOutput> {
  const reqId = Math.random().toString(36).slice(2);
  console.time(`schedule ${reqId}`);
  
  const { competitors, arenas, eventDays, timeSlots } = input;

  const requiredRuns = competitors.flatMap(c => {
    if (!c.specialties?.length) {
      return [{ competitorId: c.id, specialtyType: 'Any' as Specialty }];
    }
    return c.specialties.map(s => {
      let specialtyType: Specialty;
      if (s.type === 'Detection') {
        specialtyType = `Detection (${s.detectionType})` as Specialty;
      } else {
        specialtyType = 'Bite Work' as Specialty;
      }
      return { competitorId: c.id, specialtyType: specialtyType };
    });
  });

  const all = buildAllSlots(
    arenas as any,
    eventDays,
    timeSlots
  );

  // 1) Deterministic attempt
  console.log(`[${reqId}] Attempting deterministic scheduling...`);
  const det = scheduleDeterministic(requiredRuns, all);
  if (det && det.schedule.length === requiredRuns.length) {
    console.log(`[${reqId}] Deterministic scheduling SUCCEEDED.`);
    console.timeEnd(`schedule ${reqId}`);
    return det;
  }
  console.warn(`[${reqId}] Deterministic scheduling failed or was incomplete. Falling back to AI.`);


  // 2) AI fall-back with allowlist and repair
  const runAllowlist = allowlist(requiredRuns, all);
  const aiResult = await generateScheduleAI({
    ...input,
    requiredRuns,
    totalRunsNeeded: requiredRuns.length,
    allSlots: all,
    runAllowlist,
  });

  const fixed = await repairIfNeeded(aiResult, {
    allSlots: all,
    runAllowlist,
    totalRunsNeeded: requiredRuns.length,
  });
  
  console.timeEnd(`schedule ${reqId}`);
  return fixed;
}
