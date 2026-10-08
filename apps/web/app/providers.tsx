'use client';

import { SerwistProvider } from '@serwist/turbopack/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Panels refresh every 20 s while visible (architecture §3.4); no WebSocket.
            refetchInterval: 20_000,
            refetchIntervalInBackground: false,
            retry: 1,
          },
        },
      }),
  );
  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === 'development'}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SerwistProvider>
  );
}
