import { describe, it, expect } from 'vitest';
import {
  mapRowToProduct,
  mapCategoryToSlot,
  formatVnd,
  fetchProducts,
  CATEGORY_LABELS,
  type RawProductRow,
} from '../lib/api';

const row: RawProductRow = {
  id: 'cpu-1',
  category: 'cpu',
  brand: 'AMD',
  model: 'Ryzen 7 7800X3D',
  specs: '{"socket":"AM5","tdp":120,"ramType":"DDR5"}',
  price_vnd: 9000000,
  price_updated_at: '2026-09-01T00:00:00Z',
  stock: 5,
  image_url: '/img/cpu.png',
  model_3d_url: '/models/cpu.glb',
  rating: 4.8,
  tier: 'high',
};

describe('mapRowToProduct', () => {
  it('maps snake_case row fields to Product camelCase', () => {
    const p = mapRowToProduct(row);
    expect(p.id).toBe('cpu-1');
    expect(p.category).toBe('cpu');
    expect(p.brand).toBe('AMD');
    expect(p.model).toBe('Ryzen 7 7800X3D');
    expect(p.priceVnd).toBe(9000000);
    expect(p.priceUpdatedAt).toBe('2026-09-01T00:00:00Z');
    expect(p.stock).toBe(5);
    expect(p.imageUrl).toBe('/img/cpu.png');
    expect(p.model3dUrl).toBe('/models/cpu.glb');
    expect(p.rating).toBe(4.8);
    expect(p.tier).toBe('high');
  });

  it('JSON-parses the specs string', () => {
    const p = mapRowToProduct(row);
    expect(p.specs.socket).toBe('AM5');
    expect(p.specs.tdp).toBe(120);
    expect(p.specs.ramType).toBe('DDR5');
  });

  it('accepts specs already delivered as an object', () => {
    const p = mapRowToProduct({ ...row, specs: { socket: 'LGA1700' } as unknown as string });
    expect(p.specs.socket).toBe('LGA1700');
  });

  it('falls back to empty specs on invalid JSON', () => {
    const p = mapRowToProduct({ ...row, specs: 'not-json' });
    expect(p.specs).toEqual({});
  });

  it('normalizes nullable model_3d_url and rating to safe defaults', () => {
    const p = mapRowToProduct({
      ...row,
      model_3d_url: null,
      rating: null,
    });
    expect(p.model3dUrl).toBe('');
    expect(p.rating).toBe(0);
  });

  it('keeps a known tier and falls back to mid for an unknown one', () => {
    expect(mapRowToProduct(row).tier).toBe('high');
    expect(mapRowToProduct({ ...row, tier: 'mid' }).tier).toBe('mid');
    expect(mapRowToProduct({ ...row, tier: 'ultra' }).tier).toBe('mid');
  });

  it('maps an unknown category to accessory instead of leaking a bad union', () => {
    expect(mapRowToProduct({ ...row, category: 'quantum' }).category).toBe('accessory');
    expect(mapRowToProduct({ ...row, category: 'monitor' }).category).toBe('monitor');
  });
});

describe('mapCategoryToSlot', () => {
  it('maps every buildable category to its slot id', () => {
    expect(mapCategoryToSlot('cpu')).toBe('cpu_slot');
    expect(mapCategoryToSlot('gpu')).toBe('gpu_slot');
    expect(mapCategoryToSlot('mainboard')).toBe('mainboard_slot');
    expect(mapCategoryToSlot('ram')).toBe('ram_slot');
    expect(mapCategoryToSlot('ssd')).toBe('ssd_slot');
    expect(mapCategoryToSlot('psu')).toBe('psu_slot');
    expect(mapCategoryToSlot('cooler')).toBe('cooler_slot');
  });

  it('uses a generic <category>_slot fallback for the rest', () => {
    expect(mapCategoryToSlot('case')).toBe('case_slot');
    expect(mapCategoryToSlot('monitor')).toBe('monitor_slot');
    expect(mapCategoryToSlot('accessory')).toBe('accessory_slot');
  });
});

describe('formatVnd', () => {
  it('formats with vi-VN grouping and the ₫ suffix', () => {
    expect(formatVnd(1500000)).toBe('1.500.000₫');
    expect(formatVnd(0)).toBe('0₫');
  });

  it('rounds fractional input', () => {
    expect(formatVnd(9999.6)).toBe('10.000₫');
  });
});

describe('CATEGORY_LABELS', () => {
  it('has a Vietnamese label for every category used in the breakdown', () => {
    expect(CATEGORY_LABELS.gpu).toBe('VGA');
    expect(CATEGORY_LABELS.psu).toBe('Nguồn');
    expect(CATEGORY_LABELS.cooler).toBe('Tản nhiệt');
    expect(CATEGORY_LABELS.mainboard).toBe('Mainboard');
  });
});

describe('fetchProducts', () => {
  it('hits /api/products with filters and maps rows to Product[]', async () => {
    let captured = '';
    const fetchImpl = async (input: string): Promise<Response> => {
      captured = input;
      return new Response(JSON.stringify({ data: [row], total: 1, page: 2, limit: 12 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await fetchProducts(
      { category: 'cpu', brand: 'AMD', search: 'ryzen', sort: 'price_asc', page: 2, limit: 12 },
      { fetchImpl }
    );

    expect(captured).toBe(
      'http://localhost:8787/api/products?category=cpu&brand=AMD&search=ryzen&sort=price_asc&page=2&limit=12'
    );
    expect(res.total).toBe(1);
    expect(res.page).toBe(2);
    expect(res.limit).toBe(12);
    expect(res.products).toHaveLength(1);
    expect(res.products[0].priceVnd).toBe(9000000);
    expect(res.products[0].specs.socket).toBe('AM5');
  });

  it('honours an explicit baseUrl', async () => {
    let captured = '';
    const fetchImpl = async (input: string): Promise<Response> => {
      captured = input;
      return new Response(JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }), { status: 200 });
    };
    await fetchProducts({}, { fetchImpl, baseUrl: 'https://api.example.com/' });
    expect(captured).toBe('https://api.example.com/api/products');
  });

  it('omits empty filters from the query string', async () => {
    let captured = '';
    const fetchImpl = async (input: string): Promise<Response> => {
      captured = input;
      return new Response(JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }), { status: 200 });
    };
    await fetchProducts({ category: '', brand: undefined, minPrice: undefined }, { fetchImpl });
    expect(captured).toBe('http://localhost:8787/api/products');
  });

  it('rejects with the HTTP status when the API is down', async () => {
    const fetchImpl = async (): Promise<Response> => new Response('boom', { status: 503 });
    await expect(fetchProducts({}, { fetchImpl })).rejects.toThrow(/503/);
  });
});
