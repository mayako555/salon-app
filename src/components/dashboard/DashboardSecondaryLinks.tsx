"use client";

import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { 
  Calculator, 
  Calendar, 
  Clock, 
  FileText, 
  BookOpen 
} from "lucide-react";
import Link from "next/link";

export default function DashboardSecondaryLinks() {
  const { hasFeature } = useAuth();

  return (
    <section className="space-y-3 mt-8">
      <h3 className="text-sm font-bold text-slate-700">その他メニュー</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {hasFeature("payroll") && (
          <Link href="/staff-portal/payroll">
            <Card className="bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all cursor-pointer text-center py-4 flex flex-col items-center gap-2 group">
              <div className="p-3 bg-rose-50 text-rose-500 rounded-xl group-hover:scale-110 transition-transform">
                <Calculator size={20} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">給与明細確認</span>
            </Card>
          </Link>
        )}
        {hasFeature("shifts") && (
          <Link href="/staff-portal/holidays">
            <Card className="bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer text-center py-4 flex flex-col items-center gap-2 group">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar size={20} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">希望休申請</span>
            </Card>
          </Link>
        )}
        {hasFeature("payroll") && (
          <Link href="/staff-portal/transport">
            <Card className="bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer text-center py-4 flex flex-col items-center gap-2 group">
              <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                <Clock size={20} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">交通費申請</span>
            </Card>
          </Link>
        )}
        {hasFeature("expenses") && (
          <Link href="/staff-portal/expenses">
            <Card className="bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer text-center py-4 flex flex-col items-center gap-2 group">
              <div className="p-3 bg-amber-50 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
                <FileText size={20} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">経費精算</span>
            </Card>
          </Link>
        )}
        {hasFeature("training") && (
          <Link href="/manuals">
            <Card className="bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all cursor-pointer text-center py-4 flex flex-col items-center gap-2 group">
              <div className="p-3 bg-purple-50 text-purple-500 rounded-xl group-hover:scale-110 transition-transform">
                <BookOpen size={20} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">マニュアル</span>
            </Card>
          </Link>
        )}
      </div>
    </section>
  );
}
