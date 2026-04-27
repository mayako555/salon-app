"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { getMasterData, updateMasterData, MasterData, MasterItem } from "./actions";

export default function AdminSettingsPage() {
  const [data, setData] = useState<MasterData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getMasterData().then(setData);
  }, []);

  const addItem = (type: keyof MasterData) => {
    if (!data) return;
    const newItem: MasterItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      price: 0
    };
    setData({ ...data, [type]: [...data[type], newItem] });
  };

  const removeItem = (type: keyof MasterData, id: string) => {
    if (!data) return;
    setData({ ...data, [type]: data[type].filter(i => i.id !== id) });
  };

  const updateItem = (type: keyof MasterData, id: string, field: keyof MasterItem, value: string | number) => {
    if (!data) return;
    setData({
      ...data,
      [type]: data[type].map(i => i.id === id ? { ...i, [field]: value } : i)
    });
  };

  const handleSave = async () => {
    if (!data) return;
    setIsSaving(true);
    await updateMasterData(data);
    setIsSaving(false);
    alert("設定を保存しました。");
  };

  if (!data) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/sales" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">マスタデータ設定</h1>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            保存する
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* Menus Section */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-slate-800 text-lg">施術メニュー・本数</CardTitle>
              <p className="text-xs text-slate-500 font-normal mt-0.5">会計時に選択・自動入力されるメニュー名と基本価格</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => addItem("menus")} className="bg-white border-slate-300 text-slate-600 font-medium">
              <Plus size={14} className="mr-1" /> 追加
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="font-medium px-6 py-3 text-left">メニュー名・本数</th>
                  <th className="font-medium px-6 py-3 text-left w-40">基本価格 (円)</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.menus.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-3">
                      <Input 
                        value={item.name} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem("menus", item.id, "name", e.target.value)}
                        placeholder="例: 上まつげ120本"
                        className="h-9 border-transparent group-hover:border-slate-200 focus:border-emerald-500 bg-transparent focus:bg-white transition-all"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <Input 
                        type="number"
                        value={item.price} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem("menus", item.id, "price", parseInt(e.target.value) || 0)}
                        className="h-9 border-transparent group-hover:border-slate-200 focus:border-emerald-500 bg-transparent focus:bg-white transition-all font-mono"
                      />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => removeItem("menus", item.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Hair Materials Section */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-slate-800 text-lg">毛質グレード</CardTitle>
              <Button variant="outline" size="sm" onClick={() => addItem("materials")} className="bg-white border-slate-300">
                <Plus size={14} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {data.materials.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 group">
                      <td className="px-4 py-2">
                        <Input 
                          value={item.name} 
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem("materials", item.id, "name", e.target.value)}
                          className="h-8 border-transparent group-hover:border-slate-200 focus:border-emerald-500 bg-transparent focus:bg-white text-xs"
                        />
                      </td>
                      <td className="px-4 py-2 w-28 text-right">
                        <Input 
                          type="number"
                          value={item.price} 
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem("materials", item.id, "price", parseInt(e.target.value) || 0)}
                          className="h-8 border-transparent group-hover:border-slate-200 focus:border-emerald-500 bg-transparent focus:bg-white text-xs text-right font-mono"
                        />
                      </td>
                      <td className="pr-4 text-right">
                        <button onClick={() => removeItem("materials", item.id)} className="text-slate-300 hover:text-rose-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Options Section */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-slate-800 text-lg">その他オプション</CardTitle>
              <Button variant="outline" size="sm" onClick={() => addItem("options")} className="bg-white border-slate-300">
                <Plus size={14} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {data.options.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 group">
                      <td className="px-4 py-2">
                        <Input 
                          value={item.name} 
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem("options", item.id, "name", e.target.value)}
                          className="h-8 border-transparent group-hover:border-slate-200 focus:border-emerald-500 bg-transparent focus:bg-white text-xs"
                        />
                      </td>
                      <td className="px-4 py-2 w-28 text-right">
                        <Input 
                          type="number"
                          value={item.price} 
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem("options", item.id, "price", parseInt(e.target.value) || 0)}
                          className="h-8 border-transparent group-hover:border-slate-200 focus:border-emerald-500 bg-transparent focus:bg-white text-xs text-right font-mono"
                        />
                      </td>
                      <td className="pr-4 text-right">
                        <button onClick={() => removeItem("options", item.id)} className="text-slate-300 hover:text-rose-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
}
