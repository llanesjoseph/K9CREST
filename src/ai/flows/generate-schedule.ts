
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
// # 1) Precompute all valid slots and create allowlists per run
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

function compat(runSpec: string, arenaSpec: Slot['arenaSpecialty']) {
  if (runSpec === 'Any') return arenaSpec === 'Any';
  if (runSpec === 'Bite Work') return arenaSpec === 'Bite Work' || arenaSpec === 'Any';
  if (runSpec === 'Detection (Narcotics)') return arenaSpec === 'Detection (Narcotics)' || arenaSpec === 'Any';
  if (runSpec === 'Detection (Explosives)') return arenaSpec === 'Detection (Explosives)' || arenaSpec === 'Any';
  return false;
}

function allowedSlotsForRuns(requiredRuns: any[], allSlots: Slot[]) {
  return requiredRuns.map(r => ({
    runKey: `${r.competitorId}|${r.specialtyType}`,
    competitorId: r.competitorId,
    specialtyType: r.specialtyType,
    allowedSlotIds: allSlots.filter(s => compat(r.specialtyType, s.arenaSpecialty)).map(s => s.slotId),
  }));
}

// ##################################################################
// # 2) Stricter prompt requiring choices from allowlist
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
      allSlots: z.array(z.any()), // Simplified for prompt, validation is key
      runAllowlist: z.array(z.object({
        runKey: z.string(),
        competitorId: z.string(),
        specialtyType: z.string(),
        allowedSlotIds: z.array(z.string()),
      })),
    })
  },
  output: { schema: GenerateScheduleOutputSchema },
  prompt: `
You are an expert event scheduler. Your goal is to assign every required run to a unique slot from its own list of allowed slots.

DATA:
- runAllowlist: A list of all runs that must be scheduled. For each run, you are given 'allowedSlotIds' which is a list of valid places it can go.
- allSlots: A lookup table to get the date, time, and arena details from a chosen slotId.

TASK:
You must assign every required run to exactly one slotId from its own allowedSlotIds.

RULES:
1) Use ONLY slotIds listed for that run in 'runAllowlist'. This is the most important rule.
2. A slotId from 'allSlots' can be used at most once across the entire schedule.
3. A competitor cannot be scheduled in two different runs that happen at the same date and startTime.
4. Your final 'schedule' array MUST contain exactly {{totalRunsNeeded}} items.

OUTPUT:
Return ONLY the final JSON object. Do not include any other text.
{"schedule":[{"competitorId":"","arenaId":"","startTime":"","endTime":"","date":""}]}

SELECTION PROCEDURE:
- For each run in 'runAllowlist', pick one slotId from its 'allowedSlotIds' that has not yet been used by another run.
- Use the 'allSlots' data to get the date, startTime, endTime, and arenaId for the chosen slotId.
- Do not invent slots. Do not deviate from 'allowedSlotIds'.
`
});


// ##################################################################
// # 3) Validate and Repair Loop
// ##################################################################

function validateAndDiff(out: GenerateScheduleOutput, ctx: {
  totalRunsNeeded: number,
  allSlots: Slot[],
  runAllowlist: { competitorId: string; specialtyType: string; allowedSlotIds: string[], runKey: string }[]
}) {
  const slotById = new Map(ctx.allSlots.map(s => [s.slotId, s]));
  const allowedByRun = new Map(
    ctx.runAllowlist.map(r => [r.runKey, new Set(r.allowedSlotIds)])
  );

  const errors: string[] = [];
  const usedSlots = new Set<string>();
  const compAtTime = new Set<string>();
  const placedRunKeys = new Set<string>();

  for (const r of out.schedule) {
    const slotId = `${r.date}|${r.startTime}|${r.arenaId}`;
    const slot = slotById.get(slotId);
    if (!slot) { errors.push(`Invalid slot ${slotId}`); continue; }

    const runKeysForCompetitor = ctx.runAllowlist
        .filter(x => x.competitorId === r.competitorId)
        .map(x => x.runKey);

    let assignedRunKey: string | null = null;

    for (const key of runKeysForCompetitor) {
        if (placedRunKeys.has(key)) continue; // Already assigned this run for this competitor
        
        const allowedSlotsForThisRun = allowedByRun.get(key);
        if (allowedSlotsForThisRun && allowedSlotsForThisRun.has(slotId)) {
            assignedRunKey = key;
            break;
        }
    }

    if (!assignedRunKey) {
        errors.push(`Slot ${slotId} is not allowed for any unplaced run of competitor ${r.competitorId}`);
        continue;
    }

    if (usedSlots.has(slotId)) errors.push(`Duplicate slot ${slotId}`);
    usedSlots.add(slotId);

    const tKey = `${r.competitorId}|${r.date}|${r.startTime}`;
    if (compAtTime.has(tKey)) errors.push(`Competitor conflict ${tKey}`);
    compAtTime.add(tKey);
    
    placedRunKeys.add(assignedRunKey);
  }

  const expected = ctx.runAllowlist.length;
  if (out.schedule.length !== expected) {
    errors.push(`Count mismatch, expected ${expected}, got ${out.schedule.length}`);
  }

  const unplaced = ctx.runAllowlist
    .filter(r => !placedRunKeys.has(r.runKey))
    .map(r => ({ competitorId: r.competitorId, specialtyType: r.specialtyType, allowedSlotIds: r.allowedSlotIds }));

  const openSlots = ctx.allSlots.filter(s => !usedSlots.has(s.slotId)).map(s => ({
    slotId: s.slotId, date: s.date, startTime: s.startTime, endTime: s.endTime, arenaId: s.arenaId
  }));

  return { errors, unplaced, openSlots };
}


async function generateScheduleFlow(input: any) {
  console.log('Starting schedule generation...');
  const { output } = await prompt(input);

  let result = output!;
  let attempts = 1;

  while (attempts <= 3) {
    console.log(`Validation attempt #${attempts}`);
    const diff = validateAndDiff(result, input);
    
    if (diff.errors.length === 0 && diff.unplaced.length === 0) {
      console.log("Validation successful. No errors found.");
      break;
    }
    
    console.warn(`Validation failed with ${diff.errors.length} errors and ${diff.unplaced.length} unplaced runs.`);
    console.warn("Errors:", diff.errors);

    const repairPrompt = ai.definePrompt({
      name: 'repairSchedule',
      input: { schema: z.object({
        current: GenerateScheduleOutputSchema,
        unplaced: z.array(z.any()),
        openSlots: z.array(z.any()),
        totalRunsNeeded: z.number()
      })},
      output: { schema: GenerateScheduleOutputSchema },
      prompt: `
You are a schedule repair assistant. Your task is to fix an invalid schedule.

RULES:
- You must add all the 'unplaced' runs to the schedule.
- You can only use slots from the 'openSlots' list.
- Do not remove or change any of the valid runs in the 'current' schedule.
- The final schedule must have exactly {{totalRunsNeeded}} items.

DATA:
- Current valid schedule items (DO NOT CHANGE THESE): {{{json current.schedule}}}
- Runs that still need to be scheduled: {{{json unplaced}}}
- Available empty slots to place them in: {{{json openSlots}}}

Return only the complete, fixed JSON schedule object.
`
    });

    const { output: repaired } = await repairPrompt({
      current: { schedule: result.schedule.filter(run => !diff.errors.some(e => e.includes(run.competitorId))) }, // Provide only valid runs
      unplaced: diff.unplaced,
      openSlots: diff.openSlots,
      totalRunsNeeded: input.totalRunsNeeded
    });
    
    if (!repaired) {
        console.error("Repair prompt failed to return an output.");
        break; // Exit loop if repair fails
    }

    result = repaired;
    attempts += 1;
  }
  
  const finalCount = result?.schedule?.length ?? 0;
  const neededCount = input.totalRunsNeeded;
  console.log(`Schedule generation finished. Scheduled ${finalCount}/${neededCount} runs.`);

  if (finalCount < neededCount) {
    console.error("CRITICAL: Final schedule is incomplete after repair attempts.");
  }

  return result || { schedule: [] };
}


// Main exported function
export async function generateSchedule(
  input: GenerateScheduleInput
): Promise<GenerateScheduleOutput> {
  const requiredRuns = createRequiredRunsList(input.competitors);
  const totalRunsNeeded = requiredRuns.length;
  const allSlots = buildAllSlots(input.arenas, input.eventDays, input.timeSlots);
  const runAllowlist = allowedSlotsForRuns(requiredRuns, allSlots);

  const enhancedInput = {
    ...input,
    requiredRuns,
    totalRunsNeeded,
    allSlots,
    runAllowlist,
  };
  
  return generateScheduleFlow(enhancedInput);
}
