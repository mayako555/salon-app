"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCustomerById, Customer } from "@/lib/customers";
import { getCounselingByCustomer, CounselingResponse } from "@/lib/counseling";
import { getKarteByCustomer, KarteRecord } from "@/lib/karte";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ChevronLeft, 
  AlertTriangle, 
  Phone, 
  Calendar, 
  MapPin, 
  Clock, 
  MessageSquare,
  ClipboardList,
  Sparkles,
  Info,
  User,
  Heart,
  ShieldCheck,
  Camera,
  Mail,
  Home
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [counseling, setCounseling] = useState<CounselingResponse[]>([]);
  const [karteRecords, setKarteRecords] = useState<KarteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (typeof id !== 'string') return;
      const [cData, qData, kData] = await Promise.all([
        getCustomerById(id),
        getCounselingByCustomer(id),
        getKarteByCustomer(id)
      ]);
      setCustomer(cData);
      setCounseling(qData);
      setKarteRecords(kData);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="p-10 text-center animate-pulse text-slate-400">読み込み中...</div>;
  if (!customer) return <div className="p-10 text-center">お客様が見つかりませんでした</div>;

  const latestCounseling = counseling[0];

  return (
    <div className="pb-24 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className={`p-6 text-white pb-16 shadow-lg ${
        customer.risk_level === 'red' ? 'bg-gradient-to-br from-rose-900 to-rose-700' :
        customer.risk_level === 'yellow' ? 'bg-gradient-to-br from-amber-600 to-amber-500' :
        'bg-gradient-to-br from-slate-900 to-slate-800'
      }`}>
        <div className="max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-white/10 -ml-2 mb-6"
            onClick={() => router.back()}
          >
            <ChevronLeft size={20} className="mr-1" /> 戻る
          </Button>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-black border border-white/30 shadow-2xl">
                {customer.name[0]}
              </div>
              {customer.risk_level !== 'none' && (
                <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
                  customer.risk_level === 'red' ? 'bg-rose-500' : 'bg-amber-400'
                }`}>
                  <AlertTriangle size={16} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border border-white/10">
                  NO. {customer.customer_no || '---'}
                </span>
                <span className="text-white/60 text-xs font-bold">初来店: {customer.first_visit_date || '未設定'}</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight">{customer.name}</h1>
              <p className="text-white/70 text-sm font-bold tracking-wider">{customer.name_kana}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="-mt-10 px-4 max-w-2xl mx-auto space-y-6">
        {/* Risk Alerts */}
        {customer.risk_flags && customer.risk_flags.length > 0 && (
          <div className={`rounded-3xl p-5 shadow-xl border-2 flex items-start gap-4 ${
            customer.risk_level === 'red' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <AlertTriangle className={customer.risk_level === 'red' ? 'text-rose-600' : 'text-amber-500'} size={28} />
            <div className="flex-1">
              <h3 className={`font-black text-sm uppercase tracking-wider mb-1 ${
                customer.risk_level === 'red' ? 'text-rose-700' : 'text-amber-700'
              }`}>
                {customer.risk_level === 'red' ? 'CRITICAL ALERTS' : 'WARNING ALERTS'}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {customer.risk_flags.map((flag, i) => (
                  <span key={i} className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    customer.risk_level === 'red' ? 'bg-rose-200/50 text-rose-800' : 'bg-amber-200/50 text-amber-800'
                  }`}>
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Basic Info Tabs/Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-3xl p-6 border-none shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <User size={14} /> Basic Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><Phone size={16}/></div>
                <div className="text-sm font-bold text-slate-700">{customer.phone}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><Mail size={16}/></div>
                <div className="text-sm font-bold text-slate-700">{customer.email || 'メール未登録'}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><Home size={16}/></div>
                <div className="text-sm font-bold text-slate-700 leading-tight">
                  {customer.postal_code && <span className="block text-[10px] text-slate-400">〒{customer.postal_code}</span>}
                  {customer.address || '住所未登録'}
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl p-6 border-none shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={14} /> Consent & Permissions
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase">写真撮影</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${customer.photo_permission === 'yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                  {customer.photo_permission === 'yes' ? '同意' : '不同意'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase">SNS掲載</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${customer.sns_permission_scope !== 'no' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                  {customer.sns_permission_scope === 'full' ? '全体OK' : customer.sns_permission_scope === 'eyes' ? '目元のみ' : customer.sns_permission_scope === 'brows' ? '眉のみ' : '不同意'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase">DM / Email</span>
                <div className="flex gap-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${customer.dm_allowed ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>DM</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${customer.email_marketing_allowed ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>MAIL</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Karte History Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="text-amber-500" size={24} /> 施術カルテ履歴
            </h2>
            <Link href={`/staff-portal/customers/${id}/karte/new`}>
              <Button size="sm" className="bg-slate-900 text-white rounded-full px-4 font-bold text-xs">
                新規作成
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {karteRecords.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-transparent rounded-3xl">
                <p className="text-slate-400 text-sm font-medium">カルテの記録がまだありません</p>
              </Card>
            ) : (
              karteRecords.map((record) => (
                <Card key={record.id} className="rounded-3xl p-6 border-none shadow-sm space-y-4 overflow-hidden relative">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 w-12 h-12 rounded-2xl flex items-center justify-center text-slate-600 flex-col leading-none">
                        <span className="text-[10px] font-bold">{format(record.date?.toDate?.() || record.date, "yyyy")}</span>
                        <span className="text-lg font-black">{format(record.date?.toDate?.() || record.date, "MM/dd")}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800 uppercase tracking-wider">{record.service_type.replace('_', ' ')}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">{record.visit_type}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> 担当: {record.staff_name}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Menu</p>
                      <p className="text-sm font-black text-slate-700">{record.service_type === 'eyelash_ext' ? 'エクステ' : record.service_type === 'lash_lift' ? 'パーマ' : 'アイブロウ'}</p>
                    </div>
                    {record.design.curl && <div className="bg-slate-50 p-3 rounded-2xl"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Curl/Thick/Len</p><p className="text-sm font-black text-slate-700">{record.design.curl}/{record.design.thickness}/{record.design.length}</p></div>}
                    <div className="bg-slate-900 p-3 rounded-2xl col-span-2 flex justify-between items-center text-white">
                      <div>
                        <p className="text-[9px] font-black opacity-50 uppercase mb-0.5">Total Count</p>
                        <p className="text-lg font-black">{record.design.count}本</p>
                      </div>
                      <div className="text-right flex gap-3">
                        <div className="border-r border-white/10 pr-3">
                          <p className="text-[8px] font-bold opacity-40 uppercase">L</p>
                          <p className="text-xs font-black">{record.design.left_total || 0}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold opacity-40 uppercase">R</p>
                          <p className="text-xs font-black">{record.design.right_total || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(record.design.left_added || record.design.right_added) && (
                    <div className="flex gap-2">
                      <div className="flex-1 bg-emerald-50/50 border border-emerald-100 rounded-xl p-2 text-center">
                        <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Refill Details</p>
                        <div className="flex justify-around items-center">
                          <div className="text-[10px] font-bold text-slate-400">L: {record.design.left_remaining}+{record.design.left_added}</div>
                          <div className="w-px h-3 bg-emerald-100" />
                          <div className="text-[10px] font-bold text-slate-400">R: {record.design.right_remaining}+{record.design.right_added}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {record.eye_diagram_url && (
                    <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100 flex justify-center">
                      <img src={record.eye_diagram_url} className="max-h-48 object-contain rounded-xl" alt="Eye Diagram" />
                    </div>
                  )}

                  {(record.before_photo_url || record.after_photo_url) && (
                    <div className="flex gap-3">
                      {record.before_photo_url && (
                        <div className="flex-1 space-y-1">
                          <p className="text-[8px] font-black text-slate-300 uppercase text-center">Before</p>
                          <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
                            <img src={record.before_photo_url} className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}
                      {record.after_photo_url && (
                        <div className="flex-1 space-y-1">
                          <p className="text-[8px] font-black text-slate-300 uppercase text-center">After</p>
                          <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-emerald-100 shadow-inner">
                            <img src={record.after_photo_url} className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {record.notes && (
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">{record.notes}</p>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Counseling History Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 px-1">
            <ClipboardList className="text-blue-500" size={24} /> カウンセリング・同意書
          </h2>
          <div className="space-y-3">
            {counseling.map((entry) => (
              <Card key={entry.id} className="rounded-3xl p-5 border-none shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                      <ClipboardList size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{entry.service_types.join(' / ')}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {format(entry.created_at?.toDate?.() || entry.created_at, "yyyy/MM/dd HH:mm")}
                      </p>
                    </div>
                  </div>
                  {entry.signature_url && (
                    <div className="bg-slate-50 p-1 rounded-lg border border-slate-100">
                      <img src={entry.signature_url} className="h-10 w-20 object-contain grayscale opacity-50" />
                    </div>
                  )}
                </div>
                
                {/* Risk Preview in History */}
                {entry.risk_flags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.risk_flags.map((flag, i) => (
                      <span key={i} className="text-[9px] font-black bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded uppercase">
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
                
                <Link href={`/staff-portal/customers/${id}/counseling/${entry.id}`}>
                  <Button variant="ghost" className="w-full text-xs font-bold text-blue-600 hover:bg-blue-50/50 py-2 h-auto">
                    詳細を確認する
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
