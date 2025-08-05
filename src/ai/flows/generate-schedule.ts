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
  prompt: `You are an expert event scheduler for K9 trials. Your task is to generate a complete and valid schedule based on the provided competitors, arenas, and event timeline.

**Rules and Constraints (Non-negotiable):**
1.  **Complete Scheduling:** You **MUST** schedule every competitor for **ALL** of their required runs. A partial schedule is an invalid output. Each specialty a competitor has requires one run in a matching arena.
2.  **Specialty Matching:** A competitor **MUST** be scheduled in an arena that matches their specialty.
    -   A "Bite Work" specialty requires a run in a "Bite Work" arena.
    -   A "Detection (Narcotics)" specialty requires a run in a "Detection (Narcotics)" arena.
    -   A "Detection (Explosives)" specialty requires a run in a "Detection (Explosives)" arena.
    -   Arenas with specialty "Any" can host any competitor, but should be prioritized for competitors with no specialties if any exist.
3.  **No Double Booking (Critical):**
    -   An arena time slot can only have **ONE** competitor scheduled at a time on a given day.
    -   A competitor **CANNOT** be scheduled in two different arenas at the **SAME** time on the **SAME** day. This is a critical constraint. You must check a competitor's entire schedule for the day before assigning them to a new time slot.
4.  **Even Distribution:** You **MUST** distribute the runs as evenly as possible across all available event days and arenas to avoid overloading any single day or arena. The entire event duration, as specified in the \`eventDays\` input, must be utilized.
5.  **Randomness:** The assignment of competitors to specific time slots should be random, as long as it adheres to all other rules.
6.  **Run Duration:** Each run (schedule entry) lasts for exactly 30 minutes. The \`endTime\` must be 30 minutes after the \`startTime\`.

**Chain of Thought / Process (Follow these steps exactly):**
1.  **Identify All Required Runs:** Go through each competitor. For each specialty they have, create a "required run" item. For example, if a competitor has two specialties, they need two runs. Create a master list of every single run that needs to be scheduled.
2.  **Map Runs to Arenas:** For each required run, identify all compatible arenas based on the specialty.
3.  **Assign to Time Slots:** Iterate through your master list of required runs. For each run, find a vacant time slot on one of the event days in a compatible arena. A time slot is vacant if:
    a. No other competitor is scheduled in that arena at that time on that day.
    b. The competitor being scheduled is not already scheduled in any other arena at that exact time on that same day.
    c. When assigning, you should make a conscious effort to use all available days from the \`eventDays\` input, not just the first day.
4.  **Create Schedule Entries:** Once a valid slot is found, create the schedule entry object. Ensure the \`endTime\` is 30 minutes after the \`startTime\`.
5.  **Verify Completeness:** Before outputting the final JSON, you **MUST** double-check that every single required run you identified in step 1 has been successfully scheduled. If not, repeat the process to find slots for the remaining runs. **Do not finish until all competitors are fully scheduled according to their specialties.**

**Inputs:**
-   **Event Days:** {{{json eventDays}}}
-   **Time Slots:** {{{json timeSlots}}}
-   **Arenas:** {{{json arenas}}}
-   **Competitors:** {{{json competitors}}}
`,
});

const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
