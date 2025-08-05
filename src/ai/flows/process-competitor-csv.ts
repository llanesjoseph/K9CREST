'use server';
/**
 * @fileOverview An AI agent that processes a CSV file of competitors,
 * mapping potentially varied headers to a standardized format, including specialties.
 *
 * - processCompetitorCsv - A function that handles the CSV processing.
 * - ProcessCompetitorCsvInput - The input type for the function.
 * - ProcessCompetitorCsvOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ProcessCompetitorCsvInputSchema = z.object({
  csvData: z.string().describe('The raw text content of a CSV file.'),
});
export type ProcessCompetitorCsvInput = z.infer<typeof ProcessCompetitorCsvInputSchema>;

const SpecialtySchema = z.object({
    type: z.enum(["Bite Work", "Detection"]).describe("The general specialty category."),
    detectionType: z.enum(["Narcotics", "Explosives"]).optional().describe("The specific type of detection, if applicable."),
});

const CompetitorSchema = z.object({
    name: z.string().describe("The full name of the competitor/handler."),
    dogName: z.string().describe("The name of the K9."),
    agency: z.string().describe("The agency or department the competitor belongs to."),
    specialties: z.array(SpecialtySchema).describe("An array of the competitor's specialties."),
});

const ProcessCompetitorCsvOutputSchema = z.object({
  competitors: z.array(CompetitorSchema).describe('An array of standardized competitor records.'),
});
export type ProcessCompetitorCsvOutput = z.infer<typeof ProcessCompetitorCsvOutputSchema>;

export async function processCompetitorCsv(
  input: ProcessCompetitorCsvInput
): Promise<ProcessCompetitorCsvOutput> {
  return processCompetitorCsvFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processCompetitorCsvPrompt',
  input: {schema: ProcessCompetitorCsvInputSchema},
  output: {schema: ProcessCompetitorCsvOutputSchema},
  prompt: `You are a data processing expert. Your task is to analyze the provided CSV data and extract a list of competitors, including their specialties.

The CSV may have different headers, but you must intelligently map them to the required fields: 'name', 'dogName', 'agency', and 'specialties'.

Common header variations to expect:
- For 'name': "Handler", "Handler Name", "Competitor", "Competitor Name"
- For 'dogName': "K9", "Dog's Name", "K9 Name"
- For 'agency': "Department", "Organization", "Team"
- For 'specialties': "Specialty", "Discipline", "Events", "Type"

Specialty parsing rules:
- The value can be a simple string like "Bite Work" or "Detection".
- If it's a detection specialty, it might be more specific, like "Detection - Narcotics", "Explosives Detection", or just "Narcotics".
- A competitor can have multiple specialties. If they are in the same cell, they are often separated by commas or semicolons (e.g., "Bite Work, Narcotics Detection").
- Map "Narcotics" or "Drugs" to the detectionType "Narcotics".
- Map "Explosives" or "Bombs" to the detectionType "Explosives".
- The final output for each specialty must be an object with a 'type' and an optional 'detectionType'.

Analyze the headers and the data rows to determine the correct mapping. Then, return a clean JSON object that follows the specified output schema. Ignore any empty rows.

CSV Data:
\`\`\`csv
{{{csvData}}}
\`\`\`
`,
});

const processCompetitorCsvFlow = ai.defineFlow(
  {
    name: 'processCompetitorCsvFlow',
    inputSchema: ProcessCompetitorCsvInputSchema,
    outputSchema: ProcessCompetitorCsvOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
