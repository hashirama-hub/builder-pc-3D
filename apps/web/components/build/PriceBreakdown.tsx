// apps/web/components/build/PriceBreakdown.tsx
'use client';

import { X } from 'lucide-react';
import { CATEGORY_LABELS, formatVnd } from '@/lib/api';
import { useBuildStore } from '@/stores/useBuildStore';

/** Line-by-line cost of the current build with a formatted VND total. */
export function PriceBreakdown() {
  const parts = useBuildStore((state) => state.parts);
  const totalPriceVnd = useBuildStore((state) => state.totalPriceVnd);
  const removePart = useBuildStore((state) => state.removePart);
  const clearParts = useBuildStore((state) => state.clearParts);

  return (
    <div className="rounded-lg border border-cyber-700/70 bg-cyber-800/70">
      <div className="flex items-center justify-between border-b border-cyber-700/60 px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
          Chi phí
        </h3>
        {parts.length > 0 && (
          <button
            type="button"
            onClick={clearParts}
            className="text-xs text-slate-500 transition-colors hover:text-red-400"
          >
            Xóa tất cả
          </button>
        )}
      </div>

      {parts.length === 0 ? (
        <p className="px-4 py-4 text-xs leading-relaxed text-slate-500">
          Chưa có linh kiện nào. Kéo thả vào khung 3D hoặc bấm “Thêm” ở danh sách bên trái.
        </p>
      ) : (
        <ul className="divide-y divide-cyber-700/40 px-4">
          {parts.map((buildPart) => (
            <li key={buildPart.slot} className="flex items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-cyber-accent/80">
                  {CATEGORY_LABELS[buildPart.product.category]}
                </span>
                <p className="truncate text-xs text-slate-300">{buildPart.product.model}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-xs text-slate-200">
                  {formatVnd(buildPart.product.priceVnd)}
                </span>
                <button
                  type="button"
                  onClick={() => removePart(buildPart.slot)}
                  aria-label={`Xóa ${buildPart.product.model}`}
                  className="rounded p-0.5 text-slate-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between border-t border-cyber-700/60 px-4 py-3">
        <span className="text-sm text-slate-400">Tổng cộng</span>
        <span className="neon-text font-mono text-lg font-bold text-cyber-green">
          {formatVnd(totalPriceVnd)}
        </span>
      </div>
    </div>
  );
}
