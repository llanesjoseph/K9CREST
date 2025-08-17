'use server';

/**
 * AI-powered address suggestion flow.
 *
 * Given a partial address query, the flow requests suggestions from Google's
 * Generative Language API and returns a list of potential full addresses.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit';

const InputSchema = z.object({
  query: z.string().describe('Partial address provided by the user'),
});
export type SuggestAddressInput = z.infer<typeof InputSchema>;

const OutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('Array of possible full addresses derived from the query'),
});
export type SuggestAddressOutput = z.infer<typeof OutputSchema>;

export async function suggestAddress(
  input: SuggestAddressInput
): Promise<SuggestAddressOutput> {
  const { query } = InputSchema.parse(input);

  const prompt =
    `You are an assistant that completes postal addresses. ` +
    `Provide up to five complete address suggestions as a JSON array of strings ` +
    `for the following partial input: "${query}".`;

  const text = await ai.generateText(prompt);

  let suggestions: string[] = [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      suggestions = parsed.map((s) => String(s));
    }
  } catch {
    suggestions = text
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  return OutputSchema.parse({ suggestions });
}

export const suggestAddressFlow = ai.defineFlow(
  {
    name: 'suggestAddress',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
  },
  suggestAddress
);

