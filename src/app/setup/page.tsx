"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { getCompanySetupStatus, updateAdoptionProgress } from "./actions";
import { AdoptionProgress } from "./types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, Home, Store, Clock, BookOpen, Users, Calculator } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  { id: "storeInfo", label: "店舗情報", icon: Store, desc: "店舗名や住所の登録" },
  { id: "businessHours", label: "営業時間", icon: Clock, desc: "営業時間と休日の設定" },
  { id: "menu", label: "メニュー", icon: BookOpen, desc: "提供するメニューと料金" },
  { id: "staff", label: "スタッフ", icon: Users, desc: "所属スタッフの登録" },
  { id: "payroll", label: "給与設定", icon: Calculator, desc: "基本給や歩合の設定" },
];

export default function SetupWizardPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState<AdoptionProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (authLoading) return;
      const res = await getCompanySetupStatus();
      if (res.success && res.data) {
        setProgress(res.data.progress);
        
        // Find first incomplete step
        const p = res.data.progress;
        if (!p.storeInfo) setCurrentStep(0);
        else if (!p.businessHours) setCurrentStep(1);
        else if (!p.menu) setCurrentStep(2);
        else if (!p.staff) setCurrentStep(3);
        else if (!p.payroll) setCurrentStep(4);
        else setCurrentStep(5); // all done
      }
      setLoading(false);
    }
    load();
  }, [authLoading]);

  const handleCompleteStep = async () => {
    if (!progress) return;
    
    const stepId = steps[currentStep].id as keyof AdoptionProgress;
    const res = await updateAdoptionProgress(stepId, true);
    
    if (res.success) {
      setProgress({ ...progress, [stepId]: true });
      toast.success(`${steps[currentStep].label}の設定を完了しました`);
      if (currentStep < steps.length) {
        setCurrentStep(prev => prev + 1);
      }
    } else {
      toast.error("保存に失敗しました");
    }
  };

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">初期設定ウィザード</h1>
          <p className="text-slate-500 mt-2">システムの利用を開始するために、必要な情報を順番に設定しましょう。</p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="text-slate-500">
            スキップしてダッシュボードへ
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-2">
          {steps.map((step, index) => {
            const isCompleted = progress?.[step.id as keyof AdoptionProgress];
            const isActive = currentStep === index;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isActive ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                  isCompleted ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className={`w-5 h-5 ${isActive ? "text-indigo-400" : "text-slate-300"}`} />
                )}
                <div className="flex-1">
                  <div className={`text-sm font-bold ${isActive ? "text-indigo-900" : ""}`}>
                    {step.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            {currentStep < steps.length ? (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="border-none shadow-md overflow-hidden">
                  <div className="bg-indigo-600 p-6 text-white flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl">
                      {(() => {
                        const Icon = steps[currentStep].icon;
                        return <Icon className="w-8 h-8" />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-xl font-black">STEP {currentStep + 1}: {steps[currentStep].label}</h2>
                      <p className="text-indigo-100 text-sm mt-1">{steps[currentStep].desc}</p>
                    </div>
                  </div>
                  <CardContent className="p-8">
                    <div className="min-h-[200px] flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                        {(() => {
                          const Icon = steps[currentStep].icon;
                          return <Icon className="w-8 h-8 text-slate-400" />;
                        })()}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">
                        {steps[currentStep].label}の設定画面を開きますか？
                      </h3>
                      <p className="text-slate-500 text-sm max-w-sm">
                        現在はウィザードのデモ版です。<br/>
                        本来はここに専用の入力フォームが表示されるか、設定ページへ遷移します。
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
                      <Button 
                        variant="ghost" 
                        onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                        disabled={currentStep === 0}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" /> 戻る
                      </Button>
                      <Button 
                        onClick={handleCompleteStep}
                        className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8"
                      >
                        この設定を完了する <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-center p-12">
                  <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-black mb-4">初期設定がすべて完了しました！</h2>
                  <p className="text-emerald-50 mb-8">
                    お疲れ様でした。<br/>
                    これでシステムの全ての機能をご利用いただけます。
                  </p>
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 font-black rounded-full px-8">
                      <Home className="w-5 h-5 mr-2" /> ダッシュボードへ戻る
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
