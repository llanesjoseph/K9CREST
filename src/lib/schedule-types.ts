
import type { Timestamp } from "firebase/firestore";
import { z } from "zod";

export const SpecialtyLabelSchema = z.enum([
  "Any",
  "Bite Work",
  "Detection (Narcotics)",
  "Detection (Explosives)",
]);
export type SpecialtyLabel = z.infer<typeof SpecialtyLabelSchema>;

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
  specialties: z.array(SpecialtySchema).optional().default([]),
  bibNumber: z.string().optional().nullable(),
  dogBio: z.string().optional().nullable(),
  dogImage: z.string().optional().nullable(),
  photoURL: z.string().optional().nullable(),
});
export type Competitor = z.infer<typeof CompetitorSchema>;


export const ArenaSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialtyType: SpecialtyLabelSchema,
  rubricId: z.string().nullable().optional(),
  rubricName: z.string().nullable().optional(),
});
export type Arena = z.infer<typeof ArenaSchema>;

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
    status: z.enum(['scheduled', 'in_progress', 'paused', 'scored', 'locked']).default('scheduled'),
    actualStartTime: z.custom<Timestamp>().optional().nullable(),
    actualEndTime: z.custom<Timestamp>().optional().nullable(),
    scores: z.array(ScorePhaseSchema).optional().nullable(),
    notes: z.string().optional().nullable(),
    totalTime: z.number().optional().nullable(),
    judgeName: z.string().optional().nullable(),
    judgingInterface: z.enum(["phases", "detection"]).optional().nullable(),
    detectionMax: z.number().optional().nullable(),
    teamworkMax: z.number().optional().nullable(),
    aidsPlanted: z.number().optional().nullable(),
    falseAlertPenalty: z.number().optional().nullable(),
    falseAlerts: z.number().optional().nullable(),
    startAt: z.custom<Timestamp>().optional().nullable(),
    endAt: z.custom<Timestamp>().optional().nullable(),
});
export type ScheduledEvent = z.infer<typeof ScheduledRunSchema>;

export const InputSchema = z.object({
  eventDays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  timeSlots: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
  arenas: z.array(ArenaSchema),
  competitors: z.array(CompetitorSchema),
});
export type GenerateScheduleInput = z.infer<typeof InputSchema>;

export const OutputSchema = z.object({
  schedule: z.array(
    z.object({
      competitorId: z.string(),
      arenaId: z.string(),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  ),
  diagnostics: z.object({
    requiredRuns: z.number(),
    placedRuns: z.number(),
    unplacedRuns: z.array(
      z.object({
        competitorId: z.string(),
        specialtyType: SpecialtyLabelSchema,
        reason: z.string(),
      })
    ),
  }),
});
export type GenerateScheduleOutput = z.infer<typeof OutputSchema>;
