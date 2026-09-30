import type { Metadata } from 'next';
import DemoApp from '@/components/demo/DemoApp';
export const metadata:Metadata={title:'SALON AGENT | 営業デモ',robots:{index:false,follow:false},description:'架空のデータでSALON AGENTの操作を体験できます。'};
export default function DemoPage() {return <DemoApp/>;}
