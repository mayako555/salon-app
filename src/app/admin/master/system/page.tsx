"use client";

import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Brain, FileText, LayoutDashboard, Calculator, ShieldCheck, Award, Beaker, Banknote, Database } from "lucide-react";

export default function SystemMasterPage() {
  const { isSystemOwner } = useAuth();

  if (!isSystemOwner) {
    return (
      <div className="p-8 text-center bg-slate-50 min-h-screen">
        <p className="text-slate-500 font-bold">権限がありません。</p>
      </div>
    );
  }

  const sections = [
    { title: "テナント管理", icon: Users, desc: "SaaS利用企業の追加・削除、契約状態の管理", href: "/admin/master/system/tenants" },
    { title: "権限ロール設定", icon: ShieldCheck, desc: "システム内のアクセス権限パターンの定義", href: "/admin/master/system/roles" },
    { title: "AI分析設定", icon: Brain, desc: "SARIMAXのパラメータや回帰分析の重み付け設定", href: "/admin/master/system/ai-settings" },
    { title: "給与・手当ルール", icon: Calculator, desc: "全テナント共通の基本計算ロジック", href: "/admin/master/system/payroll-rules" },
    { title: "契約テンプレート", icon: FileText, desc: "雇用契約書・業務委託契約書の雛形管理", href: "/admin/master/system/contracts" },
    { title: "請求・入金管理", icon: Banknote, desc: "FC加盟店やテナントへのシステム利用料・ロイヤリティ請求", href: "/admin/master/system/billing" },
    { title: "評価マスタ設定", icon: Award, desc: "各役職の評価項目と配点の設定", href: "/admin/master/system/evaluations" },
    { title: "Test/Beta管理", icon: Beaker, desc: "テスト導入企業の利用状況とフィードバック分析", href: "/admin/master/system/test-tenants" },
    { title: "システム全体設定", icon: Settings, desc: "デフォルト値や共通マスタの設定", href: "/admin/master/system/settings" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Settings className="text-indigo-600" /> システム管理マスタ
          </h1>
          <Badge variant="outline" className="text-xs py-1 px-2 border-indigo-200 bg-indigo-50 text-indigo-700 flex items-center gap-1">
            <Database size={12} />
            接続先: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "未設定"}
          </Badge>
        </div>
        <p className="text-slate-500 font-medium">システムオーナー専用の全テナント共通設定</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map(sec => (
          <a key={sec.title} href={sec.href} className="block outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl">
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full">
              <CardHeader>
                <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <sec.icon className="text-indigo-500 group-hover:scale-110 transition-transform" size={20} />
                  {sec.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{sec.desc}</CardDescription>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
