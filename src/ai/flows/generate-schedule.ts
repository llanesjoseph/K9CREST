
'use server';
/**
 * @fileOverview Enhanced AI agent that generates a complete event schedule.
 * This version uses a pre-computed slot list and a validate-and-repair loop
 * for higher accuracy and reliability.
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
export type Arena = z.infer<typeof ArenaSchema>;


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
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

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

// ##################################################################
// # 1) Precompute all valid slots
// ##################################################################

type Slot = {
  slotId: string;        // e.g. "2024-09-28|09:00|arena_X"
  date: string;          // "YYYY-MM-DD"
  startTime: string;     // "HH:mm"
  endTime: string;       // start + 30 min
  arenaId: string;
  arenaSpecialty: Arena['specialtyType']; // "Any" | "Bite Work" | "Detection (Narcotics)" | "Detection (Explosives)"
};

function add30(start: string) {
  const [h, m] = start.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m + 30);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function specialtyCompat(runSpec: string, arenaSpec: Arena['specialtyType']) {
  if (runSpec === 'Any') return arenaSpec === 'Any';
  if (runSpec === 'Bite Work') return arenaSpec === 'Bite Work' || arenaSpec === 'Any';
  if (runSpec === 'Detection (Narcotics)') return arenaSpec === 'Detection (Narcotics)' || arenaSpec === 'Any';
  if (runSpec === 'Detection (Explosives)') return arenaSpec === 'Detection (Explosives)' || arenaSpec === 'Any';
  return false;
}

function buildAllSlots(arenas: Arena[], days: string[], timeSlots: string[]): Slot[] {
  const out: Slot[] = [];
  for (const date of days) {
    for (const t of timeSlots) {
      for (const a of arenas) {
        const end = add30(t);
        out.push({
          slotId: `${date}|${t}|${a.id}`,
          date, startTime: t, endTime: end,
          arenaId: a.id,
          arenaSpecialty: a.specialtyType,
        });
      }
    }
  }
  return out;
}

function createRequiredRunsList(competitors: any[]) {
  const runs: any[] = [];
  
  competitors.forEach(competitor => {
    if (competitor.specialties.length === 0) {
        runs.push({
            competitorId: competitor.id,
            competitorName: competitor.name,
            specialtyType: 'Any',
        });
    } else {
        competitor.specialties.forEach((specialty: any) => {
          let specialtyType = specialty.type;
          if (specialty.type === 'Detection' && specialty.detectionType) {
              specialtyType = `Detection (${specialty.detectionType})`;
          }
          runs.push({
            competitorId: competitor.id,
            competitorName: competitor.name,
            specialtyType: specialtyType,
          });
        });
    }
  });
  
  return runs;
}

export async function generateSchedule(
  input: GenerateScheduleInput
): Promise<GenerateScheduleOutput> {
  // Pre-process the data
  const requiredRuns = createRequiredRunsList(input.competitors);
  const totalRunsNeeded = requiredRuns.length;
  const allSlots = buildAllSlots(input.arenas, input.eventDays, input.timeSlots);

  const enhancedInput = {
    ...input,
    requiredRuns,
    totalRunsNeeded,
    allSlots
  };
  
  return generateScheduleFlow(enhancedInput);
}


// ##################################################################
// # 2) Use a stricter prompt
// ##################################################################

const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: { 
    schema: z.object({
      competitors: z.array(CompetitorSchema),
      arenas: z.array(ArenaSchema),
      eventDays: z.array(z.string()),
      timeSlots: z.array(z.string()),
      requiredRuns: z.array(z.any()),
      totalRunsNeeded: z.number(),
      allSlots: z.array(z.object({
        slotId: z.string(),
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        arenaId: z.string(),
        arenaSpecialty: z.enum(['Any','Bite Work','Detection (Narcotics)','Detection (Explosives)']),
      })),
    })
  },
  output: { schema: GenerateScheduleOutputSchema },
  prompt: `
You are scheduling a K9 trial. Assign every run in {{totalRunsNeeded}} required runs to a unique, valid slot. Choose from the provided slots only.

Data:
- Required Runs: {{{json requiredRuns}}}
- All Slots (pick by slotId only): {{{json allSlots}}}

Hard rules:
1) Arena compatibility:
   - Bite Work -> Bite Work or Any
   - Detection (Narcotics) -> Detection (Narcotics) or Any
   - Detection (Explosives) -> Detection (Explosives) or Any
   - Any -> Any only
2) No competitor can occupy two slots that share the same date+startTime.
3) Each slotId can be used at most once.
4) Each run consumes exactly one slot. End time is already given in the slot.
5) Output must contain exactly {{totalRunsNeeded}} items if possible. It is acceptable to schedule fewer if there are not enough compatible slots.

Priorities to reduce conflicts:
- Prefer exact specialty arenas before using Any.
- Spread a competitor’s runs across different times if possible.

Output:
Return ONLY this JSON:
{
  "schedule": [
    {
      "competitorId": "...",
      "arenaId": "...",
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "date": "YYYY-MM-DD"
    }
  ]
}

How to pick a slot:
- For each run, select exactly one slotId from allSlots that is specialty-compatible and not yet taken, then emit its date/startTime/endTime/arenaId.
- Do not invent slots. If a run cannot be assigned, do not include it in the output.
`
});


// ##################################################################
// # 3) Single-pass flow (no repair loop)
// ##################################################################
async function generateScheduleFlow(input: any): Promise<GenerateScheduleOutput> {
  console.log(`Starting schedule generation. Needing to schedule ${input.totalRunsNeeded} runs.`);
  const { output } = await prompt(input);

  if (output && output.schedule) {
    const scheduledCount = output.schedule.length;
    const percentage = input.totalRunsNeeded > 0 ? (scheduledCount / input.totalRunsNeeded) * 100 : 100;
    console.log(`AI returned a schedule with ${scheduledCount}/${input.totalRunsNeeded} runs (${percentage.toFixed(1)}%).`);

    if (scheduledCount < input.totalRunsNeeded) {
       console.warn('WARNING: Not all runs were scheduled by the AI.');
    }
  } else {
    console.error("Flow finished but did not produce a valid schedule object.");
    // Return an empty schedule to avoid crashing the client
    return { schedule: [] };
  }

  return output!;
}
    

    