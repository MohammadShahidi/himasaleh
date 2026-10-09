import {
  IconAlertCircle, IconAlertTriangle, IconArrowLeft, IconArrowRight, IconBrandInstagram, IconBrandLinkedin, IconBrandTelegram, IconBrandWhatsapp, IconBuilding, IconBuildingSkyscraper, IconBuildingStore, IconCash, IconCheck, IconChevronDown, IconChevronLeft, IconChevronUp, IconCircleCheck, IconClock, IconCurrentLocation, IconDeviceMobile, IconDiscount, IconDiscountCheck, IconDownload, IconFileInvoice, IconGift, IconHandFinger, IconHeadset, IconHelmet, IconHome, IconId, IconInfoCircle, IconLayoutColumns, IconLayoutDashboard, IconLoader2, IconLockDollar, IconMail, IconMap2, IconMapPin, IconMapPinFilled, IconMenu2, IconMessage2, IconMessageQuestion, IconMinus, IconPackage, IconPercentage, IconPhone, IconPlus, IconPointFilled, IconReceipt2, IconRefresh, IconSearch, IconSend, IconShieldCheck, IconShieldLock, IconShovel, IconSteeringWheel, IconSwitchHorizontal, IconTools, IconTruck, IconTruckDelivery, IconUser, IconUserCircle, IconUserStar, IconWall, IconX,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import type { CSSProperties } from 'react';

/**
 * The designs use Tabler's webfont (`<i class="ti ti-truck">`). We render the same icons as
 * tree-shaken SVGs instead of shipping the whole font; add a name here when a design needs it.
 */
const ICONS = {
  'alert-circle': IconAlertCircle,
  'alert-triangle': IconAlertTriangle,
  'arrow-left': IconArrowLeft,
  'arrow-right': IconArrowRight,
  'brand-instagram': IconBrandInstagram,
  'brand-linkedin': IconBrandLinkedin,
  'brand-telegram': IconBrandTelegram,
  'brand-whatsapp': IconBrandWhatsapp,
  'building': IconBuilding,
  'building-skyscraper': IconBuildingSkyscraper,
  'building-store': IconBuildingStore,
  'cash': IconCash,
  'check': IconCheck,
  'chevron-down': IconChevronDown,
  'chevron-left': IconChevronLeft,
  'chevron-up': IconChevronUp,
  'circle-check': IconCircleCheck,
  'clock': IconClock,
  'current-location': IconCurrentLocation,
  'device-mobile': IconDeviceMobile,
  'discount': IconDiscount,
  'discount-check': IconDiscountCheck,
  'download': IconDownload,
  'file-invoice': IconFileInvoice,
  'gift': IconGift,
  'hand-finger': IconHandFinger,
  'headset': IconHeadset,
  'helmet': IconHelmet,
  'home': IconHome,
  'id': IconId,
  'info-circle': IconInfoCircle,
  'layout-columns': IconLayoutColumns,
  'layout-dashboard': IconLayoutDashboard,
  'loader-2': IconLoader2,
  'lock-dollar': IconLockDollar,
  'mail': IconMail,
  'map-2': IconMap2,
  'map-pin': IconMapPin,
  'map-pin-filled': IconMapPinFilled,
  'menu-2': IconMenu2,
  'message-2': IconMessage2,
  'message-question': IconMessageQuestion,
  'minus': IconMinus,
  'package': IconPackage,
  'percentage': IconPercentage,
  'phone': IconPhone,
  'plus': IconPlus,
  'point-filled': IconPointFilled,
  'receipt-2': IconReceipt2,
  'refresh': IconRefresh,
  'search': IconSearch,
  'send': IconSend,
  'shield-check': IconShieldCheck,
  'shield-lock': IconShieldLock,
  'shovel': IconShovel,
  'steering-wheel': IconSteeringWheel,
  'switch-horizontal': IconSwitchHorizontal,
  'tools': IconTools,
  'truck': IconTruck,
  'truck-delivery': IconTruckDelivery,
  'user': IconUser,
  'user-circle': IconUserCircle,
  'user-star': IconUserStar,
  'wall': IconWall,
  'x': IconX,
} satisfies Record<string, TablerIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, style, className }: { name: IconName; size?: number; style?: CSSProperties; className?: string }) {
  const C = ICONS[name];
  return <C size={size} stroke={1.75} style={{ flex: 'none', ...style }} className={className} aria-hidden />;
}
