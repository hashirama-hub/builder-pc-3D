// workers/api/middleware/rateLimit.ts
import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';

const KV_PREFIX = 'rl:';
const MAX_REQ = 100;
const WINDOW_MS = 60_000;
const WINDOW_SECONDS = Math.ceil(WINDOW_MS / 1000);

/**
 * Sliding-ish fixed-window rate limit: 100 requests/min per IP, counted in KV.
 * Returns 429 with `{ error: 'Rate limit exceeded' }` once the window is spent.
 */
export const rateLimit = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown';
  const key = `${KV_PREFIX}${ip}`;
  const stored = await c.env.KV.get(key, 'text');
  const parsed = stored === null ? 0 : Number(stored);
  const current = Number.isFinite(parsed) ? parsed : 0;
  if (current >= MAX_REQ) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }
  await c.env.KV.put(key, String(current + 1), { expirationTtl: WINDOW_SECONDS });
  await next();
});
