import { SiteHeader } from '@/components/site/site-header';
import { DriverWizard } from './wizard';

export const metadata = { title: 'ثبت‌نام راننده' };

export default function DriverRegister() {
  return (
    <>
      <SiteHeader active="" />
      <DriverWizard />
    </>
  );
}
