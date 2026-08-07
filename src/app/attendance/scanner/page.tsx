"use client";

import { useState, useRef, useEffect } from "react";
import QrScanner from "react-qr-scanner";
import { handleQRScan } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, User, Loader2, Sparkles, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import AuthGuard from "@/components/AuthGuard";

export default function AttendanceScannerPage() {
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [staffName, setStaffName] = useState<string>("");
  const [actionType, setActionType] = useState<"IN" | "OUT" | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const scannerRef = useRef<any>(null);

  // Time display
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleScan = async (data: any) => {
    if (data && data.text && status === "idle") {
      const text = data.text;
      
      // QR format check: salon-auth:STAFF_ID or raw STAFF_ID
      if (text.startsWith("salon-auth:")) {
        const staffId = text.split(":")[1];
        processScan(staffId);
      } else if (text.length > 5) {
        // Fallback for raw IDs (assuming IDs are reasonably long)
        processScan(text);
      }
    }
  };

  const processScan = async (staffId: string) => {
    setStatus("scanning");
    try {
      const res = await handleQRScan(staffId);
      if (res.success) {
        setStaffName(res.name || "");
        setActionType(res.action as any);
        setStatus("success");
        setMessage(res.action === "IN" ? "出勤を記録しました" : "退勤を記録しました");
        
        // Reset after 3 seconds
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

  const handleError = (err: any) => {
    console.error(err);
    setStatus("error");
    setMessage("カメラの起動に失敗しました。権限を確認してください。");
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
    setStatus("idle");
  };

  return (
    <AuthGuard requireRole="manager" requireFeature="attendance">
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center gap-6">
          
          {/* Header/Clock */}
          <div className="text-center space-y-2 mb-2">
            <div className="flex items-center justify-center gap-3 mb-1">
              <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <Sparkles className="text-emerald-400 w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-widest uppercase">Timecard Scanner</h1>
            </div>
            <div className="text-5xl font-black text-white tabular-nums tracking-tighter">
              {currentTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          {/* Scanner Container */}
          <div className="relative w-full aspect-square max-w-[380px] rounded-[2.5rem] overflow-hidden border-4 border-slate-800 bg-slate-900 shadow-2xl">
            <QrScanner
              key={facingMode}
              delay={200}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={handleError}
              onScan={handleScan}
              constraints={{ video: { facingMode: facingMode } }}
            />
            
            {/* Scanning Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-12 left-12 w-10 h-10 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg opacity-40"></div>
              <div className="absolute top-12 right-12 w-10 h-10 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg opacity-40"></div>
              <div className="absolute bottom-12 left-12 w-10 h-10 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg opacity-40"></div>
              <div className="absolute bottom-12 right-12 w-10 h-10 border-b-4 border-r-4 border-emerald-500 rounded-br-lg opacity-40"></div>
              
              <motion.div 
                className="absolute left-6 right-6 h-0.5 bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                animate={{ top: ["15%", "85%", "15%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Status Overlays */}
            <AnimatePresence>
              {status === "scanning" && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center"
                >
                  <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                </motion.div>
              )}

              {status === "success" && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className={`absolute inset-0 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center ${
                    actionType === "IN" ? "bg-emerald-500/90" : "bg-blue-500/90"
                  }`}
                >
                  <CheckCircle2 className="w-20 h-20 text-white mb-4" />
                  <h2 className="text-3xl font-black text-white mb-1">{staffName} さん</h2>
                  <p className="text-lg font-bold text-white/90">{message}</p>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-rose-500/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                >
                  <XCircle className="w-20 h-20 text-white mb-4" />
                  <h2 className="text-2xl font-black text-white mb-1">エラー</h2>
                  <p className="text-base font-bold text-white/90 leading-relaxed">{message}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4 w-full max-w-[380px]">
            <div className="flex gap-2">
              <button 
                onClick={toggleCamera}
                className="flex-1 h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm transition-all border border-white/10 flex items-center justify-center gap-2"
              >
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <QrCode size={16} />
                </div>
                カメラ切替 ({facingMode === "user" ? "前面" : "背面"})
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center justify-center transition-all border border-white/10"
              >
                <Loader2 size={18} />
              </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
              <p className="text-slate-400 text-[11px] flex items-center justify-center gap-2">
                <User size={14} className="text-emerald-500" />
                個人のQRコードを枠内にかざしてください
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
