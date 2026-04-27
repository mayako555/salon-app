"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCustomerById, Customer } from "@/lib/customers";
import { addKarteRecord } from "@/lib/karte";
import { getStaffList, StaffProfile } from "@/app/staff/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Save, 
  Scissors, 
  User, 
  Calendar,
  Sparkles,
  Info,
  Clock,
  Camera,
  Trash2,
  MoveHorizontal,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

// --- Drawing Canvas Component ---
const EyeDiagramCanvas = ({ onSave }: { onSave: (url: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const bgImage = "/assets/eye_template.png";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = bgImage;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#e11d48";
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
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const img = new Image();
      img.src = bgImage;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        onSave(canvas.toDataURL());
      };
      ctx.beginPath();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Sparkles size={12} className="text-amber-500" /> 手書きデザインマップ
        </label>
        <Button variant="ghost" size="sm" onClick={clear} className="text-slate-400 text-[10px] h-6 px-2 hover:text-rose-500">
          <Trash2 size={10} className="mr-1" /> リセット
        </Button>
      </div>
      <div className="border-4 border-slate-100 rounded-3xl bg-white overflow-hidden touch-none shadow-inner aspect-[3/2]">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="w-full h-full cursor-crosshair"
        />
      </div>
    </div>
  );
};

// --- Main Page Component ---
export default function NewKartePage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    staff_id: "",
    staff_name: "",
    date: new Date().toISOString().split('T')[0],
    service_type: "eyelash_ext" as 'eyelash_ext' | 'lash_lift' | 'eyebrow' | 'and_healthy',
    visit_type: "repeat" as 'new' | 'repeat' | 'refill',
    design: {
      curl: "C",
      thickness: "0.15",
      length: "10-12mm",
      count: 120,
      style: "Natural",
      shape: "",
      wax_type: "Hard",
      thinning: false,
      brow_perm: false,
      stencil: false,
      perm_solution_1_time: 0,
      perm_solution_2_time: 0,
      hair_material: "セーブル",
      // Detailed counts
      left_remaining: 0,
      right_remaining: 0,
      left_added: 0,
      right_added: 0,
      left_total: 0,
      right_total: 0
    },
    eye_diagram_url: "",
    before_photo_url: "",
    after_photo_url: "",
    notes: ""
  });

  useEffect(() => {
    async function load() {
      if (typeof id !== 'string') return;
      const [cData, sData] = await Promise.all([
        getCustomerById(id),
        getStaffList()
      ]);
      setCustomer(cData);
      setStaffList(sData);
      
      // Auto-fill from profile if available
      if (profile) {
        setFormData(prev => ({ 
          ...prev, 
          staff_id: profile.id, 
          staff_name: profile.name 
        }));
      } else if (sData.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          staff_id: sData[0].id, 
          staff_name: sData[0].name 
        }));
      }
      setLoading(false);
    }
    load();
  }, [id, profile]);

  const updateDesign = (key: string, value: any) => {
    setFormData(prev => {
      const newDesign = { ...prev.design, [key]: value };
      
      // Auto-calculate totals if parts change
      if (['left_remaining', 'left_added'].includes(key)) {
        newDesign.left_total = (newDesign.left_remaining || 0) + (newDesign.left_added || 0);
      }
      if (['right_remaining', 'right_added'].includes(key)) {
        newDesign.right_total = (newDesign.right_remaining || 0) + (newDesign.right_added || 0);
      }
      // Sync global count
      newDesign.count = (newDesign.left_total || 0) + (newDesign.right_total || 0);

      return { ...prev, design: newDesign };
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData(prev => ({ ...prev, [type === 'before' ? 'before_photo_url' : 'after_photo_url']: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof id !== 'string') return;
    setSaving(true);
    try {
      const res = await addKarteRecord({
        customer_id: id,
        staff_id: formData.staff_id,
        staff_name: formData.staff_name,
        date: new Date(formData.date),
        service_type: formData.service_type,
        visit_type: formData.visit_type,
        design: formData.design as any,
        eye_diagram_url: formData.eye_diagram_url,
        before_photo_url: formData.before_photo_url,
        after_photo_url: formData.after_photo_url,
        notes: formData.notes
      });
      if (res.success) {
        toast.success("カルテを保存しました");
        router.push(`/staff-portal/customers/${id}`);
      } else {
        toast.error("保存に失敗しました");
      }
    } catch (error) {
      toast.error("エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-slate-400">読み込み中...</div>;
  if (!customer) return <div className="p-10 text-center">お客様が見つかりませんでした</div>;

  return (
    <div className="pb-24 bg-slate-50 min-h-screen">
      <div className="bg-slate-900 p-6 text-white pb-12 shadow-lg">
        <Button variant="ghost" className="text-white hover:bg-white/10 -ml-2 mb-4" onClick={() => router.back()}><ChevronLeft className="mr-1" /> 戻る</Button>
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-3 rounded-2xl text-white shadow-xl"><Sparkles size={24} /></div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">施術カルテ作成</h1>
            <p className="text-white/50 text-xs font-bold tracking-widest uppercase">{customer.name} 様</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="-mt-6 px-4 max-w-2xl mx-auto space-y-4">
        {/* Step 1: Meta Info */}
        <Card className="rounded-3xl p-6 border-none shadow-xl space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-black tracking-widest"><Calendar size={10} /> 施術日</label>
              <Input type="date" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-black tracking-widest"><User size={10} /> 担当スタッフ</label>
              <select className="w-full h-12 px-3 bg-slate-50 border-none rounded-xl text-sm font-bold" value={formData.staff_id} onChange={(e) => {
                const staff = staffList.find(s => s.id === e.target.value);
                if (staff) setFormData({ ...formData, staff_id: staff.id, staff_name: staff.name });
              }}>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-black tracking-widest">メニュー & 来店種別</label>
            <div className="grid grid-cols-2 gap-2">
              <select className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs" value={formData.service_type} onChange={(e) => setFormData({...formData, service_type: e.target.value as any})}>
                <option value="eyelash_ext">まつ毛エクステ</option>
                <option value="lash_lift">まつ毛パーマ</option>
                <option value="eyebrow">アイブロウ</option>
                <option value="and_healthy">&Healthy</option>
              </select>
              <select className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs" value={formData.visit_type} onChange={(e) => setFormData({...formData, visit_type: e.target.value as any})}>
                <option value="repeat">付け足し (Refill)</option>
                <option value="new">付け替え (Full Set)</option>
                <option value="refill">初回付け足し</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Step 2: Design Specification */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="rounded-3xl p-6 border-none shadow-xl space-y-6">
            <div className="flex items-center gap-2 text-slate-800 font-black border-b border-slate-50 pb-4">
              <Sparkles className="text-amber-500" size={20} />
              <h3 className="uppercase tracking-tighter text-sm">Design Specification</h3>
            </div>

            {/* まつ毛共通スペック */}
            {(formData.service_type === 'eyelash_ext' || formData.service_type === 'and_healthy') && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Style / Shape (形)</label>
                    <Input placeholder="Natural / Cute / Cat" className="h-11 rounded-xl bg-slate-50 border-none font-bold" value={formData.design.style} onChange={(e) => updateDesign('style', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Curl / Thick / Length</label>
                    <div className="flex gap-2">
                      <Input placeholder="C" className="flex-1 h-11 rounded-xl bg-slate-50 border-none font-bold text-center" value={formData.design.curl} onChange={(e) => updateDesign('curl', e.target.value)} />
                      <Input placeholder="0.15" className="flex-1 h-11 rounded-xl bg-slate-50 border-none font-bold text-center" value={formData.design.thickness} onChange={(e) => updateDesign('thickness', e.target.value)} />
                      <Input placeholder="9-11-10" className="flex-1 h-11 rounded-xl bg-slate-50 border-none font-bold text-center" value={formData.design.length} onChange={(e) => updateDesign('length', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* 左右別の本数管理 (付け足し対応) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-amber-400 rounded-full" />
                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Lash Count (左右別)</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8">
                    {/* LEFT */}
                    <div className="space-y-4">
                      <div className="text-center text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-blue-50 pb-1">LEFT (左)</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400">残数</span>
                          <Input type="number" className="w-16 h-8 rounded-lg bg-slate-100 border-none text-xs font-bold text-center" value={formData.design.left_remaining} onChange={(e) => updateDesign('left_remaining', parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400">付け足し</span>
                          <Input type="number" className="w-16 h-8 rounded-lg bg-emerald-50 border-none text-xs font-bold text-center text-emerald-600" value={formData.design.left_added} onChange={(e) => updateDesign('left_added', parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="flex items-center justify-between border-t pt-2 mt-2">
                          <span className="text-[9px] font-black text-slate-600">仕上がり</span>
                          <span className="text-sm font-black text-slate-900">{formData.design.left_total}本</span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT */}
                    <div className="space-y-4">
                      <div className="text-center text-[10px] font-black text-rose-500 uppercase tracking-widest border-b border-rose-50 pb-1">RIGHT (右)</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400">残数</span>
                          <Input type="number" className="w-16 h-8 rounded-lg bg-slate-100 border-none text-xs font-bold text-center" value={formData.design.right_remaining} onChange={(e) => updateDesign('right_remaining', parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400">付け足し</span>
                          <Input type="number" className="w-16 h-8 rounded-lg bg-emerald-50 border-none text-xs font-bold text-center text-emerald-600" value={formData.design.right_added} onChange={(e) => updateDesign('right_added', parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="flex items-center justify-between border-t pt-2 mt-2">
                          <span className="text-[9px] font-black text-slate-600">仕上がり</span>
                          <span className="text-sm font-black text-slate-900">{formData.design.right_total}本</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Finish</span>
                    </div>
                    <span className="text-2xl font-black">{formData.design.count}本</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Step 3: Hand-drawn Design Map (Moved Below Spec) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="rounded-3xl p-6 border-none shadow-xl">
            <EyeDiagramCanvas onSave={(url) => setFormData({...formData, eye_diagram_url: url})} />
          </Card>
        </motion.div>

        {/* Step 4: Photos Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="rounded-3xl p-6 border-none shadow-xl space-y-6">
            <div className="flex items-center gap-2 text-slate-800 font-black">
              <Camera className="text-blue-500" size={18} />
              <h3 className="uppercase tracking-tighter text-sm">施術写真 (Before/After)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="aspect-square bg-slate-100 rounded-3xl flex flex-col items-center justify-center border-4 border-dashed border-slate-200 text-slate-300 hover:bg-slate-50 transition-all cursor-pointer relative overflow-hidden">
                {formData.before_photo_url ? <img src={formData.before_photo_url} className="w-full h-full object-cover" /> : <><Camera size={32} className="mb-2" /><span className="text-[10px] font-black uppercase">Before</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'before')} />
              </label>
              <label className="aspect-square bg-slate-100 rounded-3xl flex flex-col items-center justify-center border-4 border-dashed border-slate-200 text-slate-300 hover:bg-slate-50 transition-all cursor-pointer relative overflow-hidden">
                {formData.after_photo_url ? <img src={formData.after_photo_url} className="w-full h-full object-cover" /> : <><Camera size={32} className="mb-2" /><span className="text-[10px] font-black uppercase">After</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'after')} />
              </label>
            </div>
          </Card>
        </motion.div>

        <Button className="w-full h-20 rounded-3xl text-xl font-black shadow-2xl bg-slate-900 hover:bg-slate-800 text-white gap-3 transition-all border-b-8 border-slate-950 mt-4" disabled={saving} type="submit">
          {saving ? "SAVING..." : <><Save size={24} /> SAVE KARTE</>}
        </Button>
      </form>
    </div>
  );
}
