
'use server';
/**
 * @fileOverview An AI agent that generates a random but valid event schedule.
 *
 * - generateSchedule - A function that handles the schedule generation.
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
type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

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

export async function generateSchedule(
  input: GenerateScheduleInput
): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: { schema: GenerateScheduleInputSchema },
  output: { schema: GenerateScheduleOutputSchema },
  prompt: `You are an expert event scheduler for K9 trials. Your task is to generate a COMPLETE schedule for ALL competitors.

**CRITICAL REQUIREMENT: You MUST schedule EVERY competitor for ALL their specialties. An incomplete schedule is INVALID.**

**Pre-Processing Steps (MANDATORY):**
1. **Count Total Competitors:** Count the exact number of competitors provided.
2. **Count Total Required Runs:** Go through each competitor and count their specialties. Sum up the total number of runs needed. A competitor with 0 specialties still needs 1 run.
   - Example: If 20 competitors have 1 specialty each and 10 competitors have 2 specialties each, total runs = 20 + (10 × 2) = 40 runs.
3. **Calculate Available Slots:** Multiply (number of arenas) × (number of time slots per day) × (number of event days).
4. **Verify Feasibility:** Ensure total available slots ≥ total required runs. If not, you must still schedule all runs by utilizing every available slot.

**Scheduling Rules:**
1. **Complete Coverage:** Every competitor MUST be scheduled for EACH of their specialties. A competitor with no specialties must be scheduled for one run. No exceptions.
2. **Specialty Matching:** 
   - "Bite Work" specialty → "Bite Work" or "Any" arena
   - "Detection" with "Narcotics" → "Detection (Narcotics)" or "Any" arena  
   - "Detection" with "Explosives" → "Detection (Explosives)" or "Any" arena
   - Competitors with no specialties → "Any" arena only
3. **No Double Booking:**
   - Each arena slot can only have ONE competitor
   - A competitor CANNOT be in two places at the same time on the same day
4. **Even Distribution:** Spread runs across all available days and arenas
5. **Run Duration:** Each run is exactly 30 minutes (endTime = startTime + 30 minutes)

**Step-by-Step Process:**
1. **Create Required Runs List:**
   - For each competitor, create an entry for EACH specialty they have. If a competitor has no specialties, create one 'General' run for them.
   - Track: competitorId, competitorName, specialtyType, runNumber (1st, 2nd, etc.)
   - Keep a running count to ensure you have the correct total

2. **Initialize Tracking:**
   - Create a schedule grid: [day][arena][timeSlot] to track occupancy
   - Create a competitor availability grid: [day][timeSlot] to prevent double-booking

3. **Schedule Each Run:**
   - For each required run in your list:
     a. Find compatible arenas based on specialty
     b. Try each day, starting with the least utilized day
     c. For each compatible arena, find an available time slot where:
        - The arena slot is empty
        - The competitor is not already scheduled elsewhere at that time
     d. Book the slot and update both tracking grids

4. **Final Verification:**
   - Count the total scheduled runs in your output
   - Verify it equals the total required runs from step 1
   - For each competitor, verify they have been scheduled for ALL their specialties (or one run if they have none)
   - If any competitor is missing runs, identify them and find slots for them

**Output Requirements:**
- The schedule array MUST contain exactly as many entries as the total number of required runs
- Every competitor MUST appear in the schedule once for each of their specialties
- Include all scheduled runs, even if it means using every available slot

**Inputs:**
- **Event Days:** {{{json eventDays}}}
- **Time Slots:** {{{json timeSlots}}}
- **Arenas:** {{{json arenas}}}
- **Competitors:** {{{json competitors}}}

Remember: An incomplete schedule is a FAILURE. Schedule ALL competitors for ALL their specialties.`,
});

const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    
    // Add validation to ensure all competitors are scheduled
    if (output && output.schedule) {
       const requiredRuns = input.competitors.reduce((total, competitor) => {
        const specialtiesCount = competitor.specialties.length > 0 ? competitor.specialties.length : 1;
        return total + specialtiesCount;
      }, 0);
      
      if (output.schedule.length < requiredRuns) {
        console.warn(`AI Scheduling Warning: Only ${output.schedule.length} runs scheduled out of ${requiredRuns} required runs. The AI may have failed to schedule everyone. Consider adjusting inputs or re-running.`);
        // Potentially throw an error here to notify the user more directly
        // throw new Error(`AI failed to generate a complete schedule. Only found ${output.schedule.length} of ${requiredRuns} required runs.`);
      }
    }
    
    return output!;
  }
);
