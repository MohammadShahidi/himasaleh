import type { IconName } from '@/components/icon';

/**
 * Site content defaults from the designs. In phase 4 these come from the CMS («محتوای سایت»);
 * until then this file is the single source, so header and footer cannot disagree.
 */
export const SITE = {
  brandAccent: 'های',
  brandRest: 'مصالح',
  // The header design showed 021-17245678 and the footer/CMS default 021-17345678; the CMS default is used.
  phone: '021-17345678',
  mobile: '0912-173-4567',
  email: 'info@hymasaleh.com',
  address: 'تهران، بازار آهن، مجتمع تجاری، طبقه ۲، واحد ۵',
  footerAbout: 'تامین و عرضه انواع مصالح ساختمانی با بهترین کیفیت و قیمت مناسب برای ساخت آینده‌ای بهتر',
  copyright: 'تمام حقوق این سایت متعلق به های مصالح می‌باشد.',
  socials: [
    { icon: 'brand-whatsapp', href: '#' },
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
  subs: string[];
}

export const CATEGORIES: Category[] = [
  { key: 'cement', icon: 'package', name: 'سیمان و افزودنی‌ها', subs: ['سیمان پرتلند', 'سیمان سفید', 'چسب و ملات', 'افزودنی بتن'] },
  { key: 'steel', icon: 'layout-columns', name: 'آهن آلات', subs: ['میلگرد', 'تیرآهن', 'ناودانی و نبشی', 'ورق و پروفیل'] },
  { key: 'brick', icon: 'wall', name: 'انواع آجر و بلوک', subs: ['آجر فشاری و نما', 'آجر سفال', 'بلوک سیمانی', 'بلوک سبک'] },
  { key: 'sand', icon: 'shovel', name: 'شن، ماسه و مصالح', subs: ['ماسه', 'شن', 'پوکه و گچ'] },
  { key: 'pipe', icon: 'tools', name: 'لوله و اتصالات', subs: ['لوله پلی‌اتیلن', 'لوله پنج‌لایه', 'لوله PVC', 'اتصالات و شیرآلات'] },
];

export const categoryHref = (key: string, sub?: string) => `/products?cat=${key}${sub ? `&sub=${encodeURIComponent(sub)}` : ''}`;

export type SiteSection = 'home' | 'products' | 'categories' | 'about' | 'contact' | '';

/** Opens the consultation form (ConsultModal) from anywhere, as the designs do. */
export function openConsult(detail: { topic?: string; ctx?: string } = {}) {
  window.dispatchEvent(new CustomEvent('hm:consult', { detail }));
}
