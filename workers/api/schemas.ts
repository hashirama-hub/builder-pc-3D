// workers/api/schemas.ts
// Zod request-body schemas for the worker's write endpoints.
//
// The compat engine dereferences `part.product.category`, `part.product.specs.*`
// and `part.product.model.toLowerCase()` with no guards of its own, so every
// route accepting build parts must prove those fields exist *and* be typed
// before the body reaches the engine or the database. Replaces the hand-rolled
// `lib/parts.ts` guards with schemas that also give type-level safety.
import { z } from 'zod';
import { PART_CATEGORIES } from '../../apps/web/lib/api';
import type { BuildPart } from '../../apps/web/types';

/** Product tiers the domain type allows (mirrors `Product['tier']`). */
const PRODUCT_TIERS = ['budget', 'mid', 'high', 'enthusiast'] as const;

/** `specs` is an open JSON object — the engine reads `specs.socket`, `specs.tdp`, … */
const specsSchema = z.record(z.unknown());

/**
 * Pragmatic subset of `Product` (the full domain type is *not* re-declared):
 * `category`, `model` and `specs` are required because the compat engine
 * dereferences them (anything less used to be an HTTP 500), everything else is
 * optional but type-checked when present. Unknown keys pass through so a full
 * product posted by the client survives validation byte-for-byte.
 */
export const productSchema = z
  .object({
    id: z.string().min(1).optional(),
    category: z.enum(PART_CATEGORIES),
    brand: z.string().optional(),
    model: z.string().min(1),
    specs: specsSchema,
    priceVnd: z.number().finite().optional(),
    priceUpdatedAt: z.string().optional(),
    stock: z.number().finite().optional(),
    imageUrl: z.string().optional(),
    model3dUrl: z.string().optional(),
    rating: z.number().finite().optional(),
    tier: z.enum(PRODUCT_TIERS).optional(),
  })
  .passthrough();

export const buildPartSchema = z
  .object({
    product: productSchema,
    slot: z.string().min(1).optional(),
  })
  .passthrough();

/** `POST /api/compat` body: `{ parts: BuildPart[] }`. */
export const compatBodySchema = z.object({
  parts: z.array(buildPartSchema),
});

/** `POST /api/builds` body. `warnings`/`userId` are optional on the wire. */
export const buildPostSchema = z.object({
  name: z.string().refine((value) => value.trim() !== '', 'name must not be blank'),
  parts: z.array(buildPartSchema),
  totalPriceVnd: z.number().finite(),
  compatible: z.boolean(),
  warnings: z.array(z.string()).nullish().transform((value) => value ?? []),
  userId: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
});

/** Wire shape produced by the schemas above (before the `BuildPart` bridge). */
export type ValidatedPart = z.infer<typeof buildPartSchema>;

/**
 * Bridge from the validated wire shape to `BuildPart`.
 *
 * The schema proves exactly what the engine dereferences (`product.category`,
 * `product.model`, `product.specs`); the remaining `Product` fields are
 * legitimately absent on minimal payloads (the routes have always accepted
 * `{ product: { category, model, specs } }`), so the compiler cannot prove the
 * full domain type — this is the same trust boundary the old `asBuildParts`
 * cast had, now enforced by zod. One documented assertion, no `any`.
 */
export function toBuildParts(parts: readonly ValidatedPart[]): BuildPart[] {
  return parts as unknown as BuildPart[];
}
