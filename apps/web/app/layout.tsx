import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import './globals.css';
import '@/components/ui.css';
import { ConsultModal } from '@/components/consult-modal';
import { Providers } from './providers';

// Self-hosted: Google Fonts and other CDNs are unreliable from Iran.
const vazirmatn = localFont({
  src: './fonts/Vazirmatn-Variable.woff2',
  variable: '--font-vazirmatn',
  weight: '100 900',
  display: 'swap',
});

const BRAND = process.env['NEXT_PUBLIC_BRAND_NAME'] ?? 'های مصالح';

export const metadata: Metadata = {
  title: { default: BRAND, template: `%s | ${BRAND}` },
  description: 'تامین و حمل مصالح ساختمانی',
  applicationName: BRAND,
};

export const viewport: Viewport = {
  themeColor: '#141414',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="min-h-dvh font-sans">
        <Providers>
          {children}
          <ConsultModal />
        </Providers>
      </body>
    </html>
  );
}
