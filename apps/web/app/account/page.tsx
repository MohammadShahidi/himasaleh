import { PanelPlaceholder } from '@/components/panel-placeholder';

export const metadata = { title: 'پنل کاربری' };

export default function Account() {
  return <PanelPlaceholder roles={['personal', 'contractor']} title="پنل کاربری" phase="فاز ۲ (سفارش)" />;
}
