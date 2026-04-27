"use client";

import { useEffect, useState } from "react";
import { getAllCustomers, Customer } from "@/lib/customers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, AlertCircle, Phone, Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function StaffCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getAllCustomers();
      setCustomers(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = customers.filter(c => 
    c.name.includes(search) || 
    c.name_kana.includes(search) || 
    c.phone.includes(search)
  );

  return (
    <div className="pb-24">
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white pb-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-bold mb-1">お客様管理</h1>
            <p className="opacity-90 text-sm">顧客名簿とカルテの確認ができます。</p>
          </div>
          <Button size="icon" className="rounded-full bg-white/20 hover:bg-white/30 border-none text-white">
            <UserPlus size={20} />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-200" size={18} />
          <Input 
            placeholder="名前・フリガナ・電話番号で検索" 
            className="bg-white/20 border-none text-white placeholder:text-orange-100 pl-10 h-11 rounded-xl focus-visible:ring-white/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="-mt-4 px-4 space-y-3">
        {loading ? (
          <div className="p-10 text-center text-slate-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
            <p className="text-slate-400">お客様が見つかりませんでした</p>
          </div>
        ) : (
          filtered.map((customer) => (
            <Link key={customer.id} href={`/staff-portal/customers/${customer.id}`}>
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4 active:scale-95 transition-transform">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                  customer.has_allergy ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {customer.name[0]}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 truncate">{customer.name}</span>
                    {customer.has_allergy && (
                      <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <AlertCircle size={10} /> アレルギー
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mb-1">{customer.name_kana}</div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Phone size={12} className="text-slate-300" /> {customer.phone}
                    </div>
                    {customer.latest_counseling && (
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-300" /> 
                        {format(customer.latest_counseling.date?.toDate?.() || new Date(), "M/d", { locale: ja })}
                      </div>
                    )}
                  </div>
                </div>

                <ChevronRight size={18} className="text-slate-300" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
