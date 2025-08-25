import { describe, expect, it, vi } from 'vitest';

process.env.GOOGLE_API_KEY = 'test';
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'x';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'x';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'x';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'x';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'x';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'x';
process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = 'x';
process.env.EMAIL_HOST = 'h';
process.env.EMAIL_PORT = '1';
process.env.EMAIL_USER = 'u';
process.env.EMAIL_PASS = 'p';
process.env.EMAIL_FROM = 'test@example.com';

const { processCompetitorCsv } = await import('../src/ai/flows/process-competitor-csv');
const { ai } = await import('../src/ai/genkit');

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
