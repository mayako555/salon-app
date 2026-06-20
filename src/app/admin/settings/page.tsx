"use client";

import { useEffect, useState } from "react";
import { getReservationSettings, saveReservationSettings, getLineSettings, saveLineSettings, ReservationSettings, LineSettingsMap, getCompanySettings, saveCompanyAttendanceRule, getKioskSettings, saveKioskSettings } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Settings, MessageCircle, HelpCircle, Clock, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function SystemSettingsPage() {
  const { profile, isAdmin, availableStores } = useAuth();
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [lineSettings, setLineSettings] = useState<LineSettingsMap>({});
  const [attendanceRule, setAttendanceRule] = useState<"jasminelash" | "simple">("simple");
  const [kioskSettings, setKioskSettings] = useState<Record<string, { token: string, enabled: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [data, lineData, compData, kioskData] = await Promise.all([
        getReservationSettings(),
        getLineSettings(),
        getCompanySettings(profile?.companyId || "company_default"),
        getKioskSettings(profile?.companyId || "company_default")
      ]);
      setSettings(data);
      setLineSettings(lineData);
      setAttendanceRule(compData.attendanceRule || "simple");
      setKioskSettings(kioskData || {});
      setLoading(false);
    }
    load();
  }, []);

  if (!isAdmin) {
    return <div className="p-12 text-center text-slate-400 font-bold">アクセス権限がありません</div>;
  }

  if (loading || !settings) {
    return <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Loading Settings...</div>;
  }

  const handleStoreChange = (store: string, field: "startHour" | "endHour" | "slotDuration", value: number) => {
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        stores: {
          ...prev.stores,
          [store]: {
            ...prev.stores[store],
            [field]: value
          }
        }
      };
    });
  };

  const handleLineStoreChange = (store: string, value: string) => {
    setLineSettings(prev => ({
      ...prev,
      [store]: value
    }));
  };

  const handleKioskTokenGenerate = (store: string) => {
    const randomToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setKioskSettings(prev => ({
      ...prev,
      [store]: { ...prev[store], token: randomToken, enabled: prev[store]?.enabled ?? false }
    }));
  };

  const handleKioskToggle = (store: string, enabled: boolean) => {
    setKioskSettings(prev => {
      const token = prev[store]?.token || (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
      return {
        ...prev,
        [store]: { token, enabled }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await saveReservationSettings(settings);
    
    // Save Line Settings
    const linePromises = Object.entries(lineSettings).map(([store, token]) => {
      return saveLineSettings(store, token);
    });
    
    // Save Kiosk Settings
    const kioskPromises = Object.entries(kioskSettings).map(([store, data]) => {
      return saveKioskSettings(profile?.companyId || "company_default", store, data.token, data.enabled);
    });
    
    // Save Attendance Rule
    await saveCompanyAttendanceRule(profile?.companyId || "company_default", attendanceRule);

    await Promise.all([...linePromises, ...kioskPromises]);

    if (res.success) {
      toast.success("設定を保存しました");
    } else {
      toast.error(res.error || "保存に失敗しました");
    }
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-24">
      <div className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Settings className="text-blue-600" /> システム設定
          </h1>
          <p className="text-slate-500 font-medium">予約台帳の営業時間・刻み幅などの設定</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-black text-white h-12 px-8 shadow-xl shadow-blue-200"
        >
          <Save size={18} className="mr-2" /> 
          {saving ? "保存中..." : "保存する"}
        </Button>
      </div>

      <Card className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white mb-8">
        <CardHeader className="bg-amber-50 border-b border-amber-100">
          <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Clock className="text-amber-600" /> 勤怠ルール設定（テナント全体）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-500">
              全店舗共通のタイムカード（打刻）処理ルールを選択します。<br/>
              ※「Jasminelashルール」は、シフトデータと連携して出退勤時刻を自動補正（30分丸め等）します。<br/>
              ※「Simpleルール」は、打刻された実時刻をそのまま記録します。
            </p>
            <div className="flex gap-4">
              <label className={`flex-1 border-2 rounded-2xl p-4 cursor-pointer transition-all ${attendanceRule === 'jasminelash' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-200'}`}>
                <input 
                  type="radio" 
                  name="attendanceRule" 
                  value="jasminelash" 
                  checked={attendanceRule === 'jasminelash'}
                  onChange={(e) => setAttendanceRule(e.target.value as any)}
                  className="hidden" 
                />
                <div className="font-black text-slate-800">Jasminelashルール</div>
                <div className="text-xs text-slate-500 mt-1">シフト連動・30分丸め自動補正</div>
              </label>
              <label className={`flex-1 border-2 rounded-2xl p-4 cursor-pointer transition-all ${attendanceRule === 'simple' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}>
                <input 
                  type="radio" 
                  name="attendanceRule" 
                  value="simple" 
                  checked={attendanceRule === 'simple'}
                  onChange={(e) => setAttendanceRule(e.target.value as any)}
                  className="hidden" 
                />
                <div className="font-black text-slate-800">Simpleルール</div>
                <div className="text-xs text-slate-500 mt-1">実時刻打刻（補正・丸めなし）</div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {availableStores.filter(store => store !== "共通" && store !== "全店舗").map(store => { const storeSettings = settings.stores[store] || { startHour: 8, endHour: 22, slotDuration: 30 }; return (
          <Card key={store} className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-lg font-black text-slate-800">{store}店の予約台帳設定</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">営業開始（何時から表示するか）</label>
                  <div className="relative">
                    <Input 
                      type="number"
                      min={0}
                      max={23}
                      value={storeSettings.startHour} 
                      onChange={(e) => handleStoreChange(store, "startHour", parseInt(e.target.value) || 0)}
                      className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                    />
                    <span className="absolute right-4 top-3 text-slate-400 font-bold">時</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">営業終了（何時まで表示するか）</label>
                  <div className="relative">
                    <Input 
                      type="number"
                      min={1}
                      max={24}
                      value={storeSettings.endHour} 
                      onChange={(e) => handleStoreChange(store, "endHour", parseInt(e.target.value) || 0)}
                      className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4"
                    />
                    <span className="absolute right-4 top-3 text-slate-400 font-bold">時</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">時間の刻み幅（マス目の単位）</label>
                  <div className="relative">
                    <select
                      value={storeSettings.slotDuration}
                      onChange={(e) => handleStoreChange(store, "slotDuration", parseInt(e.target.value) || 30)}
                      className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 font-bold text-sm appearance-none"
                    >
                      <option value={60}>60分ごと</option>
                      <option value={30}>30分ごと</option>
                      <option value={15}>15分ごと</option>
                      <option value={10}>10分ごと</option>
                      <option value={5}>5分ごと</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ); })}

        <div className="pt-8 pb-4">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <MessageCircle className="text-green-600" /> LINE公式アカウント連携
          </h2>
          <p className="text-slate-500 font-medium">各店舗のLINE Messaging API（チャネルアクセストークン）の設定</p>
        </div>

        {availableStores.filter(store => store !== "共通" && store !== "全店舗").map((store) => (
          <Card key={`line-${store}`} className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-green-50 border-b border-green-100">
              <CardTitle className="text-lg font-black text-slate-800">{store}店 LINE設定</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
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
                <Input 
                  type="password"
                  placeholder="LINE Developersコンソールから取得したトークンを入力"
                  value={lineSettings[store] || ""} 
                  onChange={(e) => handleLineStoreChange(store, e.target.value)}
                  className="h-12 bg-slate-50 border-none rounded-2xl font-bold px-4 w-full"
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="pt-8 pb-4">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="text-indigo-600" /> 外部タイムカード（キオスク端末）
          </h2>
          <p className="text-slate-500 font-medium">店舗ごとのタブレット用打刻画面の設定・専用URL発行</p>
        </div>

        {availableStores.filter(store => store !== "共通" && store !== "全店舗").map((store) => {
          const kSettings = kioskSettings[store] || { token: "", enabled: false };
          const companyId = profile?.companyId || "company_default";
          const kioskUrl = typeof window !== 'undefined' ? `${window.location.origin}/kiosk/attendance?companyId=${companyId}&storeId=${encodeURIComponent(store)}&token=${kSettings.token}` : "";

          return (
          <Card key={`kiosk-${store}`} className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-indigo-50 border-b border-indigo-100 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-lg font-black text-slate-800">{store}店 キオスク端末</CardTitle>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-bold text-slate-600">{kSettings.enabled ? "利用中" : "停止中"}</span>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${kSettings.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${kSettings.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={kSettings.enabled}
                  onChange={(e) => handleKioskToggle(store, e.target.checked)}
                />
              </label>
            </CardHeader>
            <CardContent className="p-6">
              {kSettings.enabled ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">専用URL</label>
                    <div className="flex gap-2">
                      <Input 
                        readOnly
                        value={kioskUrl}
                        className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold px-4 text-xs text-slate-500"
                      />
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(kioskUrl);
                          toast.success("URLをコピーしました");
                        }}
                        className="h-12 px-6 rounded-xl font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        コピー
                      </Button>
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => window.open(kioskUrl, "_blank")}
                        className="h-12 px-6 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                      >
                        開く
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-rose-50 p-4 rounded-xl border border-rose-100">
                    <div className="text-sm text-rose-700 font-bold">
                      セキュリティトークンの再発行
                      <p className="text-[10px] text-rose-500/80 mt-1 font-normal">現在のURLを無効にし、新しいURLを発行します。</p>
                    </div>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => handleKioskTokenGenerate(store)}
                      className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-100 font-bold"
                    >
                      再発行
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400 font-bold text-sm">
                  キオスク端末は停止中です。右上のスイッチをONにすると専用URLが発行されます。
                </div>
              )}
            </CardContent>
          </Card>
        )})}
      </div>
    </div>
  );
}
