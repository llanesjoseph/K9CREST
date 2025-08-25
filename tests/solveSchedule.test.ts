import { describe, it, expect } from 'vitest';
import { solveSchedule } from '@/lib/schedule-solver';
import type { GenerateScheduleInput } from '@/lib/schedule-types';

describe('solveSchedule', () => {
  const baseInput: GenerateScheduleInput = {
    eventDays: ['2024-01-01'],
    timeSlots: ['09:00', '09:15', '09:30', '09:45'],
    arenas: [{ id: 'a1', name: 'Arena 1', specialtyType: 'Any' }],
    competitors: [
      { id: 'c1', name: 'Alice', dogName: 'Rex', agency: 'A1', specialties: [] },
      { id: 'c2', name: 'Bob', dogName: 'Fido', agency: 'A1', specialties: [] },
    ],
  };

  it('places all runs when capacity is sufficient', () => {
    const result = solveSchedule(baseInput);
    expect(result.schedule).toHaveLength(2);
    expect(result.diagnostics.unplacedRuns).toHaveLength(0);
  });

  it('reports unplaced runs when capacity is insufficient', () => {
    const input: GenerateScheduleInput = {
      ...baseInput,
      competitors: [...baseInput.competitors, { id: 'c3', name: 'Cara', dogName: 'Spot', agency: 'A1', specialties: [] }],
    };
    const result = solveSchedule(input);
    expect(result.schedule).toHaveLength(2);
    expect(result.diagnostics.unplacedRuns).toHaveLength(1);
  });

  it('reports unplaced runs when no compatible arena exists', () => {
    const input: GenerateScheduleInput = {
      eventDays: ['2024-01-01'],
      timeSlots: ['09:00', '09:15'],
      arenas: [{ id: 'a1', name: 'Arena 1', specialtyType: 'Detection (Explosives)' }],
      competitors: [
        { id: 'c1', name: 'Alice', dogName: 'Rex', agency: 'A1', specialties: [{ type: 'Detection', detectionType: 'Narcotics' }] },
      ],
    };
    const result = solveSchedule(input);
    expect(result.schedule).toHaveLength(0);
    expect(result.diagnostics.unplacedRuns[0]?.reason).toMatch(/No compatible arena/);
  });
});
