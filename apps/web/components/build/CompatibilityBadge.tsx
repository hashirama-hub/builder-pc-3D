// apps/web/components/build/CompatibilityBadge.tsx
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronDown, CircleDashed, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useBuildStore } from '@/stores/useBuildStore';

type Status = 'empty' | 'ok' | 'warning' | 'error';

const STATUS_STYLE: Record<Status, { label: string; className: string; icon: JSX.Element }> = {
  empty: {
    label: 'Chưa có linh kiện',
    className: 'border-slate-600 bg-slate-500/10 text-slate-300',
    icon: <CircleDashed className="h-4 w-4" />,
  },
  ok: {
    label: 'Tương thích',
    className: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  warning: {
    label: 'Có cảnh báo',
    className: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  error: {
    label: 'Không tương thích',
    className: 'border-red-500/50 bg-red-500/10 text-red-300',
    icon: <XCircle className="h-4 w-4" />,
  },
};

/** Compatibility status from the store, expandable to the full message list. */
export function CompatibilityBadge() {
  const compatResult = useBuildStore((state) => state.compatResult);
  const partCount = useBuildStore((state) => state.parts.length);
  const [expanded, setExpanded] = useState(false);

  const errors = compatResult.errors;
  const warnings = compatResult.warnings;
  const messages = [...errors, ...warnings];

  const status: Status =
    partCount === 0
      ? 'empty'
      : errors.length > 0
        ? 'error'
        : warnings.length > 0
          ? 'warning'
          : 'ok';

  const style = STATUS_STYLE[status];
  const expandable = messages.length > 0;

  return (
    <div className="overflow-hidden rounded-lg border border-cyber-700/70 bg-cyber-800/70">
      <motion.button
        key={status}
        type="button"
        onClick={() => expandable && setExpanded((value) => !value)}
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        disabled={!expandable}
        aria-expanded={expandable ? expanded : undefined}
        className={`flex w-full items-center justify-between gap-2 border-l-4 px-4 py-3 text-left text-sm font-semibold ${style.className} disabled:cursor-default`}
      >
        <span className="flex items-center gap-2">
          {style.icon}
          {style.label}
          {warnings.length > 0 && status === 'warning' && (
            <span className="font-normal text-amber-400/80">({warnings.length})</span>
          )}
          {errors.length > 0 && (
            <span className="font-normal text-red-400/80">({errors.length})</span>
          )}
        </span>
        {expandable && (
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded && expandable && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-cyber-700/60 bg-cyber-900/50"
          >
            {errors.map((message) => (
              <li
                key={message}
                className="flex items-start gap-2 border-b border-cyber-700/40 px-4 py-2 text-xs text-red-300 last:border-b-0"
              >
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {message}
              </li>
            ))}
            {warnings.map((message) => (
              <li
                key={message}
                className="flex items-start gap-2 border-b border-cyber-700/40 px-4 py-2 text-xs text-amber-300 last:border-b-0"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {message}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
