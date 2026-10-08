import type { MetadataRoute } from 'next';

const BRAND = process.env['NEXT_PUBLIC_BRAND_NAME'] ?? 'های مصالح';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND} | مصالح ساختمانی`,
    short_name: BRAND,
    description: 'تامین و حمل مصالح ساختمانی',
    lang: 'fa',
    dir: 'rtl',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#141414',
    theme_color: '#141414',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
