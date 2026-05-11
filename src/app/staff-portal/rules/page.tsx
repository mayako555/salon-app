"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, FileText, Shield, Clock, Coins, Coffee, GraduationCap, Heart } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ruleSections = [
  {
    id: "general",
    title: "第1章 総則",
    icon: Shield,
    content: `
      本規則は、当サロンの従業員の就業に関する事項を定めるものです。
      従業員は、互いに協力し合い、お客様に最高のサービスを提供するとともに、職場環境の向上に努めなければなりません。
    `
  },
  {
    id: "working-hours",
    title: "第2章 勤務時間・休憩・休日",
    icon: Clock,
    content: `
      1. 勤務時間は、シフト表により個別に定めます。
      2. 休憩時間は、労働時間が6時間を超える場合は45分、8時間を超える場合は60分を付与します。
      3. 休日は、週休2日を基本とし、店舗の状況により調整します。
    `
  },
  {
    id: "salary",
    title: "第3章 給与・報酬",
    icon: Coins,
    content: `
      1. 給与は、基本給、各種手当（役職、技術、指名等）で構成されます。
      2. 支払日は、毎月末日締め、翌月15日払いとします。
      3. 歩合報酬は、個人の売上実績に基づき、契約に定める比率で算出します。
    `
  },
  {
    id: "leave",
    title: "第4章 休暇",
    icon: Heart,
    content: `
      1. 有給休暇：入社半年後に10日付与します。事前申請が必要です。
      2. 希望休：月の上限日数（通常3日）内で申請可能です。
      3. 慶弔休暇：社内規定に基づき付与します。
    `
  },
  {
    id: "conduct",
    title: "第5章 服務規律",
    icon: GraduationCap,
    content: `
      1. 遅刻・欠勤：やむを得ない場合は、必ず始業30分前までに店舗責任者に連絡してください。
      2. 身だしなみ：サロンのイメージを損なわない、清潔感のある服装・ヘアメイクを心がけてください。
      3. 機密保持：お客様の情報や店舗運営の機密事項を外部に漏らしてはなりません。
    `
  },
  {
    id: "welfare",
    title: "第6章 福利厚生",
    icon: Coffee,
    content: `
      1. 従業員割引：サロンメニューを特別価格で利用可能です。
      2. 研修制度：技術向上を目的とした講習会や練習会を定期的に実施します。
      3. 産休・育休制度：法令に基づき完備しています。
    `
  }
];

export default function RulesPage() {
  const [openSection, setOpenSection] = useState<string | null>("general");

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <BookOpen size={120} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <BookOpen size={24} />
            </div>
            就業規則
          </h1>
          <p className="text-slate-500 mt-2">
            当サロンで働くすべての従業員が心地よく、プロフェッショナルとして活躍するためのルールです。
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
            <span>最終更新日: 2026年5月1日</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full" />
            <span>Ver 2.0</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {ruleSections.map((section) => {
          const isOpen = openSection === section.id;
          const Icon = section.icon;
          
          return (
            <div 
              key={section.id} 
              className={cn(
                "bg-white border transition-all duration-300 rounded-xl overflow-hidden",
                isOpen ? "border-blue-200 shadow-md ring-1 ring-blue-100" : "border-slate-200 hover:border-slate-300"
              )}
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-5 text-left transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isOpen ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                  )}>
                    <Icon size={20} />
                  </div>
                  <span className={cn(
                    "font-bold text-lg",
                    isOpen ? "text-blue-900" : "text-slate-700"
                  )}>
                    {section.title}
                  </span>
                </div>
                {isOpen ? <ChevronDown className="text-blue-400" /> : <ChevronRight className="text-slate-300" />}
              </button>
              
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className="px-5 pb-6 pt-0 ml-14">
                  <div className="prose prose-slate max-w-none">
                    <div className="text-slate-600 leading-relaxed whitespace-pre-line text-sm">
                      {section.content.trim()}
                    </div>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <button className="text-[10px] font-bold text-blue-600 hover:underline">
                      詳細を確認
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl flex gap-4 items-start">
        <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
          <Shield size={20} />
        </div>
        <div>
          <h4 className="font-bold text-amber-900">不明点がある場合</h4>
          <p className="text-sm text-amber-700 mt-1 leading-relaxed">
            就業規則の解釈や、個別の事情に関する相談は、店舗責任者または本部事務局までお問い合わせください。
            より詳細なPDF版の閲覧を希望する場合も、事務局にて対応いたします。
          </p>
        </div>
      </div>
    </div>
  );
}
