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
  QrCode,
  Database,
  BookOpen,
  GraduationCap
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useAuth } from "@/lib/auth-context";

const managementNav = [
  { name: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard, role: "staff" },
  { name: "売上管理", href: "/sales", icon: Coins, role: "staff" },
  { name: "マスタ管理", href: "/staff-portal/sales/master", icon: Database, role: "admin" },
  { name: "勤怠管理", href: "/attendance", icon: Clock, role: "staff" },
  { name: "シフト管理", href: "/shifts", icon: CalendarDays, role: "manager" },
  { name: "スタッフ管理", href: "/staff", icon: Users, role: "admin" },
  { name: "給与・報酬計算", href: "/payroll", icon: Calculator, role: "admin" },
  { name: "業務委託契約", href: "/contracts", icon: FileText, role: "admin" },
  { name: "手当管理", href: "/allowances", icon: Gift, role: "admin" },
  { name: "監査ログ", href: "/audit", icon: Settings, role: "admin" },
  { name: "打刻スキャナー", href: "/attendance/scanner", icon: QrCode, role: "admin" },
  { name: "新人教育", href: "/training", icon: GraduationCap, role: "staff" },
];

const staffNav = [
  { name: "マイQRコード", href: "/staff-portal/my-qr", icon: QrCode },
  { name: "自分の明細を確認", href: "/staff-portal/payroll", icon: Calculator },
  { name: "希望休の提出", href: "/staff-portal/holidays", icon: CalendarDays },
  { name: "交通費の申請", href: "/staff-portal/transport", icon: Train },
  { name: "就業規則", href: "/staff-portal/rules", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, isAdmin, isManager, isStaff } = useAuth();

  const filteredManagementNav = managementNav.filter(item => {
    if (item.role === "admin") return isAdmin;
    if (item.role === "manager") return isManager;
    if (item.role === "staff") return isStaff;
    return true;
  });

  const NavItem = ({ item, colorClass = "text-rose-600", bgClass = "bg-rose-50", iconColor = "text-rose-500" }: { item: any, colorClass?: string, bgClass?: string, iconColor?: string }) => {
    const isActive = pathname.startsWith(item.href);
    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          isActive
            ? `${bgClass} ${colorClass}`
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
          "group flex items-center rounded-md px-3 py-2 text-sm font-bold transition-all duration-200"
        )}
      >
        <item.icon
          className={cn(
            isActive ? iconColor : "text-slate-400 group-hover:text-slate-500",
            "mr-3 h-5 w-5 flex-shrink-0"
          )}
          aria-hidden="true"
        />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-white shadow-sm">
      <div className="flex h-16 items-center flex-shrink-0 px-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-slate-800 to-slate-700 p-2 rounded-lg text-white shadow-md">
            <Scissors size={20} />
          </div>
          <span className="font-black text-lg tracking-tight text-slate-900 italic">SalonManager</span>
        </div>
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto py-4">
        <nav className="flex-1 space-y-8 px-3">
          {/* Management Section */}
          {(isAdmin || isManager) && (
            <div className="space-y-1">
              <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Salon Management
              </h3>
              <div className="space-y-1">
                {filteredManagementNav.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Staff Portal Section */}
          <div className="space-y-1">
            <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Staff Portal
            </h3>
            <div className="space-y-1">
              {staffNav.map((item) => (
                <NavItem 
                  key={item.name} 
                  item={item} 
                  colorClass="text-blue-600" 
                  bgClass="bg-blue-50" 
                  iconColor="text-blue-500" 
                />
              ))}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
