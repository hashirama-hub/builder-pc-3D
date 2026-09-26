// workers/api/routes/builds.ts
import { Hono } from 'hono';
import type { Env } from '../env';
import type { BuildPart } from '../../../apps/web/types';
import { asBuildParts, asStringArray } from '../lib/parts';

export const buildsRoute = new Hono<{ Bindings: Env }>();

interface CreateBuildRequest {
  name: string;
  parts: BuildPart[];
  totalPriceVnd: number;
  compatible: boolean;
  warnings: string[];
  userId?: string;
}

interface BuildRow {
  id: string;
  name: string;
  parts: string;
  total_price_vnd: number;
  compatible: number;
  warnings: string | null;
  created_at: string;
  short_id: string;
  user_id: string | null;
}

/** Returns null (→ 400) when the payload is missing required fields. */
function parseCreateBuild(body: unknown): CreateBuildRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  if (typeof b.name !== 'string' || b.name.trim() === '') return null;
  const parts = asBuildParts(b.parts);
  if (!parts) return null;
  if (typeof b.totalPriceVnd !== 'number' || !Number.isFinite(b.totalPriceVnd)) return null;
  if (typeof b.compatible !== 'boolean') return null;
  const warnings = asStringArray(b.warnings);
  if (!warnings) return null;

  let userId: string | undefined;
  if (b.userId !== undefined && b.userId !== null) {
    if (typeof b.userId !== 'string') return null;
    userId = b.userId;
  }

  return {
    name: b.name,
    parts,
    totalPriceVnd: b.totalPriceVnd,
    compatible: b.compatible,
    warnings,
    userId,
  };
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

buildsRoute.post('/', async (c) => {
  const db = c.env.DB;

  let body: unknown;
  try {
    body = await c.req.json<unknown>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const input = parseCreateBuild(body);
  if (!input) {
    return c.json(
      { error: 'Invalid build payload: name, totalPriceVnd, compatible and well-formed parts are required' },
      400
    );
  }

  const id = crypto.randomUUID();
  const shortId = id.slice(0, 8);

  await db
    .prepare(
      'INSERT INTO builds (id, name, parts, total_price_vnd, compatible, warnings, created_at, short_id, user_id) VALUES (?,?,?,?,?,?,?,?,?)'
    )
    .bind(
      id,
      input.name,
      JSON.stringify(input.parts),
      input.totalPriceVnd,
      input.compatible ? 1 : 0,
      JSON.stringify(input.warnings),
      new Date().toISOString(),
      shortId,
      input.userId ?? null
    )
    .run();

  return c.json({ id, shortId });
});

buildsRoute.get('/:shortId', async (c) => {
  const db = c.env.DB;
  const { shortId } = c.req.param();

  const row = await db
    .prepare('SELECT * FROM builds WHERE short_id = ?')
    .bind(shortId)
    .first<BuildRow>();
  if (!row) return c.json({ error: 'Not found' }, 404);

  return c.json({
    ...row,
    parts: parseJson<BuildPart[]>(row.parts, []),
    warnings: parseJson<string[]>(row.warnings ?? '[]', []),
  });
});
