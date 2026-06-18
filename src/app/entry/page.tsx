"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Scissors, 
  Info, 
  AlertTriangle,
  Camera,
  Heart,
  ShieldCheck,
  User,
  Clock,
  Sparkles,
  Signature,
  MessageSquare,
  Smartphone,
  Search
} from "lucide-react";
import { addCustomer, getCustomerById, updateCustomer } from "@/lib/customers";
import { addCounselingResponse, calculateRiskFlags, ServiceType } from "@/lib/counseling";
import { toast } from "sonner";
import liff from "@line/liff";
import { useSearchParams } from "next/navigation";

// --- Sub-components ---

const SignaturePad = ({ onSave }: { onSave: (url: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) onSave(canvas.toDataURL());
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      ctx?.beginPath();
      onSave("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="border-2 border-slate-200 rounded-xl bg-white overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="w-full cursor-crosshair"
        />
      </div>
      <Button variant="ghost" size="sm" onClick={clear} className="text-slate-400 text-xs">クリア</Button>
    </div>
  );
};

// --- Main Component ---

export default function CustomerEntryPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center animate-pulse text-slate-400">読み込み中...</div>}>
      <CustomerEntryFormContent />
    </Suspense>
  );
}

function CustomerEntryFormContent() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [lineProfile, setLineProfile] = useState<{ userId: string; displayName: string } | null>(null);
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("id");

  // Form State
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);
  const [formData, setFormData] = useState<any>({
    // Basic Info
    name: "",
    name_kana: "",
    gender: "female",
    phone: "",
    postal_code: "",
    address: "",
    email: "",
    email_marketing_allowed: true,
    birthday: "",
    blood_type: "",
    occupation: "",
    dm_allowed: true,
    line_user_id: "",
    referral_source: [] as string[],
    referral_name: "",
    
    // Photo/SNS
    photo_permission: "no",
    sns_permission: "no",
    sns_permission_scope: "no",
    
    // Answers (will be populated dynamically)
    answers: {},
    signature: "",
    is_minimo: false,
  });

  useEffect(() => {
    if (customerIdParam) {
      getCustomerById(customerIdParam).then(data => {
        if (data) {
          setFormData((prev: any) => ({
            ...prev,
            ...data,
            id: customerIdParam
          }));
          if (data.gender) setFormData((prev: any) => ({ ...prev, gender: data.gender }));
        }
      });
    }

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (liffId) {
      liff.init({ liffId }).then(() => {
        if (liff.isLoggedIn()) {
          liff.getProfile().then(profile => {
            setLineProfile({ userId: profile.userId, displayName: profile.displayName });
            setFormData((prev: any) => ({ 
              ...prev, 
              name: prev.name || profile.displayName, 
              line_user_id: prev.line_user_id || profile.userId 
            }));
          });
        }
      }).catch((err: any) => console.error("LIFF Init Error:", err));
    }
  }, [customerIdParam]);

  const handleLineLogin = () => {
    if (!liff.isLoggedIn()) {
      liff.login();
    }
  };

  const updateAnswers = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      answers: { ...prev.answers, [key]: value }
    }));
  };

  const toggleService = (service: ServiceType) => {
    setSelectedServices(prev => 
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error("名前と電話番号は必須です");
      return;
    }

    setLoading(true);
    try {
      const { riskLevel, riskFlags } = calculateRiskFlags(formData.answers, selectedServices);

      const customerPayload = {
        name: formData.name,
        name_kana: formData.name_kana,
        gender: formData.gender as any,
        phone: formData.phone,
        postal_code: formData.postal_code,
        address: formData.address,
        email: formData.email,
        email_marketing_allowed: formData.email_marketing_allowed,
        birthday: formData.birthday,
        blood_type: formData.blood_type,
        occupation: formData.occupation,
        dm_allowed: formData.dm_allowed,
        line_user_id: formData.line_user_id,
        referral_source: formData.referral_source,
        referral_name: formData.referral_name,
        photo_permission: formData.photo_permission,
        sns_permission: formData.sns_permission,
        sns_permission_scope: formData.sns_permission_scope,
        is_minimo: formData.is_minimo,
        allergies: formData.answers.allergies || [],
        has_allergy: (formData.answers.allergies || []).length > 0 || formData.answers.allergies_present === 'yes',
        risk_level: riskLevel,
        risk_flags: riskFlags,
      };

      let customerRes;
      if (formData.id) {
        customerRes = await updateCustomer(formData.id, customerPayload);
        if (customerRes.success) (customerRes as any).id = formData.id;
      } else {
        customerRes = await addCustomer(customerPayload);
      }

      if (customerRes.success && (customerRes as any).id) {
        await addCounselingResponse({
          customer_id: (customerRes as any).id,
          service_types: selectedServices,
          gender: formData.gender as any,
          answers: formData.answers,
          risk_level: riskLevel,
          risk_flags: riskFlags,
          signature_url: formData.signature,
          signed_at: new Date(),
        });
        setCompleted(true);
      } else {
        toast.error("登録に失敗しました。");
      }
    } catch (error) {
      console.error(error);
      toast.error("エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const renderStepHeader = (title: string, subtitle: string) => (
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
    </div>
  );

  const CheckboxGroup = ({ label, options, selected, onChange }: any) => (
    <div className="space-y-3">
      <label className="text-sm font-bold text-slate-700 block ml-1">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt: string) => (
          <button
            key={opt}
            onClick={() => {
              const next = selected.includes(opt) ? selected.filter((x: string) => x !== opt) : [...selected, opt];
              onChange(next);
            }}
            className={`p-3 rounded-xl border text-sm transition-all text-left ${
              selected.includes(opt) 
              ? 'bg-rose-500 border-rose-500 text-white shadow-md' 
              : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  const RadioGroup = ({ label, options, value, onChange }: any) => (
    <div className="space-y-3">
      <label className="text-sm font-bold text-slate-700 block ml-1">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt: { id: string, label: string }) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`px-4 py-2 rounded-full border text-sm font-bold transition-all ${
              value === opt.id 
              ? 'bg-rose-500 border-rose-500 text-white shadow-md' 
              : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (completed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShieldCheck size={48} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">ご登録完了</h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
              カウンセリングシートの送信が完了しました。<br />スタッフがお呼びするまで、店内のソファーでお掛けになってお待ちください。
            </p>
            <Button variant="outline" className="w-full h-12 rounded-xl text-slate-400" onClick={() => window.location.reload()}>
              最初に戻る
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <header className="bg-white border-b border-slate-100 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-rose-400 to-rose-600 p-1.5 rounded-lg text-white shadow-md">
              <Scissors size={18} />
            </div>
            <span className="font-extrabold text-slate-900 tracking-tighter text-xl">当サロン</span>
          </div>
          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Counseling System</div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 pt-8">
        <div className="flex gap-1.5 mb-10 px-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className={`h-1 flex-1 rounded-full transition-all duration-700 ${i <= step ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-slate-200'}`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {renderStepHeader("メニュー選択", "本日受ける施術をすべて選択してください")}
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'eyelash_ext', label: 'まつ毛エクステ', desc: 'Eyelash Extensions', icon: <Sparkles className="text-amber-400" size={20}/> },
                  { id: 'led_ext', label: 'LEDエクステ', desc: 'LED Eyelash Extensions', icon: <Sparkles className="text-violet-400" size={20}/> },
                  { id: 'lash_lift', label: 'まつ毛パーマ', desc: 'Lash Lift', icon: <Heart className="text-rose-400" size={20}/> },
                  { id: 'eyebrow', label: 'アイブロウ（眉）', desc: 'Eye Brow Wax', icon: <Scissors className="text-emerald-400" size={20}/> },
                  { id: 'and_healthy', label: '&Healthy（アンドヘルシー）', desc: 'Lash Ext + Lift', icon: <ShieldCheck className="text-blue-400" size={20}/> },
                  { id: 'brow_gym_men', label: 'メンズアイブロウ', desc: 'BROW GYM', icon: <User className="text-slate-400" size={20}/> }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s.id as ServiceType)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
                      selectedServices.includes(s.id as ServiceType) 
                      ? 'border-rose-500 bg-rose-50 ring-4 ring-rose-500/10' 
                      : 'border-white bg-white shadow-sm hover:border-slate-200'
                    }`}
                  >
                    <div className="bg-slate-50 p-3 rounded-xl shadow-inner">{s.icon}</div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{s.label}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.desc}</div>
                    </div>
                    {selectedServices.includes(s.id as ServiceType) && <CheckCircle2 className="text-rose-500" size={24} />}
                  </button>
                ))}
              </div>
              <div className="space-y-4 pt-4">
                <label className="text-sm font-bold text-slate-700 block ml-1">性別</label>
                <div className="flex gap-3">
                  {['female', 'male'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`flex-1 p-4 rounded-2xl border-2 font-bold transition-all ${
                        formData.gender === g 
                        ? 'border-rose-500 bg-rose-50 text-rose-600' 
                        : 'border-white bg-white text-slate-400 shadow-sm'
                      }`}
                    >
                      {g === 'female' ? '女性' : '男性'}
                    </button>
                  ))}
                </div>
              </div>
              <Button 
                className="w-full h-16 rounded-2xl text-lg font-extrabold mt-8 shadow-xl shadow-rose-200 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all" 
                onClick={nextStep}
                disabled={selectedServices.length === 0}
              >
                次へ進む <ChevronRight className="ml-2" />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              {renderStepHeader("基本情報", "お客様の情報を教えてください")}
              {!lineProfile ? (
                <Card className="p-5 rounded-3xl border-2 border-emerald-500 bg-emerald-50/30 overflow-hidden relative group" onClick={handleLineLogin}>
                   <div className="flex items-center gap-4">
                     <div className="bg-[#06C755] w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                       <MessageSquare size={24} />
                     </div>
                     <div className="flex-1">
                       <h3 className="font-black text-emerald-900 leading-tight">LINEでログイン</h3>
                       <p className="text-[10px] text-emerald-700 font-bold">お名前の自動入力と次回予約の自動案内を有効にします</p>
                     </div>
                     <ChevronRight size={20} className="text-emerald-500" />
                   </div>
                </Card>
              ) : (
                <div className="bg-emerald-500 text-white p-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-100">
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-black">LINE連携済み: {lineProfile.displayName}様</span>
                </div>
              )}
              <Card className="p-6 rounded-3xl border-none shadow-sm space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block ml-1">お名前（フリガナ） <span className="text-rose-500">*</span></label>
                    <Input placeholder="ヤマダ ハナコ" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.name_kana} onChange={(e) => setFormData({ ...formData, name_kana: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block ml-1">お名前（漢字） <span className="text-rose-500">*</span></label>
                    <Input placeholder="山田 花子" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block ml-1">電話番号 <span className="text-rose-500">*</span></label>
                    <Input type="tel" placeholder="09012345678" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block ml-1">生年月日</label>
                    <Input type="date" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.birthday} onChange={(e) => setFormData({ ...formData, birthday: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block ml-1">血液型</label>
                    <select className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold px-3 text-sm" value={formData.blood_type} onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}>
                      <option value="">選択</option>
                      <option value="A">A型</option>
                      <option value="B">B型</option>
                      <option value="O">O型</option>
                      <option value="AB">AB型</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block ml-1">郵便番号</label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="6570000" 
                      className="flex-1 h-12 rounded-xl bg-slate-50 border-none font-bold" 
                      value={formData.postal_code} 
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })} 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-12 px-4 rounded-xl border-slate-200 text-slate-600 font-bold bg-white" 
                      onClick={async () => {
                        if (!formData.postal_code || formData.postal_code.replace(/-/g, '').length < 7) {
                          toast.error("郵便番号は7桁で入力してください");
                          return;
                        }
                        try {
                          const zip = formData.postal_code.replace(/-/g, '');
                          const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`);
                          const data = await res.json();
                          if (data.status === 200 && data.results) {
                            const result = data.results[0];
                            const address = `${result.address1}${result.address2}${result.address3}`;
                            setFormData(prev => ({ ...prev, address }));
                          } else {
                            toast.error("住所が見つかりませんでした");
                          }
                        } catch (e) {
                          toast.error("住所検索に失敗しました");
                        }
                      }}
                    >
                      <Search className="w-4 h-4 mr-2" /> 検索
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block ml-1">住所</label>
                  <Input placeholder="兵庫県神戸市..." className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>
              </Card>
              <div className="flex gap-3 mt-8">
                <Button variant="outline" className="h-16 w-20 rounded-2xl border-none shadow-sm bg-white" onClick={prevStep}>
                  <ChevronLeft />
                </Button>
                <Button 
                  className="flex-1 h-16 rounded-2xl text-lg font-extrabold shadow-xl shadow-rose-200 bg-rose-600 hover:bg-rose-700" 
                  onClick={nextStep}
                  disabled={!formData.name || !formData.phone}
                >
                  次へ進む <ChevronRight className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              {renderStepHeader("カウンセリング", "安全な施術のために詳細をお伺いします")}
              <div className="space-y-8">
                <CheckboxGroup 
                  label="来店きっかけ（複数選択可）"
                  options={['ホームページ', 'Instagram', 'SNS', '紹介', 'ちらし', 'ホットペッパー', '看板', 'ミニモ', 'その他']}
                  selected={formData.referral_source}
                  onChange={(val: any) => setFormData({...formData, referral_source: val, is_minimo: val.includes("ミニモ")})}
                />
                {(selectedServices.includes('eyebrow') || selectedServices.includes('brow_gym_men')) && (
                  <div className="space-y-6 border-l-4 border-emerald-400 pl-4 py-2">
                    <h3 className="font-black text-slate-800">アイブロウ・WAXについて</h3>
                    <RadioGroup label="ワックス脱毛の経験はありますか？" options={[{id:'yes', label:'はい'}, {id:'no', label:'いいえ'}]} value={formData.answers.wax_experience} onChange={(val: any) => updateAnswers('wax_experience', val)} />
                    <RadioGroup label="現在ピーリング製品を使用中ですか？" options={[{id:'yes', label:'はい'}, {id:'no', label:'いいえ'}]} value={formData.answers.peeling_history} onChange={(val: any) => updateAnswers('peeling_history', val)} />
                  </div>
                )}
                {selectedServices.includes('led_ext') && (
                  <div className="space-y-6 border-l-4 border-violet-400 pl-4 py-2">
                    <h3 className="font-black text-slate-800">LEDエクステについて</h3>
                    <RadioGroup label="光線過敏症・紫外線アレルギーなど何らかのアレルギーをお持ちですか？" options={[{id:'yes', label:'はい'}, {id:'no', label:'いいえ'}]} value={formData.answers.uv_allergy} onChange={(val: any) => updateAnswers('uv_allergy', val)} />
                    <RadioGroup label="白内障、緑内障などの治療を受けたことがありますか？" options={[{id:'yes', label:'はい'}, {id:'no', label:'いいえ'}]} value={formData.answers.glaucoma_history} onChange={(val: any) => updateAnswers('glaucoma_history', val)} />
                    <RadioGroup label="ドライアイと診断され治療を受けたことがありますか？" options={[{id:'yes', label:'はい'}, {id:'no', label:'いいえ'}]} value={formData.answers.dry_eye_history} onChange={(val: any) => updateAnswers('dry_eye_history', val)} />
                  </div>
                )}
                <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100">
                  <RadioGroup label="アレルギーはありますか？" options={[{id:'yes', label:'はい'}, {id:'no', label:'いいえ'}]} value={formData.answers.allergies_present} onChange={(val: any) => updateAnswers('allergies_present', val)} />
                  {formData.answers.allergies_present === 'yes' && (
                    <div className="mt-4"><CheckboxGroup options={['金属', '化粧品', 'ゴム', 'アルコール']} selected={formData.answers.allergies || []} onChange={(val: any) => updateAnswers('allergies', val)} /></div>
                  )}
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 block ml-1">備考・その他</label>
                  <textarea className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-sm min-h-[100px]" placeholder="特記事項があればご記入ください" value={formData.answers.other_notes} onChange={(e) => updateAnswers('other_notes', e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <Button variant="outline" className="h-16 w-20 rounded-2xl border-none shadow-sm bg-white" onClick={prevStep}><ChevronLeft /></Button>
                <Button className="flex-1 h-16 rounded-2xl text-lg font-extrabold shadow-xl shadow-rose-200 bg-rose-600 hover:bg-rose-700" onClick={nextStep}>次へ進む <ChevronRight className="ml-2" /></Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              {renderStepHeader("写真・SNS同意", "広報へのご協力について")}
              <div className="bg-white p-6 rounded-3xl shadow-sm space-y-6">
                <RadioGroup label="施術写真の撮影" options={[{id:'yes', label:'はい'}, {id:'no', label:'いいえ'}]} value={formData.photo_permission} onChange={(val: any) => setFormData({...formData, photo_permission: val})} />
                <RadioGroup label="SNSへの掲載" options={[{id:'yes', label:'目元のみ可'}, {id:'full', label:'全体可'}, {id:'no', label:'不可'}]} value={formData.sns_permission_scope} onChange={(val: any) => setFormData({...formData, sns_permission_scope: val})} />
              </div>
              <div className="flex gap-3 mt-8">
                <Button variant="outline" className="h-16 w-20 rounded-2xl border-none shadow-sm bg-white" onClick={prevStep}><ChevronLeft /></Button>
                <Button className="flex-1 h-16 rounded-2xl text-lg font-extrabold shadow-xl shadow-rose-200 bg-rose-600 hover:bg-rose-700" onClick={nextStep}>同意事項へ <ChevronRight className="ml-2" /></Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              {renderStepHeader("同意書", "ご署名をお願いします")}
              <div className="bg-white p-6 rounded-3xl shadow-inner border border-slate-100 max-h-[300px] overflow-y-auto text-xs space-y-4 text-slate-600">
                <p className="font-bold text-slate-900">事前説明書・同意書</p>
                <p>体質や体調により、充血、腫れ、痒み等の症状が出る可能性があります。故意または重過失を除き、当店は一切の責任を負いかねます。</p>
                {selectedServices.includes('led_ext') && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <p className="font-bold text-violet-900">【LEDエクステ同意事項（松風LED版）】</p>
                    <ul className="list-disc pl-4 space-y-2">
                      <li>当サロンでは、安全性の高い松風LEDライトを使用しています。LEDライトと専用の接着剤で、まつげエクステを2〜3秒で完全硬化させます。</li>
                      <li>使用するライトは安全基準を満たしており、通常の使用で目や皮膚への影響はありません。ただし、光線過敏症や紫外線アレルギーの方は事前にお知らせください。</li>
                      <li>施術中は、専用の目元アイパッチにてライト照射時のまぶしさを軽減しますが人によっては多少のまぶしさを感じられたり、照射により温かく感じたりすることがございます。</li>
                      <li>ごく稀にアレルギー反応が起こる可能性もございます。万が一、施術中に異常を感じられた場合は、速やかにスタッフまでお申し付けください。</li>
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 block ml-1 flex items-center gap-2"><Signature size={18} className="text-rose-500" /> ご署名</label>
                <SignaturePad onSave={(url) => setFormData({...formData, signature: url})} />
              </div>
              <div className="flex gap-3 mt-8">
                <Button variant="outline" className="h-16 w-20 rounded-2xl border-none shadow-sm bg-white" onClick={prevStep}><ChevronLeft /></Button>
                <Button 
                  className="flex-1 h-16 rounded-2xl text-lg font-extrabold shadow-xl shadow-rose-200 bg-rose-600 hover:bg-rose-700" 
                  onClick={handleSubmit}
                  disabled={loading || !formData.signature}
                >
                  {loading ? "送信中..." : "内容を確認して送信"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
