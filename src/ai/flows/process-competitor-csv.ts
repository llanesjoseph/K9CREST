'use server';

/**
 * AI flow that normalises competitor CSV uploads.
 *
 * The incoming CSV files may use varying column headers.  This flow uses a
 * small generative prompt to map those headers to a standard set and then
 * returns the parsed competitor objects.
 */

import { z } from 'zod';
import { parse } from 'papaparse';
import { ai } from '@/ai/genkit';

const InputSchema = z.object({
  csv: z.string().describe('Raw CSV contents uploaded by the user'),
});
export type ProcessCompetitorCsvInput = z.infer<typeof InputSchema>;

const CompetitorSchema = z.object({
  firstName: z.string().default(''),
  lastName: z.string().default(''),
  specialties: z.array(z.string()).default([]),
});

const OutputSchema = z.object({
  competitors: z.array(CompetitorSchema),
});
export type ProcessCompetitorCsvOutput = z.infer<typeof OutputSchema>;

export async function processCompetitorCsv(
  input: ProcessCompetitorCsvInput
): Promise<ProcessCompetitorCsvOutput> {
  const { csv } = InputSchema.parse(input);

  const parsed = parse(csv, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, string>[];
  const headers = parsed.meta.fields ?? [];

  // Ask the model to map arbitrary headers to our canonical fields.
  const mappingPrompt =
    `Map each of the following CSV headers to one of the fields ` +
    `[firstName, lastName, specialties]. ` +
    `Return a JSON object with keys "firstName", "lastName" and ` +
    `"specialties" whose values are the best matching CSV header names. ` +
    `Headers: ${headers.join(', ')}`;

  const mappingText = await ai.generateText(mappingPrompt);

  let mapping: Record<string, string> = {};
  try {
    mapping = JSON.parse(mappingText);
  } catch {
    // Fallback: assume headers already match the canonical names
    mapping = {
      firstName: 'firstName',
      lastName: 'lastName',
      specialties: 'specialties',
    };
  }

  const competitors = rows.map((row) => {
    const firstName = row[mapping.firstName] ?? '';
    const lastName = row[mapping.lastName] ?? '';
    const specialtiesRaw = row[mapping.specialties] ?? '';
    const specialties = specialtiesRaw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);

    return { firstName, lastName, specialties };
  });

  return OutputSchema.parse({ competitors });
}

export const processCompetitorCsvFlow = ai.defineFlow(
  {
    name: 'processCompetitorCsv',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
  },
  processCompetitorCsv
);

