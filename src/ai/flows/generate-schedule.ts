
'use server';
/**
 * @fileOverview AI agent that generates a complete event schedule.
 * Uses a pre-computed slot list and constraint-based generation for higher accuracy.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Arena, Competitor } from '@/lib/schedule-types';
import { Slot } from '@/lib/schedule-solver';

const OutputSchema = z.object({
  schedule: z.array(
    z.object({
      competitorId: z.string(),
      arenaId: z.string(),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).strict()
  )
}).strict();

export type GenerateScheduleOutput = z.infer<typeof OutputSchema>;

export interface GenerateScheduleInput {
  competitors: Competitor[];
  arenas: Arena[];
  eventDays: string[];
  timeSlots: string[];
}


export async function generateScheduleAI(
  input: GenerateScheduleInput & { requiredRuns: any[], totalRunsNeeded: number, allSlots: Slot[], runAllowlist: any[] }
): Promise<GenerateScheduleOutput> {
  console.log('Starting AI schedule generation...');
  const { output } = await generateScheduleFlow(input);

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

const scheduleInputSchema = z.object({
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
    });

const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: { 
    schema: scheduleInputSchema
  },
  output: { schema: OutputSchema },
  prompt: `
You are an expert event scheduler. Your goal is to assign every required run to a unique slot from its own list of allowed slots.

DATA:
- runAllowlist: A list of all runs that must be scheduled. For each run, you are given 'allowedSlotIds' which is a list of valid places it can go.
- allSlots: A lookup table to get the date, time, and arena details from a chosen slotId.

TASK:
You must assign every required run to exactly one slotId from its own allowedSlotIds.

RULES:
1) Use ONLY slotIds listed for that run in 'runAllowlist'. This is the most important rule.
2) A slotId from 'allSlots' can be used at most once across the entire schedule.
3) A competitor cannot be scheduled in two different runs that happen at the same date and startTime.
4) Your final 'schedule' array MUST contain exactly {{totalRunsNeeded}} items.

OUTPUT:
Return ONLY the final JSON object. Do not include any other text.
{"schedule":[{"competitorId":"","arenaId":"","startTime":"","endTime":"","date":""}]}

SELECTION PROCEDURE:
- For each run in 'runAllowlist', pick one slotId from its 'allowedSlotIds' that has not yet been used by another run.
- Use the 'allSlots' data to get the date, startTime, endTime, and arenaId for the chosen slotId.
- Do not invent slots. Do not deviate from 'allowedSlotIds'.
`
});

const generateScheduleFlow = ai.defineFlow(
    {
        name: 'generateScheduleFlow',
        inputSchema: scheduleInputSchema,
        outputSchema: OutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);


export async function repairIfNeeded(
    out: GenerateScheduleOutput,
    ctx: { allSlots: Slot[]; runAllowlist: any[]; totalRunsNeeded: number }
): Promise<GenerateScheduleOutput> {
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
