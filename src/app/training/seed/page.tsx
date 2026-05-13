"use client";

import { useState } from "react";
import { saveCurriculumItem } from "../training-actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Database } from "lucide-react";

const SEED_DATA = [
  {
    name: "アイブロウ基礎知識",
    description: "皮膚学、毛髪学、脱毛学、衛生学、倫理学、カウンセリング学、商材学、フェイス分析、デザイン学",
    free_model_target: 0,
    paid_model_target: 0,
    evaluation_criteria: ["皮膚・毛髪の知識", "商材・衛生の理解", "デザイン理論の習得"]
  },
  {
    name: "アイブロウ基礎技術",
    description: "アイブロウデッサン（演習・モデル）、ワキシング（シート・ハード）、ツイージング、スタイリング＆WAX、ラミネート技術、メンズアイブロウ",
    free_model_target: 5,
    paid_model_target: 5,
    evaluation_criteria: ["左右バランスの正確さ", "ワキシングの技術", "間引きの適切さ", "ラミネートの仕上がり"]
  },
  {
    name: "エクステンション基礎知識",
    description: "マネキンかき分け、1by1装着特性、ツイーザー保持、毛髪学、皮膚学、ワゴンセッティング、ヒトモデル前処理、ポイントリムーブ、トラブル対策、アフターカウンセリング、広告・リスク管理",
    free_model_target: 0,
    paid_model_target: 0,
    evaluation_criteria: ["装着姿勢の正しさ", "ツイーザーの扱い", "カウンセリングの質", "衛生管理の徹底"]
  },
  {
    name: "シングルエクステ",
    description: "テープワーク、グルー塗布量、装着すり合わせ技法、デザイン演習（ゴージャス、キュート、セクシー、スイート）、シルク・カシミア施術、下まつ毛エクステ",
    free_model_target: 10,
    paid_model_target: 10,
    evaluation_criteria: ["装着のスピード", "持続力（接着面）", "デザインの再現性"]
  },
  {
    name: "ボリュームラッシュ",
    description: "2D〜5D FANトレーニング、ウィッグFAN装着、デザインFAN装着実習",
    free_model_target: 10,
    paid_model_target: 10,
    evaluation_criteria: ["FANの開き具合", "装着の安定感", "デザインバランス"]
  },
  {
    name: "アイブロウOJT",
    description: "アイブロウメニューの実務実習、カウンセリングから施術完了までのフロー習得",
    free_model_target: 0,
    paid_model_target: 0,
    evaluation_criteria: ["実務フローの習得", "接客の丁寧さ"]
  },
  {
    name: "ラッシュリフトOJT",
    description: "次世代まつ毛パーマの実務実習、ロット選定、薬剤塗布技術の習得",
    free_model_target: 5,
    paid_model_target: 5,
    evaluation_criteria: ["ロット選定の適切さ", "カールの均一性"]
  },
  {
    name: "シングルエクステOJT",
    description: "通常メニュー（シングル）の現場実習、入客を通したスピードと質の向上",
    free_model_target: 0,
    paid_model_target: 0,
    evaluation_criteria: ["施術スピード", "顧客満足度"]
  },
  {
    name: "ボリュームラッシュOJT",
    description: "ボリュームラッシュメニューの現場実習",
    free_model_target: 0,
    paid_model_target: 0,
    evaluation_criteria: ["仕上がりの密度", "装着の正確性"]
  }
];

export default function SeedCurriculumPage() {
  const [running, setRunning] = useState(false);

  const runSeed = async () => {
    setRunning(true);
    try {
      for (const item of SEED_DATA) {
        await saveCurriculumItem(item);
      }
      toast.success("カリキュラムマスターのインポートが完了しました");
    } catch (err) {
      toast.error("エラーが発生しました");
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-12 max-w-xl mx-auto text-center space-y-8">
      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl">
        <Database size={40} />
      </div>
      <div>
        <h1 className="text-2xl font-black text-slate-900">カリキュラムデータ・インポート</h1>
        <p className="text-sm text-slate-500 font-bold mt-2">スクショから抽出したデータをマスターに流し込みます</p>
      </div>
      
      <Card className="p-8 border-none shadow-2xl bg-white space-y-6">
        <div className="text-left space-y-2">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Import Items ({SEED_DATA.length})</p>
          <div className="flex flex-wrap gap-2">
            {SEED_DATA.map(d => (
              <span key={d.name} className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-black text-slate-600 border border-slate-100">
                {d.name}
              </span>
            ))}
          </div>
        </div>

        <Button 
          onClick={runSeed} 
          disabled={running}
          className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          {running ? <Loader2 className="animate-spin" /> : "インポートを開始する"}
        </Button>
      </Card>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={`rounded-3xl border border-slate-100 p-6 ${className}`}>{children}</div>;
}
