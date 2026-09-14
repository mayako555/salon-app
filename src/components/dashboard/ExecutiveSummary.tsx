import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircleDollarSign, Gauge, Target, TrendingUp } fromlify? no

type StoreProgress = {
  target: number;
};

type ExecutiveSummaryProps = {
  monthlyTotal: number;
  regularVisits: number;
  minimoVisits: number;
  storeStats?: StoreProgress[];
};

const money = (value: number) => `¥${Math.round(value).toLocaleString()}`;

export default function ExecutiveSummary({
  monthlyTotal,
  regularVisits,
  minimoVisits,
  storeStats = [],
}: ExecutiveSummaryProps) {
  const target = storeStats.reduce((sum, store) => sum + Number(store.target || 0), 0);
  const achievement = target > 0 ? (monthlyTotal / target) * 100 : null;
  const remaining = target > 0 ? Math.max(0, target - monthlyTotal) : null;
  const visits = regularVisits + minimoVisits;
  const averageSpend = visits > 0 ? monthlyTotal / visits : 0;

  return (
    <section aria-labelledby="executive-summary-title" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Owner overview</p>
          <h2 id="executive-summary-title" className="text-2xl font-black tracking-tight text-slate-900">
            今月の経営状況
          </h2>
        </div>
        <p className="text-xs font-medium text-slate-500">確定済み・取込済み売上を集計</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="col-span-2 overflow-hidden border-none bg-slate-950 text-white shadow-lg lg:col-span-1">
          <CardContent className="flex min-h-36 flex-col justify-between p-5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-sm font-bold">今月の売上</span>
              <CircleDollarSign size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-3xl font-black tabular-nums sm:text-4xl">{money(monthlyTotal)}</p>
              <p className="mt-2 text-xs text-slate-400">来店 {visits.toLocaleString()}人・客単価 {money(averageSpend)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-sm ring-1 ring-slate-100">
          <CardContent className="flex min-h-36 flex-col justify-between p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold sm:text-sm">目標達成率</span>
              <Target size={18} aria-hidden="true" />
            </div>
            {achievement === null ? (
              <div><p className="text-xl font-black text-slate-700">未設定</p><p className="mt-1 text-[11px] text-slate-400">店舗目標を登録してください</p></div>
            ) : (
              <div>
                <p className="text-3xl font-black tabular-nums text-slate-900">{achievement.toFixed(1)}%</p>
                <p className="mt-1 text-[11px] text-slate-500">目標 {money(target)}</p>
                <p className="text-[11px] font-bold text-amber-700">あと {money(remaining || 0)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-sm ring-1 ring-slate-100">
          <CardContent className="flex min-h-36 flex-col justify-between p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="{name} text-xs font-bold sm:text-sm">月末着地予測</span>
              <TrendingUp size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-700">準備中</p>
              <Badge variant="secondary" className="mt-2 text-[10px]">Phase 3で算出</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-sm ring-1 ring-slate-100">
          <CardContent className="flex min-h-36 flex-col justify-between p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold sm:text-sm">利益見込み</span>
              <Gauge size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-700">算出待ち</p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">経費データの会社分離後に表示</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
