export const metadata = { title: 'آفلاین' };

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-black text-ink">اینترنت قطع است</h1>
      <p className="text-muted">وقتی اینترنت وصل شد، صفحه را دوباره باز کنید.</p>
    </main>
  );
}
