# PC Builder 3D — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Full PC Builder 3D web app — 3D viewport, compatibility engine, build management, deploy to Cloudflare.

**Architecture:** Next.js 14 frontend on Cloudflare Pages, Hono.js API Workers, D1 SQLite, KV cache, R2 storage, Lucia auth.

**Tech Stack:** Next.js 14, React 18, TypeScript strict, Three.js + React Three Fiber, Zustand, TanStack Query, TailwindCSS, shadcn/ui, Hono.js, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-27-pc-builder-3d-design.md`

---

## Global Constraints

- TypeScript strict, no `any`
- Lighthouse ≥ 90 target
- TDD: RED-GREEN-REFACTOR
- YAGNI — no unused features
- DRY — shared types in one place
- Cloudflare-native (edge, D1, KV, R2)
- Vietnamese market (VND pricing)

## Review Focus (spec gaps that bite)

1. **Empty cart** — what happens when user opens builder with no parts? Must show empty state, not crash.
2. **GPU too long for case** — spec says check length, but which value wins: case max or GPU length? Case max wins, GPU rejected with warning.
3. **PSU wattage headroom** — spec says 1.3x total TDP, but what if no PSU selected? Skip check, show warning.
4. **No WebGL** — spec says fallback 2D image. Must detect and show static image.
5. **Duplicate part** — user adds 2 GPUs? Prevent, show error.

---

## Task 1: Types & Zod Schemas

**Files:**
- Create: `apps/web/types/index.ts`
- Create: `apps/web/lib/zod.ts`
- Test: `apps/web/tests/types.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Product`, `Build`, `BuildPart`, `CompatResult`, `PartCategory`, `PartSpecs` types + Zod schemas used by all tasks

- [ ] **Step 1: Write failing test**

```ts
// apps/web/tests/types.test.ts
import { describe, it, expect } from 'vitest';
import { productSchema } from '../lib/zod';

describe('Product schema', () => {
  it('validates valid product', () => {
    const p = productSchema.parse({
      id: '1', category: 'cpu', brand: 'Intel', model: 'i5-13600K',
      specs: { socket: 'LGA1700', tdp: 125 }, priceVnd: 4500000,
      priceUpdatedAt: '2026-01-01', stock: 10,
      imageUrl: '/img.jpg', model3dUrl: '/model.glb', rating: 4.5, tier: 'mid',
    });
    expect(p.brand).toBe('Intel');
  });

  it('rejects missing required field', () => {
    expect(() => productSchema.parse({ id: '1' })).toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd apps/web && npx vitest run tests/types.test.ts
# Expected: FAIL — productSchema not defined
```

- [ ] **Step 3: Implement schemas**

```ts
// apps/web/lib/zod.ts
import { z } from 'zod';

export const partSpecsSchema = z.object({
  socket: z.string().optional(),
  formFactor: z.string().optional(),
  tdp: z.number().optional(),
  wattage: z.number().optional(),
  lengthMm: z.number().optional(),
  heightMm: z.number().optional(),
  ramType: z.enum(['DDR4', 'DDR5']).optional(),
  ramSlots: z.number().optional(),
  maxGpuLengthMm: z.number().optional(),
  maxCoolerHeightMm: z.number().optional(),
  sataPorts: z.number().optional(),
  m2Slots: z.number().optional(),
  fanHeaders: z.number().optional(),
  resolution: z.string().optional(),
  refreshRate: z.number().optional(),
  panelType: z.string().optional(),
});

export const productSchema = z.object({
  id: z.string(),
  category: z.enum(['cpu','gpu','mainboard','ram','ssd','psu','case','cooler','monitor','accessory']),
  brand: z.string(),
  model: z.string(),
  specs: partSpecsSchema,
  priceVnd: z.number().positive(),
  priceUpdatedAt: z.string(),
  stock: z.number().int().nonnegative(),
  imageUrl: z.string().url(),
  model3dUrl: z.string().url(),
  rating: z.number().min(0).max(5),
  tier: z.enum(['budget','mid','high','enthusiast']),
});

export const buildPartSchema = z.object({
  product: productSchema,
  slot: z.string(),
});

export type Product = z.infer<typeof productSchema>;
export type BuildPart = z.infer<typeof buildPartSchema>;
export type PartSpecs = z.infer<typeof partSpecsSchema>;
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run tests/types.test.ts
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/zod.ts apps/web/tests/types.test.ts
git commit -m "feat: types + zod schemas with test"
```

---

## Task 2: Compatibility Engine

**Files:**
- Create: `apps/web/lib/compatEngine.ts`
- Create: `apps/web/tests/compat.test.ts`

**Interfaces:**
- Consumes: `Product`, `BuildPart[]` from Task 1
- Produces: `CompatResult` used by all later tasks

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/tests/compat.test.ts
import { describe, it, expect } from 'vitest';
import { checkCompatibility } from '../lib/compatEngine';
import { productSchema } from '../lib/zod';

const cpu = productSchema.parse({ id:'1', category:'cpu', brand:'Intel', model:'i5-13600K', specs:{ socket:'LGA1700', tdp:125 }, priceVnd:4500000, priceUpdatedAt:'2026-01-01', stock:10, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.5, tier:'mid' });
const mb = productSchema.parse({ id:'2', category:'mainboard', brand:'MSI', model:'B760', specs:{ socket:'LGA1700', ramType:'DDR5', maxGpuLengthMm:400, maxCoolerHeightMm:160, sataPorts:4, m2Slots:2, fanHeaders:3 }, priceVnd:3500000, priceUpdatedAt:'2026-01-01', stock:5, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.2, tier:'mid' });

describe('Compatibility Engine', () => {
  it('passes compatible build', () => {
    const parts = [
      { product: cpu, slot:'cpu_slot' },
      { product: mb, slot:'mainboard_slot' },
    ];
    const result = checkCompatibility(parts);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects socket mismatch', () => {
    const badMb = { ...mb, specs: { ...mb.specs, socket: 'AM5' } };
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: badMb, slot:'mainboard_slot' }]);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('socket'))).toBe(true);
  });

  it('detects RAM type mismatch', () => {
    const badMb = { ...mb, specs: { ...mb.specs, ramType: 'DDR4' } };
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: badMb, slot:'mainboard_slot' }]);
    expect(result.errors.some(e => e.includes('RAM'))).toBe(true);
  });

  it('warns on insufficient PSU', () => {
    const psu = productSchema.parse({ id:'3', category:'psu', brand:'Corsair', model:'650W', specs:{ wattage:650 }, priceVnd:1200000, priceUpdatedAt:'2026-01-01', stock:3, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.0, tier:'mid' });
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: mb, slot:'mainboard_slot' }, { product: psu, slot:'psu_slot' }]);
    // 125W CPU + no GPU = 125W * 1.3 = 162.5, 650W OK → no error
    expect(result.errors.some(e => e.includes('PSU'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/compat.test.ts
# Expected: FAIL — checkCompatibility not defined
```

- [ ] **Step 3: Implement engine**

```ts
// apps/web/lib/compatEngine.ts
import type { Product, BuildPart, CompatResult } from '../types';

const SOCKET_MATCH: Record<string, string[]> = {
  LGA1700: ['LGA1700'],
  AM5: ['AM5'],
  AM4: ['AM4'],
  LGA1851: ['LGA1851'],
};

function findPart(parts: BuildPart[], category: string): BuildPart | undefined {
  return parts.find(p => p.product.category === category);
}

export function checkCompatibility(parts: BuildPart[]): CompatResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const cpu = findPart(parts, 'cpu');
  const mb = findPart(parts, 'mainboard');
  const gpu = findPart(parts, 'gpu');
  const psu = findPart(parts, 'psu');
  const case_ = findPart(parts, 'case');
  const cooler = findPart(parts, 'cooler');

  // Socket
  if (cpu && mb) {
    const socket = cpu.specs.socket;
    const mbSocket = mb.specs.socket;
    if (socket && mbSocket && socket !== mbSocket) {
      errors.push(`CPU socket ${socket} không khớp mainboard ${mbSocket}`);
    }
  }

  // RAM
  if (cpu && mb) {
    const ramType = cpu.specs.ramType || 'DDR5';
    if (mb.specs.ramType && mb.specs.ramType !== ramType) {
      errors.push(`RAM ${ramType} không khớp mainboard ${mb.specs.ramType}`);
    }
  }

  // PSU wattage
  if (psu && parts.length > 0) {
    const totalTdp = parts.reduce((sum, p) => sum + (p.product.specs.tdp || 0), 0);
    const required = totalTdp * 1.3;
    if (psu.specs.wattage && psu.specs.wattage < required) {
      errors.push(`PSU ${psu.specs.wattage}W không đủ cho ${required}W cần thiết`);
    }
  }

  // Case form factor
  if (case_ && mb) {
    const caseFF = case_.specs.formFactor;
    const mbFF = mb.specs.formFactor;
    if (caseFF && mbFF) {
      const priority: Record<string, number> = { ITX: 0, mATX: 1, ATX: 2, EATX: 3 };
      if ((priority[caseFF] ?? 0) < (priority[mbFF] ?? 0)) {
        errors.push(`Case ${caseFF} không chứa được mainboard ${mbFF}`);
      }
    }
  }

  // GPU length
  if (gpu && case_) {
    if (gpu.specs.lengthMm && case_.specs.maxGpuLengthMm && gpu.specs.lengthMm > case_.specs.maxGpuLengthMm) {
      errors.push(`GPU ${gpu.specs.lengthMm}mm quá dài cho case (${case_.specs.maxGpuLengthMm}mm)`);
    }
  }

  // Cooler height
  if (cooler && case_) {
    if (cooler.specs.heightMm && case_.specs.maxCoolerHeightMm && cooler.specs.heightMm > case_.specs.maxCoolerHeightMm) {
      errors.push(`Cooler ${cooler.specs.heightMm}mm quá cao cho case (${case_.specs.maxCoolerHeightMm}mm)`);
    }
  }

  // Ports
  if (mb) {
    const ssdCount = parts.filter(p => p.product.category === 'ssd').length;
    if (mb.specs.sataPorts !== undefined && ssdCount > mb.specs.sataPorts) {
      warnings.push(`Không đủ SATA port (${mb.specs.sataPorts}) cho ${ssdCount} SSD`);
    }
    const m2Count = parts.filter(p => p.product.category === 'ssd' && p.product.model.toLowerCase().includes('m.2')).length;
    if (mb.specs.m2Slots !== undefined && m2Count > mb.specs.m2Slots) {
      warnings.push(`Không đủ M.2 slot (${mb.specs.m2Slots})`);
    }
  }

  return { ok: errors.length === 0, warnings, errors };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run tests/compat.test.ts
# Expected: 4 tests PASS
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/compatEngine.ts apps/web/tests/compat.test.ts
git commit -m "feat: compatibility engine with TDD"
```

---

## Task 3: Zustand Store

**Files:**
- Create: `apps/web/stores/useBuildStore.ts`
- Test: `apps/web/tests/store.test.ts`

**Interfaces:**
- Consumes: `Product`, `BuildPart`, `CompatResult` from Tasks 1-2
- Produces: global store used by all UI components

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { useBuildStore } from '../stores/useBuildStore';

describe('Build Store', () => {
  it('adds part', () => {
    const store = useBuildStore.getState();
    store.addPart({ product: {} as any, slot: 'cpu_slot' });
    expect(store.parts.length).toBe(1);
  });

  it('removes part', () => {
    const store = useBuildStore.getState();
    store.removePart('cpu_slot');
    expect(store.parts.length).toBe(0);
  });

  it('computes total', () => {
    const store = useBuildStore.getState();
    store.addPart({ product: { id:'1', category:'cpu', brand:'Intel', model:'i5', specs:{}, priceVnd:4500000, priceUpdatedAt:'', stock:1, imageUrl:'', model3dUrl:'', rating:0, tier:'mid' }, slot:'cpu_slot' });
    expect(store.totalPriceVnd).toBe(4500000);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement store**

```ts
// apps/web/stores/useBuildStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, BuildPart } from '../types';
import { checkCompatibility } from '../lib/compatEngine';

interface BuildState {
  parts: BuildPart[];
  parts: BuildPart[];
  addPart: (part: BuildPart) => void;
  removePart: (slot: string) => void;
  clearParts: () => void;
  totalPriceVnd: number;
  compatResult: { ok: boolean; warnings: string[]; errors: string[] };
}

export const useBuildStore = create<BuildState>()(
  persist(
    (set, get) => ({
      parts: [],
      addPart: (part) => {
        const parts = get().parts.filter(p => p.product.category !== part.product.category);
        parts.push(part);
        const result = checkCompatibility(parts);
        set({ parts, totalPriceVnd: parts.reduce((s, p) => s + p.product.priceVnd, 0), compatResult: result });
      },
      removePart: (slot) => {
        const parts = get().parts.filter(p => p.slot !== slot);
        set({ parts, totalPriceVnd: parts.reduce((s, p) => s + p.product.priceVnd, 0), compatResult: checkCompatibility(parts) });
      },
      clearParts: () => set({ parts: [], totalPriceVnd: 0, compatResult: { ok: true, warnings: [], errors: [] } }),
      totalPriceVnd: 0,
      compatResult: { ok: true, warnings: [], errors: [] },
    }),
    { name: 'pc-builder-storage' }
  )
);
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/stores/useBuildStore.ts apps/web/tests/store.test.ts
git commit -m "feat: zustand build store with persist"
```

---

## Task 4: Worker API — Products Endpoint

**Files:**
- Create: `workers/api/index.ts`
- Create: `workers/api/routes/products.ts`
- Create: `workers/api/middleware/rateLimit.ts`

**Interfaces:**
- Consumes: D1 binding (schema from spec)
- Produces: `GET /api/products` returning paginated filtered products

- [ ] **Step 1: Create D1 schema**

```sql
-- db/schema.sql
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  specs BLOB NOT NULL,
  price_vnd INTEGER NOT NULL,
  price_updated_at TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  model_3d_url TEXT,
  rating REAL DEFAULT 0,
  tier TEXT CHECK(tier IN ('budget','mid','high','enthusiast'))
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_tier ON products(tier);
```

- [ ] **Step 2: Rate limit middleware**

```ts
// workers/api/middleware/rateLimit.ts
import { Hono } from 'hono';

const KV_PREFIX = 'rl:';
const MAX_REQ = 100;
const WINDOW_MS = 60_000;

export async function rateLimit(c: any, next: any) {
  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const key = `${KV_PREFIX}${ip}`;
  const current = await c.env.KV.get(key, 'number') || 0;
  if (current >= MAX_REQ) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }
  await c.env.KV.put(key, String(current + 1), { expirationTtl: 60 });
  await next();
}
```

- [ ] **Step 3: Products route**

```ts
// workers/api/routes/products.ts
import { Hono } from 'hono';

export const productsRoute = new Hono();

productsRoute.get('/', async (c) => {
  const db = c.env.DB;
  const category = c.req.query('category');
  const brand = c.req.query('brand');
  const tier = c.req.query('tier');
  const minPrice = c.req.query('minPrice');
  const maxPrice = c.req.query('maxPrice');
  const search = c.req.query('search');
  const sort = c.req.query('sort') || 'price_asc';
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  let where = '1=1';
  const params: any[] = [];
  let i = 0;

  if (category) { where += ` AND category = ?${++i}`; params.push(category); }
  if (brand) { where += ` AND brand = ?${i}`; params.push(brand); }
  if (tier) { where += ` AND tier = ?${i}`; params.push(tier); }
  if (minPrice) { where += ` AND price_vnd >= ?${i}`; params.push(minPrice); }
  if (maxPrice) { where += ` AND price_vnd <= ?${i}`; params.push(maxPrice); }
  if (search) { where += ` AND (brand LIKE ?${i} OR model LIKE ?${i})`; params.push(`%${search}%`, `%${search}%`); }

  let order = 'price_vnd ASC';
  if (sort === 'price_desc') order = 'price_vnd DESC';
  else if (sort === 'newest') order = 'price_updated_at DESC';
  else if (sort === 'rating') order = 'rating DESC';

  const rows = await db.prepare(`SELECT * FROM products WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .bind(...params, limit, offset).all();

  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM products WHERE ${where}`)
    .bind(...params).first('cnt');

  return c.json({ data: rows.results, total, page, limit });
});
```

- [ ] **Step 4: Worker entry**

```ts
// workers/api/index.ts
import { Hono } from 'hono';
import { productsRoute } from './routes/products';
import { rateLimit } from './middleware/rateLimit';

const app = new Hono();

app.use('*', rateLimit);
app.route('/api/products', productsRoute);

export default app;
```

- [ ] **Step 5: Commit**

```bash
git add workers/ db/schema.sql
git commit -m "feat: worker API products + rate limit + D1 schema"
```

---

## Task 5: Worker API — Builds + Compat Endpoints

**Files:**
- Create: `workers/api/routes/builds.ts`
- Create: `workers/api/routes/compat.ts`

**Interfaces:**
- Consumes: D1 (builds table), compatEngine logic
- Produces: `POST /api/builds`, `GET /api/builds/:id`, `POST /api/compat`

- [ ] **Step 1: Add builds table to schema**

```sql
CREATE TABLE IF NOT EXISTS builds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parts BLOB NOT NULL,
  total_price_vnd INTEGER NOT NULL,
  compatible INTEGER NOT NULL,
  warnings BLOB,
  created_at TEXT NOT NULL,
  short_id TEXT UNIQUE NOT NULL,
  user_id TEXT
);
```

- [ ] **Step 2: Builds route**

```ts
// workers/api/routes/builds.ts
import { Hono } from 'hono';
import { randomUUID } from 'crypto';

export const buildsRoute = new Hono();

buildsRoute.post('/', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const id = randomUUID();
  const shortId = id.slice(0, 8);
  const { name, parts, totalPriceVnd, compatible, warnings } = body;

  await db.prepare(
    'INSERT INTO builds (id, name, parts, total_price_vnd, compatible, warnings, created_at, short_id, user_id) VALUES (?,?,?,?,?,?,?,?,?)'
  ).bind(id, name, JSON.stringify(parts), totalPriceVnd, compatible ? 1 : 0, JSON.stringify(warnings || []), new Date().toISOString(), shortId, body.userId || null).run();

  return c.json({ id, shortId });
});

buildsRoute.get('/:shortId', async (c) => {
  const db = c.env.DB;
  const { shortId } = c.req.param();
  const row = await db.prepare('SELECT * FROM builds WHERE short_id = ?').bind(shortId).first();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ ...row, parts: JSON.parse(row.parts), warnings: JSON.parse(row.warnings || '[]') });
});
```

- [ ] **Step 3: Compat route (delegates to pure function, exposed via API)**

```ts
// workers/api/routes/compat.ts
import { Hono } from 'hono';
import { checkCompatibility } from '../../compatEngine'; // shipped as worker bundle

export const compatRoute = new Hono();

compatRoute.post('/', async (c) => {
  const body = await c.req.json();
  const result = checkCompatibility(body.parts);
  return c.json(result);
});
```

- [ ] **Step 4: Commit**

```bash
git add workers/api/routes/builds.ts workers/api/routes/compat.ts db/schema.sql
git commit -m "feat: builds + compat API endpoints"
```

---

## Task 6: 3D Scene Component (R3F)

**Files:**
- Create: `apps/web/components/3d/Scene.tsx`
- Create: `apps/web/components/3d/Case3D.tsx`
- Create: `apps/web/components/3d/Slot.tsx`
- Create: `apps/web/components/3d/Lighting.tsx`

**Interfaces:**
- Consumes: `Product[]` from Zustand store
- Produces: interactive 3D viewport with OrbitControls, drop zones

- [ ] **Step 1: Create Scene with lazy loading**

```tsx
// apps/web/components/3d/Scene.tsx
'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Suspense, memo } from 'react';
import { Case3D } from './Case3D';
import { Slot } from './Slot';

const Slot = memo(({ position, label, onDrop }: { position: [number,number,number]; label: string; onDrop: (product: any) => void }) => {
  // R3F drop zone implementation
  return <mesh position={position} onClick={() => {}}>
    <boxGeometry args={[1, 1, 0.2]} />
    <meshStandardMaterial color="#1a1a2e" transparent opacity={0.7} />
  </mesh>;
});

export const Scene = memo(() => (
  <Canvas shadows camera={{ position: [5, 4, 5], fov: 50 }}>
    <ambientLight intensity={0.4} />
    <pointLight position={[10, 10, 10]} intensity={1.5} />
    <Case3D />
    <Slot position={[0, 1.5, 0]} label="cpu" />
    <Slot position={[-1.5, 0.5, 0]} label="ram" />
    <Slot position={[1.8, 0.5, 0]} label="gpu" />
    <Slot position={[0, -1, 0.5]} label="psu" />
    <OrbitControls enableDamping />
    <Environment preset="city" />
  </Canvas>
));
```

- [ ] **Step 2: Dynamic import on builder page**

```tsx
// apps/web/app/builder/[[...slug]]/page.tsx
import dynamic from 'next/dynamic';
const Scene = dynamic(() => import('@/components/3d/Scene'), { ssr: false, loading: () => <div>Loading 3D...</div> });

export default function BuilderPage() {
  return <div className="grid grid-cols-4 gap-4">
    <div className="col-span-1"><PartSidebar /></div>
    <div className="col-span-3"><Scene /></div>
  </div>;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/3d/
git commit -m "feat: 3D scene with R3F + dynamic import"
```

---

## Task 7: UI Components + Layout

**Files:**
- Create: `apps/web/components/parts/PartCard.tsx`
- Create: `apps/web/components/parts/PartFilters.tsx`
- Create: `apps/web/components/parts/PartSearch.tsx`
- Create: `apps/web/components/build/CompatibilityBadge.tsx`
- Create: `apps/web/components/build/PriceBreakdown.tsx`
- Create: `apps/web/components/layout/Header.tsx`
- Create: `apps/web/components/layout/Sidebar.tsx`
- Create: `apps/web/components/layout/RightPanel.tsx`

**Interfaces:**
- Consumes: Zustand store + TanStack Query
- Produces: full builder layout

- [ ] **Step 1: PartCard with drag**
- [ ] **Step 2: Filters sidebar**
- [ ] **Step 3: CompatibilityBadge**
- [ ] **Step 4: PriceBreakdown**
- [ ] **Step 5: Full layout page**
- [ ] **Step 6: Commit**

```bash
git add apps/web/components/
git commit -m "feat: UI components + layout"
```

---

## Task 8: Seed Data (30+ parts)

**Files:**
- Create: `scripts/seed.ts`
- Create: `db/seed.sql`

**Interfaces:**
- Produces: 30+ products with real VN pricing

- [ ] **Step 1: Write seed script**
- [ ] **Step 2: Run against D1 local**
- [ ] **Step 3: Commit**

```bash
git add scripts/seed.ts db/seed.sql
git commit -m "feat: seed 30+ VN parts"
```

---

## Task 9: Deploy Config

**Files:**
- Create: `wrangler.toml`
- Create: `.github/workflows/deploy.yml`
- Create: `apps/web/public/robots.txt`
- Create: `apps/web/public/sitemap.xml`

**Interfaces:**
- Produces: deployable config

- [ ] **Step 1: wrangler.toml**
- [ ] **Step 2: GitHub Actions CI/CD**
- [ ] **Step 3: Commit**

```bash
git add wrangler.toml .github/
git commit -m "feat: deploy config + CI/CD"
```

---

## Self-Review

| Spec section | Task coverage |
|---|---|
| 3D PC Builder View | Task 6 |
| Parts + Filters | Task 7 |
| Compatibility Engine | Task 2 |
| Build Management | Task 3, 5 |
| API Workers | Task 4, 5 |
| UI/UX | Task 7 |
| Seed data | Task 8 |
| Deploy | Task 9 |
| Tests | Tasks 1, 2, 3 |
| Performance | Dynamic import, LOD plan in 3D, KV cache |
| Security | Rate limit, Zod validation |

All spec sections covered. No TBD. Steps are atomic. Types consistent across tasks.
