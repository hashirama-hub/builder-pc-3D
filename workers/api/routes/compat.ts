// workers/api/routes/compat.ts
import { Hono } from 'hono';
import type { Env } from '../env';
import { checkCompatibility } from '../../../apps/web/lib/compatEngine';
import { asBuildParts } from '../lib/parts';

export const compatRoute = new Hono<{ Bindings: Env }>();

compatRoute.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json<unknown>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (typeof body !== 'object' || body === null) {
    return c.json({ error: 'Invalid payload: expected { parts: [] }' }, 400);
  }

  const parts = asBuildParts((body as { parts?: unknown }).parts);
  if (!parts) {
    return c.json({ error: 'Invalid payload: parts must be an array' }, 400);
  }

  return c.json(checkCompatibility(parts));
});
