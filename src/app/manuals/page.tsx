"use client";

import { useState } from "react";
import { 
  Library, 
  Search, 
  ChevronRight, 
  FileText, 
  Scissors, 
  Sparkles, 
  Clock, 
  Zap, 
  MessageSquare, 
  ShieldCheck,
  Video,
  ChevronDown,
  Info
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const categories = [
  { id: "all", label: "すべて", icon: Library },
  { id: "conduct", label: "就業・勤怠規定", icon: Clock },
  { id: "payroll", label: "給与・交通費", icon: Zap },
  { id: "reception", label: "接客・身だしなみ", icon: MessageSquare },
  { id: "environment", label: "店内環境・清掃", icon: Sparkles },
  { id: "operation", label: "業務・顧客対応", icon: ShieldCheck },
];

const manualSections = [
  {
    id: "attendance",
    category: "conduct",
    title: "1. 勤怠・タイムカードのルール",
    icon: Clock,
    items: [
      { label: "出勤打刻", content: "朝礼が始まる直前に押す。着替えなどの準備時間は労働時間外となります。" },
      { label: "退勤打刻", content: "締め作業が終わったタイミングで押す。業務終了後の居残りは原則禁止です。カルテ記入はお客様ごとに終わらせてください。" },
      { label: "打刻忘れ", content: "基本的には出勤扱いされません。万が一忘れた場合は「岡田」に伝え、手書きで出勤時間を記入し自身の印鑑を押してください。" },
      { label: "休憩打刻", content: "自動で計算されるため、手動で押す必要はありません。" },
      { label: "シフト外の休み・遅刻", content: "原則として皆勤手当がつかなくなります。やむを得ない場合は証明書を提出すれば有給扱いとなります（岡田に要確認）。" }
    ]
  },
  {
    id: "payroll",
    category: "payroll",
    title: "2. 給与・交通費のルール",
    icon: Zap,
    items: [
      { label: "給与支払い", content: "月末締め、翌月25日に三井住友銀行口座へ振り込まれます。給与明細はメールで送付されます。" },
      { label: "交通費", content: "月に15日以上出勤する場合、6ヶ月分まとめて定期券を購入（自宅からの最安値ルート）。更新時は交通費申請用紙を記入し、岡田に写しを送ってください。" },
      { label: "退職時の注意", content: "予告なく退職した場合、給与は「現金手渡し」となり、残りの交通費は自己負担となります。定期券の残りがある場合は最終出勤日までに払い戻しを行い返却してください。" }
    ]
  },
  {
    id: "hospitality",
    category: "reception",
    title: "3. 接客・身だしなみ",
    icon: MessageSquare,
    items: [
      { label: "言葉遣い", content: "必ずきちんとした敬語を使う（〇〇様と呼ぶ等）。年下や仲の良いお客様に対してもフランクになりすぎず、丁寧に対応してください。口コミ返信やブログも同様です。" },
      { label: "お見送り", content: "ドアが閉まりきるまでお辞儀を継続してください。" },
      { label: "身だしなみ", "content": "コンセプトに見合った服装を心がけ、施術中にお客様の顔に髪が当たらないようしっかりまとめてください。" },
      { label: "匂いのケア", content: "匂いのする食べ物（カップ麺など）は原則禁止。入客前には手や衣服の匂い（タバコ、食べ物など）を必ず確認してください。" }
    ]
  },
  {
    id: "cleaning",
    category: "environment",
    title: "4. 店内環境・清掃",
    icon: Sparkles,
    items: [
      { label: "空間への配慮", content: "お客様がいる時は、足音やバックルームでの過ごし方（生活音）に細心の注意を払ってください。" },
      { label: "トイレ清掃", content: "お客様をご案内する前に必ず清掃確認。洗面台は、水滴、水垢、指紋、ホコリが「何もない状態」まで完全に拭き上げてください。" },
      { label: "ベッドメイキング", content: "タオルにシワやゴミがないよう、しっかりと整えてください。" }
    ]
  },
  {
    id: "customer-handling",
    category: "operation",
    title: "5. 業務・顧客対応",
    icon: ShieldCheck,
    items: [
      { label: "情報共有", content: "フリーのお客様の些細な情報でもスタッフ間で共有。カルテは誰が担当しても経緯が分かるように書き、お客様に同じ話をさせないようにしてください。" },
      { label: "遅刻対応（5-9分）", content: "軽く注意喚起を行います。" },
      { label: "遅刻対応（10分）", content: "電話で来店確認・来店時に注意喚起を行います。" },
      { label: "遅刻対応（15分）", content: "電話に出ない場合はキャンセル扱いとします。丁寧な対応を心がけてください。" },
      { label: "次回予約特典", content: "店頭予約のみ受付。エクステ（付替500円OFF/付足300円OFF）、パーマ（300円OFF）を適用してください。" }
    ]
  }
];

export default function ManualsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<string[]>(["attendance"]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredSections = manualSections.filter(section => {
    const matchesCategory = activeCategory === "all" || section.category === activeCategory;
    const matchesSearch = section.title.includes(searchQuery) || 
                         section.items.some(i => i.label.includes(searchQuery) || i.content.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
          <Library size={180} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
             <span className="bg-emerald-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Official Manual</span>
             <span className="text-slate-400 text-xs font-bold">当サロン 運営基準</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-4">
            業務マニュアル
          </h1>
          <p className="text-slate-400 font-medium max-w-xl leading-relaxed mb-8">
            「接客・技術・空間すべてにおいて五つ星クオリティ」を提供するための共通ルールです。
            スタッフ全員が高い基準で仕事に取り組むための指針として活用してください。
          </p>
          
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-3.5 text-slate-500" size={20} />
            <input 
              type="text" 
              placeholder="知りたい項目を検索..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 backdrop-blur-md transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all",
              activeCategory === cat.id 
                ? "bg-slate-900 text-white shadow-lg" 
                : "bg-white text-slate-500 border border-slate-100 hover:border-slate-200 hover:text-slate-900"
            )}
          >
            <cat.icon size={14} />
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredSections.map(section => {
          const isOpen = openSections.includes(section.id);
          const Icon = section.icon;

          return (
            <div key={section.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
              <button 
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    isOpen ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                  )}>
                    <Icon size={20} />
                  </div>
                  <span className="font-black text-lg text-slate-800">{section.title}</span>
                </div>
                <div className={cn("transition-transform duration-300", isOpen && "rotate-180")}>
                  <ChevronDown size={20} className="text-slate-300" />
                </div>
              </button>

              <div className={cn(
                "overflow-hidden transition-all duration-500 ease-in-out",
                isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className="px-6 pb-8 pt-0 ml-[64px] mr-6">
                  <div className="h-px bg-slate-100 w-full mb-6" />
                  <div className="space-y-6">
                    {section.items.map((item, i) => (
                      <div key={i} className="space-y-1">
                        <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{item.label}</h5>
                        <p className="text-slate-600 text-sm leading-relaxed font-medium">
                          {item.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-8 rounded-[2.5rem] flex gap-6 items-start shadow-sm">
        <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm">
          <Info size={24} />
        </div>
        <div>
          <h4 className="font-black text-blue-900 text-lg mb-1">不明点がある場合</h4>
          <p className="text-sm text-blue-700 font-medium leading-relaxed">
            マニュアルに記載がない事項や、判断に迷うイレギュラーな事象については、必ず代表の岡田に確認してください。
            スタッフ個人の判断で進めず、常に「五つ星の基準」を意識しましょう。
          </p>
        </div>
      </div>
    </div>
  );
}
