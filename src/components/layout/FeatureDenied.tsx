"use client";

import { useAuth } from "@/lib/auth-context";
import { Lock, AlertCircle } from "lucide-react";
import Link from "next/link";

export function FeatureDenied() {
  const { isSystemOwnerCompany, isAdmin } = useAuth();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="bg-slate-100 p-6 rounded-full mb-6 text-slate-400">
        <Lock size={48} />
      </div>
      
      <h1 className="text-2xl font-black text-slate-800 mb-4">
        アクセス権限がありません
      </h1>
      
      {isAdmin ? (
        <div className="max-w-md bg-amber-50 border border-amber-200 rounded-2xl p-6 text-left">
          <div className="flex items-start gap-3 text-amber-800">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold mb-2">この機能は現在のご契約では利用できません。</p>
              <p className="text-sm opacity-90 mb-4">
                追加オプションや上位プランでご利用いただける可能性があります。
                利用をご希望の場合は、システムオーナーまでお問い合わせください。
              </p>
              <div className="flex justify-center">
                <Link href="/" className="inline-block px-6 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors">
                  ダッシュボードへ戻る
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-md text-slate-500">
          <p className="mb-6">指定されたページへのアクセス権限がありません。</p>
          <Link href="/" className="inline-block px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors">
            ダッシュボードへ戻る
          </Link>
        </div>
      )}
    </div>
  );
}
