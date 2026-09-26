// workers/api/lib/parts.ts
import type { BuildPart } from '../../../apps/web/types';

/**
 * Narrows an untrusted JSON value to a `BuildPart[]`, or null when any item is
 * malformed. There is no zod schema on this path, and the compat engine
 * dereferences `part.product.category`, `part.product.specs.*` and
 * `part.product.model.toLowerCase()` directly — so every item must carry:
 *
 * - `product` as an object,
 * - `product.category` as a string,
 * - `product.model` as a string,
 * - `product.specs` as an object.
 *
 * Anything less reaches the engine and throws (HTTP 500), so it is rejected
 * here as a 400 instead.
 */
export function asBuildParts(value: unknown): BuildPart[] | null {
  if (!Array.isArray(value)) return null;
  const parts: BuildPart[] = [];
  for (const item of value as unknown[]) {
    if (!isBuildPart(item)) return null;
    parts.push(item as BuildPart);
  }
  return parts;
}

function isBuildPart(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const product = (value as { product?: unknown }).product;
  if (typeof product !== 'object' || product === null) return false;
  const p = product as { category?: unknown; model?: unknown; specs?: unknown };
  if (typeof p.category !== 'string') return false;
  if (typeof p.model !== 'string') return false;
  if (typeof p.specs !== 'object' || p.specs === null) return false;
  return true;
}

/** Narrows an untrusted JSON value to a `string[]`, or null if any item differs. */
export function asStringArray(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value as unknown[]) {
    if (typeof item !== 'string') return null;
    out.push(item);
  }
  return out;
}
