const WINDOW_MS = 60 * 60 * 1000;
const MAX_CALLS = 15;

// Per-instance only: a serverless deployment runs several instances, so the
// effective ceiling is MAX_CALLS x instances. Enough to stop a runaway client,
// not a substitute for a shared counter.
const hits = new Map<string, number[]>();

export function checkRateLimit(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_CALLS) {
    const retryAfterMs = WINDOW_MS - (now - recent[0]);
    return { allowed: false as const, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true as const, remaining: MAX_CALLS - recent.length };
}
