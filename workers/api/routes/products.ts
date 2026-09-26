// workers/api/routes/products.ts
import { Hono } from 'hono';
import type { Env } from '../env';
import { buildProductsQuery, type ProductsQueryInput } from '../lib/productsQuery';

export const productsRoute = new Hono<{ Bindings: Env }>();

productsRoute.get('/', async (c) => {
  const db = c.env.DB;
  const raw = c.req.query();
  const input: ProductsQueryInput = {
    category: raw.category,
    brand: raw.brand,
    tier: raw.tier,
    minPrice: raw.minPrice,
    maxPrice: raw.maxPrice,
    search: raw.search,
    sort: raw.sort,
    page: raw.page,
    limit: raw.limit,
  };
  const { where, params, order, page, limit, offset } = buildProductsQuery(input);

  const rows = await db
    .prepare(`SELECT * FROM products WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .bind(...params, limit, offset)
    .all();

  const total = await db
    .prepare(`SELECT COUNT(*) as cnt FROM products WHERE ${where}`)
    .bind(...params)
    .first<number>('cnt');

  return c.json({ data: rows.results, total: total ?? 0, page, limit });
});
