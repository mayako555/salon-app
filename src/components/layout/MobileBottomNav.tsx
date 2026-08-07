"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  Home, 
  CalendarDays, 
  Coins, 
  Banknote, 
  Menu,
  Users,
  Train,
  Wallet,
  CalendarHeart,
  BookOpen,
  Settings,
  Library,
  X,
  Package,
  LayoutDashboard,
  ClipboardList,
  Calculator,
  Clock,
  Briefcase,
  Award,
  GraduationCap,
  Database,
  Building2,
  Sparkles,
  Gift
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { tenantPlan, isAdmin, isManager, isCompanyOwner, isSystemOwner, hasFeature } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainTabs = [
    { name: "ホーム", href: "/staff-portal", icon: Home },
    { name: "予約", href: "/staff-portal/reservations", icon: CalendarDays, feature: "reservations" },
    { name: "レジ", href: "/staff-portal/cash", icon: Banknote, feature: "cash_management" },
    { name: "売上", href: isAdmin || isManager ? "/sales" : "/staff-portal/sales", icon: Coins, feature: "sales" },
  ];

  const hasAccess = (role: string) => {
    if (role === "systemOwner") return isSystemOwner;
    if (role === "companyOwner") return isCompanyOwner || isSystemOwner;
    if (role === "admin") return isAdmin;
    if (role === "manager") return isManager || isAdmin || isCompanyOwner;
    return true; // staff
  };

  const moreItems = [
    { name: "顧客管理", href: "/staff-portal/customers", icon: Users, role: "staff", feature: "customers" },
    { name: "シフト・勤怠", href: "/staff-portal/shifts", icon: CalendarDays, role: "staff", feature: "shifts" },
    { name: "交通費申請", href: "/staff-portal/transport", icon: Train, role: "staff", feature: "payroll" },
    { name: "経費申請", href: "/staff-portal/expenses", icon: Wallet, role: "staff", feature: "expenses" },
    { name: "希望休提出", href: "/staff-portal/holidays", icon: CalendarHeart, role: "staff", feature: "shifts" },
    { name: "在庫管理", href: "/inventory", icon: Package, role: "manager", feature: "inventory" },
  ];

  const adminItems = [
    { name: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard, role: "manager" },
    { name: "高度分析", href: "/analytics", icon: Sparkles, role: "admin" },
    { name: "シフト管理", href: "/shifts", icon: CalendarDays, role: "manager", feature: "shifts" },
    { name: "勤怠管理", href: "/attendance", icon: Clock, role: "admin", feature: "attendance" },
    { name: "有給管理", href: "/admin/paid-leaves", icon: CalendarDays, role: "admin", feature: "attendance" },
    { name: "採用管理", href: "/admin/recruitment", icon: Briefcase, role: "admin" },
    { name: "スタッフ管理", href: "/staff", icon: Users, role: "admin" },
    { name: "スタッフ評価", href: "/evaluations", icon: Award, role: "admin", feature: "evaluations" },
    { name: "新人教育", href: "/training", icon: GraduationCap, role: "admin", feature: "training" },
    { name: "経費・収支", href: "/admin/expenses", icon: Wallet, role: "admin", feature: "expenses" },
    { name: "給与・報酬", href: "/payroll", icon: Calculator, role: "admin", feature: "payroll" },
    { name: "AIタスク管理", href: "/admin/tasks", icon: ClipboardList, role: "manager", feature: "tasks" },
    { name: "手当管理", href: "/allowances", icon: Gift, role: "admin" },
    { name: "システム管理", href: "/admin/master/operations", icon: Database, role: "admin" },
    { name: "システム設定", href: "/admin/settings", icon: Settings, role: "companyOwner" },
    { name: "請求書", href: "/admin/settings/subscription", icon: Building2, role: "companyOwner" },
  ];

  const rulesItems = tenantPlan !== "Solo" ? [
    { name: "就業規則", href: "/staff-portal/rules", icon: BookOpen, role: "staff", feature: "training" },
    { name: "マニュアル", href: "/manuals", icon: Library, role: "staff", feature: "training" },
  ] : [];

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe">
        <div className="flex justify-around items-center h-16">
          {mainTabs.filter(t => !(t as any).feature || hasFeature((t as any).feature)).map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className="flex flex-col items-center justify-center w-full h-full space-y-1 active:bg-slate-50 transition-colors pt-1"
                onClick={() => setIsMoreOpen(false)}
              >
                <tab.icon 
                  size={24} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? "text-slate-900" : "text-slate-400"} 
                />
                <span className={cn(
                  "text-[10px] font-bold leading-none",
                  isActive ? "text-slate-900" : "text-slate-400"
                )}>
                  {tab.name}
                </span>
              </Link>
            );
          })}
          
          <button
            onClick={() => setIsMoreOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 active:bg-slate-50 transition-colors pt-1"
          >
            <Menu 
              size={24} 
              strokeWidth={isMoreOpen ? 2.5 : 2}
              className={isMoreOpen ? "text-slate-900" : "text-slate-400"} 
            />
            <span className={cn(
              "text-[10px] font-bold leading-none",
              isMoreOpen ? "text-slate-900" : "text-slate-400"
            )}>
              その他
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMoreOpen && (
          <div className="md:hidden relative z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2rem] pb-safe flex flex-col max-h-[85vh] shadow-2xl"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-100">
                <h3 className="font-black text-lg text-slate-900">その他メニュー</h3>
                <button 
                  onClick={() => setIsMoreOpen(false)}
                  className="p-2 bg-slate-100 rounded-full text-slate-500 active:scale-90 transition-transform"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="overflow-y-auto p-5 space-y-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">業務メニュー</p>
                  <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                    {moreItems.filter(item => {
                    if (item.role && !hasAccess(item.role)) return false;
                    if ((item as any).feature && !hasFeature((item as any).feature)) return false;
                    return true;
                  }).map(item => (
                      <Link 
                        key={item.name} 
                        href={item.href}
                        onClick={() => setIsMoreOpen(false)}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 border border-slate-100 shadow-sm active:scale-90 transition-transform">
                          <item.icon size={24} strokeWidth={2} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 text-center leading-tight whitespace-nowrap">{item.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {rulesItems.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">規程・マニュアル</p>
                    <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                      {rulesItems.filter(item => {
                          if (item.role && !hasAccess(item.role)) return false;
                          if ((item as any).feature && !hasFeature((item as any).feature)) return false;
                          return true;
                        }).map(item => (
                      <Link 
                        key={item.name} 
                        href={item.href}
                        onClick={() => setIsMoreOpen(false)}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 border border-slate-100 shadow-sm active:scale-90 transition-transform">
                          <item.icon size={24} strokeWidth={2} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 text-center leading-tight whitespace-nowrap">{item.name}</span>
                      </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">設定</p>
                  <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                    <Link 
                      href="/staff-portal/settings"
                      onClick={() => setIsMoreOpen(false)}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 border border-slate-100 shadow-sm active:scale-90 transition-transform">
                        <Settings size={24} strokeWidth={2} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 text-center leading-tight whitespace-nowrap">個人設定</span>
                    </Link>
                    
                    {adminItems.filter(i => hasAccess(i.role)).filter(item => !(item as any).feature || hasFeature((item as any).feature)).map(item => (
                      <Link 
                        key={item.name} 
                        href={item.href}
                        onClick={() => setIsMoreOpen(false)}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white border border-slate-800 shadow-md active:scale-90 transition-transform">
                          <item.icon size={24} strokeWidth={2} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-900 text-center leading-tight whitespace-nowrap">{item.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
                
                {/* Spacer for scroll */}
                <div className="h-8"></div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
