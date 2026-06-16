"use client";

import { useEffect, useState } from "react";
import { getReservationSettings, saveReservationSettings, getLineSettings, saveLineSettings, ReservationSettings, LineSettingsMap } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Settings, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function SystemSettingsPage() {
  const { profile, isAdmin, availableStores } = useAuth();
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [lineSettings, setLineSettings] = useState<LineSettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [data, lineData] = await Promise.all([
        getReservationSettings(),
        getLineSettings()
      ]);
      setSettings(data);
      setLineSettings(lineData);
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

  const handleSave = async () => {
    setSaving(true);
    const res = await saveReservationSettings(settings);
    
    // Save Line Settings
    const linePromises = Object.entries(lineSettings).map(([store, token]) => {
      return saveLineSettings(store, token);
    });
    
    await Promise.all(linePromises);

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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">チャネルアクセストークン (Channel Access Token)</label>
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
      </div>
    </div>
  );
}
