"use client";

import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  FileText, 
  Database, 
  ShieldCheck, 
  QrCode, 
  Clock, 
  Calendar,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";

export default function DashboardPage() {
  const { profile, isAdmin, isManager } = useAuth();

  return (
    <AuthGuard requireRole="staff">
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="text-emerald-500" />
            {profile?.name}さん、おはようございます
          </h1>
          <p className="text-slate-500">本日の状況と重要なタスクを確認します。</p>
        </div>

        {/* STAFF VIEW */}
        {!isAdmin && !isManager && (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            <Card className="lg:col-span-1 bg-white border-none shadow-sm flex flex-col items-center justify-center p-8 border-t-4 border-t-emerald-500">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <QrCode size={20} className="text-emerald-500" />
                  打刻用QRコード
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">店舗のタブレットにかざしてください</p>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6">
                <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-100">
                  <QRCodeSVG 
                    value={`salon-auth:${profile?.id}`} 
                    size={200}
                    level="H"
                    includeMargin={true}
                    fgColor="#0f172a"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700">{profile?.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">{profile?.id.substring(0, 8)}</p>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-emerald-600 text-white border-none shadow-md overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Clock size={80} />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-100 uppercase tracking-wider">本日の勤務</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">10:00 - 19:00</div>
                    <p className="text-xs text-emerald-100/70 mt-1">休憩: 60分 (予定)</p>
                  </CardContent>
                </Card>

                <Link href="/staff-portal/payroll">
                  <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between">
                        最新の給与明細
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">確認する</div>
                      <p className="text-xs text-slate-400 mt-1">前月分の明細が確定しています</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              <Card className="bg-white border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Calendar size={18} className="text-blue-500" />
                    お知らせ・連絡事項
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm text-slate-600">
                    <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-l-blue-500">
                      <p className="font-bold text-slate-800">【重要】来月の希望休について</p>
                      <p className="text-xs mt-1">25日までにポータルから提出をお願いします。</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-l-slate-300">
                      <p className="font-bold text-slate-800">店舗ミーティングのお知らせ</p>
                      <p className="text-xs mt-1">来週月曜 9:00〜 全員参加です。</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ADMIN VIEW */}
        {(isAdmin || isManager) && (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 whitespace-nowrap">
              <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">登録スタッフ数</CardTitle>
                  <Users className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">12 人</div>
                  <p className="text-xs text-slate-500 mt-1">稼働中の全スタッフ</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">未処理の勤怠</CardTitle>
                  <FileText className="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">3 件</div>
                  <p className="text-xs text-slate-500 mt-1">打刻漏れ等の確認が必要</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">今月の売上予測</CardTitle>
                  <Database className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">¥4,280,000</div>
                  <p className="text-xs text-emerald-600 mt-1">前月同期比 +8.5%</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">システム状態</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">正常</div>
                  <p className="text-xs text-slate-500 mt-1">セキュリティ保護済み</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="col-span-1 bg-white border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-800">店舗別売上サマリ (本日)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">六甲店</span>
                      <span className="font-bold">¥125,000</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">神戸店</span>
                      <span className="font-bold">¥98,000</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">元町店</span>
                      <span className="font-bold">¥112,000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-1 bg-white border-none shadow-sm border-l-4 border-l-rose-500">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-800 text-rose-600 font-bold">管理者アラート</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm text-slate-600 font-medium">
                    <p className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      前月の月次締め処理が完了していません
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      業務委託「佐藤」様の契約期限が残り7日です
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
