// apps/web/components/build/SaveBuildButton.tsx
'use client';

import { Check, Copy, Link2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { saveBuild } from '@/lib/api';
import { pushHistory, readHistory, type BuildHistoryEntry } from '@/lib/buildHistory';
import { useBuildStore } from '@/stores/useBuildStore';

const DEFAULT_NAME = 'Build của tôi';

/** Copy without the async Clipboard API (http:// / older browsers). */
function copyWithTextarea(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(area);
  return copied;
}

/** Save the current build, share its link, and list the builds saved so far. */
export function SaveBuildButton() {
  const parts = useBuildStore((state) => state.parts);
  const totalPriceVnd = useBuildStore((state) => state.totalPriceVnd);
  const compatResult = useBuildStore((state) => state.compatResult);

  const [name, setName] = useState(DEFAULT_NAME);
  const [history, setHistory] = useState<BuildHistoryEntry[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // localStorage only exists in the browser — read it after mount so the
  // prerendered HTML and the first client render match.
  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const empty = parts.length === 0;

  async function handleSave(): Promise<void> {
    const buildName = name.trim() || DEFAULT_NAME;
    setBusy(true);
    setError(null);
    try {
      const result = await saveBuild({
        name: buildName,
        parts,
        totalPriceVnd,
        compatible: compatResult.ok,
        warnings: compatResult.warnings,
      });
      setShareUrl(`${window.location.origin}/build/${result.shortId}`);
      setCopied(false);
      setHistory(
        pushHistory({
          shortId: result.shortId,
          name: buildName,
          savedAt: new Date().toISOString(),
        })
      );
    } catch {
      setError('Không lưu được build — kiểm tra API đang chạy rồi thử lại.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(): Promise<void> {
    if (!shareUrl) return;
    setError(null);
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    try {
      if (clipboard?.writeText) {
        await clipboard.writeText(shareUrl);
        setCopied(true);
        return;
      }
    } catch {
      // fall through to the textarea fallback below
    }
    const ok = copyWithTextarea(shareUrl);
    setCopied(ok);
    if (!ok) {
      setError('Không sao chép được — hãy copy thủ công từ ô bên dưới.');
    }
  }
  return (
    <div className="overflow-hidden rounded-lg border border-cyber-700/70 bg-cyber-800/70">
      <div className="border-b border-cyber-700/60 px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
          Lưu &amp; chia sẻ
        </h3>
      </div>

      <div className="flex flex-col gap-2 px-4 py-3">
        <label htmlFor="build-name" className="text-[10px] uppercase tracking-widest text-slate-400">
          Tên build
        </label>
        <input
          id="build-name"
          type="text"
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          className="h-9 w-full rounded-md border border-cyber-700 bg-cyber-900 px-3 text-sm text-slate-200 outline-none transition-colors focus:border-cyber-accent"
          placeholder={DEFAULT_NAME}
        />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={empty || busy}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-cyber-accent px-4 text-sm font-medium text-cyber-900 shadow-[0_0_16px_rgba(0,240,255,0.35)] transition-colors hover:bg-cyber-accent/90 disabled:pointer-events-none disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {busy ? 'Đang lưu…' : 'Lưu & Chia sẻ'}
        </button>
        {empty && (
          <p className="text-[11px] leading-relaxed text-slate-500">
            Thêm ít nhất một linh kiện trước khi lưu build.
          </p>
        )}
        {error && (
          <p role="alert" className="text-[11px] leading-relaxed text-red-300">
            {error}
          </p>
        )}
      </div>

      {shareUrl && (
        <div className="flex flex-col gap-2 border-t border-cyber-700/60 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <Check className="h-3.5 w-3.5" />
            Đã lưu ✓
          </p>
          <div className="flex items-center gap-1.5">
            <input
              readOnly
              value={shareUrl}
              aria-label="Liên kết chia sẻ"
              onFocus={(event) => event.currentTarget.select()}
              className="h-8 min-w-0 flex-1 rounded-md border border-cyber-700 bg-cyber-900 px-2 font-mono text-[11px] text-slate-300 outline-none"
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              aria-label="Sao chép liên kết"
              title="Sao chép liên kết"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyber-700 bg-cyber-900 text-slate-300 transition-colors hover:border-cyber-accent hover:text-cyber-accent"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          {copied && <span className="text-[11px] text-cyber-accent">Đã sao chép ✓</span>}
        </div>
      )}

      {history.length > 0 && (
        <div className="border-t border-cyber-700/60 px-4 py-3">
          <h4 className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-400">
            Đã lưu gần đây
          </h4>
          <ul className="flex flex-col gap-1">
            {history.map((entry) => (
              <li key={entry.shortId}>
                <a
                  href={`/build/${entry.shortId}`}
                  className="flex items-center gap-1.5 truncate text-xs text-slate-300 transition-colors hover:text-cyber-accent"
                >
                  <Link2 className="h-3 w-3 shrink-0 text-cyber-accent/70" />
                  <span className="truncate">{entry.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
