"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCustomerById, Customer } from "@/lib/customers";
import { getKarteByCustomer, KarteRecord, addKarteRecord } from "@/lib/karte";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  Calendar, 
  Sparkles, 
  Image as ImageIcon, 
  Plus, 
  X, 
  Camera, 
  FileText,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";

export default function TreatmentResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [photos, setPhotos] = useState<{url: string, description: string, date: any}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  
  // Add State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    if (typeof id !== 'string') return;
    const [cData, kData] = await Promise.all([
      getCustomerById(id),
      getKarteByCustomer(id)
    ]);
    setCustomer(cData);
    
    const allPhotos: {url: string, description: string, date: any}[] = [];
    kData.forEach(karte => {
      if (karte.treatment_photos && karte.treatment_photos.length > 0) {
        karte.treatment_photos.forEach(p => {
          allPhotos.push({
            ...p,
            date: karte.date
          });
        });
      }
    });
    setPhotos(allPhotos);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleAddSubmit = async () => {
    if (!newPhotoUrl) {
      alert("写真のURLを入力してください（デモ用）");
      return;
    }
    setIsSubmitting(true);
    try {
      // Create a simple karte record for this treatment result
      await addKarteRecord({
        customer_id: id as string,
        staff_id: "staff-1",
        staff_name: "スタッフ",
        date: new Date(),
        service_type: 'eyelash_ext',
        visit_type: 'repeat',
        design: {},
        treatment_photos: [{ url: newPhotoUrl, description: newDescription }],
        notes: newDescription
      });
      setIsAddOpen(false);
      setNewPhotoUrl("");
      setNewDescription("");
      await load();
    } catch (e) {
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white/50 animate-pulse">Loading...</div>;
  if (!customer) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Customer not found</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 selection:bg-amber-500/30">
      {/* Premium Header */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="text-white/50 hover:text-white hover:bg-white/10"
          >
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="text-amber-400" size={20} />
              TREATMENT PROGRESS
            </h1>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
              Presentation for {customer.name}
            </p>
          </div>
        </div>

        <Button 
          onClick={() => setIsAddOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-full px-6 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
        >
          <Plus size={18} />
          新規経過を追加
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-12 space-y-12">
        {photos.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-white/10">
              <ImageIcon size={48} />
            </div>
            <div className="space-y-2">
              <p className="text-white font-black text-xl uppercase tracking-widest">No Photos Found</p>
              <p className="text-white/30 text-sm font-medium">施術結果の写真をアップロードして、お客様と経過を共有しましょう。</p>
            </div>
            <Button 
              onClick={() => setIsAddOpen(true)}
              variant="outline"
              className="rounded-full border-white/10 hover:bg-white/5 text-amber-400 font-bold"
            >
              最初の経過を追加する
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {photos.map((photo, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group cursor-pointer"
                onClick={() => setSelectedPhoto(i)}
              >
                <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-slate-900 border border-white/10 shadow-2xl transition-all duration-500 group-hover:shadow-amber-500/10 group-hover:border-amber-500/30">
                  <img 
                    src={photo.url} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt={photo.description}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                  
                  <div className="absolute bottom-8 left-8 right-8">
                    <div className="flex items-center gap-2 text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 opacity-100">
                      <Calendar size={12} />
                      {format(photo.date?.toDate?.() || photo.date, "yyyy.MM.dd")}
                    </div>
                    <h3 className="text-xl font-black leading-tight group-hover:text-amber-200 transition-colors">
                      {photo.description || "Treatment Result"}
                    </h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white rounded-[2rem] p-8 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <Camera className="text-amber-400" />
              新規経過の登録
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">施術写真</label>
              
              {newPhotoUrl ? (
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 group">
                  <img src={newPhotoUrl} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setNewPhotoUrl("")}
                    className="absolute top-4 right-4 w-10 h-10 bg-slate-900/80 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-[4/5] bg-white/5 border-2 border-dashed border-white/10 rounded-[2.5rem] cursor-pointer hover:bg-white/10 hover:border-amber-500/50 transition-all group">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Camera size={32} />
                  </div>
                  <p className="text-sm font-black text-white/60">写真を選択・撮影</p>
                  <p className="text-[10px] text-white/20 mt-2 font-bold">JPG / PNG / HEIC</p>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setNewPhotoUrl(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">施術メモ / デザイン詳細</label>
              <textarea 
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="カールの種類や薬剤の浸透時間など..."
                className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-amber-500/50 outline-none resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setIsAddOpen(false)}
              className="h-14 rounded-2xl font-black text-white/50"
            >
              キャンセル
            </Button>
            <Button 
              onClick={handleAddSubmit}
              disabled={isSubmitting || !newPhotoUrl}
              className="flex-1 h-14 rounded-2xl font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xl shadow-amber-500/20"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "経過を保存する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Overlay Gallery */}
      <AnimatePresence>
        {selectedPhoto !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
            onClick={() => setSelectedPhoto(null)}
          >
            <Button 
              className="absolute top-8 right-8 text-white/50 hover:text-white"
              variant="ghost"
              onClick={() => setSelectedPhoto(null)}
            >
              <X size={32} />
            </Button>

            <motion.div 
              layoutId={`photo-${selectedPhoto}`}
              className="relative max-w-full max-h-[75vh] aspect-[4/5] overflow-hidden rounded-3xl shadow-[0_0_100px_rgba(251,191,36,0.1)]"
            >
              <img 
                src={photos[selectedPhoto].url} 
                className="w-full h-full object-contain"
                alt="Selected result"
              />
            </motion.div>

            <div className="mt-10 text-center space-y-3">
              <p className="text-amber-400 font-black tracking-[0.3em] text-xs uppercase">
                {format(photos[selectedPhoto].date?.toDate?.() || photos[selectedPhoto].date, "yyyy MMMM dd")}
              </p>
              <h2 className="text-3xl font-black tracking-tight">{photos[selectedPhoto].description || "Treatment Result"}</h2>
            </div>

            <div className="mt-12 flex gap-8">
              <button 
                className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhoto(prev => (prev! > 0 ? prev! - 1 : photos.length - 1));
                }}
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhoto(prev => (prev! < photos.length - 1 ? prev! + 1 : 0));
                }}
              >
                <ChevronLeft size={24} className="rotate-180" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
