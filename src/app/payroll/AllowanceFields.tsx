"use client";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export type AllowanceValues = {
  transport: string;
  nomination: string;
  review: string;
  blog: string;
  executive: string;
  business: string;
  attendance: string;
};

const fields: { key: keyof AllowanceValues; label: string; salaryOnly?: boolean }[] = [
  { key: "transport", label: "通勤手当" },
  { key: "nomination", label: "指名手当" },
  { key: "review", label: "口コミ手当" },
  { key: "blog", label: "ブログ手当" },
  { key: "executive", label: "役職・その他" },
  { key: "business", label: "業務手当", salaryOnly: true },
  { key: "attendance", label: "皆勤手当", salaryOnly: true },
];

export default function AllowanceFields({
  isSalary,
  values,
  onChange,
  separateDisplay,
  onSeparateDisplayChange,
}: {
  isSalary: boolean;
  values: AllowanceValues;
  onChange: (key: keyof AllowanceValues, value: string) => void;
  separateDisplay: boolean;
  onSeparateDisplayChange: (checked: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 block mb-1">手当の内訳 (円)</label>
      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
        {fields.filter((field) => isSalary || !field.salaryOnly).map((field) => (
          <div className="space-y-1" key={field.key}>
            <span className="text-[9px] text-slate-400 font-bold block">{field.label}</span>
            <Input
              type="number"
              placeholder={field.label}
              value={values[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="h-8 text-xs rounded font-bold border-slate-200"
            />
          </div>
        ))}
        {isSalary && (
          <label className="col-span-2 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 p-2.5 cursor-pointer">
            <Checkbox
              checked={separateDisplay}
              onCheckedChange={(checked) => onSeparateDisplayChange(checked === true)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-[10px] font-bold text-slate-700">給与明細で固定給の内訳を個別表示する</span>
              <span className="block text-[9px] text-slate-500 mt-0.5">ベース給・皆勤手当・業務手当を別々の行で表示します</span>
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
