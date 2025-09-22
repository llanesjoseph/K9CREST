import { describe, it, expect, vi } from 'vitest';

// Ensure env is set before dynamic imports that read env
process.env.GOOGLE_API_KEY = 'test-key';
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'x';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'x';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'x';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'x';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'x';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'x';
process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = 'x';

describe('ai client', () => {
  it('retries once on failure and then throws', async () => {
    const { generateText } = await import('../src/ai/genkit');

    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
      } as any);

    global.fetch = mockFetch;

    const text = await generateText('hi');
    expect(text).toBe('ok');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws if no candidates are returned', async () => {
    const { generateText } = await import('../src/ai/genkit');
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await expect(generateText('hi')).rejects.toThrow(/No text candidates/);
  });
});

