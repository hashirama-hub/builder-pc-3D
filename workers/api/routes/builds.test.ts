// workers/api/routes/builds.test.ts
import { describe, it, expect } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { buildsRoute } from './builds';

interface BindCall {
  sql: string;
  args: unknown[];
}

/** Minimal in-memory stand-in for the D1 binding: records binds, canned results. */
class FakeD1 {
  readonly binds: BindCall[] = [];
  nextFirst: unknown = null;

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        self.binds.push({ sql, args });
        return {
          async run() {
            return { success: true };
          },
          async first() {
            return self.nextFirst;
          },
          async all() {
            return { results: [] };
          },
        };
      },
    };
  }

  get asD1(): D1Database {
    return this as unknown as D1Database;
  }
}

function post(db: FakeD1, body: string): Promise<Response> {
  return buildsRoute.request(
    '/',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body },
    { DB: db.asD1 }
  );
}

function get(db: FakeD1, shortId: string): Promise<Response> {
  return buildsRoute.request(`/${shortId}`, { method: 'GET' }, { DB: db.asD1 });
}

describe('POST /api/builds', () => {
  it('inserts a build and returns id + shortId', async () => {
    const db = new FakeD1();
    const res = await post(
      db,
      JSON.stringify({
        name: 'My rig',
        parts: [{ slot: 'cpu_slot', product: { id: 'cpu-1' } }],
        totalPriceVnd: 4500000,
        compatible: true,
        warnings: ['few SATA ports'],
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { id: string; shortId: string };
    expect(json.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(json.shortId).toBe(json.id.slice(0, 8));

    expect(db.binds).toHaveLength(1);
    const { sql, args } = db.binds[0];
    expect(sql).toContain('INSERT INTO builds');
    expect(args).toHaveLength(9);
    expect(args[0]).toBe(json.id);
    expect(args[1]).toBe('My rig');
    expect(JSON.parse(String(args[2]))).toHaveLength(1);
    expect(args[3]).toBe(4500000);
    expect(args[4]).toBe(1);
    expect(JSON.parse(String(args[5]))).toEqual(['few SATA ports']);
    expect(typeof args[6]).toBe('string');
    expect(args[7]).toBe(json.shortId);
    expect(args[8]).toBeNull();
  });

  it('stores incompatible builds as 0 and defaults warnings/userId', async () => {
    const db = new FakeD1();
    const res = await post(
      db,
      JSON.stringify({ name: 'bad', parts: [], totalPriceVnd: 0, compatible: false })
    );
    expect(res.status).toBe(200);
    const args = db.binds[0].args;
    expect(args[4]).toBe(0);
    expect(JSON.parse(String(args[5]))).toEqual([]);
    expect(args[8]).toBeNull();
  });

  it('rejects a payload with a missing name', async () => {
    const db = new FakeD1();
    const res = await post(
      db,
      JSON.stringify({ parts: [], totalPriceVnd: 1, compatible: true })
    );
    expect(res.status).toBe(400);
    expect(db.binds).toHaveLength(0);
  });

  it('rejects a payload with a non-array parts', async () => {
    const db = new FakeD1();
    const res = await post(
      db,
      JSON.stringify({ name: 'x', parts: {}, totalPriceVnd: 1, compatible: true })
    );
    expect(res.status).toBe(400);
    expect(db.binds).toHaveLength(0);
  });

  it('rejects a body that is not valid JSON', async () => {
    const db = new FakeD1();
    const res = await post(db, '{{{');
    expect(res.status).toBe(400);
    expect(db.binds).toHaveLength(0);
  });
});

describe('GET /api/builds/:shortId', () => {
  it('returns the build with parts + warnings parsed from JSON', async () => {
    const db = new FakeD1();
    db.nextFirst = {
      id: 'abc',
      name: 'My rig',
      parts: JSON.stringify([{ slot: 'cpu_slot' }]),
      total_price_vnd: 4500000,
      compatible: 1,
      warnings: JSON.stringify(['warn']),
      created_at: '2026-01-01T00:00:00.000Z',
      short_id: 'deadbeef',
      user_id: null,
    };

    const res = await get(db, 'deadbeef');
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.short_id).toBe('deadbeef');
    expect(json.parts).toEqual([{ slot: 'cpu_slot' }]);
    expect(json.warnings).toEqual(['warn']);
    expect(db.binds[0].sql).toContain('SELECT * FROM builds WHERE short_id = ?');
    expect(db.binds[0].args).toEqual(['deadbeef']);
  });

  it('404s when the short id is unknown', async () => {
    const db = new FakeD1();
    db.nextFirst = null;
    const res = await get(db, 'nope');
    expect(res.status).toBe(404);
  });
});
