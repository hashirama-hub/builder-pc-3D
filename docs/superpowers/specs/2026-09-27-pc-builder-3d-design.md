# PC Builder 3D — Design Spec

## Intent

Web app cho phép user chọn linh kiện PC, xem dưới dạng 3D tương tác, kiểm tra tương thích tự động, tính giá VNĐ, lưu/share build. Deploy Cloudflare Pages + Workers.

## Success Criteria

- Lighthouse ≥ 90 (Perf, A11y, Best Practices, SEO)
- 3D viewport mượt 60fps trên desktop, 30fps mobile
- Compatibility engine test coverage ≥ 90%
- Build flow complete: select → validate → save → share

## Architecture

```
Cloudflare Pages (Next.js 14) ── Cloudflare Workers (Hono)
       │                                │
  Zustand + R3F                     D1 + KV + R2
  TanStack Query                     Lucia Auth
```

## Components

### 3D Scene (React Three Fiber)
- `Scene.tsx` — Canvas, OrbitControls, Lighting, Grid
- `Case3D.tsx` — Low-poly case mở nắp, RGB fan
- `Slot.tsx` — Drop zone cho từng loại linh kiện
- `PartDraggable.tsx` — Draggable from sidebar

### Compatibility Engine (pure functions)
- `compatEngine.ts` — socket match, DDR match, wattage, dimensions
- `bottleneck.ts` — CPU-GPU tier comparison
- Returns: `{ ok, warnings, errors }`

### State (Zustand)
- `useBuildStore` — add/remove part, compute total, validate
- Persist: localStorage (guest) + D1 (user)

### API Workers (Hono)
- `GET /api/products` — list with filters, KV cache
- `POST /api/builds` — save build
- `GET /api/builds/:id` — load build
- `POST /api/compat` — check compatibility
- `POST /api/ai-suggest` — budget-based suggestion

### UI
- Header, Sidebar (filters), Builder (3D + summary), BuildList

## Data Model

### Product (D1)
```sql
products(id, category, brand, model, specs JSON, price_vnd,
         price_updated_at, stock, image_url, model_3d_url,
         rating, tier)
```

### Build (D1)
```sql
builds(id, name, parts JSON, total_price_vnd, compatible,
       warnings JSON, created_at, short_id, user_id)
```

## Performance

- Dynamic import 3D scene (`ssr: false`)
- LOD 2 levels for models
- KV stale-while-revalidate for prices
- R2 CDN for assets
- Zustand selectors for minimal re-renders
- Edge caching headers

## Security

- Zod validation on Worker API
- Rate limit via KV (100 req/min per IP)
- CORS strict origin
- Session auth Lucia

## Testing

- Vitest: compatibility engine (RED-GREEN-REFACTOR)
- Playwright: e2e build flow

## Scoping

Phase 1 (MVP): compatibility engine + basic 3D + build CRUD
Phase 2: AI suggestions + scraper + compare
Phase 3: advanced 3D (exploded view, first person)
