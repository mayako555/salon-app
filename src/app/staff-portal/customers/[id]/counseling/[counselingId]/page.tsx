"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCustomerById, Customer } from "@/lib/customers";
import { getCounselingByCustomer, CounselingResponse } from "@/lib/counseling";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ChevronLeft, 
  ClipboardList, 
  AlertTriangle,
  Clock,
  User,
  Heart,
  ShieldCheck,
  Signature
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function CounselingDetailPage() {
  const { id, counselingId } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [response, setResponse] = useState<CounselingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (typeof id !== 'string' || typeof counselingId !== 'string') return;
      const [cData, qData] = await Promise.all([
        getCustomerById(id),
        getCounselingByCustomer(id)
      ]);
      setCustomer(cData);
      const found = qData.find(q => q.id === counselingId);
      setResponse(found || null);
      setLoading(false);
    }
    load();
  }, [id, counselingId]);

  if (loading) return <div className="p-10 text-center animate-pulse text-slate-400">読み込み中...</div>;
  if (!response || !customer) return <div className="p-10 text-center">データが見つかりませんでした</div>;

  const renderAnswer = (label: string, value: any) => {
    if (value === undefined || value === null) return null;
    let displayValue = value;
    if (Array.isArray(value)) displayValue = value.join('、');
    if (value === 'yes') displayValue = 'はい';
    if (value === 'no') displayValue = 'いいえ';
    
    return (
      <div className="flex justify-between items-start py-3 border-b border-slate-50">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">{label}</span>
        <span className="text-sm font-bold text-slate-700 text-right flex-1">{displayValue}</span>
      </div>
    );
  };

  return (
    <div className="pb-24 bg-slate-50 min-h-screen">
      <div className={`p-6 text-white pb-16 shadow-lg ${
        response.risk_level === 'red' ? 'bg-gradient-to-br from-rose-900 to-rose-700' :
        response.risk_level === 'yellow' ? 'bg-gradient-to-br from-amber-600 to-amber-500' :
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
          
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <ClipboardList size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">カウンセリング回答詳細</h1>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
                {customer.name} 様 | {format(response.created_at?.toDate?.() || response.created_at, "yyyy/MM/dd HH:mm")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="-mt-10 px-4 max-w-2xl mx-auto space-y-6">
        {/* Risk Flags */}
        {response.risk_flags.length > 0 && (
          <Card className={`p-5 rounded-3xl shadow-xl border-2 ${
            response.risk_level === 'red' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className={response.risk_level === 'red' ? 'text-rose-600' : 'text-amber-500'} size={20} />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">リスクアラート詳細</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {response.risk_flags.map((flag, i) => (
                <span key={i} className={`text-xs font-black px-3 py-1.5 rounded-xl ${
                  response.risk_level === 'red' ? 'bg-rose-600 text-white shadow-md' : 'bg-amber-400 text-white shadow-md'
                }`}>
                  {flag}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Answers Sections */}
        <Card className="rounded-3xl p-6 border-none shadow-sm space-y-8">
          <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">基本質問 / 共通</h3>
            <div className="space-y-1">
              {renderAnswer("性別", response.gender === 'female' ? '女性' : '男性')}
              {renderAnswer("サービス", response.service_types.join(' / '))}
              {renderAnswer("アレルギーの有無", response.answers.allergies_present)}
              {renderAnswer("アレルギー内容", response.answers.allergies)}
              {renderAnswer("薬品アレルギー", response.answers.drug_allergy)}
              {renderAnswer("美容整形・レーシック歴", response.answers.surgery_history)}
              {renderAnswer("手術内容・部位", response.answers.surgery_content)}
              {renderAnswer("目元・肌の疾患", response.answers.skin_inflammation)}
              {renderAnswer("パッチテスト希望", response.answers.patch_test_request)}
            </div>
          </section>

          {(response.service_types.includes('eyebrow') || response.service_types.includes('brow_gym_men')) && (
            <section className="space-y-4">
              <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest border-b border-emerald-50 pb-2">アイブロウ・WAX</h3>
              <div className="space-y-1">
                {renderAnswer("WAX経験", response.answers.wax_experience)}
                {renderAnswer("ピーリング歴", response.answers.peeling_history)}
                {renderAnswer("イベント予定", response.answers.important_event)}
              </div>
            </section>
          )}

          {(response.service_types.includes('eyelash_ext') || response.service_types.includes('lash_lift') || response.service_types.includes('and_healthy')) && (
            <section className="space-y-4">
              <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest border-b border-amber-50 pb-2">まつ毛（エクステ・パーマ）</h3>
              <div className="space-y-1">
                {renderAnswer("まつ毛エクステ経験", response.answers.eyelash_ext_experience)}
                {renderAnswer("まつ毛パーマ経験", response.answers.lash_lift_experience)}
                {renderAnswer("コンタクト使用", response.answers.contact_lens)}
                {renderAnswer("体調", response.answers.body_condition)}
              </div>
            </section>
          )}

          {response.gender === 'female' && (
            <section className="space-y-4">
              <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest border-b border-rose-50 pb-2">女性特有の確認事項</h3>
              <div className="space-y-1">
                {renderAnswer("妊娠中", response.answers.pregnancy)}
                {renderAnswer("授乳中", response.answers.lactation)}
                {renderAnswer("生理中", response.answers.menstruation)}
              </div>
            </section>
          )}
        </Card>

        {/* Signature */}
        {response.signature_url && (
          <Card className="rounded-3xl p-6 border-none shadow-sm space-y-4 text-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <Signature size={14} /> Digital Signature
            </h3>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex justify-center">
              <img src={response.signature_url} className="max-h-32 object-contain" alt="Signature" />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Signed At: {format(response.signed_at?.toDate?.() || response.signed_at, "yyyy/MM/dd HH:mm")}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
