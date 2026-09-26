// apps/web/lib/dnd.ts
// HTML5 drag & drop payload for part cards. The full product travels with the
// drag when available; the drop handler falls back to an API fetch when it is not.
import type { PartCategory, Product } from '../types';
import { PART_CATEGORIES } from './api';

/** Custom MIME type used for part drags (with a `text/plain` JSON fallback). */
export const PART_MIME = 'application/x-pc-builder-part';

export interface PartDragPayload {
  category: PartCategory;
  /** Product id, when only an id travelled with the drag. */
  id?: string;
  /** Full product, when the source had it (normal path — no fetch needed). */
  product?: Product;
}

function isPartCategory(value: unknown): value is PartCategory {
  return (
    typeof value === 'string' &&
    (PART_CATEGORIES as readonly string[]).includes(value)
  );
}

function isProductLike(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Record<keyof Product, unknown>>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.priceVnd === 'number' &&
    isPartCategory(candidate.category)
  );
}

export function serializePartDragData(payload: PartDragPayload): string {
  return JSON.stringify(payload);
}

/** Outcome of {@link resolvePayload}: an installable product, or no match. */
export type PayloadResolution =
  | { kind: 'product'; product: Product }
  | { kind: 'not-found' };

/**
 * Resolve a drop payload to the product it should install.
 *
 * `products` is the candidate list fetched for `payload.category` (may be empty
 * when the payload already carries the full product). When the payload has no
 * product, only an exact `payload.id` match resolves — there is deliberately no
 * "fall back to the first product" path, which would silently install an
 * arbitrary part.
 */
export function resolvePayload(
  payload: PartDragPayload,
  products: readonly Product[]
): PayloadResolution {
  const candidate: Product | undefined = payload.product
    ? payload.product
    : payload.id
      ? products.find((item) => item.id === payload.id)
      : undefined;

  // A product (attached or looked up) that disagrees with the dragged category
  // is the wrong part for this slot — reject it rather than install it.
  if (!candidate || candidate.category !== payload.category) {
    return { kind: 'not-found' };
  }
  return { kind: 'product', product: candidate };
}

/** Parse drag data. Returns null for anything that is not a valid payload. */
export function parsePartDragData(text: string | null | undefined): PartDragPayload | null {
  if (!text) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

  const candidate = parsed as Partial<Record<'category' | 'id' | 'product', unknown>>;
  if (!isPartCategory(candidate.category)) return null;

  const payload: PartDragPayload = { category: candidate.category };
  if (typeof candidate.id === 'string') payload.id = candidate.id;
  if (isProductLike(candidate.product) && candidate.product.category === candidate.category) {
    payload.product = candidate.product;
  }
  return payload;
}
