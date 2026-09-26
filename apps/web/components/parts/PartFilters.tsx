// apps/web/components/parts/PartFilters.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, PackageOpen, RotateCcw, WifiOff } from 'lucide-react';
import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CATEGORY_LABELS,
  PART_CATEGORIES,
  fetchProducts,
  mapCategoryToSlot,
  type ProductQueryParams,
} from '@/lib/api';
import type { Product } from '@/types';
import { useBuildStore } from '@/stores/useBuildStore';
import { PartCard } from './PartCard';
import { PartSearch } from './PartSearch';

const CATEGORY_TABS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tất cả' },
  ...PART_CATEGORIES.map((category) => ({ value: category, label: CATEGORY_LABELS[category] })),
];

const BRANDS = [
  'AMD',
  'Intel',
  'ASUS',
  'MSI',
  'GIGABYTE',
  'Corsair',
  'Kingston',
  'Samsung',
  'Western Digital',
  'Seagate',
  'Seasonic',
  'Cooler Master',
  'NZXT',
  'be quiet!',
  'LG',
  'AOC',
];

const SORTS: Array<{ value: string; label: string }> = [
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'newest', label: 'Mới nhất' },
];

const DEFAULT_FILTERS: ProductQueryParams = { sort: 'price_asc', limit: 50 };

const selectClassName =
  'h-9 w-full rounded-md border border-cyber-600 bg-cyber-900/80 px-2 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-accent/60';

/** Filter controls + TanStack Query product list (left sidebar content). */
export function PartFilters() {
  const [filters, setFilters] = useState<ProductQueryParams>(DEFAULT_FILTERS);
  const parts = useBuildStore((state) => state.parts);
  const addPart = useBuildStore((state) => state.addPart);

  const query = useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
    retry: false,
  });

  const installedIds = useMemo(
    () => new Set(parts.map((part) => part.product.id)),
    [parts]
  );

  const patch = useCallback((next: Partial<ProductQueryParams>) => {
    setFilters((prev) => ({ ...prev, page: 1, ...next }));
  }, []);

  const handleAdd = useCallback(
    (product: Product) => {
      addPart({ product, slot: mapCategoryToSlot(product.category) });
    },
    [addPart]
  );

  const updateMinPrice = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '');
    patch({ minPrice: digits ? Number(digits) : undefined });
  };

  const updateMaxPrice = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '');
    patch({ maxPrice: digits ? Number(digits) : undefined });
  };

  const loadMore = () => {
    patch({ limit: (filters.limit ?? 50) + 50 });
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const showReset =
    Boolean(filters.category) ||
    Boolean(filters.brand) ||
    Boolean(filters.search) ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined;

  return (
    <div className="flex flex-col gap-3 p-3">
      <PartSearch value={filters.search ?? ''} onValueChange={(search) => patch({ search })} />

      {/* category tabs */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_TABS.map((tab) => {
          const active = (filters.category ?? '') === tab.value;
          return (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => patch({ category: tab.value || undefined })}
              className={
                active
                  ? 'rounded-full border border-cyber-accent/60 bg-cyber-accent/15 px-2.5 py-1 text-xs font-medium text-cyber-accent'
                  : 'rounded-full border border-cyber-600 px-2.5 py-1 text-xs font-medium text-slate-400 transition-colors hover:border-cyber-accent/50 hover:text-cyber-accent'
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* brand + sort */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-slate-500">
          Hãng
          <select
            className={selectClassName}
            value={filters.brand ?? ''}
            onChange={(event) => patch({ brand: event.target.value || undefined })}
            aria-label="Lọc theo hãng"
          >
            <option value="">Tất cả</option>
            {BRANDS.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-slate-500">
          Sắp xếp
          <select
            className={selectClassName}
            value={filters.sort ?? 'price_asc'}
            onChange={(event) => patch({ sort: event.target.value })}
            aria-label="Sắp xếp kết quả"
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* price range */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-slate-500">
          Giá từ (₫)
          <Input
            inputMode="numeric"
            placeholder="0"
            value={filters.minPrice ?? ''}
            onChange={updateMinPrice}
            aria-label="Giá tối thiểu"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-slate-500">
          Giá đến (₫)
          <Input
            inputMode="numeric"
            placeholder="Không giới hạn"
            value={filters.maxPrice ?? ''}
            onChange={updateMaxPrice}
            aria-label="Giá tối đa"
          />
        </label>
      </div>

      {showReset && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <RotateCcw className="h-3.5 w-3.5" /> Xóa bộ lọc
        </Button>
      )}

      <div className="flex items-center justify-between border-t border-cyber-700/60 pt-2 text-xs text-slate-500">
        <span>
          {query.data ? `${query.data.total} kết quả` : '—'}
        </span>
        {query.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyber-accent" />}
      </div>

      {/* results */}
      {query.isPending ? (
        <div className="flex items-center gap-2 rounded-lg border border-cyber-700/60 bg-cyber-800/50 p-3 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-cyber-accent" /> Đang tải linh kiện…
        </div>
      ) : query.isError ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <p className="flex items-center gap-2 font-semibold">
            <WifiOff className="h-4 w-4" /> Không tải được dữ liệu
          </p>
          <p className="mt-1 leading-relaxed text-amber-300/80">
            API chưa chạy. Bật terminal khác với{' '}
            <code className="rounded bg-cyber-900/70 px-1 py-0.5 font-mono">npm run dev:api</code>{' '}
            rồi bấm tải lại.
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => query.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : query.data.products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-cyber-700/60 bg-cyber-800/50 p-4 text-center text-slate-400">
          <PackageOpen className="h-6 w-6 text-cyber-accent/70" />
          <p className="text-sm">Không tìm thấy linh kiện nào phù hợp.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {query.data.products.map((product) => (
              <PartCard
                key={product.id}
                product={product}
                installed={installedIds.has(product.id)}
                onAdd={handleAdd}
              />
            ))}
          </div>
          {query.data.products.length < query.data.total && (
            <Button variant="outline" size="sm" onClick={loadMore}>
              Tải thêm ({query.data.total - query.data.products.length})
            </Button>
          )}
        </>
      )}
    </div>
  );
}
