// apps/web/app/layout.tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/layout/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'PC Builder 3D',
  description: 'Lắp cấu hình PC với mô hình 3D tương tác và kiểm tra tương thích thời gian thực',
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
