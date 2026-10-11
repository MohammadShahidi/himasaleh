import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHero } from '@/components/site/page-hero';
import { PublicPage } from '@/components/site/public-page';
import { ProductsView } from './products-view';

export const metadata: Metadata = {
  title: 'محصولات',
  description: 'انواع مصالح ساختمانی: سیمان، آهن‌آلات، آجر و بلوک، شن و ماسه، لوله و اتصالات. قیمت روز را استعلام بگیرید.',
};

export default function ProductsPage() {
  return (
    <PublicPage active="products">
      <PageHero title="محصولات های مصالح" crumb="محصولات" subtitle="تمام مصالح مورد نیاز پروژه‌تان را بر اساس دسته‌بندی و زیرگروه پیدا کنید و قیمت روز را استعلام بگیرید." />
      <Suspense>
        <ProductsView />
      </Suspense>
    </PublicPage>
  );
}
