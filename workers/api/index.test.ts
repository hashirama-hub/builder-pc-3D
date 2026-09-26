// workers/api/index.test.ts
import { describe, it, expect } from 'vitest';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import app from './index';
import { bucketKey } from './middleware/rateLimit';

class FakeKV {
  private readonly store: Map<string, string>;

  constructor(initial?: Record<string, string>) {
    this.store = new Map<string, string>(Object.entries(initial ?? {}));
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  read(key: string): string | undefined {
    return this.store.get(key);
  }

  get asKv(): KVNamespace {
    return this as unknown as KVNamespace;
  }
}

class FakeProductsD1 {
  readonly binds: unknown[][] = [];
  readonly sql: string[] = [];

  constructor(
    private readonly rows: Record<string, unknown>[],
    private readonly total: number
  ) {}

  prepare(sql: string) {
    const self = this;
    self.sql.push(sql);
    return {
      bind(...args: unknown[]) {
        self.binds.push(args);
        return {
          async all() {
            return { results: self.rows };
          },
          async first() {
            return self.total;
          },
          async run() {
            return { success: true };
          },
        };
      },
    };
  }

  get asD1(): D1Database {
    return this as unknown as D1Database;
  }
}

const productRow = {
  id: 'cpu-1',
  category: 'cpu',
  brand: 'AMD',
  model: 'Ryzen 7 7800X3D',
  price_vnd: 9000000,
  tier: 'high',
};

describe('GET /api/products', () => {
  it('returns paginated rows and forwards filters to SQL', async () => {
    const db = new FakeProductsD1([productRow], 1);
    const res = await app.request(
      '/api/products?category=cpu&sort=rating&page=2&limit=10',
      {},
      { DB: db.asD1, KV: new FakeKV().asKv }
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      data: unknown[];
      total: number;
      page: number;
      limit: number;
    };
    expect(json.data).toEqual([productRow]);
    expect(json.total).toBe(1);
    expect(json.page).toBe(2);
    expect(json.limit).toBe(10);

    expect(db.sql[0]).toContain('category = ?1');
    expect(db.sql[0]).toContain('ORDER BY rating DESC');
    expect(db.sql[0]).toContain('LIMIT ? OFFSET ?');
    expect(db.binds[0]).toEqual(['cpu', 10, 10]);
    expect(db.sql[1]).toContain('SELECT COUNT(*)');
    expect(db.binds[1]).toEqual(['cpu']);
  });
});

describe('rate limit middleware', () => {
  it('lets requests through and increments the KV counter', async () => {
    const kv = new FakeKV({ 'rl:1.2.3.4': '5' });
    const db = new FakeProductsD1([], 0);
    const res = await app.request(
      '/api/products',
      { headers: { 'x-forwarded-for': '1.2.3.4' } },
      { DB: db.asD1, KV: kv.asKv }
    );

    expect(res.status).toBe(200);
    expect(kv.read('rl:1.2.3.4')).toBe('6');
  });

  it('returns 429 once the 100 req/min window is spent', async () => {
    const kv = new FakeKV({ 'rl:1.2.3.4': '100' });
    const db = new FakeProductsD1([], 0);
    const res = await app.request(
      '/api/products',
      { headers: { 'x-forwarded-for': '1.2.3.4' } },
      { DB: db.asD1, KV: kv.asKv }
    );

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'Rate limit exceeded' });
    expect(db.binds).toHaveLength(0);
  });
});

describe('rate limit client key', () => {
  async function send(headers: Record<string, string>): Promise<{ res: Response; kv: FakeKV }> {
    const kv = new FakeKV();
    const db = new FakeProductsD1([], 0);
    const res = await app.request('/api/products', { headers }, { DB: db.asD1, KV: kv.asKv });
    return { res, kv };
  }

  it('keys on the LAST hop of x-forwarded-for', async () => {
    const { res, kv } = await send({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(res.status).toBe(200);
    expect(kv.read('rl:5.6.7.8')).toBe('1');
    expect(kv.read('rl:1.2.3.4')).toBeUndefined();
    expect(kv.read('rl:1.2.3.4, 5.6.7.8')).toBeUndefined();
  });

  it('prefers cf-connecting-ip over x-forwarded-for', async () => {
    const { res, kv } = await send({
      'cf-connecting-ip': '9.9.9.9',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    expect(res.status).toBe(200);
    expect(kv.read('rl:9.9.9.9')).toBe('1');
    expect(kv.read('rl:5.6.7.8')).toBeUndefined();
  });

  it('uses the unknown bucket only when no client IP headers are present', async () => {
    const { res, kv } = await send({});
    expect(res.status).toBe(200);
    expect(kv.read('rl:unknown')).toBe('1');
  });

  it('ignores blank x-forwarded-for hops', async () => {
    const { res, kv } = await send({ 'x-forwarded-for': ' 1.2.3.4 ,, 5.6.7.8 ' });
    expect(res.status).toBe(200);
    expect(kv.read('rl:5.6.7.8')).toBe('1');
    expect(kv.read('rl:unknown')).toBeUndefined();
  });
});

describe('routing', () => {
  it('404s unknown paths', async () => {
    const res = await app.request('/nope', {}, { DB: null as unknown as D1Database, KV: new FakeKV().asKv });
    expect(res.status).toBe(404);
  });
});

describe('bucketKey', () => {
  it('prefers cf-connecting-ip, then the last XFF hop, then unknown', () => {
    expect(bucketKey('9.9.9.9', '1.1.1.1, 2.2.2.2')).toBe('9.9.9.9');
    expect(bucketKey(undefined, '1.1.1.1, 2.2.2.2')).toBe('2.2.2.2');
    expect(bucketKey(undefined, '1.1.1.1, 2.2.2.2,')).toBe('2.2.2.2');
    expect(bucketKey('   ', undefined)).toBe('unknown');
    expect(bucketKey(undefined, undefined)).toBe('unknown');
    expect(bucketKey(undefined, ' , , ')).toBe('unknown');
  });
});
