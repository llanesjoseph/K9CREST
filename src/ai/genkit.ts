'use server';
/**
 * Lightweight AI utility used by server flows.
 *
 * The original project removed Genkit initialization to keep builds working
 * when AI features were disabled.  This replacement provides a small
 * abstraction that is compatible with the rest of the codebase without
 * requiring additional dependencies.
 *
 * - `defineFlow` mimics the behaviour of Genkit's flow definition by
 *   validating input and output against Zod schemas.
 * - `generateText` performs a call to Google's Generative Language API using
 *   the API key provided in `GOOGLE_API_KEY`.
 */

import { z } from 'zod';
import { env } from '@/env';

export type FlowConfig<I, O> = {
  name: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
};

type FlowFn<I, O> = (input: I) => Promise<O>;

/**
 * Wrap a function with schema validation similar to Genkit's `defineFlow`.
 */
export function defineFlow<I, O>(config: FlowConfig<I, O>, fn: FlowFn<I, O>): FlowFn<I, O> {
  return async (raw: I) => {
    const parsed = config.inputSchema.parse(raw);
    const result = await fn(parsed);
    return config.outputSchema.parse(result);
  };
}

/**
 * Call Google's Generative Language API with the provided prompt and return
 * the text of the first candidate.  This relies on `fetch`, which is available
 * in the Node 18 runtime used by Firebase and Next.js.
 */
export async function generateText(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GOOGLE_API_KEY}`;

  const timeoutMs = 10000;
  const maxAttempts = 2;

  async function fetchOnce(): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Generative API error: ${response.status} ${text}`);
      }
      const data = (await response.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) throw new Error('No text candidates returned from Generative API');
      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchOnce();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 200 * attempt));
        continue;
      }
    }
  }
  const message = (lastError as any)?.message ?? String(lastError);
  throw new Error(`Failed to generate text: ${message}`);
}

/**
 * Exported `ai` object used by existing flow implementations.
 */
export const ai = {
  defineFlow,
  generateText,
};

export default ai;

