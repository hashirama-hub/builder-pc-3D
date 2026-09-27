// apps/web/lib/api.ts
// Typed client for the Cloudflare Worker products API.
// The API returns raw D1 rows (snake_case, `specs` as a JSON/BLOB string);
// these helpers map them into the camelCase `Product` domain type.
import type { Build, BuildPart, PartCategory, PartSpecs, Product } from '../types';

/** Every category the domain type allows. */
export const PART_CATEGORIES = [
  'cpu',
  'gpu',
  'mainboard',
  'ram',
  'ssd',
  'psu',
  'case',
  'cooler',
  'monitor',
  'accessory',
] as const;

type ProductTier = Product['tier'];

const PRODUCT_TIERS: readonly ProductTier[] = ['budget', 'mid', 'high', 'enthusiast'];

/** Vietnamese labels shown in the build summary / filters. */
export const CATEGORY_LABELS: Record<PartCategory, string> = {
  cpu: 'CPU',
  gpu: 'VGA',
  mainboard: 'Mainboard',
  ram: 'RAM',
  ssd: 'SSD',
  psu: 'Nguồn',
  case: 'Case',
  cooler: 'Tản nhiệt',
  monitor: 'Màn hình',
  accessory: 'Phụ kiện',
};

/** Raw shape of a `products` row coming back from `GET /api/products`. */
export interface RawProductRow {
  id: string;
  category: string;
  brand: string;
  model: string;
  specs: string | object | null;
  price_vnd: number;
  price_updated_at: string;
  stock: number;
  image_url: string;
  model_3d_url: string | null;
  rating: number | null;
  tier: string;
}

function asPartCategory(value: string): PartCategory {
  return (PART_CATEGORIES as readonly string[]).includes(value)
    ? (value as PartCategory)
    : 'accessory';
}

function asTier(value: string | null | undefined): ProductTier {
  return PRODUCT_TIERS.includes(value as ProductTier) ? (value as ProductTier) : 'mid';
}

function parseSpecs(raw: string | object | null | undefined): PartSpecs {
  if (raw === null || raw === undefined) return {};
  if (typeof raw === 'object') return raw as PartSpecs;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as PartSpecs;
    }
    return {};
  } catch {
    return {};
  }
}

/** Map one snake_case API row into a `Product`. Never throws on bad optional fields. */
export function mapRowToProduct(row: RawProductRow): Product {
  return {
    id: row.id,
    category: asPartCategory(row.category),
    brand: row.brand,
    model: row.model,
    specs: parseSpecs(row.specs),
    priceVnd: Number(row.price_vnd ?? 0),
    priceUpdatedAt: row.price_updated_at ?? '',
    stock: Number(row.stock ?? 0),
    imageUrl: row.image_url ?? '',
    model3dUrl: row.model_3d_url ?? '',
    rating: row.rating ?? 0,
    tier: asTier(row.tier),
  };
}

/** Category → 3D drop slot id (one slot per category, matching the store). */
export function mapCategoryToSlot(category: PartCategory): string {
  switch (category) {
    case 'cpu':
      return 'cpu_slot';
    case 'gpu':
      return 'gpu_slot';
    case 'mainboard':
      return 'mainboard_slot';
    case 'ram':
      return 'ram_slot';
    case 'ssd':
      return 'ssd_slot';
    case 'psu':
      return 'psu_slot';
    case 'cooler':
      return 'cooler_slot';
    default:
      return `${category}_slot`;
  }
}

const vndFormatter = new Intl.NumberFormat('vi-VN');

/** 1500000 → "1.500.000₫" */
export function formatVnd(value: number): string {
  return `${vndFormatter.format(Math.round(value))}₫`;
}

export interface ProductQueryParams {
  category?: string;
  brand?: string;
  tier?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export interface FetchProductsOptions {
  /** Overrides `NEXT_PUBLIC_API_URL` (tests / proxies). */
  baseUrl?: string;
  fetchImpl?: Fetcher;
}

export const DEFAULT_API_BASE = 'http://localhost:8787';

function resolveBaseUrl(explicit?: string): string {
  const candidate = explicit ?? process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE;
  return candidate.replace(/\/+$/, '');
}

/** Build `GET /api/products?...` — empty filters are omitted. */
export function buildProductsUrl(params: ProductQueryParams, baseUrl?: string): string {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.brand) query.set('brand', params.brand);
  if (params.tier) query.set('tier', params.tier);
  if (params.minPrice !== undefined) query.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice));
  if (params.search) query.set('search', params.search);
  if (params.sort) query.set('sort', params.sort);
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  const qs = query.toString();
  return `${resolveBaseUrl(baseUrl)}/api/products${qs ? `?${qs}` : ''}`;
}

interface ProductsPayload {
  data?: RawProductRow[];
  total?: number;
  page?: number;
  limit?: number;
}

/** Fetch + map a page of products. Throws on non-2xx so callers can show a fallback. */
export async function fetchProducts(
  params: ProductQueryParams,
  options: FetchProductsOptions = {}
): Promise<ProductsResponse> {
  const impl: Fetcher = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const res = await impl(buildProductsUrl(params, options.baseUrl));
  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}`);
  }
  const payload = (await res.json()) as ProductsPayload;
  return {
    products: (payload.data ?? []).map(mapRowToProduct),
    total: payload.total ?? 0,
    page: payload.page ?? params.page ?? 1,
    limit: payload.limit ?? params.limit ?? 20,
  };
}

/** Error carrying the HTTP status, so callers can branch on 404 vs. outage. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`API request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Raw shape of a `builds` row coming back from `GET /api/builds/:shortId`. */
export interface RawBuildRow {
  id: string;
  name: string;
  /** JSON string straight from D1, or the array the worker already parsed. */
  parts: string | BuildPart[];
  total_price_vnd: number;
  /** SQLite stores booleans as 0/1; the worker passes them through as-is. */
  compatible: number | boolean;
  warnings: string | string[] | null;
  created_at: string;
  short_id: string;
  user_id?: string | null;
}

/** Parse a JSON column that should hold an array; already-parsed rows pass through. */
function parseJsonArray<T>(raw: string | T[] | null | undefined, fallback: T[]): T[] {
  if (raw === null || raw === undefined) return fallback;
  if (Array.isArray(raw)) return raw;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

/** Map one snake_case `builds` row into a `Build`. Never throws on bad optional fields. */
export function mapRowToBuild(row: RawBuildRow): Build {
  return {
    id: row.id,
    name: row.name,
    parts: parseJsonArray<BuildPart>(row.parts, []),
    totalPriceVnd: Number(row.total_price_vnd ?? 0),
    compatible: row.compatible === true || Number(row.compatible) !== 0,
    warnings: parseJsonArray<string>(row.warnings, []),
    createdAt: row.created_at ?? '',
    shortId: row.short_id,
    userId: row.user_id ?? undefined,
  };
}

/** `${baseUrl}/api/…` — same resolver the products helpers use. */
export function buildApiUrl(path: string, baseUrl?: string): string {
  return `${resolveBaseUrl(baseUrl)}${path}`;
}

/** Body of `POST /api/builds`. */
export interface SaveBuildPayload {
  name: string;
  parts: BuildPart[];
  totalPriceVnd: number;
  compatible: boolean;
  warnings: string[];
  userId?: string;
}

export interface SavedBuild {
  id: string;
  shortId: string;
}

/** Persist a build; resolves to the ids needed for the share link. */
export async function saveBuild(
  payload: SaveBuildPayload,
  options: FetchProductsOptions = {}
): Promise<SavedBuild> {
  const impl: Fetcher = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const res = await impl(buildApiUrl('/api/builds', options.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new ApiError(res.status);
  const saved = (await res.json()) as { id?: string; shortId?: string };
  return { id: saved.id ?? '', shortId: saved.shortId ?? '' };
}

/** Fetch one saved build by its short id. Throws `ApiError(404)` when unknown. */
export async function fetchBuild(
  shortId: string,
  options: FetchProductsOptions = {}
): Promise<Build> {
  const impl: Fetcher = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const res = await impl(buildApiUrl(`/api/builds/${encodeURIComponent(shortId)}`, options.baseUrl));
  if (!res.ok) throw new ApiError(res.status);
  const row = (await res.json()) as RawBuildRow;
  return mapRowToBuild(row);
}
