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
  GraduationCap,
  ClipboardPaste,
  Library,
  Package,
  Award,
  Wallet,
  Sparkles,
  Banknote,
  Briefcase,
  Building2,
  ClipboardList
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useAuth } from "@/lib/auth-context";



export function Sidebar() {
  const pathname = usePathname();
  const { profile, isAdmin, isManager, isStaff, isSystemOwner, isCompanyOwner, tenantPlan } = useAuth();

  const hasAccess = (role: string) => {
    if (role === "systemOwner") return isSystemOwner;
    if (role === "companyOwner") return isCompanyOwner || isSystemOwner;
    if (role === "admin") return isAdmin;
    if (role === "manager") return isManager || isAdmin || isCompanyOwner;
    if (role === "staff") return isStaff || isManager || isAdmin || isCompanyOwner;
    return true;
  };

  const managementCategories = [
    {
      title: "ダッシュボード",
      items: [
        { name: "管理者ダッシュボード", href: "/dashboard", icon: LayoutDashboard, role: "manager" },
      ]
    },
    {
      title: "日常業務",
      items: [
        { name: "スタッフホーム", href: "/staff-portal", icon: LayoutDashboard, role: "staff" },
        { name: "AIタスク管理", href: "/admin/tasks", icon: ClipboardList, role: "manager" },
        { name: "予約カレンダー", href: "/staff-portal/reservations", icon: CalendarDays, role: "staff" },
        { name: "顧客管理", href: "/staff-portal/customers", icon: Users, role: "staff" },
        { name: "売上管理・レジ締め", href: isAdmin || isManager ? "/sales" : "/staff-portal/sales", icon: Coins, role: "staff" },
      ]
    },
    {
      title: "分析・経理",
      items: [
        { name: "高度分析", href: "/analytics", icon: Sparkles, role: "admin" }, // All admins can see the page, but tabs are restricted inside
        { name: "経費・収支管理", href: "/admin/expenses", icon: Wallet, role: "admin" },
        { name: "給与・報酬計算", href: "/payroll", icon: Calculator, role: "admin" },
      ]
    },
    {
      title: "勤怠・シフト",
      items: [
        { name: "シフト管理", href: "/shifts", icon: CalendarDays, role: "manager" },
        { name: "勤怠管理", href: "/attendance", icon: Clock, role: "admin" },
        { name: "店舗用タイムカード", href: "/attendance/setup", icon: Clock, role: "admin" },
        { name: "有給管理", href: "/admin/paid-leaves", icon: CalendarDays, role: "admin" },
      ]
    },
    {
      title: "スタッフ・教育",
      items: [
        { name: "採用管理", href: "/admin/recruitment", icon: Briefcase, role: "admin" },
        { name: "スタッフ管理", href: "/staff", icon: Users, role: "admin" },
        { name: "スタッフ評価", href: "/evaluations", icon: Award, role: "admin" },
        { name: "新人教育", href: "/training", icon: GraduationCap, role: "admin" },
      ]
    },
    {
      title: "マスタ・データ管理",
      items: [
        { name: "顧客一括取込", href: "/admin/import", icon: ClipboardPaste, role: "admin" },
        { name: "口コミ一括取込", href: "/admin/reviews/import", icon: ClipboardPaste, role: "admin" },
        { name: "店舗運用マスタ", href: "/admin/master/operations", icon: Database, role: "admin" },
        { name: "システム管理マスタ", href: "/admin/master/system", icon: Settings, role: "systemOwner" },
        { name: "在庫管理", href: "/inventory", icon: Package, role: "manager" },
        { name: "雇用・業務委託契約", href: "/contracts", icon: FileText, role: "admin" },
        { name: "手当管理", href: "/allowances", icon: Gift, role: "admin" },
        { name: "FC契約・請求管理", href: "/admin/settings/subscription", icon: Building2, role: "companyOwner" },
        { name: "システム設定", href: "/admin/settings", icon: Settings, role: "systemOwner" },
        { name: "監査ログ", href: "/audit", icon: Settings, role: "systemOwner" },
      ]
    }
  ];

  const staffCategories = [
    {
      title: "各種申請・確認",
      items: [
        { name: "自分の明細を確認", href: "/staff-portal/payroll", icon: Calculator },
        { name: "交通費の申請", href: "/staff-portal/transport", icon: Train },
        { name: "経費の申請", href: "/staff-portal/expenses", icon: Wallet },
        { name: "現金・入金管理", href: "/staff-portal/cash", icon: Banknote },
        { name: "希望休の提出", href: "/staff-portal/holidays", icon: CalendarDays },
      ]
    },
    {
      title: "マニュアル・規程",
      items: [
        { name: "就業規則", href: "/staff-portal/rules", icon: BookOpen },
        { name: "マニュアル", href: "/manuals", icon: Library },
      ]
    },
    {
      title: "設定",
      items: [
        { name: "プロフィール設定", href: "/staff-portal/settings", icon: Settings },
      ]
    }
  ];

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
        <nav className="flex-1 space-y-6 px-3 pb-8">
          {/* Management & Operations Section */}
          <div className="space-y-6">
            {managementCategories.map((category) => {
              const visibleItems = category.items.filter(item => hasAccess(item.role));
              if (visibleItems.length === 0) return null;
              
              return (
                <div key={category.title} className="space-y-1">
                  <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    {category.title}
                  </h3>
                  <div className="space-y-1">
                    {visibleItems.map((item) => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Staff Portal Section */}
          <div className="space-y-6 pt-4 border-t border-slate-100">
            {staffCategories.map((category) => {
              if (tenantPlan === "Solo" && category.title === "マニュアル・規程") {
                return null;
              }
              return (
              <div key={category.title} className="space-y-1">
                <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {category.title}
                </h3>
                <div className="space-y-1">
                  {category.items.map((item) => (
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
            )})}
          </div>
        </nav>
      </div>
    </div>
  );
}
