"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCustomerById, Customer } from "@/lib/customers";
import { addKarteRecord } from "@/lib/karte";
import { getStaffList, StaffProfile } from "@/app/staff/actions";
import { getMasterItems } from "@/app/sales/master-actions";
import { SalesMasterItem } from "@/app/sales/seeds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Save, 
  User, 
  Calendar,
  Sparkles,
  Camera,
  Trash2,
  X,
  Type,
  Pencil
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

// --- Drawing Canvas Component with Text Support ---
const EyeDiagramCanvas = ({ 
  onSave, 
  bgImage 
}: { 
  onSave: (url: string) => void;
  bgImage: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<'draw' | 'text'>('draw');
  const [textNodes, setTextNodes] = useState<{ x: number, y: number, text: string }[]>([]);
  const [activeText, setActiveText] = useState<{ x: number, y: number, text: string } | null>(null);

  const defaultBg = "/assets/eye_template.png";
  const currentBg = bgImage || defaultBg;

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = currentBg;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Draw text nodes
      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = "#e11d48";
      textNodes.forEach(node => {
        ctx.fillText(node.text, node.x, node.y);
      });
      
      onSave(canvas.toDataURL());
    };
  };

  useEffect(() => {
    renderCanvas();
  }, [currentBg, textNodes]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode === 'text') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
      const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
      setActiveText({ x, y, text: "" });
      return;
    }
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) onSave(canvas.toDataURL());
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#e11d48";
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleAddText = () => {
    if (activeText && activeText.text.trim()) {
      setTextNodes([...textNodes, activeText]);
      setActiveText(null);
    } else {
      setActiveText(null);
    }
  };

  const clear = () => {
    if (!confirm("入力をすべて消去しますか？")) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setTextNodes([]);
      renderCanvas();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <div className="flex gap-2">
          <Button 
            type="button"
            variant={mode === 'draw' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setMode('draw')}
            className="h-8 rounded-full text-[10px] font-bold gap-1"
          >
            <Pencil size={12} /> ペン
          </Button>
          <Button 
            type="button"
            variant={mode === 'text' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setMode('text')}
            className="h-8 rounded-full text-[10px] font-bold gap-1"
          >
            <Type size={12} /> テキスト
          </Button>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={clear} className="text-slate-400 text-[10px] h-6 px-2 hover:text-rose-500">
          <Trash2 size={10} className="mr-1" /> 全消去
        </Button>
      </div>
      
      <div className="relative border-4 border-slate-100 rounded-3xl bg-white overflow-hidden touch-none shadow-inner aspect-[3/2]">
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
          className={`w-full h-full ${mode === 'draw' ? 'cursor-crosshair' : 'cursor-text'}`}
        />

        {activeText && (
          <div 
            className="absolute z-10 p-2 bg-white shadow-xl border-2 border-rose-500 rounded-xl flex gap-2 animate-in zoom-in-95 duration-200"
            style={{ left: `${(activeText.x / 600) * 100}%`, top: `${(activeText.y / 400) * 100}%`, transform: 'translate(-50%, -100%)' }}
          >
            <Input 
              autoFocus
              className="h-8 text-sm font-bold w-32 border-none bg-slate-50 focus-visible:ring-0" 
              value={activeText.text}
              onChange={(e) => setActiveText({ ...activeText, text: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
            />
            <Button size="sm" className="h-8 bg-rose-500 hover:bg-rose-600 px-2" onClick={handleAddText}><Save size={14} /></Button>
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setActiveText(null)}><X size={14} /></Button>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-400 text-center font-bold">
        {mode === 'draw' ? '指やペンで描画してください' : '文字を入れたい場所をタップしてください'}
      </p>
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
  const [templates, setTemplates] = useState<SalesMasterItem[]>([]);
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
      hair_material: "セーブル"
    },
    eye_diagram_url: "",
    photos: [] as { url: string; description: string }[],
    treatment_photos: [] as { url: string; description: string }[],
    past_karte_photos: [] as { url: string; description: string }[],
    notes: ""
  });

  const [selectedTemplateUrl, setSelectedTemplateUrl] = useState("");

  useEffect(() => {
    async function load() {
      if (typeof id !== 'string') return;
      const [cData, sData, tData] = await Promise.all([
        getCustomerById(id),
        getStaffList(),
        getMasterItems() // Will filter for karteTemplate below
      ]);
      setCustomer(cData);
      setStaffList(sData);
      
      const karteTemplates = tData.filter(i => i.itemType === 'karteTemplate' && i.isActive);
      setTemplates(karteTemplates);
      if (karteTemplates.length > 0) {
        setSelectedTemplateUrl(karteTemplates[0].imageUrl || "");
      }

      if (profile) {
        setFormData(prev => ({ ...prev, staff_id: profile.id, staff_name: profile.name }));
      }
      setLoading(false);
    }
    load();
  }, [id, profile]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'photos' | 'treatment_photos' | 'past_karte_photos') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData(prev => ({ 
        ...prev, 
        [target]: [...prev[target], { url: ev.target?.result as string, description: "" }] 
      }));
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
        photos: formData.photos,
        treatment_photos: formData.treatment_photos,
        past_karte_photos: formData.past_karte_photos,
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
        {/* Step 1: Info Card */}
        <Card className="rounded-3xl p-6 border-none shadow-xl space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-black tracking-widest"><Calendar size={10} /> 施術日</label>
              <Input type="date" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-black tracking-widest"><User size={10} /> 担当</label>
              <select className="w-full h-12 px-3 bg-slate-50 border-none rounded-xl text-sm font-bold" value={formData.staff_id} onChange={(e) => {
                const staff = staffList.find(s => s.id === e.target.value);
                if (staff) setFormData({ ...formData, staff_id: staff.id, staff_name: staff.name });
              }}>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </Card>

        {/* Step 2: Hand-drawn Design Map */}
        <Card className="rounded-3xl p-6 border-none shadow-xl space-y-4">
          <div className="space-y-3">
            <label className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-black tracking-widest">カルテ背景テンプレート</label>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {templates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTemplateUrl(t.imageUrl || "")}
                  className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border-2 ${
                    selectedTemplateUrl === t.imageUrl 
                      ? "border-rose-500 bg-rose-50 text-rose-600" 
                      : "border-slate-100 bg-slate-50 text-slate-400"
                  }`}
                >
                  {t.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedTemplateUrl("")}
                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border-2 ${
                  selectedTemplateUrl === "" 
                    ? "border-rose-500 bg-rose-50 text-rose-600" 
                    : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                デフォルト(目)
              </button>
            </div>
          </div>

          <EyeDiagramCanvas 
            bgImage={selectedTemplateUrl} 
            onSave={(url) => setFormData({...formData, eye_diagram_url: url})} 
          />
        </Card>

        {/* Step 3: Past Karte Photos (New Section) */}
        <Card className="rounded-3xl p-6 border-none shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-black">
            <Camera className="text-amber-500" size={18} />
            <h3 className="uppercase tracking-tighter text-sm">過去の（紙）カルテ画像</h3>
          </div>
          <p className="text-[10px] text-slate-400 font-bold">以前の紙カルテや外部の写真を記録として残せます</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {formData.past_karte_photos.map((photo, i) => (
              <div key={i} className="aspect-square bg-slate-50 rounded-2xl overflow-hidden relative border-2 border-slate-100">
                <img src={photo.url} className="w-full h-full object-cover" />
                <button type="button" onClick={() => {
                  const newPhotos = [...formData.past_karte_photos];
                  newPhotos.splice(i, 1);
                  setFormData({...formData, past_karte_photos: newPhotos});
                }} className="absolute top-1 right-1 bg-slate-900/50 text-white rounded-full p-1">
                  <X size={12} />
                </button>
              </div>
            ))}
            <label className="aspect-square bg-slate-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300 text-slate-400 cursor-pointer hover:bg-slate-100">
              <Plus size={24} />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'past_karte_photos')} />
            </label>
          </div>
        </Card>

        {/* Other Sections (Photos, Notes) */}
        <Card className="rounded-3xl p-6 border-none shadow-xl space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">自由記述メモ</label>
            <textarea 
              className="w-full min-h-[120px] p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-amber-500/20" 
              placeholder="施術のポイントやお客様の反応など"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </Card>

        <Button className="w-full h-20 rounded-3xl text-xl font-black shadow-2xl bg-slate-900 hover:bg-slate-800 text-white gap-3 transition-all border-b-8 border-slate-950 mt-4" disabled={saving} type="submit">
          {saving ? "SAVING..." : <><Save size={24} /> SAVE KARTE</>}
        </Button>
      </form>
    </div>
  );
}

function Plus({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
