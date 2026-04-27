"use client";

import { useState, useRef, useEffect } from "react";
import QrScanner from "react-qr-scanner";
import { handleQRScan } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, User, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import AuthGuard from "@/components/AuthGuard";

export default function AttendanceScannerPage() {
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [staffName, setStaffName] = useState<string>("");
  const [actionType, setActionType] = useState<"IN" | "OUT" | null>(null);
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
      
      // QR format check: salon-auth:STAFF_ID
      if (text.startsWith("salon-auth:")) {
        const staffId = text.split(":")[1];
        processScan(staffId);
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
  };

  return (
    <AuthGuard requireRole="manager">
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center gap-8">
          
          {/* Header/Clock */}
          <div className="text-center space-y-2 mb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <Sparkles className="text-emerald-400 w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-widest uppercase">Timecard Scanner</h1>
            </div>
            <div className="text-6xl font-black text-white tabular-nums tracking-tighter">
              {currentTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <p className="text-slate-400 font-medium">
              {currentTime.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
            </p>
          </div>

          {/* Scanner Container */}
          <div className="relative w-full aspect-square max-w-[400px] rounded-3xl overflow-hidden border-4 border-slate-800 bg-slate-900 shadow-2xl">
            <QrScanner
              delay={300}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={handleError}
              onScan={handleScan}
              constraints={{ video: { facingMode: "user" } }}
            />
            
            {/* Scanning Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner Markers */}
              <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl opacity-60"></div>
              <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl opacity-60"></div>
              <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl opacity-60"></div>
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-emerald-500 rounded-br-xl opacity-60"></div>
              
              {/* Scanning Line */}
              <motion.div 
                className="absolute left-4 right-4 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* Status Overlays */}
            <AnimatePresence>
              {status === "scanning" && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center"
                >
                  <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
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
                  <div className="mt-8 text-white/60 font-medium">自動で戻ります...</div>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-rose-500/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                >
                  <XCircle className="w-24 h-24 text-white mb-6" />
                  <h2 className="text-3xl font-black text-white mb-2">エラー</h2>
                  <p className="text-xl font-bold text-white/90">{message}</p>
                  <div className="mt-8 text-white/60 font-medium">3秒後に再試行します</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Instructions */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-md text-center backdrop-blur-sm">
            <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
              <User size={16} className="text-emerald-500" />
              個人のQRコードを枠内にかざしてください
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
