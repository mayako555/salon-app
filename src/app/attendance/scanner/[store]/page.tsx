"use client";

import { useState, useRef, useEffect, use } from "react";
import QrScanner from "react-qr-scanner";
import { handleQRScan } from "../../actions";
import { CheckCircle2, XCircle, User, Loader2, Sparkles, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StoreAttendanceScanner({ params }: { params: Promise<{ store: string }> }) {
  const resolvedParams = use(params);
  const storeName = decodeURIComponent(resolvedParams.store);
  
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [staffName, setStaffName] = useState<string>("");
  const [actionType, setActionType] = useState<"IN" | "OUT" | null>(null);

  // Time display
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleScan = async (data: any) => {
    if (data && data.text && status === "idle") {
      const text = data.text;
      if (text.startsWith("salon-auth:")) {
        const staffId = text.split(":")[1];
        processScan(staffId);
      }
    }
  };

  const processScan = async (staffId: string) => {
    setStatus("scanning");
    try {
      const res = await handleQRScan(staffId, storeName);
      if (res.success) {
        setStaffName(res.name || "");
        setActionType(res.action as any);
        setStatus("success");
        setMessage(res.action === "IN" ? "出勤を記録しました" : "退勤を記録しました");
        
        setTimeout(() => {
          setStatus("idle");
          setStaffName("");
          setActionType(null);
        }, 3000);
      } else {
        setStatus("error");
        setMessage(res.error || "エラーが発生しました");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch (err) {
      setStatus("error");
      setMessage("通信エラーが発生しました");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center gap-8">
        
        {/* Store Badge */}
        <div className="bg-white/10 px-6 py-2 rounded-full border border-white/20 flex items-center gap-2 backdrop-blur-md">
          <Building2 className="text-blue-400 w-4 h-4" />
          <span className="text-white font-bold text-sm tracking-widest uppercase">{storeName}店</span>
        </div>

        {/* Header/Clock */}
        <div className="text-center space-y-2">
          <div className="text-7xl font-black text-white tabular-nums tracking-tighter">
            {currentTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <p className="text-slate-400 font-medium">
            {currentTime.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>

        {/* Scanner Container */}
        <div className="relative w-full aspect-square max-w-[420px] rounded-[3rem] overflow-hidden border-[12px] border-slate-800 bg-slate-900 shadow-2xl">
          <QrScanner
            delay={300}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(err: any) => console.error(err)}
            onScan={handleScan}
            constraints={{ video: { facingMode: "user" } }}
          />
          
          {/* Scanning Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div 
              className="absolute left-4 right-4 h-2 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.5)]"
              animate={{ top: ["10%", "90%", "10%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Status Overlays */}
          <AnimatePresence>
            {status === "scanning" && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center"
              >
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
              </motion.div>
            )}

            {status === "success" && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className={`absolute inset-0 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center ${
                  actionType === "IN" ? "bg-emerald-500/90" : "bg-blue-500/90"
                }`}
              >
                <CheckCircle2 className="w-24 h-24 text-white mb-6" />
                <h2 className="text-4xl font-black text-white mb-2">{staffName} さん</h2>
                <p className="text-xl font-bold text-white/90">{message}</p>
                <div className="mt-8 text-white/40 font-medium">Please wait...</div>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-rose-500/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
              >
                <XCircle className="w-24 h-24 text-white mb-6" />
                <h2 className="text-3xl font-black text-white mb-2">Error</h2>
                <p className="text-xl font-bold text-white/90">{message}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Instructions */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
            <User size={16} />
            <span>QRコードをスキャンしてください</span>
          </div>
        </div>
      </div>
    </div>
  );
}
