import type { Metadata } from 'next';
import AvailabilityView from './view';
export const metadata: Metadata = { title: '空き状況 | SALON AGENT', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function Page({ params }: { params: Promise<{token:string}> }) {
  const { token } = await params;
  return <AvailabilityView key={token} token={token}/>;
}
