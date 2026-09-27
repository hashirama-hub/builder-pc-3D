// apps/web/tests/debounce.test.ts
// Red-phase coverage for the trailing-edge debounce behind `useDebouncedValue`.
// Runs in the node environment with fake timers (no DOM in this repo).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebouncedValue } from '../hooks/useDebouncedValue';

describe('useDebouncedValue (debounce core)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires once after the delay with the last value despite rapid changes', () => {
    const onSettle = vi.fn();
    const debounced = createDebouncedValue<string>(onSettle, 300);

    // simulate fast typing: r → ry → ryzen within 200ms
    debounced.change('r');
    vi.advanceTimersByTime(100);
    debounced.change('ry');
    vi.advanceTimersByTime(100);
    debounced.change('ryzen');

    expect(onSettle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(onSettle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onSettle).toHaveBeenCalledTimes(1);
    expect(onSettle).toHaveBeenCalledWith('ryzen');
  });

  it('restarts the delay on every change so a slow typer still waits', () => {
    const onSettle = vi.fn();
    const debounced = createDebouncedValue<number>(onSettle, 300);

    debounced.change(1);
    vi.advanceTimersByTime(250);
    debounced.change(2);
    vi.advanceTimersByTime(250);
    expect(onSettle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(onSettle).toHaveBeenCalledTimes(1);
    expect(onSettle).toHaveBeenCalledWith(2);
  });

  it('cancel() drops the pending settle (unmount safety)', () => {
    const onSettle = vi.fn();
    const debounced = createDebouncedValue<string>(onSettle, 300);

    debounced.change('x');
    debounced.cancel();
    vi.advanceTimersByTime(1000);

    expect(onSettle).not.toHaveBeenCalled();
  });
});
