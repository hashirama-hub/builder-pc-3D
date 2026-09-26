// apps/web/app/layout.tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/layout/Providers';
import './globals.css';

export const metadata: Metadata = {
  // TODO: replace with the production domain (keep in sync with
  // apps/web/public/robots.txt + sitemap.xml).
  metadataBase: new URL('https://pc-builder-3d.pages.dev'),
  title: 'PC Builder 3D',
  description: 'Lắp cấu hình PC với mô hình 3D tương tác và kiểm tra tương thích thời gian thực',
  keywords: ['lắp ráp PC', 'PC Builder', 'cấu hình máy tính', 'tương thích phần cứng', '3D'],
  openGraph: {
    title: 'PC Builder 3D',
    description: 'Lắp cấu hình PC với mô hình 3D tương tác và kiểm tra tương thích thời gian thực',
    locale: 'vi_VN',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className="dark">
      <body className="bg-cyber-900 text-slate-200 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
