import { describe, expect, it, vi } from 'vitest';
import { processCompetitorCsv } from '../src/ai/flows/process-competitor-csv';
import { ai } from '../src/ai/genkit';

describe('processCompetitorCsv', () => {
  it('maps headers using AI response', async () => {
    vi.spyOn(ai, 'generateText').mockResolvedValueOnce(
      JSON.stringify({ firstName: 'First', lastName: 'Last', specialties: 'Specialties' })
    );
    const csv = 'First,Last,Specialties\nJohn,Doe,Bite Work';
    const result = await processCompetitorCsv({ csv });
    expect(result.competitors).toEqual([
      { firstName: 'John', lastName: 'Doe', specialties: ['Bite Work'] }
    ]);
  });

  it('falls back when AI returns invalid JSON', async () => {
    vi.spyOn(ai, 'generateText').mockResolvedValueOnce('not json');
    const csv = 'firstName,lastName,specialties\nJane,Doe,Bite Work;Detection';
    const result = await processCompetitorCsv({ csv });
    expect(result.competitors[0].specialties).toEqual(['Bite Work', 'Detection']);
  });
});
