
import { z } from "zod";
import { Timestamp } from "firebase/firestore";

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
export type Specialty = z.infer<typeof SpecialtySchema>;


export const CompetitorSchema = z.object({
  id: z.string(),
  name: z.string(),
  dogName: z.string(),
  agency: z.string(),
  specialties: z.array(SpecialtySchema),
  bibNumber: z.string().optional(),
  eventId: z.string(),
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

const ScoreExerciseSchema = z.object({
  exerciseName: z.string(),
  score: z.union([z.number(), z.boolean()]),
  type: z.string(),
  maxPoints: z.number().optional(),
});

const ScorePhaseSchema = z.object({
  phaseName: z.string(),
  exercises: z.array(ScoreExerciseSchema),
});

export const ScheduledRunSchema = z.object({
    id: z.string(),
    competitorId: z.string(),
    arenaId: z.string(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['scheduled', 'in_progress', 'paused', 'scored', 'locked']).optional(),
    actualStartTime: z.instanceof(Timestamp).optional(),
    scores: z.array(ScorePhaseSchema).optional(),
    notes: z.string().optional(),
    totalTime: z.number().optional(),
    judgeName: z.string().optional(),
});

export const OutputSchema = z.object({
  schedule: z.array(ScheduledRunSchema.omit({ id: true })),
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
export type ScheduledEvent = z.infer<typeof ScheduledRunSchema>;
