// apps/web/tests/buildHistory.test.ts
import { describe, it, expect } from 'vitest';
import {
  BUILD_HISTORY_KEY,
  MAX_HISTORY,
  pushHistory,
  readHistory,
  type BuildHistoryEntry,
} from '../lib/buildHistory';

/** In-memory stand-in for the browser's localStorage (node test env). */
class MemoryStorage {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  raw(key: string): string | undefined {
    return this.store.get(key);
  }
}

const entry = (shortId: string): BuildHistoryEntry => ({
  shortId,
  name: `Build ${shortId}`,
  savedAt: `2026-09-27T00:00:0${shortId.slice(-1)}Z`,
});

describe('build history', () => {
  it('reads an empty history when nothing is stored', () => {
    expect(readHistory(new MemoryStorage())).toEqual([]);
  });

  it('reads an empty history when the stored value is corrupt', () => {
    const storage = new MemoryStorage();
    storage.setItem(BUILD_HISTORY_KEY, '{not json');
    expect(readHistory(storage)).toEqual([]);
  });

  it('keeps the newest save first', () => {
    const storage = new MemoryStorage();
    pushHistory(entry('1111aaaa'), storage);
    const history = pushHistory(entry('2222bbbb'), storage);
    expect(history.map((h) => h.shortId)).toEqual(['2222bbbb', '1111aaaa']);
    expect(readHistory(storage)).toEqual(history);
  });

  it('caps the history at 10 entries, dropping the oldest', () => {
    const storage = new MemoryStorage();
    let history: BuildHistoryEntry[] = [];
    for (let i = 0; i < MAX_HISTORY + 2; i += 1) {
      history = pushHistory(entry(`${i}`.padStart(8, '0')), storage);
    }
    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0].shortId).toBe('00000011');
    expect(history[MAX_HISTORY - 1].shortId).toBe('00000002');
    expect(readHistory(storage)).toHaveLength(MAX_HISTORY);
  });

  it('stores entries under the pc-build-history key', () => {
    const storage = new MemoryStorage();
    pushHistory(entry('1111aaaa'), storage);
    expect(storage.raw(BUILD_HISTORY_KEY)).toContain('1111aaaa');
  });

  it('returns [] without throwing when no storage exists (SSR)', () => {
    expect(pushHistory(entry('1111aaaa'), null)).toEqual([]);
    expect(readHistory(null)).toEqual([]);
  });
});
