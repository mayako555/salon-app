"use client";

import { useAuth } from "@/lib/auth-context";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, QrCode, Sparkles } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

export default function MyQRPage() {
  const { profile } = useAuth();

  if (!profile) return null;

  // Format: salon-auth:STAFF_ID
  const qrValue = `salon-auth:${profile.id}`;

  return (
    <AuthGuard requireRole="staff">
      <div className="max-w-md mx-auto space-y-6 pt-4 pb-20">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">マイQRコード</h1>
          <p className="text-slate-500 text-sm">出退勤の際、店舗のスキャナーにかざしてください</p>
        </div>

        <Card className="border-none shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden rounded-[2.5rem]">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/10">
              <Sparkles className="text-blue-400 w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-black">{profile.name}</CardTitle>
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest opacity-80">
              {profile.role === 'admin' ? '管理者' : profile.role === 'manager' ? 'マネージャー' : 'スタッフ'}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-8 pb-10">
            <div className="bg-white p-6 rounded-[2rem] shadow-[0_0_50px_rgba(59,130,246,0.3)]">
              <QRCodeSVG 
                value={qrValue} 
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>
            
            <div className="flex flex-col items-center gap-4 w-full px-4">
              <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/10 w-full justify-center">
                <QrCode className="text-blue-400 w-5 h-5" />
                <span className="text-sm font-medium text-slate-300">ID: {profile.id.slice(0, 8)}...</span>
              </div>
              
              <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                ※このQRコードは打刻専用です。<br />
                他人に教えたり、スクリーンショットを共有しないでください。
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 items-start">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <User size={18} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-blue-900">使い方</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              店舗の入り口にあるスキャナーに、この画面を表示したままスマホをかざしてください。
              自動的に「出勤」または「退勤」が記録されます。
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
