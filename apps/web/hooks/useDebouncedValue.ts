// apps/web/hooks/useDebouncedValue.ts
import { useEffect, useState } from 'react';

/** Result of {@link createDebouncedValue}. */
export interface DebouncedValue<T> {
  /** Schedule `onSettle(value)`; the timer restarts on every call (trailing edge). */
  change: (value: T) => void;
  /** Drop any pending settle (used on unmount / dependency change). */
  cancel: () => void;
}

/**
 * Trailing-edge debounce core: `onSettle` fires once, `delay`ms after the last
 * `change`, with the latest value. Pure (no React) so tests can drive it with
 * fake timers.
 */
export function createDebouncedValue<T>(
  onSettle: (value: T) => void,
  delay: number
): DebouncedValue<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return {
    change(value: T) {
      cancel();
      timer = setTimeout(() => {
        timer = undefined;
        onSettle(value);
      }, delay);
    },
    cancel,
  };
}

/**
 * Returns `value` after it has stopped changing for `delay` ms (default 300).
 * Used to keep the parts search input out of the TanStack Query key while the
 * user is still typing — one fetch per pause instead of one per keystroke
 * (the worker rate-limits at 100 req/min per IP).
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const debouncedValue = createDebouncedValue(setDebounced, delay);
    debouncedValue.change(value);
    return () => debouncedValue.cancel();
  }, [value, delay]);

  return debounced;
}
