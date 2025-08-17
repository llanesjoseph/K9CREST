import { describe, expect, it, vi } from 'vitest';
import { suggestAddress } from '../src/ai/flows/suggest-address';
import { ai } from '../src/ai/genkit';

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
