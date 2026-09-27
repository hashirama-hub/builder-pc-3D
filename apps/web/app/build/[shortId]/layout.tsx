// apps/web/app/build/[shortId]/layout.tsx
import type { ReactNode } from 'react';

/**
 * One placeholder id so the static export emits the share page at
 * `/build/preview.html` (a client page may not export `generateStaticParams`,
 * and Next refuses to export a dynamic route with none).
 *
 * Cloudflare Pages rewrites every `/build/<shortId>` link to that file
 * (`apps/web/public/_redirects`); the page reads the real id from the URL the
 * visitor opened, so the placeholder never reaches the API.
 */
export function generateStaticParams(): { shortId: string }[] {
  return [{ shortId: 'preview' }];
}

export default function BuildShareLayout({ children }: { children: ReactNode }) {
  return children;
}
