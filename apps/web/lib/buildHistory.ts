// apps/web/lib/buildHistory.ts
// "Recently saved" list kept in localStorage so a visitor can jump back to the
// builds they shared, without an account.

export interface BuildHistoryEntry {
  shortId: string;
  name: string;
  savedAt: string;
}

export const BUILD_HISTORY_KEY = 'pc-build-history';
export const MAX_HISTORY = 10;

/** The two localStorage methods this module needs (injectable for tests/SSR). */
export type HistoryStorage = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): HistoryStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Some environments expose the global but throw on access.
    return null;
  }
}

function isEntry(value: unknown): value is BuildHistoryEntry {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<BuildHistoryEntry>;
  return (
    typeof candidate.shortId === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.savedAt === 'string'
  );
}

/** Newest first. Returns `[]` when nothing is stored or the value is corrupt. */
export function readHistory(
  storage: HistoryStorage | null = defaultStorage()
): BuildHistoryEntry[] {
  if (!storage) return [];
  let raw: string | null;
  try {
    raw = storage.getItem(BUILD_HISTORY_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

/**
 * Prepend `entry` to the history and persist it, keeping at most
 * `MAX_HISTORY` entries (oldest dropped). Returns the new list, or `[]` when
 * no storage is available (SSR / private mode).
 */
export function pushHistory(
  entry: BuildHistoryEntry,
  storage: HistoryStorage | null = defaultStorage()
): BuildHistoryEntry[] {
  if (!storage) return [];
  const next = [entry, ...readHistory(storage).filter((h) => h.shortId !== entry.shortId)].slice(
    0,
    MAX_HISTORY
  );
  try {
    storage.setItem(BUILD_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Quota or blocked storage: the in-memory list still renders.
  }
  return next;
}
