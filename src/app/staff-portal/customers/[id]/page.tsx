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
  Home,
  Edit2,
  History,
  CheckCircle2,
  Link as LinkIcon
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";
import { toast } from "sonner";
import { updateCustomer } from "@/lib/customers";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [counseling, setCounseling] = useState<CounselingResponse[]>([]);
  const [karteRecords, setKarteRecords] = useState<KarteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for History Modal
  const [selectedHistoryKarte, setSelectedHistoryKarte] = useState<KarteRecord | null>(null);
  
  // State for Edit Customer
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // State for LINE Link QR
  const [isLinkQrOpen, setIsLinkQrOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

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

  const handleEditClick = () => {
    if (!customer) return;
    setEditFormData({
      name: customer.name,
      name_kana: customer.name_kana,
      phone: customer.phone,
      email: customer.email,
      postal_code: customer.postal_code,
      address: customer.address,
      birthday: customer.birthday,
      customer_no: customer.customer_no,
      gender: customer.gender,
      is_minimo: customer.is_minimo,
      allergies: customer.allergies || [],
      risk_flags: customer.risk_flags || [],
    });
    setIsEditOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (typeof id !== 'string') return;
    setIsSaving(true);
    const res = await updateCustomer(id, editFormData);
    if (res.success) {
      toast.success("情報を更新しました");
      setCustomer({ ...customer!, ...editFormData });
      setIsEditOpen(false);
    } else {
      toast.error("更新に失敗しました");
    }
    setIsSaving(false);
  };

  const handleShowLinkQr = () => {
    setLinkUrl(window.location.origin + `/link-line/${id}`);
    setIsLinkQrOpen(true);
  };

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
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2"><User size={14} /> Basic Information</span>
              <Button variant="ghost" size="sm" onClick={handleEditClick} className="h-6 w-6 p-0 text-slate-400 hover:text-slate-900">
                <Edit2 size={12} />
              </Button>
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
              <div className="pt-2">
                {customer.line_user_id ? (
                  <div className="flex items-center gap-2 bg-emerald-50 p-2.5 rounded-xl text-emerald-700 text-xs font-bold">
                    <div className="w-5 h-5 bg-[#06C755] rounded-full flex items-center justify-center text-white"><CheckCircle2 size={12}/></div>
                    LINE連携済み
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full rounded-xl border-[#06C755] text-[#06C755] hover:bg-emerald-50 gap-2 font-bold"
                    onClick={handleShowLinkQr}
                  >
                    <LinkIcon size={14} /> LINE連携用QRを表示
                  </Button>
                )}
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
            <div className="flex gap-2">
              <Link href={`/staff-portal/customers/${id}/treatment-results`}>
                <Button size="sm" variant="outline" className="rounded-full px-4 font-bold text-xs border-amber-200 text-amber-700 hover:bg-amber-50">
                  <Sparkles size={14} className="mr-1" /> トリートメント経過
                </Button>
              </Link>
              <Link href={`/staff-portal/customers/${id}/karte/new`}>
                <Button size="sm" className="bg-slate-900 text-white rounded-full px-4 font-bold text-xs">
                  新規作成
                </Button>
              </Link>
            </div>
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
                        <span className="text-[10px] font-bold">{format(record.date?.toDate?.() || record.date || new Date(), "yyyy")}</span>
                        <span className="text-lg font-black">{format(record.date?.toDate?.() || record.date || new Date(), "MM/dd")}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800 uppercase tracking-wider">{(record.service_type || 'other').replace('_', ' ')}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">{record.visit_type}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> 担当: {record.staff_name}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {record.edit_history && record.edit_history.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setSelectedHistoryKarte(record)} className="h-8 px-2 text-xs font-bold text-slate-500">
                          <History size={14} className="mr-1" /> 履歴
                        </Button>
                      )}
                      <Link href={`/staff-portal/customers/${id}/karte/${record.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 bg-slate-50">
                          <Edit2 size={14} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Menu</p>
                      <p className="text-sm font-black text-slate-700">{record.service_type === 'eyelash_ext' ? 'エクステ' : record.service_type === 'lash_lift' ? 'パーマ' : record.service_type === 'eyebrow' ? 'アイブロウ' : 'その他'}</p>
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

                  {record.photos && record.photos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Camera size={12}/> 施術写真</p>
                      <div className="grid grid-cols-2 gap-3">
                        {record.photos.map((photo, i) => (
                          <div key={i} className="space-y-1">
                            <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
                              <img src={photo.url} className="w-full h-full object-cover" />
                            </div>
                            {photo.description && <p className="text-[10px] text-slate-500 font-bold px-1">{photo.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {record.treatment_photos && record.treatment_photos.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><Sparkles size={12}/> 経過写真</p>
                      <div className="grid grid-cols-2 gap-3">
                        {record.treatment_photos.map((photo, i) => (
                          <div key={i} className="space-y-1">
                            <div className="aspect-square bg-emerald-50/50 rounded-2xl overflow-hidden border border-emerald-100 shadow-inner">
                              <img src={photo.url} className="w-full h-full object-cover" />
                            </div>
                            {photo.description && <p className="text-[10px] text-slate-500 font-bold px-1">{photo.description}</p>}
                          </div>
                        ))}
                      </div>
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

        {/* Scanned Charts (Visual Check) Section */}
        {customer.chart_image_urls && customer.chart_image_urls.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 px-1">
              <Camera className="text-blue-500" size={24} /> スキャン済み紙カルテ (目視確認)
            </h2>
            <Card className="rounded-3xl p-6 border-none shadow-sm space-y-6">
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {customer.chart_image_urls.map((url, i) => (
                  <Dialog key={i}>
                    <DialogTrigger asChild>
                      <button className="relative flex-shrink-0 w-32 h-44 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm hover:scale-105 transition-transform bg-white group">
                        <img src={url} alt={`Scanned page ${i+1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                          <Info className="text-white opacity-0 group-hover:opacity-100" size={24} />
                        </div>
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                          #{i+1}
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden bg-black/95 border-none rounded-none sm:rounded-[2rem]">
                      <div className="relative w-full h-full flex items-center justify-center p-4">
                        <img src={url} className="max-w-full max-h-full object-contain shadow-2xl" alt="Full scan" />
                        <div className="absolute top-6 left-6 text-white bg-black/40 backdrop-blur-md px-4 py-2 rounded-full font-black text-sm border border-white/20">
                          スキャン原本 #{i+1}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>

              {customer.notes && (
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <ClipboardList size={10} /> インポート時のAI書き起こしメモ
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                    {customer.notes}
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

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
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{(entry.service_types || []).join(' / ') || '未設定'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {format(entry.created_at?.toDate?.() || entry.created_at || new Date(), "yyyy/MM/dd HH:mm")}
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
                {(entry.risk_flags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.risk_flags?.map((flag, i) => (
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

      {/* Edit History Modal */}
      {selectedHistoryKarte && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <History className="text-blue-500" size={18} /> 編集履歴
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedHistoryKarte(null)} className="h-8 w-8 p-0 rounded-full">
                X
              </Button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              {[...selectedHistoryKarte.edit_history || []].reverse().map((hist, index) => (
                <div key={index} className="border-l-2 border-slate-200 pl-4 py-1 relative">
                  <div className="absolute w-2 h-2 bg-blue-500 rounded-full -left-[5px] top-2" />
                  <p className="text-xs font-black text-slate-500 mb-1">
                    {format(new Date(hist.edited_at), "yyyy/MM/dd HH:mm")} 
                    <span className="font-normal text-slate-400 ml-2">by {hist.edited_by_name}</span>
                  </p>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 font-medium">
                    {/* Render a brief summary of what the previous state was, since showing the entire karte map is too big */}
                    <p><span className="font-bold">担当:</span> {hist.previous_data.staff_name}</p>
                    <p><span className="font-bold">総仕上がり:</span> {hist.previous_data.design?.count}本</p>
                    {hist.previous_data.notes && <p className="mt-1 text-slate-500 italic">"{hist.previous_data.notes}"</p>}
                    <p className="text-[10px] text-slate-400 mt-2">※ 編集前のデータのスナップショットが保存されています</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">顧客情報の編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">お名前</label>
                <Input value={editFormData.name || ""} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">フリガナ</label>
                <Input value={editFormData.name_kana || ""} onChange={e => setEditFormData({...editFormData, name_kana: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">性別</label>
                <Select value={editFormData.gender} onValueChange={(v: any) => setEditFormData({...editFormData, gender: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">女性</SelectItem>
                    <SelectItem value="male">男性</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">電話番号</label>
                <Input value={editFormData.phone || ""} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">お客様No.</label>
                <Input value={editFormData.customer_no || ""} onChange={e => setEditFormData({...editFormData, customer_no: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">メールアドレス</label>
              <Input value={editFormData.email || ""} onChange={e => setEditFormData({...editFormData, email: e.target.value})} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">郵便番号</label>
                <Input value={editFormData.postal_code || ""} onChange={e => setEditFormData({...editFormData, postal_code: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">住所</label>
                <Input value={editFormData.address || ""} onChange={e => setEditFormData({...editFormData, address: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">集客ルート</label>
              <div className="flex items-center gap-2 mt-1">
                <input 
                  type="checkbox" 
                  id="is_minimo" 
                  checked={editFormData.is_minimo} 
                  onChange={e => setEditFormData({...editFormData, is_minimo: e.target.checked})}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="is_minimo" className="text-sm font-bold text-slate-700">ミニモからの集客</label>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">アレルギー・特記事項</label>
              <Textarea 
                value={editFormData.risk_flags?.join('\n') || ""} 
                onChange={e => setEditFormData({...editFormData, risk_flags: e.target.value.split('\n')})} 
                placeholder="注意点を一行ずつ入力"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>キャンセル</Button>
            <Button onClick={handleSaveCustomer} className="bg-slate-900" disabled={isSaving}>保存する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LINE Link QR Dialog */}
      <Dialog open={isLinkQrOpen} onOpenChange={setIsLinkQrOpen}>
        <DialogContent className="sm:max-w-xs rounded-[2rem] text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">LINE連携用QR</DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-6">
            <div className="p-4 bg-white rounded-3xl shadow-xl border border-slate-100">
              <QRCodeSVG 
                value={linkUrl} 
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-700">お客様のスマホで読み取ってください</p>
              <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
                スキャンするとLINEログイン画面が開きます。<br/>
                連携が完了すると、LINEでのお知らせが可能になります。
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setIsLinkQrOpen(false)} className="rounded-xl w-full">
            閉じる
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
