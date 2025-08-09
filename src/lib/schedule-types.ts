import { z } from "zod";

export const SpecialtyLabel = z.enum([
  "Any",
  "Bite Work",
  "Detection (Narcotics)",
  "Detection (Explosives)",
]);

export type SpecialtyLabel = z.infer<typeof SpecialtyLabel>;

export const SpecialtySchema = z.object({
  type: z.enum(["Bite Work", "Detection"]),
  detectionType: z.enum(["Narcotics", "Explosives"]).optional(),
});

export const CompetitorSchema = z.object({
  id: z.string(),
  name: z.string(),
  dogName: z.string(),
  agency: z.string(),
  specialties: z.array(SpecialtySchema),
});

export const ArenaSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialtyType: SpecialtyLabel,
  rubricId: z.string().nullable().optional(),
  rubricName: z.string().nullable().optional(),
});

export const InputSchema = z.object({
  competitors: z.array(CompetitorSchema),
  arenas: z.array(ArenaSchema),
  eventDays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  timeSlots: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
});

export const ScheduledRunSchema = z.object({
    competitorId: z.string(),
    arenaId: z.string(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const OutputSchema = z.object({
  schedule: z.array(ScheduledRunSchema),
  // Extra diagnostics; your UI can ignore these safely
  diagnostics: z.object({
    requiredRuns: z.number(),
    placedRuns: z.number(),
    unplacedRuns: z.array(z.object({
      competitorId: z.string(),
      specialtyType: SpecialtyLabel,
      reason: z.string(),
    })),
  }).optional(),
});

export type GenerateScheduleInput = z.infer<typeof InputSchema>;
export type GenerateScheduleOutput = z.infer<typeof OutputSchema>;
export type Competitor = z.infer<typeof CompetitorSchema>;
export type Arena = z.infer<typeof ArenaSchema>;
export type ScheduledEvent = z.infer<typeof ScheduledRunSchema> & { id: string };
