import { OwnerVideo } from './owner-video';

export const metadata = { title: 'ویدیو رضایت مالک خودرو', robots: { index: false } };

export default async function OwnerVideoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OwnerVideo token={token} />;
}
