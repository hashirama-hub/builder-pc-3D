// workers/api/middleware/rateLimit.ts
import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';

const KV_PREFIX = 'rl:';
const MAX_REQ = 100;
const WINDOW_MS = 60_000;
const WINDOW_SECONDS = Math.ceil(WINDOW_MS / 1000);
const UNKNOWN_CLIENT = 'unknown';

/**
 * Resolves the rate-limit bucket key for a request, in order of trust:
 *
 * 1. `CF-Connecting-IP` — set by Cloudflare's edge, not client-controllable.
 * 2. The **last** hop of `X-Forwarded-For` — the address appended by our own
 *    proxy. Earlier hops are attacker-prefixable, so a client that rotates
 *    `X-Forwarded-For: fake, fake, ...` cannot mint a fresh bucket per request.
 * 3. `'unknown'` — only when neither header is present.
 */
export function bucketKey(
  cfConnectingIp: string | undefined,
  forwardedFor: string | undefined
): string {
  const cf = cfConnectingIp?.trim();
  if (cf) return cf;

  const hops = (forwardedFor ?? '')
    .split(',')
    .map((hop) => hop.trim())
    .filter((hop) => hop !== '');
  const lastHop = hops[hops.length - 1];
  if (lastHop) return lastHop;

  return UNKNOWN_CLIENT;
}

/**
 * Sliding-ish fixed-window rate limit: 100 requests/min per IP, counted in KV.
 * Returns 429 with `{ error: 'Rate limit exceeded' }` once the window is spent.
 */
export const rateLimit = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const key = `${KV_PREFIX}${bucketKey(
    c.req.header('cf-connecting-ip'),
    c.req.header('x-forwarded-for')
  )}`;
  const stored = await c.env.KV.get(key, 'text');
  const parsed = stored === null ? 0 : Number(stored);
  const current = Number.isFinite(parsed) ? parsed : 0;
  if (current >= MAX_REQ) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }
  await c.env.KV.put(key, String(current + 1), { expirationTtl: WINDOW_SECONDS });
  await next();
});
