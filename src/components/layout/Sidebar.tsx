"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CalendarDays, 
  Clock, 
  Coins, 
  Gift, 
  Calculator, 
  Settings,
  Scissors,
  Train,
  QrCode
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useAuth } from "@/lib/auth-context";

const navigation = [
  { name: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard, role: "staff" },
  { name: "勤怠管理", href: "/attendance", icon: Clock, role: "staff" },
  { name: "売上管理", href: "/sales", icon: Coins, role: "staff" },
  { name: "自分の明細を確認", href: "/staff-portal/payroll", icon: Calculator, role: "staff" },
  { name: "希望休の提出", href: "/staff-portal/holidays", icon: CalendarDays, role: "staff" },
  { name: "交通費の申請", href: "/staff-portal/transport", icon: Train, role: "staff" },
  
  // Manager only sees Shift Management (in addition to staff items)
  { name: "シフト管理", href: "/shifts", icon: CalendarDays, role: "manager" },
  
  // Admin only items
  { name: "スタッフ管理", href: "/staff", icon: Users, role: "admin" },
  { name: "業務委託契約", href: "/contracts", icon: FileText, role: "admin" },
  { name: "手当管理", href: "/allowances", icon: Gift, role: "admin" },
  { name: "給与・報酬計算", href: "/payroll", icon: Calculator, role: "admin" },
  { name: "監査ログ", href: "/audit", icon: Settings, role: "admin" },
  { name: "打刻スキャナー", href: "/attendance/scanner", icon: QrCode, role: "admin" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, isAdmin, isManager, isStaff } = useAuth();

  const filteredNavigation = navigation.filter(item => {
    if (item.role === "admin") return isAdmin;
    if (item.role === "manager") return isManager;
    if (item.role === "staff") return isStaff;
    return true;
  });

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-white shadow-sm">
      <div className="flex h-16 items-center flex-shrink-0 px-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 rounded-lg text-white shadow-md shadow-emerald-200">
            <Scissors size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">SalonManager</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <nav className="flex-1 space-y-1 px-3">
          {filteredNavigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive
                    ? "bg-rose-50 text-rose-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out"
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? "text-rose-500" : "text-slate-400 group-hover:text-slate-500",
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
