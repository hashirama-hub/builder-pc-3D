// apps/web/components/parts/PartCard.tsx
'use client';

import { motion } from 'framer-motion';
import { Check, Plus, Star } from 'lucide-react';
import { memo, type DragEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS, formatVnd } from '@/lib/api';
import { PART_MIME, serializePartDragData } from '@/lib/dnd';
import type { Product } from '@/types';

export interface PartCardProps {
  product: Product;
  installed: boolean;
  onAdd: (product: Product) => void;
}

const TIER_LABEL: Record<Product['tier'], string> = {
  budget: 'Phổ thông',
  mid: 'Trung cấp',
  high: 'Cao cấp',
  enthusiast: 'Hàng đầu',
};

export const PartCard = memo(function PartCard({ product, installed, onAdd }: PartCardProps) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    const data = serializePartDragData({ category: product.category, product });
    event.dataTransfer.setData(PART_MIME, data);
    event.dataTransfer.setData('text/plain', data);
    event.dataTransfer.effectAllowed = 'copy';
  };

  // The outer div owns the HTML5 drag (framer's motion.div retypes onDragStart).
  return (
    <div draggable onDragStart={handleDragStart} className="cursor-grab active:cursor-grabbing">
      <motion.div
        whileHover={{ y: -2, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="group rounded-lg border border-cyber-700/70 bg-cyber-800/80 p-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100">{product.model}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {product.brand} · {CATEGORY_LABELS[product.category]}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {TIER_LABEL[product.tier]}
          </Badge>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold text-cyber-green">
              {formatVnd(product.priceVnd)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {product.rating.toFixed(1)}
              {product.stock > 0 ? (
                <span className="text-slate-500">· còn {product.stock}</span>
              ) : (
                <span className="text-red-400">· hết hàng</span>
              )}
            </span>
          </div>

          <Button
            size="sm"
            variant={installed ? 'ghost' : 'default'}
            disabled={installed}
            onClick={(event) => {
              event.stopPropagation();
              onAdd(product);
            }}
            aria-label={`Thêm ${product.model} vào cấu hình`}
          >
            {installed ? (
              <>
                <Check className="h-3.5 w-3.5" /> Đã lắp
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Thêm
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
});
