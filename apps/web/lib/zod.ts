import { z } from 'zod';

/**
 * Absolute URL (http/https/...) or a root-relative path such as "/img.jpg".
 * `z.string().url()` is intentionally not used here: image/model assets are
 * commonly stored as root-relative paths, which `new URL()` rejects.
 */
const urlOrPath = z.string().refine(
  (value) => {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }
    return value.startsWith('/');
  },
  { message: 'must be an absolute URL or a root-relative path ("/...")' },
);

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
  imageUrl: urlOrPath,
  model3dUrl: urlOrPath,
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
