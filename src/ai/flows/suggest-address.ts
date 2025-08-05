'use server';
/**
 * @fileOverview An AI agent that suggests addresses based on a partial query.
 *
 * - suggestAddress - A function that suggests addresses.
 * - SuggestAddressInput - The input type for the suggestAddress function.
 * - SuggestAddressOutput - The return type for the suggestAddress function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SuggestAddressInputSchema = z.object({
  query: z.string().describe('A partial address string or location name.'),
});
export type SuggestAddressInput = z.infer<typeof SuggestAddressInputSchema>;

const SuggestAddressOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('A list of suggested complete addresses or location names.'),
});
export type SuggestAddressOutput = z.infer<typeof SuggestAddressOutputSchema>;

export async function suggestAddress(
  input: SuggestAddressInput
): Promise<SuggestAddressOutput> {
  return suggestAddressFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAddressPrompt',
  input: {schema: SuggestAddressInputSchema},
  output: {schema: SuggestAddressOutputSchema},
  prompt: `You are an address and location autocompletion service. Given a partial address or location name query, provide a list of up to 5 likely complete address or location suggestions. Return real addresses and well-known locations.

Query: {{{query}}}
`,
});

const suggestAddressFlow = ai.defineFlow(
  {
    name: 'suggestAddressFlow',
    inputSchema: SuggestAddressInputSchema,
    outputSchema: SuggestAddressOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
