// apps/web/components/parts/PartSearch.tsx
'use client';

import { Search } from 'lucide-react';
import { memo } from 'react';
import { Input } from '@/components/ui/input';

export interface PartSearchProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const PartSearch = memo(function PartSearch({ value, onValueChange }: PartSearchProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <Input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="Tìm CPU, VGA, bàn phím…"
        className="pl-8"
        aria-label="Tìm kiếm linh kiện"
      />
    </div>
  );
});
