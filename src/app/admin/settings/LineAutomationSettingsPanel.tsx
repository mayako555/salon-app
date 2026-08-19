import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Bot, Save, AlertCircle, PlayCircle, Eye, RefreshCw } from "lucide-react";
import { LineAutomationSettings } from "./line-automation-actions";
import { LINE_TEMPLATE_VARIABLES, validateLineTemplate, replaceLineTemplate } from "@/lib/lineTemplate";

export default function LineAutomationSettingsPanel({
  settings,
  onChange,
  availableStores,
}: {
  settings: LineAutomationSettings;
  onChange: (newSettings: LineAutomationSettings) => void;
  availableStores: string[];
}) {
  const [activeTab, setActiveTab] = useState<"reminder" | "thanks" | "next_booking">("reminder");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testLineUserId, setTestLineUserId] = useState("");
  const [testStoreName, setTestStoreName] = useState(availableStores[0] || "");

  const handleToggleAutomation = () => {
    onChange({ ...settings, automationEnabled: !settings.automationEnabled });
  };

  const handleReminderChange = (field: keyof LineAutomationSettings, value: any) => {
    onChange({ ...settings, [field]: value });
  };

  const getDummyData = (storeName: string = testStoreName || availableStores[0] || "店舗") => ({
    customer_name: "山田 花子",
    store_name: storeName,
    date: "2026年7月20日",
    time: "10:00",
    menu_name: "まつげパーマ",
    staff_name: "岡田",
    reservation_url: "https://example.com/reservation",
    store_phone: "078-000-0000",
    next_reservation_date: "2026年8月20日",
    next_reservation_time: "14:00",
  });

  const handleTestSend = async () => {
    const normalizedLineUserId = testLineUserId.trim();
    if (!normalizedLineUserId) {
      toast.error("テスト送信先のLINEユーザーIDを入力してください（Uから始まる33文字）");
      return;
    }
    if (!/^U[0-9a-f]{32}$/i.test(normalizedLineUserId)) {
      toast.error("LINEユーザーIDの形式が正しくありません。表示名やLINE IDではなく、Uから始まる33文字のIDを入力してください");
      return;
    }
    const template = activeTab === "reminder" 
      ? settings.reminderTemplate 
      : activeTab === "thanks" 
        ? settings.thanksTemplate 
        : settings.nextBookingTemplate;
    if (!template.trim()) {
      toast.error("メッセージテンプレートを入力してください");
      return;
    }
    if (!testStoreName) {
      toast.error("テスト送信に使用する店舗を選択してください");
      return;
    }
    const { isValid, invalidVariables } = validateLineTemplate(template);
    if (!isValid) {
      toast.error(`利用できない変数が含まれています: ${invalidVariables.join(", ")}`);
      return;
    }

    const message = replaceLineTemplate(template, getDummyData(testStoreName));
    
    // Call test API (will be implemented later)
    try {
      const res = await fetch("/api/cron/line-automation/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId: normalizedLineUserId, message, storeName: testStoreName })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("テスト送信しました");
      } else {
        toast.error(`送信失敗: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`エラー: ${e.message}`);
    }
  };

  return (
    <Card className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white mt-8">
      <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-400 p-6 text-white flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-black flex items-center gap-2">
          <Bot className="w-6 h-6" /> LINE自動配信設定 (全店舗共通)
        </CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold opacity-90">自動配信</span>
          <button
            type="button"
            onClick={handleToggleAutomation}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-500 ${
              settings.automationEnabled ? 'bg-white' : 'bg-white/30'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                settings.automationEnabled ? 'translate-x-5 bg-emerald-500' : 'translate-x-0 bg-white'
              }`}
            />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {!settings.automationEnabled && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 font-medium">
              現在、自動配信はOFFになっています。ONにすると、毎日朝8時頃に設定したLINEメッセージが自動的に送信されます。
            </p>
          </div>
        )}

        <div className="flex gap-2 border-b border-slate-200 mb-6">
          <button
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "reminder" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("reminder")}
            type="button"
          >
            予約リマインド
          </button>
          <button
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "thanks" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("thanks")}
            type="button"
          >
            サンクス・来店後
          </button>
          <button
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "next_booking" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("next_booking")}
            type="button"
          >
            次回予約の案内
          </button>
        </div>

        {activeTab === "reminder" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">リマインド配信</h3>
                <p className="text-xs text-slate-500 mt-1">予約日の前日に確認メッセージを送ります</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  checked={settings.reminderEnabled}
                  onChange={(e) => handleReminderChange("reminderEnabled", e.target.checked)}
                />
                <span className="text-sm font-bold text-slate-700">有効にする</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-slate-700 w-24">送信日</label>
              <select
                className="border-slate-300 rounded-md text-sm py-2 px-3 focus:border-emerald-500 focus:ring-emerald-500 bg-white"
                value={settings.reminderDaysBefore}
                onChange={(e) => handleReminderChange("reminderDaysBefore", parseInt(e.target.value))}
              >
                <option value={0}>当日</option>
                <option value={1}>1日前</option>
                <option value={2}>2日前</option>
                <option value={3}>3日前</option>
                <option value={7}>7日前</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">メッセージテンプレート</label>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-emerald-600" onClick={() => setPreviewOpen(!previewOpen)}>
                  <Eye className="w-3 h-3 mr-1" /> プレビュー
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Textarea
                  value={settings.reminderTemplate}
                  onChange={(e) => handleReminderChange("reminderTemplate", e.target.value)}
                  placeholder="{customer_name}様&#10;こんにちは、{store_name}です。..."
                  className="h-64 font-mono text-sm leading-relaxed"
                />
                {previewOpen && (
                  <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 h-64 overflow-y-auto whitespace-pre-wrap text-sm text-slate-800 font-medium">
                    {replaceLineTemplate(settings.reminderTemplate, getDummyData())}
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-100">
                <p className="font-bold mb-2">利用可能な変数（クリックでコピー）:</p>
                <div className="flex flex-wrap gap-2">
                  {LINE_TEMPLATE_VARIABLES.map(v => (
                    <span
                      key={v}
                      className="px-2 py-1 bg-white border border-slate-200 rounded cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                      onClick={() => navigator.clipboard.writeText(v)}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "thanks" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">サンクス配信</h3>
                <p className="text-xs text-slate-500 mt-1">来店後に次回予約の促進やお礼を送ります</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  checked={settings.thanksEnabled}
                  onChange={(e) => handleReminderChange("thanksEnabled", e.target.checked)}
                />
                <span className="text-sm font-bold text-slate-700">有効にする</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-slate-700 w-24">送信日</label>
              <select
                className="border-slate-300 rounded-md text-sm py-2 px-3 focus:border-emerald-500 focus:ring-emerald-500 bg-white"
                value={settings.thanksDaysAfter}
                onChange={(e) => handleReminderChange("thanksDaysAfter", parseInt(e.target.value))}
              >
                <option value={0}>当日</option>
                <option value={1}>1日後</option>
                <option value={2}>2日後</option>
                <option value={3}>3日後</option>
                <option value={7}>7日後</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">メッセージテンプレート</label>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-emerald-600" onClick={() => setPreviewOpen(!previewOpen)}>
                  <Eye className="w-3 h-3 mr-1" /> プレビュー
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Textarea
                  value={settings.thanksTemplate}
                  onChange={(e) => handleReminderChange("thanksTemplate", e.target.value)}
                  placeholder="{customer_name}様&#10;昨日はご来店ありがとうございました。..."
                  className="h-64 font-mono text-sm leading-relaxed"
                />
                {previewOpen && (
                  <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 h-64 overflow-y-auto whitespace-pre-wrap text-sm text-slate-800 font-medium">
                    {replaceLineTemplate(settings.thanksTemplate, getDummyData())}
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-100">
                <p className="font-bold mb-2">利用可能な変数（クリックでコピー）:</p>
                <div className="flex flex-wrap gap-2">
                  {LINE_TEMPLATE_VARIABLES.map(v => (
                    <span
                      key={v}
                      className="px-2 py-1 bg-white border border-slate-200 rounded cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                      onClick={() => navigator.clipboard.writeText(v)}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "next_booking" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">次回予約確定時メッセージ</h3>
                <p className="text-xs text-slate-500 mt-1">次回予約を登録した瞬間に、ご案内メッセージを即時送信します</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  checked={settings.nextBookingEnabled}
                  onChange={(e) => handleReminderChange("nextBookingEnabled", e.target.checked)}
                />
                <span className="text-sm font-bold text-slate-700">有効にする</span>
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">メッセージテンプレート</label>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-emerald-600" onClick={() => setPreviewOpen(!previewOpen)}>
                  <Eye className="w-3 h-3 mr-1" /> プレビュー
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Textarea
                  value={settings.nextBookingTemplate}
                  onChange={(e) => handleReminderChange("nextBookingTemplate", e.target.value)}
                  placeholder="{customer_name}様&#10;次回予約が確定いたしました。..."
                  className="h-64 font-mono text-sm leading-relaxed"
                />
                {previewOpen && (
                  <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 h-64 overflow-y-auto whitespace-pre-wrap text-sm text-slate-800 font-medium">
                    {replaceLineTemplate(settings.nextBookingTemplate, getDummyData())}
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-100">
                <p className="font-bold mb-2">利用可能な変数（クリックでコピー）:</p>
                <div className="flex flex-wrap gap-2">
                  {LINE_TEMPLATE_VARIABLES.map(v => (
                    <span
                      key={v}
                      className="px-2 py-1 bg-white border border-slate-200 rounded cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                      onClick={() => navigator.clipboard.writeText(v)}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200">
          <h4 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-slate-400" /> テスト送信
          </h4>
          <div className="flex items-center gap-3">
            <select
              value={testStoreName}
              onChange={(e) => setTestStoreName(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              {availableStores.map(store => <option key={store} value={store}>{store}店</option>)}
            </select>
            <Input 
              placeholder="テスト送信先のLINEユーザーID (Uxxxxxxxxxxx)" 
              value={testLineUserId}
              onChange={(e) => setTestLineUserId(e.target.value)}
              className="max-w-md text-sm font-mono"
            />
            <Button variant="secondary" onClick={handleTestSend}>
              テスト送信実行
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            LINEの表示名や検索用IDでは送信できません。顧客カルテのLINE連携後に取得される、Uから始まる33文字のユーザーIDを使用してください。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
