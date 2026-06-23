"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, ArrowRight, Monitor, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import { useAuth } from "@/lib/auth-context";

export default function AttendanceSetupPage() {
  const router = useRouter();
  const { availableStores, loading } = useAuth();

  const storesToUse = availableStores && availableStores.length > 0 ? availableStores : ["神戸", "元町", "六甲"];

  const handleSelectStore = (store: string) => {
    router.push(`/kiosk/attendance?store=${encodeURIComponent(store)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl mb-4">
            <Monitor size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">TERMINAL SETUP</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">店舗用端末の初期設定</p>
        </div>

        <Card className="p-8 rounded-[2.5rem] border-none shadow-2xl bg-white space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-800 text-center">この端末を設置する店舗を選択してください</h2>
            <p className="text-sm text-slate-400 text-center font-medium">選択すると、その店舗専用の打刻画面が開きます。</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400 font-bold animate-pulse text-sm">店舗情報を取得中...</div>
            ) : (
              storesToUse.map((store, index) => (
                <motion.div
                  key={store}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Button
                    onClick={() => handleSelectStore(store)}
                    className="w-full h-24 rounded-3xl bg-slate-50 hover:bg-slate-100 border-2 border-slate-100 hover:border-slate-900 transition-all group flex items-center justify-between px-8"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-sm border border-slate-100">
                        <MapPin size={24} />
                      </div>
                      <span className="text-2xl font-black text-slate-800">{store}店</span>
                    </div>
                    <ArrowRight className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                  </Button>
                </motion.div>
              ))
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Sparkles className="text-purple-500" size={16} />
              外部サロン（SaaS）用端末
            </h3>
            <div className="flex gap-2">
              <input 
                id="fcStoreName"
                type="text" 
                placeholder="店舗名を入力 (例: 大阪)" 
                className="flex-1 h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <Button
                onClick={() => {
                  const input = document.getElementById("fcStoreName") as HTMLInputElement;
                  if (input && input.value) {
                    router.push(`/kiosk/attendance?store=${encodeURIComponent(input.value)}&type=fc`);
                  }
                }}
                className="h-12 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                設定する
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              ※加盟店モードでは、シフト判定や丸めを行わず押した時刻をそのまま記録します。
            </p>
          </div>

          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
            <Sparkles className="text-amber-500 shrink-0" size={20} />
            <div className="space-y-1">
              <p className="text-xs font-black text-amber-800 uppercase tracking-wider">TIPS FOR MANAGERS</p>
              <p className="text-xs text-amber-700 leading-relaxed font-bold">
                店舗のiPadなどでこの画面を開き、店舗を選択してください。
                一度設定するとURLに店舗情報が含まれるため、ブラウザの「お気に入り」や「ホーム画面に追加」をしておくと便利です。
              </p>
            </div>
          </div>
        </Card>

        <p className="text-center text-slate-300 text-[10px] font-bold tracking-widest uppercase">
          JASMINE LASH SYSTEM ADMINISTRATION
        </p>
      </div>
    </div>
  );
}
