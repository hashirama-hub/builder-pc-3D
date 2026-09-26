// workers/api/routes/compat.test.ts
import { describe, it, expect } from 'vitest';
import { compatRoute } from './compat';
import type { BuildPart, CompatResult } from '../../../apps/web/types';

const cpu: BuildPart = {
  slot: 'cpu_slot',
  product: {
    id: 'cpu-1',
    category: 'cpu',
    brand: 'AMD',
    model: 'Ryzen 7 7800X3D',
    specs: { socket: 'AM5', ramType: 'DDR5', tdp: 120 },
    priceVnd: 9000000,
    priceUpdatedAt: '2026-01-01',
    stock: 5,
    imageUrl: '/img.jpg',
    model3dUrl: '/cpu.glb',
    rating: 4.8,
    tier: 'high',
  },
};

const wrongMb: BuildPart = {
  slot: 'mb_slot',
  product: {
    id: 'mb-1',
    category: 'mainboard',
    brand: 'Intel',
    model: 'B760',
    specs: { socket: 'LGA1700', ramType: 'DDR5' },
    priceVnd: 3500000,
    priceUpdatedAt: '2026-01-01',
    stock: 8,
    imageUrl: '/img.jpg',
    model3dUrl: '/mb.glb',
    rating: 4.2,
    tier: 'mid',
  },
};

async function post(body: string): Promise<Response> {
  return compatRoute.request('/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
}

describe('POST /api/compat', () => {
  it('returns ok for an empty parts list', async () => {
    const res = await post(JSON.stringify({ parts: [] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, warnings: [], errors: [] });
  });

  it('delegates to the shared compat engine', async () => {
    const res = await post(JSON.stringify({ parts: [cpu, wrongMb] }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as CompatResult;
    expect(json.ok).toBe(false);
    expect(json.errors[0]).toContain('AM5');
  });

  it('rejects a payload without a parts array', async () => {
    const res = await post(JSON.stringify({ nope: true }));
    expect(res.status).toBe(400);
  });

  it('rejects malformed part items with 400 instead of 500', async () => {
    const probes: unknown[] = [
      { parts: [{}] },
      { parts: [{ product: { category: 'psu' } }] },
      { parts: [{ product: null }] },
      { parts: [{ product: { category: 'cpu', model: 'i5' } }] },
      { parts: [{ product: { category: 'cpu', specs: { socket: 'AM5' } } }] },
      { parts: [{ product: { category: 42, model: 'i5', specs: {} } }] },
      { parts: [null] },
      { parts: 'cpu' },
    ];
    for (const probe of probes) {
      const res = await post(JSON.stringify(probe));
      expect(res.status, `probe: ${JSON.stringify(probe)}`).toBe(400);
      expect(await res.json()).toHaveProperty('error');
    }
  });

  it('still accepts a minimal well-formed part', async () => {
    const res = await post(
      JSON.stringify({
        parts: [
          { slot: 'psu_slot', product: { category: 'psu', model: 'RM750x', specs: { wattage: 750 } } },
        ],
      })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as CompatResult;
    expect(json.ok).toBe(true);
  });

  it('rejects a body that is not valid JSON', async () => {
    const res = await post('not-json{');
    expect(res.status).toBe(400);
  });
});
