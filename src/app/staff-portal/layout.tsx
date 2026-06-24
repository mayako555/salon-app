"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, User, LayoutDashboard, Users, Receipt, Calendar, Database, Settings, Train, Clock, ClipboardPaste, Lock, BookOpen, Wallet, Calculator } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, selectedStore, setSelectedStore, availableStores, tenantPlan } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/staff/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold animate-pulse">Authenticating Staff...</p>
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/staff/login");
  };

  const isManagerOrAbove = profile?.role === "manager" || profile?.role === "admin" || profile?.role === "companyOwner" || profile?.role === "systemOwner";
  const isCompanyOwnerOrAbove = profile?.role === "companyOwner" || profile?.role === "systemOwner";
  const canViewTimecard = profile?.role === "systemOwner" || profile?.role === "companyOwner" || profile?.role === "admin";
  const isTenantAdmin = profile?.role === "systemOwner" || profile?.role === "admin" || profile?.role === "companyOwner";
  const allowedStores = isTenantAdmin ? availableStores : (profile?.salonIds && profile.salonIds.length > 0 ? profile.salonIds : availableStores);

  const navItems = [
    { name: "ホーム", href: "/staff-portal", icon: LayoutDashboard },
    { name: "予約カレンダー", href: "/staff-portal/reservations", icon: Calendar },
    { name: "顧客管理", href: "/staff-portal/customers", icon: Users },
    { name: "売上管理・レジ締め", href: "/sales", icon: Lock },
    { name: "シフト確認", href: "/staff-portal/shifts", icon: Calendar },
    ...(isManagerOrAbove ? [
      { name: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
      { name: "スタッフ管理", href: "/staff", icon: Users },
      { name: "メニュー・商品設定", href: "/admin/master/operations", icon: Database },
      { name: "顧客一括取込", href: "/admin/import", icon: ClipboardPaste },
    ] : []),
    ...(isCompanyOwnerOrAbove ? [
      { name: "給与・報酬計算", href: "/payroll", icon: Calculator },
    ] : []),
    ...(canViewTimecard ? [
      { name: "タイムカード", href: "/attendance", icon: Clock },
    ] : []),
    { name: "在庫・発注", href: "/staff-portal/inventory", icon: Database },
    ...(tenantPlan !== "Solo" ? [
      { name: "交通費申請", href: "/staff-portal/transport", icon: Train },
      { name: "希望休申請", href: "/staff-portal/holidays", icon: Calendar },
      { name: "給与明細確認", href: "/staff-portal/payroll", icon: Calculator },
      { name: "マニュアル", href: "/manuals", icon: BookOpen },
    ] : []),
    { name: "経費精算", href: "/staff-portal/expenses", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-col sticky top-0 h-screen overflow-hidden">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
              <span className="text-xl font-black italic">S</span>
            </div>
            <h1 className="text-xl font-black tracking-tighter">SALON PORTAL</h1>
          </div>

          <div className="mb-4">
            {allowedStores.length > 1 ? (
              <>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-2">勤務店舗</label>
                <div className="grid grid-cols-1 gap-1">
                  {allowedStores.map(store => (
                    <button
                      key={store}
                      onClick={() => setSelectedStore(store)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 rounded-xl transition-all font-bold text-xs",
                        selectedStore === store ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", selectedStore === store ? "bg-emerald-400 animate-pulse" : "bg-slate-700")} />
                      {store}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl font-bold text-xs bg-white/5 text-white">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {allowedStores[0] || "メイン店舗"}
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-8 space-y-1 no-scrollbar pb-8">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                pathname === item.href ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-6 border-t border-white/5">
          <div className="bg-white/5 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-black text-blue-400">
              {profile?.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">{profile?.name || "担当者"}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{profile?.role || "staff"}</p>
            </div>
          </div>
          {isManagerOrAbove && (
            <Link href="/dashboard" className="mb-2 block">
              <Button 
                variant="outline" 
                className="w-full justify-start text-blue-400 border-blue-400/30 hover:bg-blue-400/10 rounded-xl gap-3 font-bold h-11"
              >
                <Settings size={18} />
                管理者画面へ
              </Button>
            </Link>
          )}
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl gap-3 font-bold"
          >
            <LogOut size={18} />
            LOGOUT
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center">
            <span className="text-sm font-black italic">S</span>
          </div>
          <span className="text-sm font-black tracking-tighter">SALON PORTAL</span>
        </div>
        <div className="flex items-center gap-3">
          {allowedStores.length > 1 ? (
            <select 
              value={selectedStore} 
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-slate-800 text-[10px] font-black px-2 py-1 rounded border-none outline-none text-blue-400"
            >
              {allowedStores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <span className="bg-slate-800 text-[10px] font-black px-2 py-1 rounded text-blue-400">
              {allowedStores[0] || "メイン店舗"}
            </span>
          )}
          {isManagerOrAbove && (
            <Link href="/dashboard" className="text-blue-400">
              <Settings size={18} />
            </Link>
          )}
          <span className="text-[10px] font-black opacity-60">{profile?.name}</span>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 h-8 w-8"><LogOut size={16} /></Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">
        {children}
      </main>

      {/* Mobile Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex overflow-x-auto z-40 pb-safe no-scrollbar">
        <div className="flex min-w-full justify-start px-2">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center gap-1 p-3 transition-all min-w-[72px] shrink-0 ${
                pathname === item.href ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-black whitespace-nowrap">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
