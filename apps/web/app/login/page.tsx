import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginFlow } from './login-flow';

export const metadata: Metadata = { title: 'ورود و ثبت‌نام' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-5">
      <Suspense>
        <LoginFlow />
      </Suspense>
    </main>
  );
}
