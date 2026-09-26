"use client";

import { Ban, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function TenantInactive() {
  const handleLogout = async () => {
    await signOut(auth);
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Ban size={28} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">契約停止中</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          現在、この会社のSalonManagerは利用を停止しています。契約状況について管理者へお問い合わせください。
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
        >
          <LogOut size={17} />
          ログアウト
        </button>
      </div>
    </div>
  );
}
