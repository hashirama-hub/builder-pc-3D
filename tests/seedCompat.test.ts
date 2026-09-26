// tests/seedCompat.test.ts
// Proves db/seed.sql is compatibility-engine friendly: parses the seed rows and
// runs hand-picked combos through apps/web/lib/compatEngine — the exact engine
// the /api/compat worker route calls. Hermetic: reads db/seed.sql as text, so
// it needs no local D1 state and runs on a fresh CI checkout.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkCompatibility } from '../apps/web/lib/compatEngine';
import type { BuildPart, PartCategory, PartSpecs, Product } from '../apps/web/types';

const seedSql = readFileSync(fileURLToPath(new URL('../db/seed.sql', import.meta.url)), 'utf8');

/** Matches one VALUES tuple: 12 columns, specs JSON in single quotes (no quotes inside). */
const ROW_RE =
  /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']*)',\s*(\d+),\s*'([^']+)',\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*([\d.]+),\s*'([^']+)'\)/g;

function parseSeed(sql: string): Product[] {
  const products: Product[] = [];
  for (const m of sql.matchAll(ROW_RE)) {
    products.push({
      id: m[1],
      category: m[2] as PartCategory,
      brand: m[3],
      model: m[4],
      specs: JSON.parse(m[5]) as PartSpecs,
      priceVnd: Number(m[6]),
      priceUpdatedAt: m[7],
      stock: Number(m[8]),
      imageUrl: m[9],
      model3dUrl: m[10],
      rating: Number(m[11]),
      tier: m[12] as Product['tier'],
    });
  }
  return products;
}

const products = parseSeed(seedSql);
const byId = new Map(products.map((p) => [p.id, p]));

function part(id: string): BuildPart {
  const product = byId.get(id);
  if (!product) throw new Error(`seed row missing: ${id}`);
  return { product, slot: 'test_slot' };
}

describe('db/seed.sql', () => {
  it('has 30+ parts covering every category with valid rows', () => {
    expect(products.length).toBeGreaterThanOrEqual(30);
    const categories = new Set(products.map((p) => p.category));
    const expected: PartCategory[] = [
      'cpu', 'gpu', 'mainboard', 'ram', 'ssd', 'psu', 'case', 'cooler', 'monitor', 'accessory',
    ];
    for (const category of expected) expect(categories).toContain(category);

    for (const p of products) {
      expect(p.priceVnd).toBeGreaterThan(0);
      expect(['budget', 'mid', 'high', 'enthusiast']).toContain(p.tier);
      expect(p.rating).toBeGreaterThanOrEqual(0);
      expect(p.rating).toBeLessThanOrEqual(5);
      expect(p.imageUrl.startsWith('/img/')).toBe(true);
      expect(p.model3dUrl.startsWith('/models/')).toBe(true);
      expect(p.specs).toBeTypeOf('object');
    }
  });

  it('includes at least one fully compatible combo (budget Intel build)', () => {
    const result = checkCompatibility([
      part('cpu-intel-i5-13600k'),
      part('mb-gigabyte-b760m-aorus'),
      part('gpu-asus-rtx4060'),
      part('ram-kingston-fury-16-ddr5'),
      part('ssd-kingston-nv2-1tb'),
      part('psu-corsair-cv650'),
      part('case-asus-ap201'),
      part('cooler-deepcool-ak400'),
    ]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('includes a second fully compatible combo (enthusiast AMD 4090 build)', () => {
    const result = checkCompatibility([
      part('cpu-amd-r7-7800x3d'),
      part('mb-asus-x670e-strix'),
      part('gpu-asus-rtx4090'),
      part('ram-corsair-veng-32-ddr5'),
      part('ssd-samsung-990pro-1tb'),
      part('psu-corsair-hx1000'),
      part('case-asus-gt501'),
      part('cooler-corsair-h150i'),
    ]);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('flags an AM4 CPU on an AM5 board (socket + RAM mismatch)', () => {
    const result = checkCompatibility([
      part('cpu-amd-r5-5600'),
      part('mb-msi-b650-tomahawk'),
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('flags an undersized PSU for a 4090 + i9 build (seed TDP math)', () => {
    const result = checkCompatibility([
      part('cpu-intel-i9-14900k'),
      part('mb-asus-x670e-strix'), // AM5 board: also a socket error, PSU error must be present too
      part('gpu-asus-rtx4090'),
      part('psu-corsair-cv650'), // 650W < sum(tdp) * 1.3
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('650W'))).toBe(true);
  });

  it('flags a GPU longer than the case clearance', () => {
    const result = checkCompatibility([
      part('gpu-asus-rtx4090'), // 348mm
      part('case-deepcool-ch160'), // 305mm max
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('348mm'))).toBe(true);
  });
});
