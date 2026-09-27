# 🖥️ PC Builder 3D

Ứng dụng web xây dựng cấu hình PC 3D tương tác — kiểm tra tương thích tự động, giá thị trường VN (VND), lưu & chia sẻ build. Deploy trên Cloudflare (Pages + Workers + D1 + KV).

**Live:** https://pc-builder-3d.pages.dev · **API:** https://pc-builder-api.tuanlinh060300.workers.dev

![PC Builder 3D](docs/superpowers/specs/2026-09-27-pc-builder-3d-design.png)

## ✨ Tính năng

- **3D Builder** — case mở nắp, kéo-thả linh kiện vào slot (CPU/RAM/GPU/PSU/SSD), OrbitControls, hiệu ứng RGB fan, animation snap, fallback 2D khi không có WebGL
- **Compatibility Engine** — kiểm tra socket (LGA1700/AM5/AM4), RAM DDR4/DDR5, PSU wattage (TDP × 1.3), form factor case, GPU length, cooler height, số cổng SATA/M.2, cảnh báo bottleneck, badge ✅⚠️❌
- **46 linh kiện** seed với giá thị trường VN thực tế (2026) — filter theo danh mục/hãng/giá/sắp xếp/tìm kiếm fuzzy
- **Lưu & chia sẻ build** — link công khai `/build/<shortId>`, lịch sử localStorage, xuất JSON
- **Bảo mật** — Zod validation, rate-limit KV (100 req/phút, CF-Connecting-IP), CORS strict allowlist

## 🛠 Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | Next.js 14 (App Router, static export) · React 18 · TypeScript strict |
| 3D | Three.js · React Three Fiber · drei |
| State | Zustand (persist) · TanStack Query |
| UI | TailwindCSS · Framer Motion · lucide-react |
| API | Cloudflare Workers · Hono.js |
| Data | D1 (SQLite) · KV (rate limit) |
| Tests | Vitest (117 tests, TDD RED-GREEN) · coverage engine ~100% |

## 🚀 Dev

```bash
npm install                 # root workspace
npm test                    # vitest — toàn bộ 117 tests
npm run dev                 # Next.js :3000
npm run dev:api             # wrangler dev :8787
npm run seed                # seed D1 local
```

`.env.example` → `apps/web/.env` (NEXT_PUBLIC_API_URL).

## ☁️ Deploy

```bash
# API (đã cấu hình sẵn binding thật trong workers/api/wrangler.toml)
npm run deploy:api

# D1 schema + seed remote
npx wrangler d1 execute PC_BUILDER_DB --remote --file db/schema.sql
npx wrangler d1 execute PC_BUILDER_DB --remote --file db/seed.sql

# Frontend (static export → Pages)
cd apps/web && NEXT_PUBLIC_API_URL=<worker-url> npm run build
npx wrangler pages deploy out --project-name pc-builder-3d
```

CI/CD: `.github/workflows/deploy.yml` — thêm secret `CLOUDFLARE_API_TOKEN` + vars `API_URL`, `ACCOUNT_ID`.

## 📁 Cấu trúc

```
apps/web/          Next.js — app/, components/{3d,build,parts,layout,ui}, stores/, lib/, tests/
workers/api/       Hono Worker — routes/{products,builds,compat}, middleware/rateLimit, schemas
db/                schema.sql, seed.sql (46 parts)
docs/superpowers/  spec + implementation plan
```

## 📜 License

MIT
