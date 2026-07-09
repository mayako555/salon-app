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
  Package
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
  const { tenantPlan, isAdmin, isManager, isCompanyOwner, isSystemOwner } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainTabs = [
    { name: "ホーム", href: "/staff-portal", icon: Home },
    { name: "予約", href: "/staff-portal/reservations", icon: CalendarDays },
    { name: "レジ", href: "/staff-portal/cash", icon: Banknote },
    { name: "売上", href: "/staff-portal/sales", icon: Coins },
  ];

  const hasAccess = (role: string) => {
    if (role === "systemOwner") return isSystemOwner;
    if (role === "companyOwner") return isCompanyOwner || isSystemOwner;
    if (role === "admin") return isAdmin;
    if (role === "manager") return isManager || isAdmin || isCompanyOwner;
    return true; // staff
  };

  const moreItems = [
    { name: "顧客管理", href: "/staff-portal/customers", icon: Users, role: "staff" },
    { name: "シフト・勤怠", href: "/staff-portal/shifts", icon: CalendarDays, role: "staff" },
    { name: "交通費申請", href: "/staff-portal/transport", icon: Train, role: "staff" },
    { name: "経費申請", href: "/staff-portal/expenses", icon: Wallet, role: "staff" },
    { name: "希望休提出", href: "/staff-portal/holidays", icon: CalendarHeart, role: "staff" },
    { name: "在庫管理", href: "/inventory", icon: Package, role: "manager" },
  ];

  const adminItems = [
    { name: "管理者メニュー", href: "/dashboard", icon: Settings, role: "manager" },
  ];

  const rulesItems = tenantPlan !== "Solo" ? [
    { name: "就業規則", href: "/staff-portal/rules", icon: BookOpen, role: "staff" },
    { name: "マニュアル", href: "/manuals", icon: Library, role: "staff" },
  ] : [];

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe">
        <div className="flex justify-around items-center h-16">
          {mainTabs.map((tab) => {
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
                    {moreItems.filter(i => hasAccess(i.role)).map(item => (
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
                      {rulesItems.map(item => (
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
                    
                    {adminItems.filter(i => hasAccess(i.role)).map(item => (
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
