'use client';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { isDemoPath } from '@/lib/demo/route';
// Keep Firebase initialization and authenticated server-action clients out of the demo import graph.
const ProductionShell=dynamic(()=>import('./ProductionShell'));
export default function RuntimeShell({children}:{children:React.ReactNode}) {
 const pathname=usePathname();
 return isDemoPath(pathname) ? <>{children}</> : <ProductionShell>{children}</ProductionShell>;
}
