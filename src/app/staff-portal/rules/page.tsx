"use client";

import { useState } from "react";
import { 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  Shield, 
  Clock, 
  Coins, 
  GraduationCap, 
  Heart,
  Users,
  Calculator,
  UserX,
  AlertTriangle,
  Settings,
  CheckCircle2
} from "lucide-react";
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
    content: `第1条（目的）
本規則は、当サロン（以下「会社」という）における労働条件、服務規律その他就業に関する事項を定め、スタッフ全員が安心して働ける環境を整備するとともに、「接客・技術・空間すべてにおいて五つ星クオリティのサービスを提供する」という理念のもと、一定基準以上のサービス品質を維持することを目的とする。

第2条（適用範囲）
本規則は、会社に雇用される正社員、契約社員、パート・アルバイト等すべての従業員に適用する。
業務委託契約者については、別途締結する契約内容によるものとする。

第3条（遵守義務）
従業員は、本規則および会社が別途定めるマニュアル、運営ルール、評価制度等を遵守し、互いに協力して職場秩序の維持および円滑な店舗運営に努めなければならない。`
  },
  {
    id: "hiring",
    title: "第2章 採用・試用期間",
    icon: Users,
    content: `第4条（採用）
会社は、書類選考、面接、技術確認等を経て適性があると認めた者を採用する。

第5条（試用期間）
試用期間は、未経験者については原則6か月、経験者については原則3か月とする。
ただし、勤務態度、接客対応、技術力、協調性、業務遂行能力等を総合的に勘案し、会社が必要と判断した場合は、経験者についても試用期間を最長6か月まで延長することがある。
試用期間中または試用期間満了時に、会社が従業員として不適格と判断した場合は、本採用を行わないことがある。`
  },
  {
    id: "working-hours",
    title: "第3章 勤務",
    icon: Clock,
    content: `第6条（勤務時間）
始業・終業時刻、休憩時間、休日その他勤務条件については、シフト表または雇用契約書により定める。

第7条（シフト）
従業員は、会社が定めたシフトを遵守しなければならない。
会社は、予約状況、店舗状況、技術レベル等を考慮しシフトを決定する。

第8条（出勤時の準備）
従業員は、お客様を円滑にお迎えできる状態で始業できるよう、時間に余裕を持って出勤するよう努めるものとする。

第9条（タイムカード）
従業員は、出勤時および退勤時に所定の方法により打刻を行わなければならない。
打刻漏れがあった場合は速やかに管理者へ申告することとし、故意または繰り返しの打刻漏れについては指導対象となる。

第10条（遅刻・早退・欠勤）
遅刻、早退、欠勤を行う場合は、速やかに会社へ連絡しなければならない。
無断欠勤は重大な服務規律違反とする。`
  },
  {
    id: "salary",
    title: "第4章 給与・手当",
    icon: Coins,
    content: `第14条（給与支払）
給与は月末締め、翌月25日に支払う。

第15条（支払方法）
給与は原則として本人名義口座への銀行振込により支払う。

第16条（昇給）
昇給は、会社業績、勤務態度、技術力、接客力、売上実績、リピート率、チーム貢献度、ブランド理解等を総合的に勘案し決定する。

第17条（インセンティブ）
会社は必要に応じて、売上歩合、指名手当、店販手当、役職手当その他各種インセンティブを支給することがある。
詳細は別途定める。`
  },
  {
    id: "conduct",
    title: "第5章 服務規律",
    icon: GraduationCap,
    content: `第19条（基本姿勢）
従業員は、当サロンの理念およびブランドコンセプトを理解し、誠実かつ丁寧な接客・施術を行わなければならない。

第21条（身だしなみ）
従業員は、会社が定める服装、髪型、メイク、衛生基準等を遵守し、常に清潔感を保たなければならない。

第24条（SNS・情報管理）
従業員は、会社の許可なく顧客情報、カルテ、店内情報、社内資料その他業務上知り得た情報をSNSその他外部へ公開してはならない。
会社またはブランド価値を著しく損なう投稿、発言、行為を禁止する。

第26条（副業）
副業を行う場合は、事前に会社へ申告し承認を得なければならない。`
  },
  {
    id: "health",
    title: "第6章 安全衛生",
    icon: Heart,
    content: `第27条（健康管理）
従業員は、自己の健康管理に留意し、感染症その他業務に支障をきたす恐れがある場合は速やかに会社へ報告しなければならない。

第28条（安全配慮）
会社は、従業員が安全かつ衛生的に働ける職場環境の整備に努める。`
  },
  {
    id: "evaluation",
    title: "第7章 人事評価",
    icon: Calculator,
    content: `第29条（評価）
会社は、技術力、接客力、売上、リピート率、時間管理、清掃・環境整備、情報共有、チーム貢献、ブランド理解等を総合的に評価する。

第30条（キャリアコース）
会社は、従業員の希望・適性に応じ、マネジメントコース、教育者コース、独立支援コース、選べる働き方コース等のキャリア制度を設けることがある。`
  },
  {
    id: "resignation",
    title: "第8章 退職",
    icon: UserX,
    content: `第31条（退職）
従業員が退職を希望する場合は、原則として3か月以上前に申し出るものとする。

第32条（引継ぎ）
退職時は、担当顧客、カルテ、備品その他業務に関する事項について誠実に引継ぎを行わなければならない。

第33条（貸与物返却）
従業員は、退職時までに制服、鍵、備品、資料その他会社貸与物を返却しなければならない。`
  },
  {
    id: "discipline",
    title: "第9章 懲戒",
    icon: AlertTriangle,
    content: `第34条（懲戒）
会社は、無断欠勤、著しい勤務態度不良、ハラスメント行為、情報漏洩、金銭の不正等に該当する場合、指導または懲戒処分を行うことがある。

第35条（懲戒種類）
懲戒の種類は、口頭注意、書面注意、始末書提出、減給、出勤停止、懲戒解雇とする。`
  },
  {
    id: "others",
    title: "第10章 その他",
    icon: Settings,
    content: `第36条（マニュアル遵守）
従業員は、会社が別途定める各種マニュアル、運営ルール、教育資料等を遵守しなければならない。

第37条（改定）
本規則は、法令改正または会社運営上必要がある場合、変更することがある。`
  }
];

export default function RulesPage() {
  const [openSection, setOpenSection] = useState<string | null>("general");

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <BookOpen size={160} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Official Document</span>
            <span className="text-slate-400 text-[10px] font-bold">Ver 1.0.0</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">
            就業規則
          </h1>
          <p className="text-slate-400 font-medium max-w-xl leading-relaxed">
            当サロンの理念に基づき、スタッフ全員が安心してプロフェッショナルとして活躍するための基準を定めています。
          </p>
          <div className="mt-8 flex items-center gap-6 text-xs font-bold text-slate-500 border-t border-slate-800 pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>最新版（2026年5月14日改定済）</span>
            </div>
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
                "bg-white border transition-all duration-500 rounded-2xl overflow-hidden shadow-sm",
                isOpen ? "border-blue-400 shadow-xl ring-1 ring-blue-100" : "border-slate-100 hover:border-slate-300"
              )}
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-500",
                    isOpen ? "bg-blue-600 text-white shadow-lg shadow-blue-200 rotate-3" : "bg-slate-50 text-slate-400"
                  )}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <span className={cn(
                      "font-black text-lg block",
                      isOpen ? "text-slate-900" : "text-slate-600"
                    )}>
                      {section.title}
                    </span>
                    {!isOpen && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Click to expand</span>}
                  </div>
                </div>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500",
                  isOpen ? "bg-blue-50 text-blue-600 rotate-180" : "bg-slate-50 text-slate-300"
                )}>
                  <ChevronDown size={20} />
                </div>
              </button>
              
              <div className={cn(
                "transition-all duration-500 ease-in-out",
                isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className="px-6 pb-8 pt-0 ml-[68px] mr-6">
                  <div className="h-px bg-slate-100 w-full mb-6" />
                  <div className="text-slate-600 leading-relaxed whitespace-pre-line text-sm font-medium">
                    {section.content}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-8 rounded-3xl flex gap-6 items-start shadow-sm">
        <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm">
          <Shield size={24} />
        </div>
        <div>
          <h4 className="font-black text-blue-900 text-lg mb-1">規則の遵守と相談について</h4>
          <p className="text-sm text-blue-700 font-medium leading-relaxed">
            本規則は全スタッフの安心とブランド品質の維持のために設けられています。内容について不明な点や、個別の事情に関する相談は、いつでも管理者へ伝えてください。
          </p>
        </div>
      </div>
    </div>
  );
}
