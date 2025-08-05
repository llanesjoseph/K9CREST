
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
  prompt: `You are a K9 trial scheduler. Generate a complete schedule following this EXACT algorithm:

**STEP 1: Build Required Runs List**
Create a list of ALL runs needed. For EACH competitor:
- If they have 0 specialties, they need 1 run (in an 'Any' arena).
- If they have 1 specialty, they need 1 run.
- If they have 2 specialties, they need 2 separate runs.
- Format: {competitorId, specialtyType, detectionType (if applicable)}

Example:
- Competitor "A" with ["Bite Work"] → 1 run for Bite Work
- Competitor "B" with ["Bite Work", "Detection-Narcotics"] → 2 runs (1 Bite Work, 1 Detection-Narcotics)

**STEP 2: Create Time Slot Matrix**
Build a matrix of all available slots:
- Rows: Each combination of date + time slot
- Columns: Each arena
- Total slots = (number of days) × (time slots per day) × (number of arenas)

**STEP 3: Match Specialties to Arenas**
For each specialty type, list compatible arenas:
- "Bite Work" → arenas with "Bite Work" OR "Any"
- "Detection (Narcotics)" → arenas with "Detection (Narcotics)" OR "Any"
- "Detection (Explosives)" → arenas with "Detection (Explosives)" OR "Any"
- No specialty → arenas with "Any"

**STEP 4: Schedule Algorithm**
Process EVERY run from Step 1:

\`\`\`
For each required run:
  1. Get compatible arenas for this specialty
  2. For each event day:
     For each time slot:
       For each compatible arena:
         If slot is empty AND competitor not busy:
           - Assign run to this slot
           - Mark slot as occupied
           - Mark competitor as busy for this time
           - Create schedule entry with 30-minute duration
           - Move to next run
\`\`\`

**STEP 5: Generate Output**
For each assigned run, create a schedule entry:
{
  competitorId: [from the run],
  arenaId: [assigned arena],
  startTime: [assigned time slot],
  endTime: [startTime + 30 minutes],
  date: [assigned date]
}

**CRITICAL CHECKS:**
- Count competitors in input: ___
- Count total runs needed (if no specialties, count as 1): ___
- Your output MUST have exactly that many schedule entries
- Every competitor MUST appear in the schedule for EACH of their specialties (or once if they have none)

**Calculate End Times:**
- 09:00 → 09:30
- 09:30 → 10:00
- ...and so on for all time slots.

**Input Data:**
- Event Days: {{{json eventDays}}}
- Time Slots: {{{json timeSlots}}}
- Arenas: {{{json arenas}}}
- Competitors: {{{json competitors}}}

IMPORTANT: Your schedule array MUST contain one entry for EVERY specialty of EVERY competitor. If a competitor has 2 specialties, they need 2 entries in the schedule. If they have 0, they need 1.`,
});

const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async (input) => {
    // Calculate expected number of runs
    const expectedRuns = input.competitors.reduce((total, competitor) => {
      const specialtiesCount = competitor.specialties.length > 0 ? competitor.specialties.length : 1;
      return total + specialtiesCount;
    }, 0);
    
    console.log(`Expecting ${expectedRuns} total runs for ${input.competitors.length} competitors`);
    
    const { output } = await prompt(input);
    
    if (output && output.schedule) {
      console.log(`Generated ${output.schedule.length} runs`);
      
      if (output.schedule.length < expectedRuns) {
        console.warn(`AI Scheduling Warning: Only ${output.schedule.length} runs scheduled out of ${expectedRuns} required runs. The AI may have failed to schedule everyone. Consider adjusting inputs or re-running.`);
        
        // Log which competitors are missing runs
        const scheduledCompetitorRuns = new Map<string, number>();
        output.schedule.forEach(run => {
          const count = scheduledCompetitorRuns.get(run.competitorId) || 0;
          scheduledCompetitorRuns.set(run.competitorId, count + 1);
        });
        
        input.competitors.forEach(competitor => {
          const needed = competitor.specialties.length > 0 ? competitor.specialties.length : 1;
          const scheduled = scheduledCompetitorRuns.get(competitor.id) || 0;
          if (scheduled < needed) {
            console.error(`Competitor ${competitor.name} (${competitor.id}) is underscheduled: ${scheduled} of ${needed} runs scheduled.`);
          }
        });
      }
    } else {
        console.error("AI did not return a valid schedule object.");
    }
    
    return output!;
  }
);
