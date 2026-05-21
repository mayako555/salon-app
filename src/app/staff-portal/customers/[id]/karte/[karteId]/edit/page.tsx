"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCustomerById, Customer } from "@/lib/customers";
import { editKarteRecord } from "@/lib/karte";
import { getStaffList, StaffProfile } from "@/app/staff/actions";
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
  X
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "@/lib/firestore-server";

// --- Drawing Canvas Component ---
const EyeDiagramCanvas = ({ initialDataUrl, onSave }: { initialDataUrl?: string, onSave: (url: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const bgImage = "/assets/eye_template.png";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = initialDataUrl || bgImage;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#e11d48";
  }, [initialDataUrl]);

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

export default function EditKartePage() {
  const { id, karteId } = useParams();
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
      left_remaining: 0,
      right_remaining: 0,
      left_added: 0,
      right_added: 0,
      left_total: 0,
      right_total: 0
    },
    eye_diagram_url: "",
    photos: [] as { url: string; description: string }[],
    treatment_photos: [] as { url: string; description: string }[],
    notes: ""
  });

  const [splitLeftRight, setSplitLeftRight] = useState(false);

  useEffect(() => {
    async function load() {
      if (typeof id !== 'string' || typeof karteId !== 'string') return;
      
      const [cData, sData] = await Promise.all([
        getCustomerById(id),
        getStaffList()
      ]);
      setCustomer(cData);
      setStaffList(sData);

      // Fetch existing karte record
      const docRef = doc(db, "karte_records", karteId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        let dateStr = new Date().toISOString().split('T')[0];
        if (data.date) {
          dateStr = data.date.toMillis ? new Date(data.date.toMillis()).toISOString().split('T')[0] : new Date(data.date).toISOString().split('T')[0];
        }

        setFormData({
          staff_id: data.staff_id || "",
          staff_name: data.staff_name || "",
          date: dateStr,
          service_type: data.service_type || "eyelash_ext",
          visit_type: data.visit_type || "repeat",
          design: {
            curl: data.design?.curl || "C",
            thickness: data.design?.thickness || "0.15",
            length: data.design?.length || "10-12mm",
            count: data.design?.count || 120,
            style: data.design?.style || "Natural",
            shape: data.design?.shape || "",
            wax_type: data.design?.wax_type || "Hard",
            thinning: data.design?.thinning || false,
            brow_perm: data.design?.brow_perm || false,
            stencil: data.design?.stencil || false,
            perm_solution_1_time: data.design?.perm_solution_1_time || 0,
            perm_solution_2_time: data.design?.perm_solution_2_time || 0,
            hair_material: data.design?.hair_material || "セーブル",
            left_remaining: data.design?.left_remaining || 0,
            right_remaining: data.design?.right_remaining || 0,
            left_added: data.design?.left_added || 0,
            right_added: data.design?.right_added || 0,
            left_total: data.design?.left_total || 0,
            right_total: data.design?.right_total || 0
          },
          eye_diagram_url: data.eye_diagram_url || "",
          photos: data.photos || [],
          treatment_photos: data.treatment_photos || [],
          notes: data.notes || ""
        });

        // Determine if we should show split view for new visit
        if (data.visit_type === 'new' && (data.design?.left_total > 0 || data.design?.right_total > 0)) {
          setSplitLeftRight(true);
        }
      }
      
      setLoading(false);
    }
    load();
  }, [id, karteId]);

  const updateDesign = (key: string, value: any) => {
    setFormData(prev => {
      const newDesign = { ...prev.design, [key]: value };
      if (['left_remaining', 'left_added', 'right_remaining', 'right_added', 'left_total', 'right_total'].includes(key)) {
        if (['left_remaining', 'left_added'].includes(key)) {
          newDesign.left_total = (newDesign.left_remaining || 0) + (newDesign.left_added || 0);
        }
        if (['right_remaining', 'right_added'].includes(key)) {
          newDesign.right_total = (newDesign.right_remaining || 0) + (newDesign.right_added || 0);
        }
        newDesign.count = (newDesign.left_total || 0) + (newDesign.right_total || 0);
      }
      return { ...prev, design: newDesign };
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'photos' | 'treatment_photos') => {
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
  
  const updatePhotoDescription = (index: number, desc: string, target: 'photos' | 'treatment_photos') => {
    setFormData(prev => {
      const newPhotos = [...prev[target]];
      newPhotos[index].description = desc;
      return { ...prev, [target]: newPhotos };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof karteId !== 'string' || !profile) return;
    setSaving(true);
    try {
      const res = await editKarteRecord(
        karteId,
        {
          staff_id: formData.staff_id,
          staff_name: formData.staff_name,
          date: new Date(formData.date),
          service_type: formData.service_type,
          visit_type: formData.visit_type,
          design: formData.design as any,
          eye_diagram_url: formData.eye_diagram_url,
          photos: formData.photos,
          treatment_photos: formData.treatment_photos,
          notes: formData.notes
        },
        profile.id,
        profile.name
      );

      if (res.success) {
        toast.success("カルテを更新しました");
        router.back();
      } else {
        toast.error("更新に失敗しました: " + res.error);
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
            <h1 className="text-2xl font-black tracking-tight">施術カルテ編集</h1>
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

                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-amber-400 rounded-full" />
                      <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Lash Count {splitLeftRight ? '(左右別)' : '(総数)'}</h4>
                    </div>
                    {formData.visit_type === 'new' && (
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-2 py-1 rounded-md">
                        <input type="checkbox" checked={splitLeftRight} onChange={e => setSplitLeftRight(e.target.checked)} className="rounded text-amber-500 w-3 h-3" />
                        <span className="text-[10px] font-bold text-slate-600">左右別で入力</span>
                      </label>
                    )}
                  </div>
                  
                  {formData.visit_type === 'new' && !splitLeftRight ? (
                    <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">総仕上がり本数</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" min="0" className="w-24 h-12 rounded-xl bg-white/10 border-white/20 text-white font-black text-2xl text-center" value={formData.design.count} onChange={(e) => updateDesign('count', parseInt(e.target.value) || 0)} />
                        <span className="text-sm font-bold opacity-80">本</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-8">
                    {/* LEFT */}
                    <div className="space-y-4">
                      <div className="text-center text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-blue-50 pb-1">LEFT (左)</div>
                      <div className="space-y-3">
                        {formData.visit_type !== 'new' ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400">残数</span>
                              <Input type="number" min="0" className="w-16 h-8 rounded-lg bg-slate-100 border-none text-xs font-bold text-center" value={formData.design.left_remaining} onChange={(e) => updateDesign('left_remaining', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400">付け足し</span>
                              <Input type="number" min="0" className="w-16 h-8 rounded-lg bg-emerald-50 border-none text-xs font-bold text-center text-emerald-600" value={formData.design.left_added} onChange={(e) => updateDesign('left_added', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="flex items-center justify-between border-t pt-2 mt-2">
                              <span className="text-[9px] font-black text-slate-600">仕上がり</span>
                              <span className="text-sm font-black text-slate-900">{formData.design.left_total}本</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[9px] font-black text-slate-600">仕上がり本数</span>
                            <Input type="number" min="0" className="w-16 h-8 rounded-lg bg-blue-50 border-none text-xs font-bold text-center text-blue-700" value={formData.design.left_total} onChange={(e) => updateDesign('left_total', parseInt(e.target.value) || 0)} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT */}
                    <div className="space-y-4">
                      <div className="text-center text-[10px] font-black text-rose-500 uppercase tracking-widest border-b border-rose-50 pb-1">RIGHT (右)</div>
                      <div className="space-y-3">
                        {formData.visit_type !== 'new' ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400">残数</span>
                              <Input type="number" min="0" className="w-16 h-8 rounded-lg bg-slate-100 border-none text-xs font-bold text-center" value={formData.design.right_remaining} onChange={(e) => updateDesign('right_remaining', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400">付け足し</span>
                              <Input type="number" min="0" className="w-16 h-8 rounded-lg bg-emerald-50 border-none text-xs font-bold text-center text-emerald-600" value={formData.design.right_added} onChange={(e) => updateDesign('right_added', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="flex items-center justify-between border-t pt-2 mt-2">
                              <span className="text-[9px] font-black text-slate-600">仕上がり</span>
                              <span className="text-sm font-black text-slate-900">{formData.design.right_total}本</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[9px] font-black text-slate-600">仕上がり本数</span>
                            <Input type="number" min="0" className="w-16 h-8 rounded-lg bg-rose-50 border-none text-xs font-bold text-center text-rose-700" value={formData.design.right_total} onChange={(e) => updateDesign('right_total', parseInt(e.target.value) || 0)} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  </>
                )}
                
                {(!(!splitLeftRight && formData.visit_type === 'new')) && (
                  <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Finish</span>
                    </div>
                    <span className="text-2xl font-black">{formData.design.count}本</span>
                  </div>
                )}
              </div>
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="rounded-3xl p-6 border-none shadow-xl">
            <EyeDiagramCanvas initialDataUrl={formData.eye_diagram_url} onSave={(url) => setFormData({...formData, eye_diagram_url: url})} />
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="rounded-3xl p-6 border-none shadow-xl space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-800 font-black">
                <Camera className="text-blue-500" size={18} />
                <h3 className="uppercase tracking-tighter text-sm">施術写真（仕上がりなど）</h3>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {formData.photos.map((photo, i) => (
                <div key={i} className="bg-slate-50 rounded-2xl p-2 border border-slate-200 relative">
                  <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden relative mb-2">
                    <img src={photo.url} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => {
                      const newPhotos = [...formData.photos];
                      newPhotos.splice(i, 1);
                      setFormData({...formData, photos: newPhotos});
                    }} className="absolute top-2 right-2 bg-slate-900/50 text-white rounded-full p-1 hover:bg-rose-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  <Input 
                    placeholder="写真の説明（例: 正面から）" 
                    className="h-8 text-[10px] bg-white border-slate-200"
                    value={photo.description}
                    onChange={(e) => updatePhotoDescription(i, e.target.value, 'photos')}
                  />
                </div>
              ))}
              {formData.photos.length < 8 && (
                <label className="aspect-square bg-slate-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300 text-slate-400 hover:bg-slate-100 transition-all cursor-pointer">
                  <Camera size={24} className="mb-2" />
                  <span className="text-[10px] font-bold">写真を追加</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'photos')} />
                </label>
              )}
            </div>

            <div className="flex items-center justify-between mb-4 mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-black">
                <Sparkles className="text-emerald-500" size={18} />
                <h3 className="uppercase tracking-tighter text-sm">トリートメント経過写真</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {formData.treatment_photos.map((photo, i) => (
                <div key={i} className="bg-emerald-50/30 rounded-2xl p-2 border border-emerald-100 relative">
                  <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden relative mb-2">
                    <img src={photo.url} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => {
                      const newPhotos = [...formData.treatment_photos];
                      newPhotos.splice(i, 1);
                      setFormData({...formData, treatment_photos: newPhotos});
                    }} className="absolute top-2 right-2 bg-slate-900/50 text-white rounded-full p-1 hover:bg-rose-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  <Input 
                    placeholder="経過の説明（例: トリートメント前）" 
                    className="h-8 text-[10px] bg-white border-emerald-200"
                    value={photo.description}
                    onChange={(e) => updatePhotoDescription(i, e.target.value, 'treatment_photos')}
                  />
                </div>
              ))}
              {formData.treatment_photos.length < 8 && (
                <label className="aspect-square bg-emerald-50/50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-emerald-200 text-emerald-500 hover:bg-emerald-100 transition-all cursor-pointer">
                  <Camera size={24} className="mb-2" />
                  <span className="text-[10px] font-bold">経過写真を追加</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'treatment_photos')} />
                </label>
              )}
            </div>
          </Card>
        </motion.div>

        <Button className="w-full h-20 rounded-3xl text-xl font-black shadow-2xl bg-amber-500 hover:bg-amber-600 text-white gap-3 transition-all border-b-8 border-amber-700 mt-4" disabled={saving} type="submit">
          {saving ? "UPDATING..." : <><Save size={24} /> UPDATE KARTE</>}
        </Button>
      </form>
    </div>
  );
}
