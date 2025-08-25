export type RetryOptions = {
  baseDelay?: number; // milliseconds
  jitter?: number; // max random additional delay in ms
};

export async function postJSONWithRetry<T>(url: string, body: unknown, tries = 3, opts: RetryOptions = {}): Promise<T> {
  const { baseDelay = 600, jitter = 0 } = opts;
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
      if (!/application\/json/.test(res.headers.get('content-type') || '')) {
        throw new Error(`Non-JSON from server`);
      }
      return JSON.parse(text);
    } catch (e: any) {
      lastErr = e;
      const msg = String(e.message || '');
      const is429 = /HTTP 429/.test(msg) || /Quota|rate limit/i.test(msg);
      const is5xx = /HTTP 5\d{2}/.test(msg);
      if (i < tries - 1 && (is429 || is5xx)) {
        const delay = baseDelay * Math.pow(2, i);
        const jitterMs = jitter ? Math.random() * jitter : 0;
        await new Promise(r => setTimeout(r, delay + jitterMs));
        continue;
      }
      console.error('postJSONWithRetry failed', e);
      throw e;
    }
  }
  console.error('postJSONWithRetry: exhausted retries', lastErr);
  throw lastErr;
}
