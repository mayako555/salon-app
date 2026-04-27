"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, ArrowLeft, Share2, Copy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function QRDisplayPage() {
  const [entryUrl, setEntryUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEntryUrl(window.location.origin + "/entry");
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(entryUrl);
    toast.success("URLをコピーしました");
  };

  return (
    <div className="pb-24">
      <div className="bg-slate-900 p-6 text-white pb-12">
        <Link href="/staff-portal">
          <Button variant="ghost" className="text-white hover:bg-white/10 -ml-2 mb-4">
            <ArrowLeft className="mr-1" /> 戻る
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className="bg-blue-500 p-3 rounded-2xl text-white shadow-lg shadow-blue-500/20">
            <QrCode size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">お客様用QRコード</h1>
            <p className="text-slate-400 text-xs">カウンセリングシート入力用</p>
          </div>
        </div>
      </div>

      <div className="-mt-6 px-4">
        <Card className="rounded-[40px] p-8 border-slate-100 shadow-2xl flex flex-col items-center text-center">
          <p className="text-slate-500 text-sm font-bold mb-8">
            お客様の端末で読み取って<br />入力を開始していただいてください
          </p>

          <div className="bg-white p-6 rounded-3xl shadow-inner border border-slate-50 mb-8">
            {entryUrl ? (
              <QRCodeSVG 
                value={entryUrl} 
                size={220} 
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "/favicon.ico",
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            ) : (
              <div className="w-[220px] h-[220px] bg-slate-50 flex items-center justify-center rounded-xl">
                読み込み中...
              </div>
            )}
          </div>

          <div className="w-full space-y-3">
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-2xl border-slate-200 text-slate-600 gap-2 font-bold"
              onClick={handleCopy}
            >
              <Copy size={16} /> URLをコピー
            </Button>
            <div className="bg-slate-50 p-3 rounded-xl break-all text-[10px] text-slate-400 font-mono">
              {entryUrl}
            </div>
          </div>
        </Card>

        <div className="mt-8 bg-blue-50 p-6 rounded-3xl border border-blue-100">
          <h3 className="text-blue-700 font-bold text-sm mb-2 flex items-center gap-2">
            <Share2 size={16} /> 案内方法
          </h3>
          <ul className="text-xs text-blue-600 space-y-2 list-disc ml-4 leading-relaxed">
            <li>「こちらのQRコードを読み取って、カウンセリングシートへのご入力をお願いします」とご案内ください。</li>
            <li>入力が完了すると、スタッフ用ダッシュボードの「最近の登録」に表示されます。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
