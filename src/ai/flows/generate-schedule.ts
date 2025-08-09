
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
          // Handle cases where detection type might be part of the type string
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
  prompt: `You are an expert K9 trial scheduler. Your goal is to schedule as many of the required runs as possible given the constraints.

**PROVIDED DATA:**
- Total runs that need to be scheduled: {{{totalRunsNeeded}}}
- A detailed list of every required run: {{{json requiredRuns}}}
- Arenas and their specialties: {{{json arenas}}}
- Event days: {{{json eventDays}}}
- Available time slots per day: {{{json timeSlots}}}

**YOUR TASK:**
Create a schedule by assigning runs from the 'requiredRuns' list to available slots. It is acceptable if not all runs can be scheduled due to conflicts or lack of compatible arenas.

**ALGORITHM TO FOLLOW:**
1. Initialize an empty schedule grid to track occupancy: scheduleGrid[day][arenaId][timeSlot] = is_occupied (boolean).
2. Initialize a competitor availability grid: competitorAvailability[day][competitorId][timeSlot] = is_busy (boolean).
3. For each run in the 'requiredRuns' list:
    a. Determine the compatible arena types based on the run's specialty (see RULES below).
    b. Iterate through each eventDay.
    c. Iterate through each timeSlot from the provided list.
    d. Iterate through each compatible arena.
    e. **CHECK FOR CONFLICTS**:
        i. Is the arena slot already occupied in 'scheduleGrid'?
        ii. Is the competitor already busy at this day and time in 'competitorAvailability'?
    f. **IF NO CONFLICTS**:
        i. This is a valid slot. Assign the run.
        ii. Mark the arena slot as occupied in 'scheduleGrid'.
        iii. Mark the competitor as busy for that time slot in 'competitorAvailability'.
        iv. Create the schedule entry and add it to your output list.
        v. Break the inner loops and move to the NEXT run in 'requiredRuns'.
4. Continue until you have attempted to schedule every run in the 'requiredRuns' list.

**RULES:**
- A competitor cannot be in two places at the same time.
- The end time for a run is 30 minutes after the start time.
- **Arena Compatibility (VERY IMPORTANT):**
  - A run with specialty 'Bite Work' can be placed in an arena of type 'Bite Work' OR 'Any'.
  - A run with specialty 'Detection (Narcotics)' can be placed in an arena of type 'Detection (Narcotics)' OR 'Any'.
  - A run with specialty 'Detection (Explosives)' can be placed in an arena of type 'Detection (Explosives)' OR 'Any'.
  - A run with specialty 'Any' (meaning the competitor has no listed specialties) can ONLY be placed in an arena of type 'Any'.
- **CRITICAL**: You MUST only use the 'startTime' values from the provided 'timeSlots' list. Do NOT invent, assume, or use any other time.

**OUTPUT REQUIREMENT:**
Return a 'schedule' array containing only the runs you were successfully able to place without conflicts. Do not include unscheduled runs.`,
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
