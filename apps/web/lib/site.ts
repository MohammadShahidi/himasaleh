import type { IconName } from '@/components/icon';

/**
 * Site content defaults. In phase 4 these come from the CMS («محتوای سایت»);
 * until then this file is the single source, so header, footer and the public pages cannot disagree.
 */
export const SITE = {
  brandAccent: 'های',
  brandRest: 'مصالح',
  brandEn: 'Hi Masaleh',
  tagline: 'مصالح ساختمانی با کیفیت، مطمئن، ماندگار',
  phone: '021-91301752',
  mobile: '0998-717-1752',
  email: 'info@hymasaleh.com',
  address: 'فردیس، بلوار امام خمینی، خیابان شهید قدیمی، نبش کوچه اقاقیا، پلاک ۲۲',
  // Exact pin given by the owner.
  geo: { lat: 35.7205642, lon: 50.9650277 },
  foundedYear: '۱۴۰۵',
  footerAbout: 'تامین و عرضه انواع مصالح ساختمانی با بهترین کیفیت و قیمت مناسب برای ساخت آینده‌ای بهتر',
  copyright: 'تمام حقوق این سایت متعلق به های مصالح می‌باشد.',
  hours: [
    { d: 'شنبه تا چهارشنبه', t: '۸:۰۰ تا ۱۸:۰۰' },
    { d: 'پنجشنبه', t: '۸:۰۰ تا ۱۳:۰۰' },
    { d: 'جمعه و تعطیلات', t: 'تعطیل' },
  ],
  socials: [
    { icon: 'brand-whatsapp', href: 'https://wa.me/989987171752' },
    { icon: 'brand-telegram', href: '#' },
    { icon: 'brand-linkedin', href: '#' },
    { icon: 'brand-instagram', href: '#' },
  ] satisfies { icon: IconName; href: string }[],
};

export const telHref = (n: string) => `tel:${n.replace(/\D/g, '')}`;

export interface Category {
  key: string;
  icon: IconName;
  name: string;
  img: string;
  desc: string;
  subs: string[];
}

export const CATEGORIES: Category[] = [
  { key: 'cement', icon: 'package', name: 'سیمان و افزودنی‌ها', img: '/c1.jpg', desc: 'انواع سیمان پرتلند و سفید، چسب و ملات آماده و افزودنی‌های تخصصی بتن.', subs: ['سیمان پرتلند', 'سیمان سفید', 'چسب و ملات', 'افزودنی بتن'] },
  { key: 'steel', icon: 'layout-columns', name: 'آهن آلات', img: '/c2.jpg', desc: 'میلگرد، تیرآهن، ناودانی، نبشی و ورق برای اسکلت و سازه‌های فلزی.', subs: ['میلگرد', 'تیرآهن', 'ناودانی و نبشی', 'ورق و پروفیل'] },
  { key: 'brick', icon: 'wall', name: 'انواع آجر و بلوک', img: '/c3.jpg', desc: 'آجر فشاری و نما، سفال و بلوک‌های سیمانی و سبک.', subs: ['آجر فشاری و نما', 'آجر سفال', 'بلوک سیمانی', 'بلوک سبک'] },
  { key: 'sand', icon: 'shovel', name: 'شن، ماسه و مصالح', img: '/c4.jpg', desc: 'ماسه شسته و بادی، شن دانه‌بندی‌شده، پوکه و گچ.', subs: ['ماسه', 'شن', 'پوکه و گچ'] },
  { key: 'pipe', icon: 'tools', name: 'لوله و اتصالات', img: '/c5.jpg', desc: 'لوله‌های پلی‌اتیلن، پنج‌لایه و PVC به همراه اتصالات و شیرآلات.', subs: ['لوله پلی‌اتیلن', 'لوله پنج‌لایه', 'لوله PVC', 'اتصالات و شیرآلات'] },
];

export const categoryHref = (key: string, sub?: string) => `/products?cat=${key}${sub ? `&sub=${encodeURIComponent(sub)}` : ''}`;

export type SiteSection = 'home' | 'products' | 'categories' | 'about' | 'contact' | '';

/** Opens the consultation form (ConsultModal) from anywhere, as the designs do. */
export function openConsult(detail: { topic?: string; ctx?: string } = {}) {
  window.dispatchEvent(new CustomEvent('hm:consult', { detail }));
}
