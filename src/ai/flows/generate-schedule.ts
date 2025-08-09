
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
        });
    } else {
        // Create a separate required run for each specialty.
        competitor.specialties.forEach((specialty: any) => {
          let specialtyType = specialty.type;
          if (specialty.type === 'Detection' && specialty.detectionType) {
              specialtyType = `Detection (${specialty.detectionType})`;
          }
          runs.push({
            competitorId: competitor.id,
            competitorName: competitor.name,
            specialtyType: specialtyType,
            detectionType: specialty.detectionType,
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
  prompt: `You are an intelligent event scheduler for a K9 trial competition. Your primary goal is to create a valid schedule by assigning competitors from a list of required runs to available time slots, following all rules without exception.

**Input Data:**
- Required Runs (every run that must be scheduled): {{{json requiredRuns}}}
- Arenas and their specialties: {{{json arenas}}}
- Event days: {{{json eventDays}}}
- Available time slots per day: {{{json timeSlots}}}

**Task:**
Assign as many runs as possible from the 'requiredRuns' list to available time slots in compatible arenas.

**Scheduling Rules (Strict and Non-Negotiable):**
1.  **Arena Compatibility (VERY IMPORTANT):** You must adhere to these placement rules:
    *   A run for a specialty of 'Bite Work' can be placed in an arena of type 'Bite Work' OR 'Any'.
    *   A run for a specialty of 'Detection (Narcotics)' can be placed in an arena of type 'Detection (Narcotics)' OR 'Any'.
    *   A run for a specialty of 'Detection (Explosives)' can be placed in an arena of type 'Detection (Explosives)' OR 'Any'.
    *   A run for a specialty of 'Any' can ONLY be placed in an arena of type 'Any'.
2.  **One Competitor Per Slot:** Each competitor can only be in one place at a time. Do not schedule a competitor for two different runs in the same time slot on the same day.
3.  **One Run Per Arena Slot:** Each arena time slot can only have one run scheduled in it.
4.  **Run Duration:** Each run occupies one time slot. The end time is 30 minutes after the start time.
5.  **Use All Competitors:** You must attempt to schedule a run for every competitor listed in 'requiredRuns'. If a valid slot cannot be found according to the rules, it is acceptable to leave that run unscheduled. Do not invent new time slots.

**Output Format:**
Your final output must be a single JSON object that contains the filled schedule. The structure should be a "schedule" array containing run objects. If a run from the 'requiredRuns' list could not be scheduled, do not include it in the output. Do not include any other text or explanations in your response—only the final JSON object.`,
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
