// Best-effort in-memory sliding-window rate limiter.
//
// Works well on long-lived Node.js servers but is NOT shared across serverless
// instances — each cold-start gets a fresh Map. This is intentional: it blocks
// the most common abuse (same source, same instance) without any external
// dependency. The production upgrade is Upstash Redis + @upstash/ratelimit,
// which shares state across all instances and survives restarts.
//
// Usage:
//   const { ok, retryAfterMs } = rateLimit(`otp-send:${email}:${ip}`, 5, 10 * 60_000);
//   if (!ok) return { error: `Too many attempts. Try again in ${Math.ceil(retryAfterMs / 1000)}s.` };

const store = new Map<string, number[]>();

/**
 * Sliding-window rate limiter.
 * @param key      Bucket identifier (e.g. "otp-send:+919...:1.2.3.4").
 * @param max      Maximum hits allowed within the window.
 * @param windowMs Window size in milliseconds.
 * @returns        { ok: true } when allowed; { ok: false, retryAfterMs } when limited.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const timestamps = (store.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= max) {
    // Oldest hit determines when the window re-opens.
    const retryAfterMs = windowMs - (now - timestamps[0]);
    store.set(key, timestamps);
    return { ok: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return { ok: true, retryAfterMs: 0 };
}
