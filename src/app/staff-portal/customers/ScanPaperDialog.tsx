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
  FileText,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Customer } from "@/lib/customers";
import { registerScannedCustomer, performOCR, parseExtractedText } from "./actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ScanPaperDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (data: Partial<Customer>) => void;
};

export default function ScanPaperDialog({ isOpen, onClose, onExtracted }: ScanPaperDialogProps) {
  const [step, setStep] = useState<"upload" | "scanning" | "result">("upload");
  const [image, setImage] = useState<string | null>(null);
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<Customer>>({});
  const [visitHistory, setVisitHistory] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (prev) => {
        const imageData = prev.target?.result as string;
        setImage(imageData);
        startScanning(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const startScanning = async (imageData: string) => {
    setStep("scanning");
    setIsUploading(true);
    
    try {
      // Parallel: OCR/AI Parsing AND Uploading to Storage
      const [ocrResult, uploadResult] = await Promise.all([
        performOCR(imageData).then(async (res) => {
          if (!res.success) return res;
          const parseRes = await parseExtractedText(res.text || "");
          return { ...res, parse: parseRes };
        }),
        import("./actions").then(m => m.uploadScanImage(imageData))
      ]);

      // 1. Handle Upload Result
      if (uploadResult.success && uploadResult.url) {
        setScannedImages(prev => [...prev, uploadResult.url]);
      } else {
        console.error("Upload failed:", uploadResult.error);
        toast.error("画像の保存に失敗しました。データのみ解析します。");
      }

      // 2. Handle OCR/AI Result
      if (ocrResult.success) {
        const text = ocrResult.text || "";
        const parseRes = (ocrResult as any).parse;

        if (parseRes?.success && parseRes.data) {
          const d = parseRes.data;
          // Merge with existing data if this is a multi-page scan
          setExtractedData(prev => ({
            ...prev,
            customer_no: d.customer_no || prev.customer_no || "",
            name: d.name || prev.name || "",
            name_kana: d.name_kana || prev.name_kana || "",
            phone: d.phone || prev.phone || "",
            postal_code: d.postal_code || prev.postal_code || "",
            address: d.address || prev.address || "",
            birthday: d.birthday || prev.birthday || "",
            gender: d.gender || prev.gender || "female",
            occupation: d.occupation || prev.occupation || "",
            allergies: Array.from(new Set([...(prev.allergies || []), ...(d.allergies || [])])),
            risk_flags: Array.from(new Set([...(prev.risk_flags || []), ...(d.risk_flags || [])])),
          }));
          setVisitHistory(prev => (prev ? prev + "\n\n" : "") + (d.visit_history || text));
        } else {
          // Fallback logic (existing)
          const phoneMatch = text.match(/\d{2,4}[-ー]\d{2,4}[-ー]\d{3,4}/) || text.match(/0\d{9,10}/);
          setExtractedData(prev => ({
            ...prev,
            name: prev.name || "読み取り不可(手動入力)",
            phone: prev.phone || (phoneMatch ? phoneMatch[0] : ""),
          }));
          setVisitHistory(prev => (prev ? prev + "\n\n" : "") + text);
          toast.error("AI解析が一部制限されました。手動で確認・修正をお願いします。");
        }
      } else {
        if (ocrResult.error === "QUOTA_LIMIT_REACHED") setQuotaExceeded(true);
        else toast.error(ocrResult.error || "解析に失敗しました");
      }

      setStep("result");
    } catch (err: any) {
      console.error("Scanning Error:", err);
      toast.error("スキャン中にエラーが発生しました");
      setStep("result");
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (isRegistering) return;
    setIsRegistering(true);
    
    try {
      // Ensure we use the latest state from the form fields
      const finalData: any = {
        ...extractedData,
        is_active: true,
        has_allergy: (extractedData.allergies?.length ?? 0) > 0,
      };

      const res = await registerScannedCustomer(finalData, visitHistory, scannedImages);
      
      if (res.success) {
        toast.success("顧客情報を登録しました（カルテ画像も保存完了）");
        onExtracted(finalData);
        onClose();
        // Reset state
        setStep("upload");
        setImage(null);
        setScannedImages([]);
        setExtractedData({});
        setVisitHistory("");
      } else {
        toast.error(res.error || "登録に失敗しました");
      }
    } catch (err: any) {
      toast.error("保存処理中にエラーが発生しました");
    } finally {
      setIsRegistering(false);
    }
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
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex items-center justify-between border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={24} />
                    <div>
                      <p className="font-black">読み取り完了</p>
                      <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Analysis successful</p>
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    {scannedImages.map((url, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden shadow-sm bg-slate-200">
                        <img src={url} alt={`page ${i+1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                      {scannedImages.length}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {/* Scanned Previews Row */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">保存される写真 (目視確認用)</h4>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {scannedImages.map((url, i) => (
                        <div key={i} className="relative flex-shrink-0 w-24 h-32 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
                          <img src={url} alt="scan" className="w-full h-full object-cover" />
                          <div className="absolute top-1 left-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">
                            #{i+1}
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0 w-24 h-32 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-100 transition-colors"
                      >
                        <Plus size={20} />
                        <span className="text-[8px] font-bold">ページ追加</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">基本情報 (AI読取・手動修正可)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500">お名前</label>
                        <Input 
                          value={extractedData.name || ""} 
                          onChange={e => setExtractedData({...extractedData, name: e.target.value})}
                          className="h-10 text-base font-black bg-white border-slate-200 focus:border-blue-500 rounded-xl"
                          placeholder="未入力"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">フリガナ</label>
                        <Input 
                          value={extractedData.name_kana || ""} 
                          onChange={e => setExtractedData({...extractedData, name_kana: e.target.value})}
                          className="h-9 text-sm bg-white rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">電話番号</label>
                        <Input 
                          value={extractedData.phone || ""} 
                          onChange={e => setExtractedData({...extractedData, phone: e.target.value})}
                          className="h-9 text-sm font-mono bg-white rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">生年月日</label>
                        <Input 
                          type="date"
                          value={extractedData.birthday || ""} 
                          onChange={e => setExtractedData({...extractedData, birthday: e.target.value})}
                          className="h-9 text-sm bg-white rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">会員No</label>
                        <Input 
                          value={extractedData.customer_no || ""} 
                          onChange={e => setExtractedData({...extractedData, customer_no: e.target.value})}
                          className="h-9 text-sm font-mono bg-white rounded-lg"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500">住所</label>
                        <Input 
                          value={extractedData.address || ""} 
                          onChange={e => setExtractedData({...extractedData, address: e.target.value})}
                          className="h-9 text-sm bg-white rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">アレルギー・健康状態</h4>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">アレルギー</label>
                      <Input 
                        value={extractedData.allergies?.join(", ") || ""} 
                        onChange={e => setExtractedData({...extractedData, allergies: e.target.value.split(",").map(s => s.trim())})}
                        className="h-9 text-sm bg-white rounded-lg"
                        placeholder="例: 金属, アルコール"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">カルテ・来店履歴メモ</h4>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-inner">
                      <label className="text-[10px] font-bold text-slate-500 block mb-2">手書き内容の書き起こし (修正可)</label>
                      <Textarea 
                        value={visitHistory} 
                        onChange={e => setVisitHistory(e.target.value)}
                        className="text-xs border-none focus-visible:ring-0 min-h-[160px] p-0 leading-relaxed"
                        placeholder="AIが読み取った内容が表示されます。必要に応じて修正してください。"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-2xl h-14 border-2" 
                      onClick={() => fileInputRef.current?.click()} 
                      disabled={isRegistering || isUploading}
                    >
                      {isUploading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Plus className="mr-2" size={16} />}
                      {scannedImages.length > 0 ? "次のページを追加" : "写真を撮る"}
                    </Button>
                    <Button 
                      className="flex-1 rounded-2xl h-14 bg-slate-900 gap-2 shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all" 
                      onClick={handleConfirm} 
                      disabled={isRegistering || isUploading || !extractedData.name}
                    >
                      {isRegistering ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                      <div className="text-left">
                        <p className="text-sm font-black leading-none">保存して完了</p>
                        <p className="text-[9px] font-bold opacity-60">Register Customer</p>
                      </div>
                    </Button>
                  </div>
                  <Button variant="ghost" className="text-slate-400 text-xs font-bold" onClick={() => { setExtractedData({}); setVisitHistory(""); setScannedImages([]); setStep("upload"); }}>
                    すべて破棄してやり直す
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>

      {/* Quota Exceeded Alert */}
      <Dialog open={quotaExceeded} onOpenChange={setQuotaExceeded}>
        <DialogContent className="sm:max-w-xs rounded-[2rem] text-center p-8">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800">無料枠の上限です</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-500 font-bold leading-relaxed">
              Google Cloud Visionの無料枠（月間1,000枚）を超えました。
            </p>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">次回の追加可能日</p>
              <p className="text-lg font-black text-slate-700">
                {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} 以降
              </p>
            </div>
            <p className="text-[10px] text-slate-400 font-bold">
              ※ 手動での顧客登録は引き続き可能です。
            </p>
          </div>
          <Button onClick={() => setQuotaExceeded(false)} className="w-full h-12 rounded-xl bg-slate-900">
            閉じる
          </Button>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
