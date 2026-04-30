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
  const [extractedData, setExtractedData] = useState<Partial<Customer>>({});
  const [visitHistory, setVisitHistory] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (prev) => {
        const imageData = prev.target?.result as string;
        setImage(imageData);
        startScanning(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const startScanning = async (imageData?: string) => {
    const currentImage = imageData || image;
    if (!currentImage) return;
    setStep("scanning");
    let ocrResult: any = null;
    try {
      const res = await performOCR(currentImage);
      ocrResult = res;
      
      if (!res.success) {
        if (res.error === "QUOTA_LIMIT_REACHED") {
          setQuotaExceeded(true);
          setStep("upload");
          return;
        }
        if (res.error === "API_KEY_INVALID") {
          toast.error(`APIキーの設定に問題があります: ${res.details || "有効化されていない可能性があります"}`);
          setStep("upload");
          return;
        }
        throw new Error(res.error);
      }

      const text = res.text || "";
      
      // Use Gemini to intelligently parse the text
      const parseRes = await parseExtractedText(text);
      
      if (parseRes.success && parseRes.data) {
        const d = parseRes.data;
        setExtractedData(prev => ({
          ...prev,
          customer_no: d.customer_no || "",
          name: d.name || "",
          name_kana: d.name_kana || "",
          phone: d.phone || "",
          postal_code: d.postal_code || "",
          address: d.address || "",
          birthday: d.birthday || "",
          gender: d.gender || "female",
          occupation: d.occupation || "",
          allergies: d.allergies || [],
          risk_flags: d.risk_flags || [],
        }));
        setVisitHistory(d.visit_history || text);
      } else {
        // Fallback to simple parsing if Gemini fails
        const phoneMatch = text.match(/\d{2,4}[-ー]\d{2,4}[-ー]\d{3,4}/) || text.match(/0\d{9,10}/);
        
        // Improved regex to ignore common labels like "お名前"
        const lines = text.split("\n");
        let foundName = "";
        for (const line of lines) {
          if (line.includes("様") || line.includes("名前")) {
            const cleaned = line.replace(/お名前|名前|様|:|：/g, "").trim();
            if (cleaned.length > 1) { // Ignore single characters like 'お'
              foundName = cleaned;
              break;
            }
          }
        }
        
        setExtractedData(prev => ({
          ...prev,
          name: foundName || "読み取り不可(手動入力)",
          phone: phoneMatch ? phoneMatch[0] : "",
        }));
        setVisitHistory(text);
      }
      
      setStep("result");
    } catch (err: any) {
      console.error("OCR Failed:", err);
      // Detailed error for debugging
      const errorMsg = ocrResult?.message || err.message || "解析に失敗しました";
      const errorDetails = ocrResult?.details || "";
      
      toast.error(errorMsg);
      
      // If we have detailed info, let's keep it in the history area so the user can read it
      if (errorDetails) {
        setVisitHistory(`【デバッグ情報: APIエラー】\n${errorMsg}\n\n詳細:\n${errorDetails}`);
      }

      // Fallback to manual entry step with empty data
      if (!extractedData.name) {
        setExtractedData({ name: "", phone: "", address: "" });
      }
      setStep("result");
    }
  };

  const handleConfirm = async () => {
    setIsRegistering(true);
    
    const finalData: any = {
      ...extractedData,
      is_active: true,
      has_allergy: (extractedData.allergies?.length ?? 0) > 0,
    };

    const res = await registerScannedCustomer(finalData, visitHistory);
    
    if (res.success) {
      toast.success("顧客情報を登録しました");
      onExtracted(finalData);
      onClose();
      setStep("upload");
      setImage(null);
      setExtractedData({});
      setVisitHistory("");
    } else {
      toast.error(res.error || "登録に失敗しました");
    }
    setIsRegistering(false);
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

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-6 max-h-[400px] overflow-y-auto">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">基本情報</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">会員No</label>
                        <Input 
                          value={extractedData.customer_no || ""} 
                          onChange={e => setExtractedData({...extractedData, customer_no: e.target.value})}
                          className="h-9 text-sm font-mono bg-white"
                        />
                      </div>
                      <div className="col-span-1"></div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500">お名前</label>
                        <Input 
                          value={extractedData.name || ""} 
                          onChange={e => setExtractedData({...extractedData, name: e.target.value})}
                          className="h-9 text-sm font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">フリガナ</label>
                        <Input 
                          value={extractedData.name_kana || ""} 
                          onChange={e => setExtractedData({...extractedData, name_kana: e.target.value})}
                          className="h-9 text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">電話番号</label>
                        <Input 
                          value={extractedData.phone || ""} 
                          onChange={e => setExtractedData({...extractedData, phone: e.target.value})}
                          className="h-9 text-sm font-mono bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">生年月日</label>
                        <Input 
                          type="date"
                          value={extractedData.birthday || ""} 
                          onChange={e => setExtractedData({...extractedData, birthday: e.target.value})}
                          className="h-9 text-sm bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500">住所</label>
                        <Input 
                          value={extractedData.address || ""} 
                          onChange={e => setExtractedData({...extractedData, address: e.target.value})}
                          className="h-9 text-sm bg-white"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">アレルギー・注意点</h4>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">アレルギー</label>
                      <Input 
                        value={extractedData.allergies?.join(", ") || ""} 
                        onChange={e => setExtractedData({...extractedData, allergies: e.target.value.split(",").map(s => s.trim())})}
                        className="h-9 text-sm bg-white"
                        placeholder="例: 金属, アルコール"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">リスクフラグ</label>
                      <Textarea 
                        value={extractedData.risk_flags?.join("\n") || ""} 
                        onChange={e => setExtractedData({...extractedData, risk_flags: e.target.value.split("\n")})}
                        className="text-xs bg-white min-h-[60px]"
                        placeholder="注意点を一行ずつ入力"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">2枚目以降（来店履歴）</h4>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <label className="text-[10px] font-bold text-slate-500 block mb-2">過去の施術メモ</label>
                      <Textarea 
                        value={visitHistory} 
                        onChange={e => setVisitHistory(e.target.value)}
                        className="text-xs border-none focus-visible:ring-0 min-h-[120px] p-0"
                        placeholder="日付: 施術内容・特記事項...&#10;例: 2024/01/10: 120本。左目頭外れやすい。"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => setStep("upload")} disabled={isRegistering}>
                      <Plus className="mr-2" size={16} /> 次のページ
                    </Button>
                    <Button className="flex-1 rounded-2xl h-12 bg-slate-900 gap-2" onClick={handleConfirm} disabled={isRegistering}>
                      {isRegistering ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      顧客リストに追加
                    </Button>
                  </div>
                  <Button variant="ghost" className="text-slate-400 text-xs" onClick={() => { setExtractedData({}); setVisitHistory(""); setStep("upload"); }}>
                    クリアして最初から
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
