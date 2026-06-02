import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, BarChart3, Users, ShieldCheck, Database, Zap, Scissors } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-slate-900 to-slate-700 p-2 rounded-lg text-white">
              <Scissors size={20} />
            </div>
            <span className="font-black text-xl tracking-tight italic">SalonManager SaaS</span>
          </div>
          <nav className="hidden md:flex gap-8 font-bold text-sm text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">機能紹介</a>
            <a href="#ai" className="hover:text-indigo-600 transition-colors">AI分析</a>
            <a href="#security" className="hover:text-indigo-600 transition-colors">セキュリティ</a>
          </nav>
          <Link href="/login">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 font-bold">
              ログイン
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm border border-indigo-100">
            <Sparkles size={16} />
            <span>サロン経営のすべてを、データ駆動に。</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight text-slate-900">
            次世代サロン向け <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-rose-500">
              オールインワンSaaS
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-medium">
            AIによる高度なLTV予測から、シフト管理、給与計算、電子カルテまで。
            複数店舗を展開するサロンの「見えない課題」を可視化し、利益の最大化を実現します。
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-14 px-8 text-lg font-bold shadow-lg shadow-indigo-200">
              無料デモをリクエスト
            </Button>
            <Button variant="outline" className="rounded-full h-14 px-8 text-lg font-bold border-slate-300 text-slate-700 hover:bg-slate-100">
              資料ダウンロード
            </Button>
          </div>
          
          {/* Dashboard Preview Image Placeholder */}
          <div className="mt-16 relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50 z-10 top-1/2"></div>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white p-2">
              <div className="bg-slate-100 rounded-xl aspect-[16/9] flex items-center justify-center">
                <p className="text-slate-400 font-bold text-xl">※ ここにダッシュボードのスクリーンショットを配置 ※</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">圧倒的な業務効率化とデータ活用</h2>
            <p className="text-slate-500 font-medium max-w-2xl mx-auto">
              バラバラだった業務システムを一つに統合。店長もスタッフも、直感的な操作で日々の業務をスムーズに。
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Database size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800">自由自在な電子カルテ</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                サロンの業態に合わせてカルテの背景テンプレートを自由に変更可能。ペン描画やテキスト入力に完全対応し、ペーパーレス化を促進します。
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800">スタッフポータル</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                交通費申請、経費精算、給与明細の確認をスタッフ自身のスマホからワンストップで。面倒な労務管理の手間を大幅に削減します。
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800">給与・手当の自動計算</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                指名料や店販の還元率など、複雑な歩合ルールをシステム管理マスタで一括設定。毎月の給与計算の負担をゼロにします。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section id="ai" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
              <BarChart3 size={14} />
              DATA-DRIVEN
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              直感から、<br/>
              <span className="text-indigo-400">データに基づく意思決定へ。</span>
            </h2>
            <p className="text-slate-400 font-medium text-lg">
              SARIMAXモデルによる高精度な売上予測と、コホート生存モデルを用いたLTV（顧客生涯価値）分析を標準搭載。
              <br/><br/>
              「どの施策が」「いつ」「どれだけの」リターンを生むのかを、AIが定量的に可視化します。
            </p>
            <ul className="space-y-4 pt-4">
              <li className="flex items-center gap-3 text-slate-300 font-bold">
                <CheckCircle /> リピーター定着カーブの自動算出
              </li>
              <li className="flex items-center gap-3 text-slate-300 font-bold">
                <CheckCircle /> 天候や祝日などの外生変数を考慮した予測
              </li>
              <li className="flex items-center gap-3 text-slate-300 font-bold">
                <CheckCircle /> 要因ごとの回帰分析とAIレポート自動生成
              </li>
            </ul>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-800 p-2">
            <div className="bg-slate-900 rounded-xl aspect-[4/3] flex items-center justify-center">
              <p className="text-slate-600 font-bold">※ AI分析画面のスクリーンショット ※</p>
            </div>
          </div>
        </div>
      </section>

      {/* SaaS Architecture Section */}
      <section id="security" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">エンタープライズ対応の堅牢な基盤</h2>
            <p className="text-slate-500 font-medium max-w-2xl mx-auto">
              FC展開や複数企業を束ねるホールディングスにも対応する、最新のSaaSアーキテクチャ。
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
            <div className="flex gap-4 p-6 rounded-2xl bg-indigo-50 border border-indigo-100">
              <ShieldCheck className="text-indigo-600 flex-shrink-0" size={32} />
              <div>
                <h3 className="font-black text-lg text-slate-900 mb-2">完全なマルチテナント設計</h3>
                <p className="text-sm text-slate-600 font-medium">企業（companyId）ごとのデータ隔離をサーバーレベルで強制。他社のデータが混入するリスクはゼロです。システムオーナー画面から各テナントの契約や利用状況を一元管理できます。</p>
              </div>
            </div>
            <div className="flex gap-4 p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <Users className="text-slate-700 flex-shrink-0" size={32} />
              <div>
                <h3 className="font-black text-lg text-slate-900 mb-2">柔軟な権限ロール制御</h3>
                <p className="text-sm text-slate-600 font-medium">System Owner, Company Owner, Manager, Store Manager, Staff といった5段階の権限を設定。適切なユーザーに適切な情報だけを安全に開示します。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-indigo-600 text-center px-6">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-6">
          サロンの未来を変える準備はできましたか？
        </h2>
        <Button className="bg-white text-indigo-600 hover:bg-slate-100 rounded-full h-14 px-10 text-lg font-black shadow-lg">
          まずは無料でお試し
        </Button>
      </section>
      
      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4 text-slate-300">
          <Scissors size={20} />
          <span className="font-black text-xl tracking-tight italic">SalonManager SaaS</span>
        </div>
        <p className="text-sm font-medium">© 2026 SalonManager. All rights reserved.</p>
      </footer>
    </div>
  );
}

function CheckCircle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
