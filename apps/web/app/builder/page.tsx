// apps/web/app/builder/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { AlertCircle, Box, X } from 'lucide-react';
import { useCallback, useState, type DragEvent } from 'react';
import { Header } from '@/components/layout/Header';
import { RightPanel } from '@/components/layout/RightPanel';
import { Sidebar } from '@/components/layout/Sidebar';
import { fetchProducts, mapCategoryToSlot } from '@/lib/api';
import { PART_MIME, parsePartDragData, resolvePayload, type PartDragPayload } from '@/lib/dnd';
import { useBuildStore } from '@/stores/useBuildStore';
import type { Product } from '@/types';

const Scene = dynamic(() => import('@/components/3d/Scene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-cyber-900">
      <span className="animate-pulse text-sm text-slate-500">Đang khởi tạo 3D…</span>
    </div>
  ),
});

export default function BuilderPage() {
  const addPart = useBuildStore((state) => state.addPart);
  const [dragOver, setDragOver] = useState(false);
  const [dropMessage, setDropMessage] = useState<string | null>(null);

  const installPayload = useCallback(
    async (payload: PartDragPayload) => {
      const slot = mapCategoryToSlot(payload.category);
      let candidates: readonly Product[] = [];

      if (!payload.product) {
        try {
          const response = await fetchProducts({ category: payload.category, limit: 50 });
          candidates = response.products;
        } catch {
          setDropMessage('Không tải được dữ liệu — chạy `npm run dev:api`');
          return;
        }
      }

      // Never fall back to an arbitrary product: an id-only or category-only
      // payload that does not match a candidate is "not found", not products[0].
      const resolved = resolvePayload(payload, candidates);
      if (resolved.kind === 'not-found') {
        setDropMessage('Không tìm thấy linh kiện phù hợp cho vị trí này');
        return;
      }

      addPart({ product: resolved.product, slot });
      setDropMessage(null);
    },
    [addPart]
  );

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      const raw = event.dataTransfer.getData(PART_MIME) || event.dataTransfer.getData('text/plain');
      const payload = parsePartDragData(raw);
      if (!payload) {
        setDropMessage('Không nhận diện được linh kiện vừa kéo');
        return;
      }
      await installPayload(payload);
    },
    [installPayload]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) setDragOver(false);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cyber-900">
      <Header />

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <Sidebar />

        <main
          className="relative min-h-[45vh] min-w-0 flex-1 md:min-h-0"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Scene />

          <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-md border border-cyber-700/70 bg-cyber-800/80 px-2.5 py-1.5 text-[11px] text-slate-400">
            <Box className="h-3.5 w-3.5 text-cyber-accent" />
            Kéo thả linh kiện vào đây · kéo chuột để xoay
          </div>

          {dragOver && (
            <div className="pointer-events-none absolute inset-3 z-10 rounded-xl border-2 border-dashed border-cyber-accent/70 bg-cyber-accent/5 shadow-[0_0_30px_rgba(0,240,255,0.25)_inset]" />
          )}

          {dropMessage && (
            <div
              role="alert"
              className="absolute bottom-4 left-1/2 z-20 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-md border border-amber-500/50 bg-cyber-800/95 px-3 py-2 text-xs text-amber-200 shadow-lg"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-mono">{dropMessage}</span>
              <button
                type="button"
                onClick={() => setDropMessage(null)}
                aria-label="Đóng thông báo"
                className="rounded p-0.5 text-amber-300/70 hover:text-amber-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </main>

        <RightPanel />
      </div>
    </div>
  );
}
