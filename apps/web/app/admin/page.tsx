import { PanelPlaceholder } from '@/components/panel-placeholder';

export const metadata = { title: 'پنل مدیریت' };

export default function AdminPanel() {
  return <PanelPlaceholder roles={['staff']} title="پنل مدیریت" phase="فاز ۳" />;
}
