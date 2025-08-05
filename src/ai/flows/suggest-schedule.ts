'use server';
/**
 * @fileOverview An AI agent that suggests an initial schedule for a K9 trial event.
 *
 * - suggestSchedule - A function that generates a schedule proposal.
 * - SuggestScheduleInput - The input type for the suggestSchedule function.
 * - SuggestScheduleOutput - The return type for the suggestSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestScheduleInputSchema = z.object({
  competitorDetails: z
    .string()
    .describe('Details of the competitors, including names and specialties.'),
  taskDurations: z.string().describe('The estimated duration of each task.'),
  timezone: z.string().describe('The timezone of the event.'),
  arenaAvailability: z
    .string()
    .describe('The availability of each arena, including start and end times.'),
});
export type SuggestScheduleInput = z.infer<typeof SuggestScheduleInputSchema>;

const SuggestScheduleOutputSchema = z.object({
  scheduleProposal: z.string().describe('The proposed schedule for the event.'),
});
export type SuggestScheduleOutput = z.infer<typeof SuggestScheduleOutputSchema>;

export async function suggestSchedule(input: SuggestScheduleInput): Promise<SuggestScheduleOutput> {
  return suggestScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSchedulePrompt',
  input: {schema: SuggestScheduleInputSchema},
  output: {schema: SuggestScheduleOutputSchema},
  prompt: `You are an expert event scheduler for K9 trials.  Given the competitor details, task durations, timezone, and arena availability, create an initial schedule proposal for the event.

Competitor Details: {{{competitorDetails}}}
Task Durations: {{{taskDurations}}}
Timezone: {{{timezone}}}
Arena Availability: {{{arenaAvailability}}}

Schedule Proposal:`,
});

const suggestScheduleFlow = ai.defineFlow(
  {
    name: 'suggestScheduleFlow',
    inputSchema: SuggestScheduleInputSchema,
    outputSchema: SuggestScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
