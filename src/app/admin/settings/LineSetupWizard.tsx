"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { saveLineSettings } from "./actions";
import { toast } from "sonner";
import { isLineStoreSettingsComplete, type LineStoreSettings } from "@/lib/line-integration-settings";

export default function LineSetupWizard({ store, settings, onSaved }: { store: string; settings: LineStoreSettings; onSaved: (settings: LineStoreSettings) => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(settings);
  const [hasId, setHasId] = useState(Boolean(settings.liffId));
  const [saving, setSaving] = useState(false);
  const complete = isLineStoreSettingsComplete(settings);
  const partial = settings.lineOaId || settings.liffId || settings.hasChannelAccessToken;
  function change(field: keyof LineStoreSettings, value: string) { setDraft(previous => ({ ...previous, [field]: value })); }
  async function save() {
    setSaving(true);
    try {
      const result = await saveLineSettings(store, draft);
      if (!result.success) { toast.error(result.error || "保存に失敗しました"); return; }
      const safe = { lineOaId: draft.lineOaId.trim(), liffId: draft.liffId.trim(), channelAccessToken: "", hasChannelAccessToken: Boolean(draft.channelAccessToken.trim() || settings.hasChannelAccessToken) };
      onSaved(safe); setDraft(safe); setStep(0); toast.success("LINE設定を保存しました");
    } catch { toast.error("LINE設定を保存できませんでした"); } finally { setSaving(false); }
  }
  return <Card className="rounded-3xl overflow-hidden border-green-100">
    <CardHeader className="bg-green-50"><CardTitle className="flex justify-between gap-3"><span>{store}</span><span className="text-sm">{complete ? "LINE連携 設定済み" : partial ? "LINE連携 一部設定" : "LINE連携 未設定"}</span></CardTitle></CardHeader>
    <CardContent className="p-6 space-y-5">
      {step === 0 ? <>
        <p className="text-sm text-slate-600">顧客とLINEを紐付け、予約リマインドや来店後メッセージを送れます。</p>
        <ul className="text-sm space-y-2"><li>LINE公式アカウント：{settings.lineOaId ? "設定済み" : "未設定"}</li><li>メッセージ送信：{settings.hasChannelAccessToken ? "設定済み" : "未設定"}</li><li>顧客LINE連携：{settings.liffId ? "設定済み" : "未設定"}</li></ul>
        <p className="text-xs text-slate-500">設定済みは保存状態です。実際の接続は顧客連携・テスト送信で確認してください。</p>
        <Button onClick={() => { setDraft(settings); setHasId(Boolean(settings.liffId)); setStep(1); }}>{partial ? "設定を確認・変更" : "LINE連携を設定する"}</Button>
        <details className="text-sm"><summary className="cursor-pointer">詳細設定</summary><div className="mt-3 space-y-2"><p>Basic ID：{settings.lineOaId || "未設定"}</p><p>Channel Access Token：{settings.hasChannelAccessToken ? "設定済み" : "未設定"}</p><p>顧客連携アプリID（LIFF ID）：{settings.liffId || "未設定"}</p></div></details>
      </> : <>
        <p className="text-sm font-bold text-green-700">STEP {step} / 3</p>
        {step === 1 && <div className="space-y-3"><h3 className="font-bold">LINE公式アカウント</h3><p className="text-sm">連携する店舗のLINE公式アカウントを設定します。</p><label className="block text-sm">LINE公式アカウント Basic ID<Input value={draft.lineOaId} onChange={e => change("lineOaId", e.target.value)} placeholder="@xxxxxxxx" /></label><details className="text-sm"><summary>Basic IDはどこにありますか？</summary><p className="mt-2">LINE公式アカウントの管理画面で、対象アカウントのプロフィールにある「@」から始まるIDを確認します。</p></details></div>}
        {step === 2 && <div className="space-y-3"><h3 className="font-bold">メッセージ送信設定</h3><p className="text-sm">SALON AGENTからLINEメッセージを送信するための設定です。</p>{settings.hasChannelAccessToken && <p className="text-green-700 text-sm">設定済み。変更しない場合は空欄のままで保存できます。</p>}<label className="block text-sm">Channel Access Token<Input type="password" autoComplete="new-password" value={draft.channelAccessToken} onChange={e => change("channelAccessToken", e.target.value)} placeholder="新しいトークンを入力" /></label><details className="text-sm"><summary>トークンの確認方法</summary><p className="mt-2">LINE公式アカウント側でMessaging APIを有効化後、LINE Developersの対象チャネル → Messaging API設定 → チャネルアクセストークン（ロングターム）から発行します。</p></details></div>}
        {step === 3 && <div className="space-y-3"><h3 className="font-bold">顧客LINE連携</h3><p className="text-sm">お客様がQRコードを読み込むことで、顧客情報とLINEを紐付けできます。</p><fieldset className="space-y-2 text-sm"><legend className="mb-2 font-bold">顧客LINE連携の設定状況</legend><label className="block"><input type="radio" checked={hasId} onChange={() => setHasId(true)} /> すでに設定している</label><label className="block"><input type="radio" checked={!hasId} onChange={() => setHasId(false)} /> まだ設定していない・わからない</label></fieldset>
          {hasId ? <label className="block text-sm">顧客連携アプリID（LIFF ID）<Input value={draft.liffId} onChange={e => change("liffId", e.target.value)} placeholder="1234567890-AbCdEfGh" /></label> : <div className="rounded-xl bg-amber-50 p-4 space-y-3 text-sm"><p className="font-bold">顧客LINE連携の追加設定が必要です</p><p>Messaging APIと同じプロバイダー内でLINE Loginチャネルを作り、LIFFアプリを追加してください。</p><ol className="list-decimal pl-5 space-y-1"><li>LINE Developersで対象のプロバイダーを選択</li><li>LINE Loginチャネルを作成し公開</li><li>LIFFアプリを追加（サイズ：Full、Scope：profile）</li><li>エンドポイントURLに下のURLを登録</li><li>発行されたIDを入力</li></ol><code className="block break-all bg-white p-2">{typeof window !== "undefined" ? window.location.origin : "サイトのURL"}/link-line</code><a href="https://developers.line.biz/console/" target="_blank" rel="noreferrer" className="underline text-green-800">LINE Developersを開く</a><Button variant="outline" onClick={() => setHasId(true)}>IDを取得したので入力する</Button></div>}
          <p className="text-xs text-slate-600">アプリIDは後から設定できます。未設定の場合は顧客連携QRを表示しません。既存のアプリIDは、入力欄を変更しない限り保持されます。</p>
        </div>}
        <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={saving} onClick={() => setStep(step - 1)}>{step === 1 ? "閉じる" : "戻る"}</Button>{step < 3 ? <Button onClick={() => setStep(step + 1)}>次へ</Button> : <Button disabled={saving} onClick={save}>{saving ? "保存中…" : "LINE設定を保存"}</Button>}</div>
      </>}
    </CardContent>
  </Card>;
}
