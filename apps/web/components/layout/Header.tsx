// apps/web/components/layout/Header.tsx
'use client';

import { Cpu, Monitor } from 'lucide-react';
import { formatVnd } from '@/lib/api';
import { useBuildStore } from '@/stores/useBuildStore';

/** Top bar: branding + live build summary. */
export function Header() {
  const totalPriceVnd = useBuildStore((state) => state.totalPriceVnd);
  const partCount = useBuildStore((state) => state.parts.length);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-cyber-700/60 bg-cyber-800/80 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-cyber-accent/50 bg-cyber-accent/10 text-cyber-accent">
          <Cpu className="h-5 w-5" />
        </span>
        <div>
          <p className="neon-text text-lg font-bold leading-none tracking-[0.2em] text-cyber-accent">
            PC BUILDER 3D
          </p>
          <p className="mt-1 hidden text-[11px] text-slate-500 sm:block">
            Lắp cấu hình PC với mô hình 3D &amp; kiểm tra tương thích trực tiếp
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex">
          <Monitor className="h-3.5 w-3.5 text-cyber-pink" />
          {partCount} linh kiện
        </span>
        <span className="font-mono text-base font-semibold text-cyber-green sm:text-lg">
          {formatVnd(totalPriceVnd)}
        </span>
      </div>
    </header>
  );
}
