import Link from 'next/link';

// Placeholder until the updated home page design arrives (phase 4).
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <img src="/logo-dark.png" alt="" className="h-16 w-auto" />
      <h1 className="text-3xl font-black text-ink">
        <span className="text-orange">های</span> مصالح
      </h1>
      <p className="text-muted">نسخهٔ در حال ساخت — فاز ۰</p>
      <Link href="/login" className="rounded-xl bg-orange px-6 py-3 font-extrabold text-white shadow-lg shadow-orange/30">
        ورود / ثبت‌نام
      </Link>
    </main>
  );
}
