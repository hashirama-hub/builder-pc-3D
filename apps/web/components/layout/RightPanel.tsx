// apps/web/components/layout/RightPanel.tsx
'use client';

import { CompatibilityBadge } from '@/components/build/CompatibilityBadge';
import { PriceBreakdown } from '@/components/build/PriceBreakdown';
import { SaveBuildButton } from '@/components/build/SaveBuildButton';

/** Right panel: compatibility status + cost summary. */
export function RightPanel() {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-cyber-700/60 bg-cyber-800/50 p-4 md:h-full md:max-h-none md:w-96 md:border-l md:border-t-0 max-h-[45vh]">
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-300">
          Cấu hình của bạn
        </h2>
        <div className="flex flex-col gap-4">
          <CompatibilityBadge />
          <PriceBreakdown />
          <SaveBuildButton />
        </div>
      </div>
      <p className="mt-auto text-[11px] leading-relaxed text-slate-500">
        Mẹo: kéo linh kiện từ bảng bên trái thả vào khung 3D, hoặc bấm “Thêm”. Mỗi loại linh
        kiện chỉ lắp được một vị trí — thêm bản mới sẽ thay bản cũ.
      </p>
    </aside>
  );
}
