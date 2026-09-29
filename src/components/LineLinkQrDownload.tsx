"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LineLinkQrDownload({ url, storeName, expiresAt }: { url: string; storeName: string; expiresAt: number }) {
  const qr = useRef<HTMLCanvasElement>(null);
  const [expired, setExpired] = useState(Date.now() >= expiresAt);
  const expiry = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(expiresAt);

  useEffect(() => {
    setExpired(Date.now() >= expiresAt);
    const timer = setTimeout(() => setExpired(true), Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt]);

  const download = () => {
    if (Date.now() >= expiresAt) {
      setExpired(true);
      toast.error("有効期限が切れました。画面を閉じてQRを再発行してください。");
      return;
    }
    if (!qr.current) return;
    const sheet = document.createElement("canvas");
    sheet.width = 1200;
    sheet.height = 1490;
    const ctx = sheet.getContext("2d");
    if (!ctx) { toast.error("画像を作成できませんでした。"); return; }
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.fillStyle = "#172033";
    ctx.textAlign = "center";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText(storeName, 600, 75, 1080);
    ctx.font = "bold 38px sans-serif";
    ctx.fillText("LINE連携用QR", 600, 140);
    ctx.drawImage(qr.current, 88, 185, 1024, 1024);
    ctx.font = "30px sans-serif";
    ctx.fillText("対象のお客様1名専用・連携は1回のみ", 600, 1265);
    ctx.fillText(`有効期限：${expiry}（日本時間）`, 600, 1320, 1100);
    ctx.font = "25px sans-serif";
    ctx.fillText("QRを再発行すると、この画像のQRは使えなくなります。", 600, 1370, 1100);
    ctx.fillText("店頭掲示など、複数のお客様での共用はできません。", 600, 1415, 1100);
    const anchor = document.createElement("a");
    anchor.href = sheet.toDataURL("image/png");
    anchor.download = "SALON-AGENT-LINE-link-QR.png";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return <div className="space-y-2 text-center">
    <div className="hidden" aria-hidden="true">
      <QRCodeCanvas ref={qr} value={url} size={1024} level="H" marginSize={4} bgColor="#ffffff" fgColor="#000000" />
    </div>
    <Button type="button" variant="outline" onClick={download} disabled={expired} className="gap-2">
      <Download size={16} />連携QRを画像で保存（PNG）
    </Button>
    <p className="text-xs leading-relaxed text-slate-500">
      {expired ? "期限切れです。閉じてQRを再発行してください。" : `有効期限：${expiry}（日本時間）`}<br />
      この顧客1名専用・1回限り。再発行すると以前のQRは無効になります。<br />
      店頭掲示用の共通QRには使えません。
    </p>
  </div>;
}
