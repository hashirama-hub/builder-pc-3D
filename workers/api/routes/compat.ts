// workers/api/routes/compat.ts
import { Hono } from 'hono';
import type { Env } from '../env';
import { checkCompatibility } from '../../../apps/web/lib/compatEngine';
import { compatBodySchema, toBuildParts } from '../schemas';

export const compatRoute = new Hono<{ Bindings: Env }>();

compatRoute.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json<unknown>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = compatBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: 'Invalid payload: parts must be an array of well-formed build parts',
        issues: parsed.error.issues,
      },
      400
    );
  }

  return c.json(checkCompatibility(toBuildParts(parsed.data.parts)));
});
