"use client";

import { X, UserCheck, Calendar, Info } from "lucide-react";
import { SalesRecord } from "@/app/sales/actions";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

type NominationDetailDialogProps = {
  staffName: string;
  month: string;
  nominations: SalesRecord[];
  isOpen: boolean;
  onClose: () => void;
};

export default function NominationDetailDialog({ 
  staffName, 
  month, 
  nominations, 
  isOpen, 
  onClose 
}: NominationDetailDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-auto animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
           <div className="flex items-center gap-3">
             <div className="bg-blue-100 p-2 rounded-lg">
               <UserCheck size={20} className="text-blue-600" />
             </div>
             <div>
               <h3 className="font-black text-lg text-slate-800">{staffName} の指名詳細</h3>
               <p className="text-xs text-slate-500 font-bold flex items-center gap-1">
                 <Calendar size={12} /> {month}
               </p>
             </div>
           </div>
           <button 
             onClick={onClose}
             className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-xl hover:bg-slate-100 bg-white shadow-sm border border-slate-200"
           >
             <X size={20} />
           </button>
        </div>
        
        <div className="overflow-y-auto p-6">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="bg-blue-600 px-4 py-2 rounded-xl shadow-sm shadow-blue-100 flex items-center gap-3">
              <span className="text-sm font-black text-white">合計指名数: {nominations.length}件</span>
              <div className="w-px h-4 bg-white/20" />
              <span className="text-sm font-black text-white">指名料合計: ¥{nominations.reduce((acc, curr) => acc + (curr.nomination_fee || 0), 0).toLocaleString()}</span>
            </div>
            {/* Store Breakdown */}
            {Array.from(new Set(nominations.map(s => s.store_name))).map(store => {
              const count = nominations.filter(s => s.store_name === store).length;
              return (
                <div key={store} className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{store}</span>
                  <span className="text-sm font-black text-slate-800">{count}件</span>
                </div>
              );
            })}
          </div>

          {nominations.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">指名データがありません</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-widest border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">日付</th>
                    <th className="px-4 py-3">店舗</th>
                    <th className="px-4 py-3">顧客名</th>
                    <th className="px-4 py-3">メニュー</th>
                    <th className="px-4 py-3 text-right">指名料</th>
                    <th className="px-4 py-3">経路</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nominations.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-600">
                        {format(new Date(sale.date), "MM/dd", { locale: ja })}
                        <span className="text-[10px] ml-1 text-slate-400">{sale.time}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap inline-block">
                          {sale.store_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{sale.customer_name}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-700 font-bold leading-relaxed max-w-[300px]">
                          {(() => {
                            const keywords = ["指名"];
                            const menuParts = (sale.menu_course || "").split(",");
                            const optionParts = (sale.options || "").split(",");
                            const matched = [...menuParts, ...optionParts]
                              .map(p => p.trim())
                              .filter(p => keywords.some(k => p.toUpperCase().includes(k)));
                            
                            if (matched.length > 0) {
                              return matched.join(", ");
                            }
                            return <span className="text-slate-400 font-normal">（メニュー記載なし）</span>;
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-blue-600">
                        ¥{(sale.nomination_fee || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          {sale.reservation_route}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
            <Info className="text-amber-500 shrink-0" size={18} />
            <div className="text-xs text-amber-700 leading-relaxed font-medium">
              指名数は、売上データ（レジ会計およびホットペッパーCSVインポート）において「指名」として登録されている案件、または「指名料」が発生している案件を自動集計しています。
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 text-white font-black rounded-xl hover:bg-slate-700 transition-all text-sm shadow-lg shadow-slate-200"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
