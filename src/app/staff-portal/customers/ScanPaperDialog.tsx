"use client";

import { useState, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  Upload, 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Scan,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Customer } from "@/lib/customers";

type ScanPaperDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (data: Partial<Customer>) => void;
};

export default function ScanPaperDialog({ isOpen, onClose, onExtracted }: ScanPaperDialogProps) {
  const [step, setStep] = useState<"upload" | "scanning" | "result">("upload");
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (prev) => {
        setImage(prev.target?.result as string);
        startScanning();
      };
      reader.readAsDataURL(file);
    }
  };

  const startScanning = () => {
    setStep("scanning");
    // Simulate AI processing time
    setTimeout(() => {
      setStep("result");
    }, 3000);
  };

  const handleConfirm = () => {
    // Mocked extracted data
    const mockData: Partial<Customer> = {
      name: "山田 恵子",
      name_kana: "ヤマダ ケイコ",
      phone: "090-8888-9999",
      gender: "female",
      birthday: "1992-05-12",
      has_allergy: true,
      allergies: ["金属", "アルコール"],
      risk_level: "yellow",
      risk_flags: ["過去にトラブルあり（他店）", "アルコール消毒不可"],
    };
    
    onExtracted(mockData);
    onClose();
    setStep("upload");
    setImage(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-[2rem] overflow-hidden p-0 border-none shadow-2xl">
        <div className="bg-slate-900 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Scan size={18} />
              </div>
              紙カルテのデジタル化 (AI)
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-bold">
              既存の紙カルテを撮影して、顧客情報を自動で読み込みます。
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === "upload" && (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors shadow-inner">
                    <Camera size={32} />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-slate-700">写真を撮る・アップロード</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Select photo of paper card</p>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    capture="environment"
                  />
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
                    文字がはっきり見えるように明るい場所で撮影してください。
                    名前、電話番号、アレルギー有無、特記事項を重点的に解析します。
                  </p>
                </div>
              </motion.div>
            )}

            {step === "scanning" && (
              <motion.div 
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-8"
              >
                <div className="relative w-48 h-64 rounded-xl overflow-hidden shadow-2xl border-4 border-white">
                  {image && <img src={image} className="w-full h-full object-cover grayscale opacity-50" />}
                  <motion.div 
                    initial={{ top: "-10%" }}
                    animate={{ top: "110%" }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-blue-500 shadow-[0_0_15px_#3b82f6] z-10"
                  />
                </div>
                
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-blue-600 font-black">
                    <Loader2 className="animate-spin" size={20} />
                    <span>AI解析中...</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Digitizing paper record</p>
                </div>
              </motion.div>
            )}

            {step === "result" && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 border border-emerald-100">
                  <CheckCircle2 size={24} />
                  <div>
                    <p className="font-black">読み取り完了</p>
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Analysis successful</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Name</label>
                      <p className="font-bold text-slate-800">山田 恵子</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone</label>
                      <p className="font-bold text-slate-800 tabular-nums">090-8888-9999</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-200 pt-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Allergy Info</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full">金属</span>
                      <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full">アルコール</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notes (Risk)</label>
                    <p className="text-[11px] text-rose-600 font-bold mt-1 leading-relaxed">
                      ・過去にまつエクで痒みが出た経験あり（他店）
                      ・アルコール綿での消毒は避ける
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => setStep("upload")}>
                    撮り直す
                  </Button>
                  <Button className="flex-1 rounded-2xl h-12 bg-slate-900" onClick={handleConfirm}>
                    この情報で登録
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
