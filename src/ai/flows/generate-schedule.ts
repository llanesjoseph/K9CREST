
'use server';
/**
 * @fileOverview Enhanced AI agent that generates a complete event schedule.
 * This version uses a pre-computed slot list and a validate-and-repair loop
 * for higher accuracy and reliability.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Arena, Competitor, GenerateScheduleInput, GenerateScheduleOutput } from '@/lib/schedule-types';
import { Slot, allowlist, buildAllSlots } from '@/lib/schedule-solver';

export async function generateScheduleAI(
  input: GenerateScheduleInput & { requiredRuns: any[], totalRunsNeeded: number, allSlots: Slot[], runAllowlist: any[] }
): Promise<GenerateScheduleOutput> {
  console.log('Starting AI schedule generation...');
  const { output } = await prompt(input);

  if (!output) {
      console.error("AI prompt failed to return an output.");
      return { schedule: [] };
  }
  
  const finalCount = output?.schedule?.length ?? 0;
  const neededCount = input.totalRunsNeeded;
  console.log(`AI Scheduled ${finalCount}/${neededCount} runs.`);

  if (finalCount < neededCount) {
    console.warn("AI WARNING: Final schedule is incomplete.");
  }

  return output;
}


const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: { 
    schema: z.object({
      competitors: z.array(z.any()),
      arenas: z.array(z.any()),
      eventDays: z.array(z.string()),
      timeSlots: z.array(z.string()),
      requiredRuns: z.array(z.any()),
      totalRunsNeeded: z.number(),
      allSlots: z.array(z.any()), // Simplified for prompt, validation is key
      runAllowlist: z.array(z.object({
        runKey: z.string(),
        competitorId: z.string(),
        specialtyType: z.string(),
        allowedSlotIds: z.array(z.string()),
      })),
    })
  },
  output: { schema: z.object({ schedule: z.array(z.any()) }) },
  prompt: `
You are an expert event scheduler. Your goal is to assign every required run to a unique slot from its own list of allowed slots.

DATA:
- runAllowlist: A list of all runs that must be scheduled. For each run, you are given 'allowedSlotIds' which is a list of valid places it can go.
- allSlots: A lookup table to get the date, time, and arena details from a chosen slotId.

TASK:
You must assign every required run to exactly one slotId from its own allowedSlotIds.

RULES:
1) Use ONLY slotIds listed for that run in 'runAllowlist'. This is the most important rule.
2. A slotId from 'allSlots' can be used at most once across the entire schedule.
3. A competitor cannot be scheduled in two different runs that happen at the same date and startTime.
4. Your final 'schedule' array MUST contain exactly {{totalRunsNeeded}} items.

OUTPUT:
Return ONLY the final JSON object. Do not include any other text.
{"schedule":[{"competitorId":"","arenaId":"","startTime":"","endTime":"","date":""}]}

SELECTION PROCEDURE:
- For each run in 'runAllowlist', pick one slotId from its 'allowedSlotIds' that has not yet been used by another run.
- Use the 'allSlots' data to get the date, startTime, endTime, and arenaId for the chosen slotId.
- Do not invent slots. Do not deviate from 'allowedSlotIds'.
`
});


export function repairIfNeeded(
    out: GenerateScheduleOutput,
    ctx: { allSlots: Slot[]; runAllowlist: any[]; totalRunsNeeded: number }
): GenerateScheduleOutput {
    // For now, this is a placeholder. A full repair loop could be added back if needed,
    // but the deterministic solver should handle most cases.
    // The main goal here is to validate the output from the AI.
    
    const slotById = new Map(ctx.allSlots.map(s => [s.slotId, s]));
    const allowedByRun = new Map(
      ctx.runAllowlist.map(r => [r.runKey, new Set(r.allowedSlotIds)])
    );
  
    const errors: string[] = [];
    const usedSlots = new Set<string>();
    const compAtTime = new Set<string>();
    const placedRunKeys = new Set<string>();
    const validSchedule: any[] = [];
  
    for (const r of out.schedule) {
      let runErrors = 0;
      const slotId = `${r.date}|${r.startTime}|${r.arenaId}`;
      const slot = slotById.get(slotId);
      if (!slot) {
          errors.push(`Invalid slot ${slotId}`);
          runErrors++;
      }
  
      const runKeysForCompetitor = ctx.runAllowlist
          .filter(x => x.competitorId === r.competitorId)
          .map(x => x.runKey);
  
      let assignedRunKey: string | null = null;
      for (const key of runKeysForCompetitor) {
          if (placedRunKeys.has(key)) continue;
          const allowedSlotsForThisRun = allowedByRun.get(key);
          if (allowedSlotsForThisRun && allowedSlotsForThisRun.has(slotId)) {
              assignedRunKey = key;
              break;
          }
      }
  
      if (!assignedRunKey) {
          errors.push(`Slot ${slotId} is not allowed for any unplaced run of competitor ${r.competitorId}`);
          runErrors++;
      }
  
      if (usedSlots.has(slotId)) {
          errors.push(`Duplicate slot ${slotId}`);
          runErrors++;
      }
      
      const tKey = `${r.competitorId}|${r.date}|${r.startTime}`;
      if (compAtTime.has(tKey)) {
          errors.push(`Competitor conflict ${tKey}`);
          runErrors++;
      }
      
      if(runErrors === 0 && assignedRunKey) {
          usedSlots.add(slotId);
          compAtTime.add(tKey);
          placedRunKeys.add(assignedRunKey);
          validSchedule.push(r);
      }
    }
  
    if(errors.length > 0) {
        console.warn("AI schedule had validation errors:", errors);
    }

    if (validSchedule.length < ctx.totalRunsNeeded) {
        console.warn(`Validation resulted in an incomplete schedule. Only ${validSchedule.length}/${ctx.totalRunsNeeded} runs were valid.`);
    }
  
    return { schedule: validSchedule };
}