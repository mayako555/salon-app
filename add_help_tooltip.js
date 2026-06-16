const fs = require('fs');
const file = 'src/app/admin/settings/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. Add HelpCircle to imports
if (content.includes('import { Save, Settings, MessageCircle } from "lucide-react";')) {
    content = content.replace('import { Save, Settings, MessageCircle } from "lucide-react";', 'import { Save, Settings, MessageCircle, HelpCircle } from "lucide-react";');
} else if (content.includes('MessageCircle } from "lucide-react";') && !content.includes('HelpCircle')) {
    content = content.replace('MessageCircle } from "lucide-react";', 'MessageCircle, HelpCircle } from "lucide-react";');
}

// 2. Add tooltip UI
const targetBlock = `<div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">チャネルアクセストークン (Channel Access Token)</label>
                <Input`;

const newBlock = `<div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">チャネルアクセストークン (Channel Access Token)</label>
                  <div className="group relative flex items-center">
                    <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                    <div className="absolute left-0 bottom-full mb-2 w-[340px] p-4 bg-slate-800 text-white text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                      <p className="font-bold mb-2 text-green-400 flex items-center gap-1.5"><MessageCircle size={14} /> トークンの取得方法</p>
                      <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed text-slate-200">
                        <li>LINE Developersで対象店舗の<strong className="text-white">「Messaging API」</strong>チャネルを開く<br/><span className="text-slate-400 text-[10px]">※「LINEログイン」チャネルではありません</span></li>
                        <li>上のタブから<strong className="text-white">「Messaging API設定」</strong>を選択</li>
                        <li>一番下までスクロールし、「チャネルアクセストークン (ロングターム)」の<strong className="text-white">【発行】</strong>ボタンを押す</li>
                        <li>表示された長い文字列をコピーして下の枠へ貼り付け</li>
                      </ol>
                      <div className="absolute -bottom-1 left-1.5 w-3 h-3 bg-slate-800 rotate-45" />
                    </div>
                  </div>
                </div>
                <Input`;

if (content.includes(targetBlock)) {
    content = content.replace(targetBlock, newBlock);
    fs.writeFileSync(file, content);
    console.log("Successfully added help tooltip to settings page");
} else {
    console.log("Target block not found");
}
