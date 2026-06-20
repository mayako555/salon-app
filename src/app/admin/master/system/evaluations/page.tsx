"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Save, Settings, Edit2, Info } from "lucide-react";
import { EVALUATION_TEMPLATES, EVALUATION_CATEGORIES_JP } from "@/app/evaluations/shared";
import { toast } from "sonner";

export default function EvaluationMasterPage() {
  const [activeRole, setActiveRole] = useState("general");
  const [templates, setTemplates] = useState(EVALUATION_TEMPLATES);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // モック：本来はFirestoreに保存し、actions.ts で利用する
    setTimeout(() => {
      setIsSaving(false);
      toast.success("評価テンプレートの設定を保存しました", {
        description: "※現在はテストモードのため、DBへの反映はモックです"
      });
    }, 1000);
  };

  const currentTemplate = templates[activeRole as keyof typeof templates];

  return (
    <AuthGuard requireRole="systemOwner">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Award className="text-emerald-500 w-6 h-6" />
              評価マスタ設定
            </h1>
            <p className="text-slate-500 font-medium mt-1">役職ごとの評価項目と配点を管理します</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-slate-900 text-white hover:bg-slate-800">
            {isSaving ? "保存中..." : <><Save className="w-4 h-4 mr-2" /> 設定を保存</>}
          </Button>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2 overflow-x-auto">
          {Object.values(templates).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveRole(t.role)}
              className={`px-4 py-2 font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeRole === t.role 
                  ? "border-emerald-500 text-emerald-700" 
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg"
              }`}
            >
              {t.roleName}
            </button>
          ))}
        </div>

        <div className="bg-blue-50 text-blue-800 border border-blue-200 rounded-lg p-4 flex gap-3 text-sm font-medium">
          <Info className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
          <p>
            現在、全役職で「定量（自動計算）70点」「定性（上長評価）30点」の100点満点で評価を行っています。<br/>
            配点の変更や項目の追加・削除は、システムへの影響範囲が大きいため、将来のアップデートで完全開放されます。
          </p>
        </div>

        {currentTemplate && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl pb-4">
                <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-400" />
                  定量評価（自動計算） - 70点満点
                </CardTitle>
                <CardDescription>POS・カルテなどの実績から自動で点数が算出されます</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-slate-100">
                  {currentTemplate.autoItems.map(item => (
                    <li key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                            {EVALUATION_CATEGORIES_JP[item.category] || item.category}
                          </Badge>
                          {item.isManualInput && <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">手入力可</Badge>}
                        </div>
                        <h4 className="font-bold text-slate-700 text-sm">{item.label}</h4>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div className="text-xs text-slate-400">上限配点</div>
                        <div className="font-black text-lg text-emerald-600 w-12 text-right">{item.maxScore}</div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><Edit2 className="w-4 h-4" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl pb-4">
                <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-400" />
                  定性評価（上長評価） - {currentTemplate.managerMaxScore}点満点
                </CardTitle>
                <CardDescription>上長が面談を通して5段階で評価します（各項目5点）</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-slate-100">
                  {currentTemplate.managerItems.map(item => (
                    <li key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                            {EVALUATION_CATEGORIES_JP[item.category] || item.category}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-slate-700 text-sm">{item.label}</h4>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div className="text-xs text-slate-400">配点</div>
                        <div className="font-black text-lg text-blue-600 w-12 text-right">5</div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><Edit2 className="w-4 h-4" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
