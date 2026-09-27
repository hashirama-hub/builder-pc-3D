// apps/web/app/build/[shortId]/page.tsx
'use client';

import { ArrowLeft, Cpu, PackageOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CompatibilityBadge } from '@/components/build/CompatibilityBadge';
import { ApiError, CATEGORY_LABELS, fetchBuild, formatVnd } from '@/lib/api';
import type { Build, CompatResult } from '@/types';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

function PageHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-cyber-700/60 bg-cyber-800/80 px-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-cyber-accent/50 bg-cyber-accent/10 text-cyber-accent">
          <Cpu className="h-5 w-5" />
        </span>
        <p className="neon-text text-lg font-bold leading-none tracking-[0.2em] text-cyber-accent">
          PC BUILDER 3D
        </p>
      </div>
      <Link
        href="/builder"
        className="inline-flex items-center gap-1.5 rounded-md border border-cyber-600 px-3 py-1.5 text-xs text-cyber-accent transition-colors hover:bg-cyber-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Lắp cấu hình của riêng bạn
      </Link>
    </header>
  );
}

function StatusMessage({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <PackageOpen className="h-10 w-10 text-slate-500" />
      <h1 className="text-lg font-semibold text-slate-200">{title}</h1>
      <p className="max-w-md text-sm leading-relaxed text-slate-400">{hint}</p>
      <Link
        href="/builder"
        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-cyber-accent px-4 py-2 text-sm font-medium text-cyber-900 transition-colors hover:bg-cyber-accent/90"
      >
        <ArrowLeft className="h-4 w-4" />
        Về trang lắp ráp
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 md:px-8" aria-busy="true">
      <div className="h-7 w-64 animate-pulse rounded bg-cyber-800" />
      <div className="h-24 animate-pulse rounded-lg border border-cyber-700/60 bg-cyber-800/60" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-10 animate-pulse rounded bg-cyber-800/70" />
        ))}
      </div>
      <p className="text-sm text-slate-500">Đang tải build…</p>
    </div>
  );
}

/**
 * Short id as it appears in the address bar.
 *
 * Under `output: 'export'` the id baked into the page at build time can only be
 * a placeholder (see the segment layout's `generateStaticParams`), so the real
 * id always comes from the URL the visitor actually opened.
 */
function shortIdFromPathname(pathname: string): string | null {
  const match = /^\/build\/([^/?#]+)$/.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Read-only view of a shared build: `/build/<shortId>`. */
export default function SharedBuildPage() {
  const pathname = usePathname();
  const [state, setState] = useState<LoadState>('loading');
  const [build, setBuild] = useState<Build | null>(null);

  useEffect(() => {
    let cancelled = false;
    const shortId = shortIdFromPathname(window.location.pathname);
    if (!shortId) {
      setBuild(null);
      setState('not-found');
      return () => {
        cancelled = true;
      };
    }
    setState('loading');
    fetchBuild(shortId)
      .then((result) => {
        if (cancelled) return;
        setBuild(result);
        setState('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setBuild(null);
        setState(error instanceof ApiError && error.status === 404 ? 'not-found' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Stored builds persist warnings only — errors were never part of the row.
  const compat: CompatResult | null = build
    ? { ok: build.compatible, warnings: build.warnings, errors: [] }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-cyber-900">
      <PageHeader />

      {state === 'loading' && <LoadingSkeleton />}

      {state === 'not-found' && (
        <StatusMessage
          title="Không tìm thấy build"
          hint="Liên kết có thể đã sai hoặc build đã bị xóa. Hãy nhờ người chia sẻ gửi lại link."
        />
      )}

      {state === 'error' && (
        <StatusMessage
          title="Không tải được build"
          hint="Máy chủ API đang gặp sự cố — thử lại sau lát nữa."
        />
      )}

      {state === 'ready' && build && compat && (
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-500">
                Build chia sẻ · {build.shortId}
              </p>
              <h1 className="text-xl font-semibold text-slate-100">{build.name}</h1>
            </div>
            <p className="font-mono text-sm text-slate-400">
              {build.parts.length} linh kiện
            </p>
          </div>

          <div className="mb-4">
            <CompatibilityBadge result={compat} partCount={build.parts.length} />
          </div>

          <div className="overflow-hidden rounded-lg border border-cyber-700/70 bg-cyber-800/70">
            <h2 className="border-b border-cyber-700/60 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-slate-200">
              Danh sách linh kiện
            </h2>
            {build.parts.length === 0 ? (
              <p className="px-4 py-4 text-xs text-slate-500">Build này không có linh kiện nào.</p>
            ) : (
              <ul className="divide-y divide-cyber-700/40 px-4">
                {build.parts.map((part) => (
                  <li key={`${part.slot}-${part.product.id}`} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-cyber-accent/80">
                        {CATEGORY_LABELS[part.product.category]}
                      </span>
                      <p className="truncate text-sm text-slate-200">
                        {part.product.brand} {part.product.model}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm text-slate-200">
                      {formatVnd(part.product.priceVnd)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between border-t border-cyber-700/60 px-4 py-3">
              <span className="text-sm text-slate-400">Tổng cộng</span>
              <span className="neon-text font-mono text-lg font-bold text-cyber-green">
                {formatVnd(build.totalPriceVnd)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Link
              href="/builder"
              className="inline-flex items-center gap-1.5 rounded-md bg-cyber-accent px-4 py-2 text-sm font-medium text-cyber-900 transition-colors hover:bg-cyber-accent/90"
            >
              <ArrowLeft className="h-4 w-4" />
              Lắp cấu hình của riêng bạn
            </Link>
          </div>
        </main>
      )}
    </div>
  );
}
