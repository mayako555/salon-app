import Link from "next/link";
import { CheckCircle2, Circle, Gift, Calculator, FileCheck2 } from "lucide-react";

type WorkflowStep = "allowances" | "payroll" | "confirmation";

type Props = {
  activeStep: WorkflowStep;
  month: string;
  allowancesCompleted?: boolean;
  payrollCreated?: boolean;
};

const steps = [
  { key: "allowances" as const, label: "手当整理", icon: Gift },
  { key: "payroll" as const, label: "給与計算", icon: Calculator },
  { key: "confirmation" as const, label: "明細確認・確定", icon: FileCheck2 },
];

export default function PayrollWorkflowNav({
  activeStep,
  month,
  allowancesCompleted = false,
  payrollCreated = false,
}: Props) {
  const completed = {
    allowances: allowancesCompleted,
    payroll: payrollCreated,
    confirmation: false,
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">給与作成フロー</p>
          <p className="mt-0.5 text-sm font-bold text-slate-700">{month.replace("-", "年")}月分</p>
        </div>
        <div className="flex gap-2 text-xs font-bold">
          <Link href={`/allowances?month=${month}`} className="text-slate-500 hover:text-slate-900">手当管理</Link>
          <span className="text-slate-300">/</span>
          <Link href={`/payroll?month=${month}`} className="text-slate-500 hover:text-slate-900">給与計算</Link>
        </div>
      </div>
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = activeStep === step.key;
          const isCompleted = completed[step.key];
          return (
            <li
              key={step.key}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : isCompleted
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-slate-700">
                {isCompleted && !isActive ? <CheckCircle2 size={17} className="text-emerald-600" /> : <Icon size={16} />}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold opacity-70">STEP {index + 1}</p>
                <p className="truncate text-sm font-black">{step.label}</p>
              </div>
              {!isCompleted && !isActive && <Circle size={12} className="ml-auto opacity-40" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
