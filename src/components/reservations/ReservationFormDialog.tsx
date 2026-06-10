"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addReservation, updateReservation, Reservation } from "@/app/reservations/actions";
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
  initialData?: Reservation;
};

export default function ReservationFormDialog({ isOpen, onClose, onSuccess, defaultStaff, defaultTime, defaultDate, storeName, initialData }: Props) {
  const [loading, setLoading] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  
  // Calculate initial duration
  const initDuration = (() => {
    if (initialData?.start_time && initialData?.end_time) {
      const [sh, sm] = initialData.start_time.split(":").map(Number);
      const [eh, em] = initialData.end_time.split(":").map(Number);
      return (eh * 60 + em) - (sh * 60 + sm);
    }
    return 60;
  })();

  const [duration, setDuration] = useState(initDuration);
  const [isAllDay, setIsAllDay] = useState(initialData?.start_time === "09:00" && initialData?.end_time === "20:00");
  const [recordType, setRecordType] = useState<"reservation" | "schedule">(initialData?.type || "reservation");

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hasLoadedCustomers, setHasLoadedCustomers] = useState(false);

  // Form state for autofill
  const [formDataState, setFormDataState] = useState({
    last_name: "",
    first_name: "",
    last_name_kana: "",
    first_name_kana: "",
    phone: initialData?.customer_phone || "",
    type: initialData?.customer_type || "新規"
  });

  useEffect(() => {
    if (isOpen) {
      setRecordType(initialData?.type || "reservation");
      if (initialData?.start_time && initialData?.end_time) {
        const [sh, sm] = initialData.start_time.split(":").map(Number);
        const [eh, em] = initialData.end_time.split(":").map(Number);
        setDuration((eh * 60 + em) - (sh * 60 + sm));
        setIsAllDay(initialData.start_time === "09:00" && initialData.end_time === "20:00");
      } else {
        setDuration(60);
        setIsAllDay(false);
      }

      if (initialData?.customer_name || initialData?.customer_kana) {
        const cName = initialData.customer_name || "";
        const kName = initialData.customer_kana || "";
        const nameParts = cName.split(/[\s　]+/);
        const kanaParts = kName.split(/[\s　]+/);
        setFormDataState({
          last_name: nameParts[0] || "",
          first_name: nameParts[1] || "",
          last_name_kana: kanaParts[0] || "",
          first_name_kana: kanaParts[1] || "",
          phone: initialData.customer_phone || "",
          type: initialData.customer_type || "新規"
        });
      } else {
        setFormDataState({
          last_name: "",
          first_name: "",
          last_name_kana: "",
          first_name_kana: "",
          phone: "",
          type: "新規"
        });
      }
    }
  }, [isOpen, initialData]);

  const handleSearchMode = async () => {
    setIsNewCustomer(false);
    setIsSearching(true);
    
    const kanjiName = `${formDataState.last_name} ${formDataState.first_name}`.trim();
    const kanaName = `${formDataState.last_name_kana} ${formDataState.first_name_kana}`.trim();
    const searchTarget = kanjiName || kanaName || formDataState.phone;
    
    if (searchTarget) {
      setSearchQuery(searchTarget);
    }

    if (!hasLoadedCustomers) {
      const data = await getAllCustomers();
      setCustomers(data);
      setHasLoadedCustomers(true);
    }
  };

  const handleSelectCustomer = (c: Customer) => {
    setFormDataState({
      last_name: c.last_name || c.name?.split(" ")[0] || "",
      first_name: c.first_name || c.name?.split(" ")[1] || "",
      last_name_kana: (c as any).last_name_kana || "",
      first_name_kana: (c as any).first_name_kana || "",
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

    const lastName = formData.get("last_name") as string || "";
    const firstName = formData.get("first_name") as string || "";
    const customerName = `${lastName} ${firstName}`.trim();
    
    const lastNameKana = formData.get("last_name_kana") as string || "";
    const firstNameKana = formData.get("first_name_kana") as string || "";
    const customerKana = `${lastNameKana} ${firstNameKana}`.trim();

    const data = {
      store_name: storeName,
      staff_id: initialData?.staff_id || "manual", 
      staff_name: formData.get("staff_name") as string,
      type: recordType,
      customer_name: recordType === "reservation" ? customerName : "",
      customer_kana: recordType === "reservation" ? customerKana : "",
      customer_type: recordType === "reservation" ? (formData.get("customer_type") as any) : undefined,
      date: initialData?.date || defaultDate,
      start_time: start_time,
      end_time: end_time,
      menu_name: recordType === "reservation" ? (formData.get("menu_name") as string) : ((formData.get("schedule_title") as string)?.trim() || "予定あり"),
      portal: recordType === "reservation" ? (formData.get("portal") as any) : undefined,
      status: (initialData?.status || "booked") as any,
      memo: formData.get("memo") as string,
      bed_number: recordType === "reservation" ? (formData.get("bed_number") as string) : undefined,
      expected_price: recordType === "reservation" ? Number(formData.get("expected_price")) || 0 : 0,
      is_caution: formData.get("is_caution") === "on",
    };

    const res = initialData?.id 
      ? await updateReservation(initialData.id, data)
      : await addReservation(data);
      
    setLoading(false);
    
    if (res.success) {
      onSuccess();
    } else {
      alert("エラーが発生しました: " + res.error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[700px] bg-slate-50 p-0 overflow-hidden border-slate-300">
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
            <div className="bg-white border border-slate-300 shadow-sm mb-5">
              <div className="bg-slate-400 text-white text-xs font-bold px-3 py-1.5">
                お客様情報
              </div>
              <div className="flex flex-col sm:flex-row">
                {/* Left side: Form Fields */}
                <div className="flex-1 p-2 grid gap-2 text-xs">
                  {/* Kana */}
                  <div className="flex flex-col sm:flex-row sm:items-center bg-orange-50/50 p-2 sm:p-1 border-b border-slate-100 pb-3 sm:pb-2 gap-2 sm:gap-0">
                    <div className="w-full sm:w-28 font-bold text-slate-700 flex items-center justify-between pr-2">
                      氏名（カナ） <span className="w-2 h-2 rounded-full bg-rose-500 block"></span>
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input required type="text" name="last_name_kana" placeholder="セイ" className="w-full h-8 sm:h-7 px-2 border border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none" value={formDataState.last_name_kana} 
                      onChange={e => setFormDataState({...formDataState, last_name_kana: e.target.value})}
                      onBlur={e => {
                        const val = e.target.value.replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
                        setFormDataState({...formDataState, last_name_kana: val});
                      }} />
                      <input required type="text" name="first_name_kana" placeholder="メイ" className="w-full h-8 sm:h-7 px-2 border border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none" value={formDataState.first_name_kana} 
                      onChange={e => setFormDataState({...formDataState, first_name_kana: e.target.value})}
                      onBlur={e => {
                        const val = e.target.value.replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
                        setFormDataState({...formDataState, first_name_kana: val});
                      }} />
                    </div>
                  </div>
                  {/* Kanji */}
                  <div className="flex flex-col sm:flex-row sm:items-center p-2 sm:p-1 border-b border-slate-100 pb-3 sm:pb-2 gap-2 sm:gap-0">
                    <div className="w-full sm:w-28 font-bold text-slate-700 pr-2">
                      氏名（漢字）
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input type="text" name="last_name" placeholder="氏" className="w-full h-7 px-2 border border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none" value={formDataState.last_name} onChange={e => setFormDataState({...formDataState, last_name: e.target.value})} />
                      <input type="text" name="first_name" placeholder="名" className="w-full h-7 px-2 border border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none" value={formDataState.first_name} onChange={e => setFormDataState({...formDataState, first_name: e.target.value})} />
                    </div>
                  </div>
                  {/* Phone */}
                  <div className="flex flex-col sm:flex-row sm:items-center bg-orange-50/50 p-2 sm:p-1 border-b border-slate-100 pb-3 sm:pb-2 gap-2 sm:gap-0">
                    <div className="w-full sm:w-28 font-bold text-slate-700 pr-2">
                      電話番号
                    </div>
                    <div className="flex-1">
                      <input type="tel" name="customer_phone" placeholder="ハイフンなしで入力してください" className="w-full h-8 sm:h-7 px-2 border border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none sm:max-w-[200px]" value={formDataState.phone} onChange={e => setFormDataState({...formDataState, phone: e.target.value})} />
                    </div>
                  </div>
                  {/* Customer Type */}
                  <div className="flex flex-col sm:flex-row sm:items-center p-2 sm:p-1 gap-2 sm:gap-0">
                    <div className="w-full sm:w-28 font-bold text-slate-700 pr-2">
                      顧客区分
                    </div>
                    <div className="flex-1">
                      <select name="customer_type" className="w-full sm:w-auto h-8 sm:h-7 px-2 border border-slate-300 bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none min-w-[150px]" value={formDataState.type} onChange={e => setFormDataState({...formDataState, type: e.target.value as any})}>
                        <option value="新規">新規</option>
                        <option value="再来">再来</option>
                        <option value="モデル">モデル</option>
                        <option value="不明">不明</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right side: Search Button */}
                <div className="w-full sm:w-48 border-t sm:border-t-0 sm:border-l border-slate-200 bg-white flex flex-col items-center justify-center p-4 relative">
                  <div className="hidden sm:block absolute left-[-16px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[20px] border-y-transparent border-l-[16px] border-l-slate-200 opacity-20"></div>
                  <Button type="button" onClick={handleSearchMode} className="w-full bg-gradient-to-b from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow font-bold tracking-wider h-12 text-sm border border-blue-700/50">
                    <Search className="w-4 h-4 mr-2" />
                    検索する
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {isSearching && (
                <div className="border-t border-slate-300 bg-slate-50 p-3">
                  <div className="relative mb-3 max-w-md mx-auto">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="名前（漢字・カナ）または電話番号で検索..." 
                      className="w-full h-9 pl-9 pr-3 border border-blue-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm shadow-inner"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                  
                  {searchQuery && filteredCustomers.length > 0 && (
                    <div className="border border-slate-300 bg-white shadow-sm max-w-2xl mx-auto text-xs">
                      <div className="grid grid-cols-4 bg-slate-100 font-bold text-slate-600 p-2 border-b border-slate-300 text-center">
                        <div>お名前</div>
                        <div>電話番号</div>
                        <div>顧客区分</div>
                        <div>前回来店日</div>
                      </div>
                      {filteredCustomers.map(c => (
                        <div 
                          key={c.id} 
                          className="grid grid-cols-4 p-2 border-b border-slate-200 last:border-0 hover:bg-blue-50 cursor-pointer transition-colors items-center text-center text-slate-700"
                          onClick={() => handleSelectCustomer(c)}
                        >
                          <div className="flex flex-col text-left pl-2">
                            <span className="font-bold text-blue-700">{c.name}</span>
                            <span className="text-[9px] text-slate-500">{(c as any).kana || `${(c as any).last_name_kana || ''} ${(c as any).first_name_kana || ''}`.trim()}</span>
                          </div>
                          <div className="font-mono">{c.phone || "-"}</div>
                          <div>{(c as any).customer_type || "-"}</div>
                          <div>{(c as any).last_visit ? (c as any).last_visit.substring(0, 10) : "なし"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchQuery && filteredCustomers.length === 0 && (
                    <div className="text-center py-4 text-slate-500">
                      見つかりませんでした
                    </div>
                  )}
                  {!searchQuery && (
                    <div className="text-center py-3 text-slate-400 text-xs">
                      検索キーワードを入力してください
                    </div>
                  )}
                  <div className="text-center mt-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsSearching(false)} className="text-xs h-7">
                      閉じる
                    </Button>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* 予約内容ブロック */}
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
              <h3 className="text-sm font-black text-slate-800 mb-3 border-b border-slate-100 pb-2">予約内容</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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
                    {recordType === "schedule" && (
                    <label className="flex items-center gap-1 cursor-pointer text-blue-600 hover:text-blue-700">
                      <input type="checkbox" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span>終日</span>
                    </label>
                    )}
                  </div>
                  <input required={!isAllDay} type="number" step="5" value={isAllDay ? 660 : duration} onChange={e => setDuration(Number(e.target.value))} disabled={isAllDay} className="w-full h-8 px-2 border border-slate-300 rounded bg-white disabled:bg-slate-100 disabled:text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1">担当スタッフ</label>
                  <select name="staff_name" defaultValue={initialData?.staff_name || defaultStaff} className="w-full h-8 px-2 border border-slate-300 rounded bg-white">
                    <option value={defaultStaff}>{defaultStaff}</option>
                    <option value="大谷奈津子">大谷奈津子</option>
                    <option value="山田花子">山田花子</option>
                  </select>
                </div>
                {recordType === "reservation" && (
                <div>
                  <label className="block mb-1">使用ベッド</label>
                  <select name="bed_number" defaultValue={initialData?.bed_number || "auto"} className="w-full h-8 px-2 border border-slate-300 rounded bg-white">
                    <option value="auto">自動割り当て</option>
                    <option value="1">ベッド 1</option>
                    <option value="2">ベッド 2</option>
                    <option value="3">ベッド 3</option>
                  </select>
                </div>
                )}
              </div>

              {recordType === "reservation" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block mb-1">メニュー・クーポン</label>
                  <div className="flex gap-2">
                    <input type="text" name="menu_name" defaultValue={initialData?.menu_name || ""} placeholder="メニュー名を入力" className="flex-1 h-8 px-2 border border-slate-300 rounded focus:bg-blue-50" />
                    <Button type="button" variant="outline" className="h-8">選択...</Button>
                  </div>
                </div>
                <div>
                  <label className="block mb-1">予約経路</label>
                  <select name="portal" defaultValue={initialData?.portal || "Direct"} className="w-full h-8 px-2 border border-slate-300 rounded bg-white">
                    <option value="Direct">直接（電話/LINE/来店）</option>
                    <option value="HPB">HOT PEPPER Beauty</option>
                    <option value="Minimo">ミニモ</option>
                    <option value="Rakuten">楽天ビューティ</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">売上見込金額（円）</label>
                  <input type="number" name="expected_price" defaultValue={initialData?.expected_price || ""} placeholder="5000" className="w-full h-8 px-2 border border-slate-300 rounded focus:bg-blue-50" />
                </div>
              </div>
              ) : (
                <div className="mb-4">
                  <label className="block mb-1">予定のタイトル</label>
                  <input required type="text" name="schedule_title" defaultValue={initialData?.menu_name || ""} placeholder="休憩、ミーティングなど" className="w-full h-8 px-2 border border-slate-300 rounded focus:bg-blue-50" />
                </div>
              )}

              <div>
                <label className="block mb-1">予約メモ（スタッフ間共有）</label>
                <textarea name="memo" defaultValue={initialData?.memo || ""} rows={2} className="w-full p-2 border border-slate-300 rounded focus:bg-blue-50"></textarea>
              </div>
            </div>

            {/* フラグ・連携ブロック */}
            {recordType === "reservation" && (
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" name="is_nomination" className="w-4 h-4 rounded border-slate-300" />
                 指名予約
               </label>
               <label className="flex items-center gap-2 cursor-pointer text-rose-600">
                 <input type="checkbox" name="is_caution" defaultChecked={initialData?.is_caution || false} className="w-4 h-4 rounded border-slate-300" />
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

          <div className="bg-white border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-3 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-32 font-bold order-2 sm:order-1">キャンセル</Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-48 bg-blue-600 hover:bg-blue-700 font-bold text-white order-1 sm:order-2">
              {loading ? "保存中..." : (initialData?.id ? "更新する" : "予約を確定する")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
