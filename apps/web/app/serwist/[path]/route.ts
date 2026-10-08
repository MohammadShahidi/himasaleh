import { createSerwistRoute } from '@serwist/turbopack';

// Builds and serves the service worker at /serwist/sw.js.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: 'app/sw.ts',
  useNativeEsbuild: true,
});
