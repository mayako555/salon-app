"use client";

import { useAuth } from "@/lib/auth-context";
import { Sparkles } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdvancedCharts from "../dashboard/AdvancedCharts";
import RegressionAnalysis from "./RegressionAnalysis";
import SarimaxForecast from "./SarimaxForecast";
import RepeatAnalysis from "./RepeatAnalysis";
import LTVForecast from "./LTVForecast";
import StaffAnalysis from "./StaffAnalysis";
import StoreAnalysis from "./StoreAnalysis";
import ReferralAnalysis from "./ReferralAnalysis";
import ChannelAnalysis from "./ChannelAnalysis";

export default function AnalyticsPage() {
  const { profile, isSystemOwner } = useAuth();

  return (
    <AuthGuard requireRole="manager">
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="text-purple-500" />
            高度分析
          </h1>
          <p className="text-slate-500">店舗の売上や来店人数の傾向、影響要因を統計的に分析します。</p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <div className="w-full overflow-x-auto pb-2 -mb-2 no-scrollbar">
            <TabsList className="inline-flex w-max min-w-full md:grid md:w-full md:grid-cols-5 max-w-5xl h-auto md:h-12 bg-slate-100 p-1 rounded-xl">
              <TabsTrigger 
                value="overview" 
                className="rounded-lg font-bold px-4 py-2.5 md:py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all"
              >
                <span className="md:hidden">概要</span>
                <span className="hidden md:inline">概要 (月次トレンド)</span>
              </TabsTrigger>

              <TabsTrigger 
                value="staff" 
                className="rounded-lg font-bold px-4 py-2.5 md:py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all"
              >
                スタッフ分析
              </TabsTrigger>

              <TabsTrigger 
                value="store" 
                className="rounded-lg font-bold px-4 py-2.5 md:py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all"
              >
                店舗比較
              </TabsTrigger>

              <TabsTrigger 
                value="referral" 
                className="rounded-lg font-bold px-4 py-2.5 md:py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all"
              >
                紹介分析
              </TabsTrigger>

              <TabsTrigger 
                value="channel" 
                className="rounded-lg font-bold px-4 py-2.5 md:py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all"
              >
                流入分析
              </TabsTrigger>
              
              {isSystemOwner && (
                <>
                  <TabsTrigger 
                    value="regression"
                    className="rounded-lg font-bold px-4 py-2.5 md:py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all"
                  >
                    <span className="md:hidden">要因分析</span>
                    <span className="hidden md:inline">回帰分析 (要因分析)</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="forecast"
                    className="rounded-lg font-bold px-4 py-2.5 md:py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all"
                  >
                    <span className="md:hidden">将来予測</span>
                    <span className="hidden md:inline">将来予測 (SARIMAX)</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="repeat"
                    className="rounded-lg font-bold px-4 py-2.5 md:py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all"
                  >
                    <span className="md:hidden">リピート</span>
                    <span className="hidden md:inline">リピート分析</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ltv-forecast"
                    className="rounded-lg font-bold px-4 py-2.5 md:py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all"
                  >
                    <span className="md:hidden">LTV予測</span>
                    <span className="hidden md:inline">LTV・リピーター予測</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>
          
          <TabsContent value="overview" className="mt-6 md:mt-8">
            {/* 既存の高度チャートを再利用 */}
            <AdvancedCharts />
          </TabsContent>

          <TabsContent value="staff" className="mt-6">
            <StaffAnalysis />
          </TabsContent>

          <TabsContent value="store" className="mt-6">
            <StoreAnalysis />
          </TabsContent>

          <TabsContent value="referral" className="mt-6">
            <ReferralAnalysis />
          </TabsContent>

          <TabsContent value="channel" className="mt-6">
            <ChannelAnalysis />
          </TabsContent>
          
          {isSystemOwner && (
            <>
              <TabsContent value="regression" className="mt-6">
                <RegressionAnalysis />
              </TabsContent>

              <TabsContent value="forecast" className="mt-6">
                <SarimaxForecast />
              </TabsContent>

              <TabsContent value="repeat" className="mt-6">
                <RepeatAnalysis />
              </TabsContent>

              <TabsContent value="ltv-forecast" className="mt-6">
                <LTVForecast />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </AuthGuard>
  );
}
