
'use server';
/**
 * @fileOverview Enhanced AI agent that generates a complete event schedule.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SpecialtySchema = z.object({
  type: z.enum(['Bite Work', 'Detection']),
  detectionType: z.enum(['Narcotics', 'Explosives']).optional(),
});

const CompetitorSchema = z.object({
  id: z.string(),
  name: z.string(),
  dogName: z.string(),
  agency: z.string(),
  specialties: z.array(SpecialtySchema),
});

const ArenaSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialtyType: z.enum([
    'Any',
    'Bite Work',
    'Detection (Narcotics)',
    'Detection (Explosives)',
  ]),
});

const GenerateScheduleInputSchema = z.object({
  competitors: z.array(CompetitorSchema),
  arenas: z.array(ArenaSchema),
  eventDays: z
    .array(z.string())
    .describe("An array of dates for the event in 'YYYY-MM-DD' format."),
  timeSlots: z
    .array(z.string())
    .describe("An array of available time slots in 'HH:mm' format."),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

const ScheduledRunSchema = z.object({
  competitorId: z.string(),
  arenaId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  date: z.string().describe("The date of the run in 'YYYY-MM-DD' format."),
});

const GenerateScheduleOutputSchema = z.object({
  schedule: z.array(ScheduledRunSchema),
});
export type GenerateScheduleOutput = z.infer<
  typeof GenerateScheduleOutputSchema
>;

// Helper function to create required runs list
function createRequiredRunsList(competitors: any[]) {
  const runs: any[] = [];
  
  competitors.forEach(competitor => {
    if (competitor.specialties.length === 0) {
        // If a competitor has no specialties, they have one run in an 'Any' arena.
        runs.push({
            competitorId: competitor.id,
            competitorName: competitor.name,
            specialtyType: 'Any',
            detectionType: undefined,
            runIndex: 0,
            totalRuns: 1,
        });
    } else {
        // Create a separate required run for each specialty.
        competitor.specialties.forEach((specialty: any, index: number) => {
          let specialtyType = specialty.type;
          if (specialty.type === 'Detection' && specialty.detectionType) {
              specialtyType = `Detection (${specialty.detectionType})`;
          }
          runs.push({
            competitorId: competitor.id,
            competitorName: competitor.name,
            specialtyType: specialtyType,
            detectionType: specialty.detectionType,
            runIndex: index,
            totalRuns: competitor.specialties.length
          });
        });
    }
  });
  
  return runs;
}


export async function generateSchedule(
  input: GenerateScheduleInput
): Promise<GenerateScheduleOutput> {
  // Pre-process the data
  const requiredRuns = createRequiredRunsList(input.competitors);
  const totalRunsNeeded = requiredRuns.length;
  
  console.log(`Total runs needed: ${totalRunsNeeded}`);
  console.log(`Total competitors: ${input.competitors.length}`);
  console.log(`Total slots available: ${input.eventDays.length * input.timeSlots.length * input.arenas.length}`);
  
  // Create enhanced input with preprocessed data
  const enhancedInput = {
    ...input,
    requiredRuns,
    totalRunsNeeded,
  };
  
  return generateScheduleFlow(enhancedInput);
}

const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: { 
    schema: z.object({
      competitors: z.array(CompetitorSchema),
      arenas: z.array(ArenaSchema),
      eventDays: z.array(z.string()),
      timeSlots: z.array(z.string()),
      requiredRuns: z.array(z.any()),
      totalRunsNeeded: z.number(),
    })
  },
  output: { schema: GenerateScheduleOutputSchema },
  prompt: `You are an expert K9 trial scheduler. Your task is to create a schedule by assigning runs from the provided 'requiredRuns' list to available arena time slots.

**DATA:**
- A list of all runs that need to be scheduled: {{{json requiredRuns}}}
- Arenas and their specialties: {{{json arenas}}}
- Event days: {{{json eventDays}}}
- Available time slots per day: {{{json timeSlots}}}

**TASK:**
Iterate through the 'requiredRuns' list and assign each run to a valid time slot in a compatible arena. Create a schedule that places as many runs as possible without violating any rules.

**RULES:**
1.  **No Double Booking (Competitors):** A competitor can only be in one place at a time. Do not schedule a competitor for two different runs in the same time slot on the same day.
2.  **No Double Booking (Arenas):** An arena time slot can only have one run scheduled in it.
3.  **Arena Compatibility (VERY IMPORTANT):**
    *   A 'Bite Work' run can be placed in a 'Bite Work' arena OR an 'Any' arena.
    *   A 'Detection (Narcotics)' run can be placed in a 'Detection (Narcotics)' arena OR an 'Any' arena.
    *   A 'Detection (Explosives)' run can be placed in a 'Detection (Explosives)' arena OR an 'Any' arena.
    *   A run for a competitor with 'Any' specialty (meaning no listed specialties) can ONLY be placed in an 'Any' arena.
4.  **Run Duration:** Each run occupies one time slot. The end time is 30 minutes after the start time.
5.  **Use Provided Times Only:** You MUST only use the 'startTime' values from the provided 'timeSlots' list. Do not invent, assume, or use any other times.

**OUTPUT:**
Return a 'schedule' array containing only the runs you were successfully able to place. It is acceptable if not all runs can be scheduled. Do not include unscheduled runs in the output. Prioritize scheduling as many runs as possible while strictly following all rules.`,
});

const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: z.any(), // Using any to accept enhanced input
    outputSchema: GenerateScheduleOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    
    if (output && output.schedule) {
      const percentage = (output.schedule.length / input.totalRunsNeeded) * 100;
      console.log(`Scheduled ${output.schedule.length}/${input.totalRunsNeeded} runs (${percentage.toFixed(1)}%)`);
      
      if (output.schedule.length < input.totalRunsNeeded) {
        console.warn('WARNING: Not all runs were scheduled!');
        
        // Log which competitors are missing runs
        const scheduledRunsMap = new Map<string, number>();
        output.schedule.forEach(run => {
            const count = scheduledRunsMap.get(run.competitorId) || 0;
            scheduledRunsMap.set(run.competitorId, count + 1);
        });

        console.error("Missing or underscheduled competitors:");
        input.competitors.forEach((c: any) => {
            const needed = c.specialties.length > 0 ? c.specialties.length : 1;
            const scheduled = scheduledRunsMap.get(c.id) || 0;
            if (scheduled < needed) {
                console.error(`- ${c.name} (${c.id}): Scheduled for ${scheduled} of ${needed} runs.`);
            }
        });
      }
    } else {
        console.error("AI did not return a valid schedule object.");
    }
    
    return output!;
  }
);
