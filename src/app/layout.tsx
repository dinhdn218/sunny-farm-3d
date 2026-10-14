import type { Metadata, Viewport } from 'next';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { nunito } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nông Trại & Thế Giới Ảo 3D Online - Play Together Style',
  description:
    'Nông trại 3D: trồng trọt, chăn nuôi, du lịch 5 khu vực và trò chuyện cùng cư dân.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={nunito.variable}>
      <body className="relative select-none overflow-hidden">{children}</body>
    </html>
  );
}
