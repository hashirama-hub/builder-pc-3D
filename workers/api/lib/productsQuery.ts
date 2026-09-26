// workers/api/lib/productsQuery.ts
// Pure query builder for GET /api/products — no I/O, unit tested.

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const DEFAULT_PAGE = 1;

/** Whitelisted sort keys → safe ORDER BY fragments (never interpolate user input). */
const SORT_ORDERS: Readonly<Record<string, string>> = {
  price_asc: 'price_vnd ASC',
  price_desc: 'price_vnd DESC',
  newest: 'price_updated_at DESC',
  rating: 'rating DESC',
};

/** Raw query-string params for the products endpoint (all values are strings). */
export interface ProductsQueryInput {
  category?: string;
  brand?: string;
  tier?: string;
  minPrice?: string;
  maxPrice?: string;
  search?: string;
  sort?: string;
  page?: string;
  limit?: string;
}

export interface ProductsQuery {
  /** `WHERE` clause without the `WHERE` keyword, e.g. `1=1 AND category = ?1`. */
  where: string;
  /** Positional params matching the numbered placeholders in `where`, in order. */
  params: (string | number)[];
  /** Whitelisted `ORDER BY` fragment. */
  order: string;
  page: number;
  limit: number;
  offset: number;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const floored = Math.floor(n);
  return floored >= 1 ? floored : fallback;
}

function parsePrice(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

export function buildProductsQuery(input: ProductsQueryInput): ProductsQuery {
  let where = '1=1';
  const params: (string | number)[] = [];
  let i = 0;

  if (input.category) {
    where += ` AND category = ?${++i}`;
    params.push(input.category);
  }
  if (input.brand) {
    where += ` AND brand = ?${++i}`;
    params.push(input.brand);
  }
  if (input.tier) {
    where += ` AND tier = ?${++i}`;
    params.push(input.tier);
  }

  const minPrice = parsePrice(input.minPrice);
  if (minPrice !== undefined) {
    where += ` AND price_vnd >= ?${++i}`;
    params.push(minPrice);
  }
  const maxPrice = parsePrice(input.maxPrice);
  if (maxPrice !== undefined) {
    where += ` AND price_vnd <= ?${++i}`;
    params.push(maxPrice);
  }

  if (input.search) {
    const like = `%${input.search}%`;
    where += ` AND (brand LIKE ?${++i} OR model LIKE ?${++i})`;
    params.push(like, like);
  }

  const order = SORT_ORDERS[input.sort ?? 'price_asc'] ?? SORT_ORDERS.price_asc;
  const page = parsePositiveInt(input.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInt(input.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const offset = (page - 1) * limit;

  return { where, params, order, page, limit, offset };
}
