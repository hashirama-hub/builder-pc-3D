// workers/api/lib/parts.ts
import type { BuildPart } from '../../../apps/web/types';

/**
 * Narrows an untrusted JSON value to a `BuildPart[]`.
 * Only the container is checked here; field-level validation of products is
 * delegated to the shared zod schemas / compat engine.
 */
export function asBuildParts(value: unknown): BuildPart[] | null {
  if (!Array.isArray(value)) return null;
  return value as BuildPart[];
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
