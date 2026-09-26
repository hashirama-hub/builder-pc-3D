// apps/web/stores/useBuildStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BuildPart, CompatResult } from '../types';
import { checkCompatibility } from '../lib/compatEngine';

const emptyCompat: CompatResult = { ok: true, warnings: [], errors: [] };

/** Recompute derived values (total price + compatibility) from a part list. */
function derive(parts: BuildPart[]): Pick<BuildState, 'parts' | 'totalPriceVnd' | 'compatResult'> {
  return {
    parts,
    totalPriceVnd: parts.reduce((sum, p) => sum + p.product.priceVnd, 0),
    compatResult: checkCompatibility(parts),
  };
}

export interface BuildState {
  parts: BuildPart[];
  totalPriceVnd: number;
  compatResult: CompatResult;
  addPart: (part: BuildPart) => void;
  removePart: (slot: string) => void;
  clearParts: () => void;
}

export const useBuildStore = create<BuildState>()(
  persist(
    (set, get) => ({
      parts: [],
      totalPriceVnd: 0,
      compatResult: emptyCompat,
      addPart: (part) => {
        // One slot per category: a new part of the same category replaces the old one.
        const kept = get().parts.filter((p) => p.product.category !== part.product.category);
        set(derive([...kept, part]));
      },
      removePart: (slot) => {
        set(derive(get().parts.filter((p) => p.slot !== slot)));
      },
      clearParts: () => set({ parts: [], totalPriceVnd: 0, compatResult: emptyCompat }),
    }),
    { name: 'pc-builder-storage' }
  )
);
