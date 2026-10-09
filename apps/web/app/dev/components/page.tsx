import { notFound } from 'next/navigation';
import { WaybillCard } from '@/components/waybill-card';
import { MapDemo } from './map-demo';

// Development-only gallery for components that have no real page yet. 404 in production.
export default function ComponentsPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main dir="rtl" style={{ minHeight: '100dvh', background: '#F4F4F5', padding: '24px 16px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>پیش‌نمایش کامپوننت‌ها (فقط محیط توسعه)</h1>
        <WaybillCard
          data={{
            no: '۱۴۰۵۰۷۱۲-۸۸۴۱', status: 'در مسیر', track: 'HM-58213',
            fromTitle: 'مصالح فروشی البرز — کرج', fromAddr: 'کرج، جاده ملارد، بعد از پل فردیس', distance: '۴۲ کیلومتر',
            toTitle: 'کارگاه پروژه ونک', toAddr: 'تهران، ونک، خیابان ملاصدرا، پلاک ۱۸',
            rows: [{ k: 'کالا', v: 'سیمان پرتلند تیپ ۲ — ۲۰۰ کیسه' }, { k: 'وزن', v: '۱۰ تن' }, { k: 'کرایه', v: '۸٬۵۰۰٬۰۰۰ تومان' }, { k: 'نوع پرداخت', v: 'پرداخت‌شده به های مصالح' }],
            driverName: 'حسن کریمی', vehicle: 'کامیون ۱۰ چرخ کفی', plate: { a: '12', letter: 'ع', b: '345', region: '67' },
            notes: ['پوشاندن بار با برزنت الزامی است', 'کیسه‌ها هنگام بارگیری و تحویل شمرده شوند'],
          }}
        />
        <MapDemo />
      </div>
    </main>
  );
}
