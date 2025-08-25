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

const { suggestAddress } = await import('../src/ai/flows/suggest-address');
const { ai } = await import('../src/ai/genkit');

describe('suggestAddress', () => {
  it('parses JSON array responses', async () => {
    vi.spyOn(ai, 'generateText').mockResolvedValueOnce('["A","B"]');
    const result = await suggestAddress({ query: '123' });
    expect(result.suggestions).toEqual(['A', 'B']);
  });

  it('falls back to newline-delimited text', async () => {
    vi.spyOn(ai, 'generateText').mockResolvedValueOnce('A\nB\n');
    const result = await suggestAddress({ query: '123' });
    expect(result.suggestions).toEqual(['A', 'B']);
  });
});
