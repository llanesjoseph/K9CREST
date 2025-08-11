
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
import Papa from 'papaparse';
import { gemini15Pro, gemini15Flash } from '@genkit-ai/googleai';

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


const HeaderMapOutputSchema = z.object({
  name: z.string().describe('The CSV header for the competitor/handler\'s name (e.g., "Handler Name").'),
  dogName: z.string().describe('The CSV header for the K9\'s name (e.g., "K9").'),
  agency: z.string().describe('The CSV header for the agency (e.g., "Department").'),
  specialties: z.string().describe('The CSV header for specialties/events (e.g., "Events").')
});

const headerMappingPrompt = ai.definePrompt({
    name: 'mapCompetitorCsvHeaders',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: z.object({ headers: z.array(z.string()) }) },
    output: { schema: HeaderMapOutputSchema },
    prompt: `You are a data mapping expert. Given the following CSV headers, map them to the required fields.

CSV Headers:
{{#each headers}}
- {{this}}
{{/each}}

Strictly return the JSON object with the mapped headers.
`
});


export async function processCompetitorCsv(
  input: ProcessCompetitorCsvInput
): Promise<ProcessCompetitorCsvOutput> {
    const { data: rows, meta } = Papa.parse<Record<string, string>>(input.csvData, { header: true, skipEmptyLines: true });
    
    if (!meta.fields || meta.fields.length === 0) {
        throw new Error("CSV has no headers or is empty.");
    }

    // 1. Use AI to map headers
    const { output: headerMap } = await headerMappingPrompt({ headers: meta.fields });
    if (!headerMap) {
        throw new Error("AI failed to map CSV headers.");
    }
    
    // 2. Use the map to parse rows locally
    const competitors = rows.map(row => {
        const specialtiesRaw = row[headerMap.specialties]?.toString() || '';
        
        const specialties: z.infer<typeof SpecialtySchema>[] = [];
        if (specialtiesRaw.toLowerCase().includes('bite')) {
            specialties.push({ type: 'Bite Work' });
        }
        if (specialtiesRaw.toLowerCase().includes('narcotics') || specialtiesRaw.toLowerCase().includes('drug')) {
            specialties.push({ type: 'Detection', detectionType: 'Narcotics' });
        }
        if (specialtiesRaw.toLowerCase().includes('explosives') || specialtiesRaw.toLowerCase().includes('bomb')) {
            specialties.push({ type: 'Detection', detectionType: 'Explosives' });
        }
        
        return {
            name: row[headerMap.name] || '',
            dogName: row[headerMap.dogName] || '',
            agency: row[headerMap.agency] || '',
            specialties: specialties,
        }
    }).filter(c => c.name && c.dogName && c.agency); // Filter out potentially empty rows

    if (competitors.length === 0) {
        throw new Error("No valid competitor data could be extracted from the CSV using the mapped headers.");
    }

    return { competitors };
}
