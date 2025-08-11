'use server';
/**
 * @fileOverview AI agent that generates a complete event schedule.
 * Uses a simplified prompt and a robust local repair function.
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
  input: GenerateScheduleInput & { totalRunsNeeded: number }
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
      totalRunsNeeded: z.number(),
    });

const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: { 
    schema: scheduleInputSchema
  },
  output: { schema: OutputSchema },
  prompt: `
You are an expert event scheduler. Your task is to create a complete and valid schedule for a K9 competition.

DATA:
- competitors: A list of competitors, including their ID and specialties.
- arenas: A list of available arenas and the specialties they support (e.g., "Bite Work", "Detection (Narcotics)", "Any").
- eventDays: A list of dates for the event.
- timeSlots: A list of available start times for each day.

TASK:
Assign each competitor to one run for each of their specialties. If a competitor has no specialties, assign them to one "Any" run.

RULES:
1. Specialty Matching: A competitor's run must be in an arena that supports that specialty. An arena with specialty "Any" can host any type of run.
2. No Overlapping Runs: A competitor cannot be in two different places at the same time.
3. One Run Per Slot: An arena time slot can only have one run scheduled in it.
4. Completeness: Your final 'schedule' array MUST contain exactly {{totalRunsNeeded}} items. Do not leave any runs unscheduled.

OUTPUT:
Return ONLY the final JSON object. Do not include any other text.
{"schedule":[{"competitorId":"","arenaId":"","startTime":"","date":""}]}
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

// This function is a critical safety net. It validates the AI's output and attempts to fix common errors.
export async function repairAndValidateSchedule(
    aiOutput: GenerateScheduleOutput,
    context: { allSlots: Slot[]; allRequiredRuns: any[]; totalRunsNeeded: number }
): Promise<GenerateScheduleOutput> {
    const { allSlots, allRequiredRuns, totalRunsNeeded } = context;
    
    const slotById = new Map(allSlots.map(s => [s.slotId, s]));
    const runKeyToAllowedSlots = new Map<string, Set<string>>();

     allRequiredRuns.forEach(run => {
        const allowedSlots = allSlots
            .filter(slot => {
                const specialtyType = run.specialtyType;
                const arenaSpecialty = slot.arenaSpecialty;

                if (arenaSpecialty === 'Any') return true;
                if (specialtyType === 'Any') return true;
                return specialtyType === arenaSpecialty;
            })
            .map(slot => slot.slotId);
        runKeyToAllowedSlots.set(run.runKey, new Set(allowedSlots));
    });

    const errors: string[] = [];
    const usedSlots = new Set<string>();
    const competitorAtTime = new Set<string>(); // "competitorId|date|startTime"
    const placedRunKeys = new Set<string>();
    const validSchedule: any[] = [];
    
    // 1. First pass: Validate the AI's schedule
    for (const run of aiOutput.schedule) {
        const slotId = `${run.date}|${run.startTime}|${run.arenaId}`;
        const timeKey = `${run.competitorId}|${run.date}|${run.startTime}`;

        // Basic validation checks
        if (!slotById.has(slotId)) {
            errors.push(`Invalid slot generated: ${slotId}`);
            continue;
        }
        if (usedSlots.has(slotId)) {
            errors.push(`Duplicate slot used: ${slotId}`);
            continue;
        }
        if (competitorAtTime.has(timeKey)) {
            errors.push(`Competitor time conflict: ${timeKey}`);
            continue;
        }

        // Find a matching required run that hasn't been placed yet
        const matchingRunKey = allRequiredRuns.find(req => 
            !placedRunKeys.has(req.runKey) &&
            req.competitorId === run.competitorId &&
            runKeyToAllowedSlots.get(req.runKey)?.has(slotId)
        )?.runKey;

        if (matchingRunKey) {
            validSchedule.push(run);
            placedRunKeys.add(matchingRunKey);
            usedSlots.add(slotId);
            competitorAtTime.add(timeKey);
        } else {
            errors.push(`No valid unplaced run for competitor ${run.competitorId} in slot ${slotId}`);
        }
    }

    // 2. Second pass: Try to place any runs the AI missed
    const unplacedRuns = allRequiredRuns.filter(run => !placedRunKeys.has(run.runKey));
    if (unplacedRuns.length > 0) {
        console.warn(`AI missed ${unplacedRuns.length} runs. Attempting to repair.`);
        for (const runToPlace of unplacedRuns) {
            const allowedSlots = runKeyToAllowedSlots.get(runToPlace.runKey) || new Set();
            // Find a free, valid slot
            for (const slotId of allowedSlots) {
                const slot = slotById.get(slotId)!;
                const timeKey = `${runToPlace.competitorId}|${slot.date}|${slot.startTime}`;

                if (!usedSlots.has(slotId) && !competitorAtTime.has(timeKey)) {
                    const newRun = {
                        competitorId: runToPlace.competitorId,
                        arenaId: slot.arenaId,
                        startTime: slot.startTime,
                        date: slot.date,
                    };
                    validSchedule.push(newRun);
                    placedRunKeys.add(runToPlace.runKey);
                    usedSlots.add(slotId);
                    competitorAtTime.add(timeKey);
                    break; // Move to the next unplaced run
                }
            }
        }
    }
    
    if (errors.length > 0) {
        console.warn("AI schedule had validation errors:", errors);
    }
    
    const finalCount = validSchedule.length;
    if (finalCount < totalRunsNeeded) {
        console.error(`Repair failed to create a complete schedule. Only ${finalCount}/${totalRunsNeeded} runs placed.`);
    }

    return { schedule: validSchedule };
}
