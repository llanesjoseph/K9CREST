
export type Specialty =
  | 'Any'
  | 'Bite Work'
  | 'Detection (Narcotics)'
  | 'Detection (Explosives)';

export interface Competitor {
  id: string;
  name: string;
  dogName: string;
  agency: string;
  specialties: {
    type: 'Bite Work' | 'Detection';
    detectionType?: 'Narcotics' | 'Explosives';
  }[];
}

export interface Arena {
  id: string;
  name: string;
  specialtyType: Specialty;
  rubricId?: string;
  rubricName?: string;
}

export interface GenerateScheduleInput {
  competitors: Competitor[];
  arenas: Arena[];
  eventDays: string[];
  timeSlots: string[];
}

export interface ScheduledRun {
    competitorId: string;
    arenaId: string;
    startTime: string;
    endTime: string;
    date: string;
}

export interface GenerateScheduleOutput {
  schedule: ScheduledRun[];
}
