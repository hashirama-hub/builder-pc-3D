// apps/web/components/layout/Sidebar.tsx
'use client';

import { SlidersHorizontal } from 'lucide-react';
import { PartFilters } from '@/components/parts/PartFilters';

/** Left panel: filters + draggable product list. */
export function Sidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-b border-cyber-700/60 bg-cyber-800/50 md:h-full md:max-h-none md:w-80 md:border-b-0 md:border-r max-h-[45vh] md:overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-cyber-700/60 px-3 py-3">
        <SlidersHorizontal className="h-4 w-4 text-cyber-accent" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-300">
          Linh kiện
        </h2>
      </div>
      <PartFilters />
    </aside>
  );
}
