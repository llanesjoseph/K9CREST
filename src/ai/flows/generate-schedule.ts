'use server';
/**
 * @fileOverview An AI agent that generates a random but valid event schedule.
 *
 * - generateSchedule - A function that handles the schedule generation.
 * - GenerateScheduleInput - The input type for the function.
 * - GenerateScheduleOutput - The return type for the function.
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

export const GenerateScheduleInputSchema = z.object({
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

export const GenerateScheduleOutputSchema = z.object({
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

**Rules and Constraints:**
1.  **Specialty Matching:** A competitor MUST be scheduled in an arena that matches their specialty.
    -   If a competitor has a specialty of "Bite Work", they must have one run in an arena with the "Bite Work" specialty.
    -   If a competitor has a specialty of "Detection (Narcotics)", they must have one run in an arena with the "Detection (Narcotics)" specialty.
    -   If a competitor has a specialty of "Detection (Explosives)", they must have one run in an arena with the "Detection (Explosives)" specialty.
    -   Competitors with multiple specialties must be scheduled for a run in EACH corresponding specialty arena.
    -   Arenas with specialty "Any" can be used for any competitor, but should be prioritized for competitors with NO specialties. If a competitor has no specialties, schedule them for one run in an "Any" arena if available.
2.  **No Double Booking:**
    -   An arena time slot can only have ONE competitor scheduled at a time on a given day.
    -   A competitor cannot be scheduled in two different arenas at the SAME time on the SAME day.
3.  **Complete Scheduling:** Ensure every competitor is scheduled for all of their required runs based on their specialties.
4.  **Distribution:** Distribute the runs as evenly as possible across all available event days.
5.  **Randomness:** The assignment of competitors to specific time slots should be random, as long as it adheres to all other rules.
6.  **Run Duration:** Each run (schedule entry) lasts for exactly 30 minutes. The \`endTime\` must be 30 minutes after the \`startTime\`.

**Inputs:**
-   **Competitors:** A list of all competitors, including their ID and specialties.
-   **Arenas:** A list of all arenas and their designated specialty type.
-   **Event Days:** A list of all dates the event is running.
-   **Time Slots:** A list of all available 30-minute time slots for each day.

Analyze all inputs and generate a valid JSON schedule object that satisfies all constraints.

**Input Data:**
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
