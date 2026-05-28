"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addReservation } from "@/app/reservations/actions";
import { getAllCustomers, Customer } from "@/lib/customers";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, FileText, CheckCircle, SearchX } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultStaff: string;
  defaultTime: string;
  defaultDate: string;
  storeName: string;
};

export default function ReservationFormDialog({ isOpen, onClose, onSuccess, defaultStaff, defaultTime, defaultDate, storeName }: Props) {
  const [loading, setLoading] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [duration, setDuration] = useState(60);
  const [isAllDay, setIsAllDay] = useState(false);
  const [recordType, setRecordType] = useState<"reservation" | "schedule">("reservation");

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hasLoadedCustomers, setHasLoadedCustomers] = useState(false);

  // Form state for autofill
  const [formDataState, setFormDataState] = useState({
    name: "",
    kana: "",
    phone: "",
    type: "新規"
  });

  const handleSearchMode = async () => {
    setIsNewCustomer(false);
    setIsSearching(true);
    if (!hasLoadedCustomers) {
      const data = await getAllCustomers();
      setCustomers(data);
      setHasLoadedCustomers(true);
    }
  };

  const handleSelectCustomer = (c: Customer) => {
    setFormDataState({
      name: c.name || "",
      kana: (c as any).kana || (c as any).last_name_kana ? `${(c as any).last_name_kana || ''} ${(c as any).first_name_kana || ''}`.trim() : "",
      phone: c.phone || "",
      type: "再来" // 既存顧客を選択したので自動で「再来」にする
    });
    setIsSearching(false);
  };

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return false;
    const q = searchQuery.toLowerCase();
    const cKana = (c as any).kana || (c as any).last_name_kana ? `${(c as any).last_name_kana || ''}${(c as any).first_name_kana || ''}` : "";
    return (c.name?.toLowerCase().includes(q) || false) ||
           (cKana.toLowerCase().includes(q) || false) ||
           (c.phone?.includes(q) || false);
  }).slice(0, 5); // トップ5件だけ表示

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const start_time = isAllDay ? "09:00" : (formData.get("start_time") as string || "09:00");
    const finalDuration = isAllDay ? 660 : duration;
    
    const [h, m] = start_time.split(":").map(Number);
    const endTotalMins = h * 60 + m + finalDuration;
    const endHour = Math.floor(endTotalMins / 60);
    const endMin = endTotalMins % 60;
    const end_time = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

    const data = {
      store_name: storeName,
      staff_id: "manual", 
      staff_name: formData.get("staff_name") as string,
      type: recordType,
      customer_name: recordType === "reservation" ? (formData.get("customer_name") as string) : "",
      customer_type: recordType === "reservation" ? (formData.get("customer_type") as any) : undefined,
      date: defaultDate,
      start_time: start_time,
      end_time: end_time,
      menu_name: recordType === "reservation" ? (formData.get("menu_name") as string) : ((formData.get("schedule_title") as string)?.trim() || "予定あり"),
      portal: recordType === "reservation" ? (formData.get("portal") as any) : undefined,
      status: "booked" as any,
      memo: formData.get("memo") as string,
      bed_number: recordType === "reservation" ? (formData.get("bed_number") as string) : undefined,
      expected_price: recordType === "reservation" ? Number(formData.get("expected_price")) || 0 : 0,
      is_caution: formData.get("is_caution") === "on",
    };

    const res = await addReservation(data);
    setLoading(false);
    
    if (res.success) {
      onSuccess();
    } else {
      alert("エラーが発生しました: " + res.error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] bg-slate-50 p-0 overflow-hidden border-slate-300">
        <DialogHeader className="bg-white border-b border-slate-200 px-4 py-3 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-500 w-5 h-5" /> 新規登録
          </DialogTitle>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setRecordType("reservation")}
              className={`px-4 py-1 text-xs font-bold rounded-md transition-colors ${recordType === 'reservation' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              予約
            </button>
            <button
              type="button"
              onClick={() => setRecordType("schedule")}
              className={`px-4 py-1 text-xs font-bold rounded-md transition-colors ${recordType === 'schedule' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              予定
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-bold text-slate-700">
            
            {/* 顧客情報ブロック (予約時のみ) */}
            {recordType === "reservation" && (
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
              <h3 className="text-sm font-black text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>顧客情報</span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className={`h-6 text-[10px] ${!isNewCustomer ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50'}`} onClick={handleSearchMode}>
                    <Search className="w-3 h-3 mr-1" /> 顧客検索
                  </Button>
                  <Button type="button" variant="outline" size="sm" className={`h-6 text-[10px] ${isNewCustomer ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50'}`} onClick={() => { setIsNewCustomer(true); setIsSearching(false); }}>
                    <UserPlus className="w-3 h-3 mr-1" /> 手動入力
                  </Button>
                </div>
              </h3>
              
              {isSearching ? (
                <div className="mb-4">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="名前（漢字・カナ）または電話番号で検索..." 
                      className="w-full h-9 pl-9 pr-3 border border-blue-300 rounded-lg bg-blue-50/50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                  
                  {searchQuery && filteredCustomers.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                      {filteredCustomers.map(c => (
                        <div 
                          key={c.id} 
                          className="px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-blue-50 cursor-pointer transition-colors flex justify-between items-center"
                          onClick={() => handleSelectCustomer(c)}
                        >
                          <div>
                            <div className="font-black text-slate-800">{c.name}</div>
                            <div className="text-[10px] text-slate-400">{(c as any).kana || `${(c as any).last_name_kana || ''} ${(c as any).first_name_kana || ''}`.trim()}</div>
                          </div>
                          <div className="text-xs text-slate-500 font-mono">{c.phone || "電話番号なし"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchQuery && filteredCustomers.length === 0 && (
                    <div className="text-center py-6 text-slate-400 flex flex-col items-center">
                      <SearchX className="w-6 h-6 mb-2 opacity-50" />
                      <p>見つかりませんでした</p>
                    </div>
                  )}
                  {!searchQuery && (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      検索キーワードを入力してください
                    </div>
                  )}
                </div>
              ) : null}

              <div className={`grid grid-cols-2 gap-4 ${isSearching ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <label className="block mb-1">お名前 <span className="text-rose-500">*</span></label>
                  <input required type="text" name="customer_name" placeholder="山田 花子" className="w-full h-8 px-2 border border-slate-300 rounded focus:bg-blue-50" value={formDataState.name} onChange={e => setFormDataState({...formDataState, name: e.target.value})} />
                </div>
                <div>
                  <label className="block mb-1">フリガナ</label>
                  <input type="text" name="customer_kana" placeholder="ヤマダ ハナコ" className="w-full h-8 px-2 border border-slate-300 rounded focus:bg-blue-50" value={formDataState.kana} onChange={e => setFormDataState({...formDataState, kana: e.target.value})} />
                </div>
                <div>
                  <label className="block mb-1">電話番号</label>
                  <input type="tel" name="customer_phone" placeholder="090-0000-0000" className="w-full h-8 px-2 border border-slate-300 rounded focus:bg-blue-50" value={formDataState.phone} onChange={e => setFormDataState({...formDataState, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block mb-1">顧客区分</label>
                  <select name="customer_type" className="w-full h-8 px-2 border border-slate-300 rounded bg-white" value={formDataState.type} onChange={e => setFormDataState({...formDataState, type: e.target.value})}>
                    <option value="新規">新規</option>
                    <option value="再来">再来</option>
                    <option value="モデル">モデル</option>
                    <option value="不明">不明</option>
                  </select>
                </div>
              </div>
            </div>
            )}

            {/* 予約内容ブロック */}
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
              <h3 className="text-sm font-black text-slate-800 mb-3 border-b border-slate-100 pb-2">予約内容</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block mb-1">予約日</label>
                  <input required type="date" name="date" defaultValue={defaultDate} className="w-full h-8 px-2 border border-slate-300 rounded bg-white" />
                </div>
                <div>
                  <label className="block mb-1">開始時間</label>
                  <input required={!isAllDay} type="time" name="start_time" defaultValue={isAllDay ? "09:00" : defaultTime} disabled={isAllDay} className="w-full h-8 px-2 border border-slate-300 rounded bg-white disabled:bg-slate-100 disabled:text-slate-400" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block">所要時間（分）</label>
                    <label className="flex items-center gap-1 cursor-pointer text-blue-600 hover:text-blue-700">
                      <input type="checkbox" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span>終日</span>
                    </label>
                  </div>
                  <input required={!isAllDay} type="number" step="5" value={isAllDay ? 660 : duration} onChange={e => setDuration(Number(e.target.value))} disabled={isAllDay} className="w-full h-8 px-2 border border-slate-300 rounded bg-white disabled:bg-slate-100 disabled:text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1">担当スタッフ</label>
                  <select name="staff_name" defaultValue={defaultStaff} className="w-full h-8 px-2 border border-slate-300 rounded bg-white">
                    <option value={defaultStaff}>{defaultStaff}</option>
                    <option value="大谷奈津子">大谷奈津子</option>
                    <option value="山田花子">山田花子</option>
                  </select>
                </div>
                {recordType === "reservation" && (
                <div>
                  <label className="block mb-1">使用ベッド</label>
                  <select name="bed_number" className="w-full h-8 px-2 border border-slate-300 rounded bg-white">
                    <option value="auto">自動割り当て</option>
                    <option value="1">ベッド 1</option>
                    <option value="2">ベッド 2</option>
                    <option value="3">ベッド 3</option>
                  </select>
                </div>
                )}
              </div>

              {recordType === "reservation" ? (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block mb-1">メニュー・クーポン</label>
                  <div className="flex gap-2">
                    <input required type="text" name="menu_name" placeholder="メニュー名を入力" className="flex-1 h-8 px-2 border border-slate-300 rounded focus:bg-blue-50" />
                    <Button type="button" variant="outline" className="h-8">選択...</Button>
                  </div>
                </div>
                <div>
                  <label className="block mb-1">予約経路</label>
                  <select name="portal" className="w-full h-8 px-2 border border-slate-300 rounded bg-white">
                    <option value="Direct">直接（電話/LINE/来店）</option>
                    <option value="HPB">HOT PEPPER Beauty</option>
                    <option value="Minimo">ミニモ</option>
                    <option value="Rakuten">楽天ビューティ</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">売上見込金額（円）</label>
                  <input type="number" name="expected_price" placeholder="5000" className="w-full h-8 px-2 border border-slate-300 rounded focus:bg-blue-50" />
                </div>
              </div>
              ) : (
                <div className="mb-4">
                  <label className="block mb-1">予定のタイトル</label>
                  <input required type="text" name="schedule_title" placeholder="休憩、ミーティングなど" className="w-full h-8 px-2 border border-slate-300 rounded focus:bg-blue-50" />
                </div>
              )}

              <div>
                <label className="block mb-1">予約メモ（スタッフ間共有）</label>
                <textarea name="memo" rows={2} className="w-full p-2 border border-slate-300 rounded focus:bg-blue-50"></textarea>
              </div>
            </div>

            {/* フラグ・連携ブロック */}
            {recordType === "reservation" && (
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm grid grid-cols-2 gap-4">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" name="is_nomination" className="w-4 h-4 rounded border-slate-300" />
                 指名予約
               </label>
               <label className="flex items-center gap-2 cursor-pointer text-rose-600">
                 <input type="checkbox" name="is_caution" className="w-4 h-4 rounded border-slate-300" />
                 要注意フラグ（アレルギー・クレーム等）
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" name="next_booking" className="w-4 h-4 rounded border-slate-300" defaultChecked />
                 次回予約を促す
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" name="line_reminder" className="w-4 h-4 rounded border-slate-300" defaultChecked />
                 前日LINEリマインドを送信
               </label>
            </div>
            )}
            
          </div>

          <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="w-32 font-bold">キャンセル</Button>
            <Button type="submit" disabled={loading} className="w-48 bg-blue-600 hover:bg-blue-700 font-bold text-white">
              {loading ? "登録中..." : "予約を確定する"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
