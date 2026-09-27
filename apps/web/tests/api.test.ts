import { describe, it, expect } from 'vitest';
import {
  mapRowToProduct,
  mapRowToBuild,
  mapCategoryToSlot,
  formatVnd,
  fetchProducts,
  fetchBuild,
  saveBuild,
  ApiError,
  CATEGORY_LABELS,
  type RawProductRow,
  type RawBuildRow,
} from '../lib/api';
import type { BuildPart, Product } from '../types';

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

const sharedProduct: Product = {
  id: 'cpu-1',
  category: 'cpu',
  brand: 'AMD',
  model: 'Ryzen 7 7800X3D',
  specs: { socket: 'AM5', tdp: 120 },
  priceVnd: 9000000,
  priceUpdatedAt: '2026-09-01T00:00:00Z',
  stock: 5,
  imageUrl: '/img/cpu.png',
  model3dUrl: '/models/cpu.glb',
  rating: 4.8,
  tier: 'high',
};

const sharedParts: BuildPart[] = [{ product: sharedProduct, slot: 'cpu_slot' }];

const buildRow: RawBuildRow = {
  id: 'b-1',
  name: 'Build của tôi',
  parts: JSON.stringify(sharedParts),
  total_price_vnd: 9000000,
  compatible: 1,
  warnings: JSON.stringify(['Chưa chọn PSU — chưa kiểm tra tổng công suất']),
  created_at: '2026-09-27T00:00:00Z',
  short_id: 'abcd1234',
  user_id: null,
};

describe('mapRowToBuild', () => {
  it('maps snake_case row fields to Build camelCase', () => {
    const build = mapRowToBuild(buildRow);
    expect(build.id).toBe('b-1');
    expect(build.name).toBe('Build của tôi');
    expect(build.shortId).toBe('abcd1234');
    expect(build.totalPriceVnd).toBe(9000000);
    expect(build.createdAt).toBe('2026-09-27T00:00:00Z');
    expect(build.compatible).toBe(true);
    expect(build.warnings).toEqual(['Chưa chọn PSU — chưa kiểm tra tổng công suất']);
    expect(build.userId).toBeUndefined();
  });

  it('JSON-parses parts and warnings', () => {
    const build = mapRowToBuild(buildRow);
    expect(build.parts).toHaveLength(1);
    expect(build.parts[0].slot).toBe('cpu_slot');
    expect(build.parts[0].product.id).toBe('cpu-1');
    expect(build.parts[0].product.priceVnd).toBe(9000000);
  });

  it('accepts parts and warnings the worker already parsed', () => {
    const build = mapRowToBuild({ ...buildRow, parts: sharedParts, warnings: ['a'] });
    expect(build.parts).toEqual(sharedParts);
    expect(build.warnings).toEqual(['a']);
  });

  it('treats compatible 0 as false and defaults missing warnings/userId', () => {
    const build = mapRowToBuild({ ...buildRow, compatible: 0, warnings: null, user_id: 'u-9' });
    expect(build.compatible).toBe(false);
    expect(build.warnings).toEqual([]);
    expect(build.userId).toBe('u-9');
  });

  it('falls back to an empty parts list on invalid JSON', () => {
    expect(mapRowToBuild({ ...buildRow, parts: 'not-json' }).parts).toEqual([]);
  });
});

describe('saveBuild', () => {
  const payload = {
    name: 'Build của tôi',
    parts: sharedParts,
    totalPriceVnd: 9000000,
    compatible: true,
    warnings: ['Chưa chọn PSU — chưa kiểm tra tổng công suất'],
  };

  it('POSTs the build to /api/builds and returns {id, shortId}', async () => {
    let url = '';
    let init: RequestInit | undefined;
    const fetchImpl = async (input: string, requestInit?: RequestInit): Promise<Response> => {
      url = input;
      init = requestInit;
      return new Response(JSON.stringify({ id: 'b-1', shortId: 'abcd1234' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const saved = await saveBuild(payload, { fetchImpl });

    expect(url).toBe('http://localhost:8787/api/builds');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'content-type': 'application/json' });
    const body = JSON.parse(String(init?.body)) as unknown;
    expect(body).toEqual(payload);
    expect(saved).toEqual({ id: 'b-1', shortId: 'abcd1234' });
  });

  it('honours an explicit baseUrl', async () => {
    let url = '';
    const fetchImpl = async (input: string): Promise<Response> => {
      url = input;
      return new Response(JSON.stringify({ id: 'b-1', shortId: 'abcd1234' }), { status: 200 });
    };
    await saveBuild(payload, { fetchImpl, baseUrl: 'https://api.example.com/' });
    expect(url).toBe('https://api.example.com/api/builds');
  });

  it('rejects with an ApiError carrying the HTTP status', async () => {
    const fetchImpl = async (): Promise<Response> =>
      new Response(JSON.stringify({ error: 'Invalid build payload' }), { status: 400 });
    const error: unknown = await saveBuild(payload, { fetchImpl }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as Error).message).toMatch(/400/);
  });
});

describe('fetchBuild', () => {
  it('GETs /api/builds/:shortId and maps the row', async () => {
    let url = '';
    const fetchImpl = async (input: string): Promise<Response> => {
      url = input;
      return new Response(JSON.stringify({ ...buildRow, parts: sharedParts, warnings: ['w'] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const build = await fetchBuild('abcd1234', { fetchImpl });

    expect(url).toBe('http://localhost:8787/api/builds/abcd1234');
    expect(build.shortId).toBe('abcd1234');
    expect(build.name).toBe('Build của tôi');
    expect(build.totalPriceVnd).toBe(9000000);
    expect(build.warnings).toEqual(['w']);
  });

  it('throws an ApiError with status 404 for an unknown short id', async () => {
    const fetchImpl = async (): Promise<Response> =>
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    const error: unknown = await fetchBuild('nope', { fetchImpl }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });
});
