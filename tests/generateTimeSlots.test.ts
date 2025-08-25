import { describe, it, expect } from 'vitest';
import { generateTimeSlots } from '@/lib/schedule-helpers';

describe('generateTimeSlots', () => {
  it('generates slots and skips lunch break', () => {
    const slots = generateTimeSlots({
      duration: 60,
      eventStartTime: '09:00',
      eventEndTime: '12:00',
      lunchBreak: { start: '10:00', end: '11:00' },
    });
    expect(slots).toEqual(['09:00', '11:00']);
  });

  it('throws on invalid time format', () => {
    expect(() => generateTimeSlots({ eventStartTime: '9', eventEndTime: '10:00' })).toThrow();
  });

  it('throws when duration is non-positive', () => {
    expect(() => generateTimeSlots({ duration: 0 })).toThrow();
  });

  it('throws when start time is after end time', () => {
    expect(() => generateTimeSlots({ eventStartTime: '12:00', eventEndTime: '10:00' })).toThrow();
  });
});
