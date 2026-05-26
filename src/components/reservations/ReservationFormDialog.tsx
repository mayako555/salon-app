"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addReservation } from "@/app/reservations/actions";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, FileText, CheckCircle } from "lucide-react";

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const start_time = formData.get("start_time") as string;
    
    const [h, m] = start_time.split(":").map(Number);
    const endTotalMins = h * 60 + m + duration;
    const endHour = Math.floor(endTotalMins / 60);
    const endMin = endTotalMins % 60;
    const end_time = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

    const data = {
      store_name: storeName,
      staff_id: "manual", 
      staff_name: formData.get("staff_name") as string,
      customer_name: formData.get("customer_name") as string,
      customer_type: formData.get("customer_type") as any,
      date: defaultDate,
      start_time: start_time,
      end_time: end_time,
      menu_name: formData.get("menu_name") as string,
      portal: formData.get("portal") as any,
      status: "booked" as any,
      memo: formData.get("memo") as string,
      expected_price: Number(formData.get("expected_price")) || 0,
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
        <DialogHeader className="bg-white border-b border-slate-200 px-4 py-3">
          <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-500 w-5 h-5" /> 予約情報の登録・編集
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
          <div className="overflow-y-auto p-5 space-y-5 text-xs font-bold text-slate-700">
            
            {/* 顧客情報ブロック */}
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
              <h3 className="text-sm font-black text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>顧客情報</span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] bg-slate-50" onClick={() => setIsNewCustomer(false)}>
                    <Search className="w-3 h-3 mr-1" /> 顧客検索
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200" onClick={() => setIsNewCustomer(true)}>
                    <UserPlus className="w-3 h-3 mr-1" /> 新規登録
                  </Button>
                </div>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">お名前 <span className="text-rose-500">*</span></label>
                  <input required type="text" name="customer_name" placeholder="山田 花子" className="w-full h-8 px-2 border border-slate-300 rounded focus:bg-blue-50" />
                </div>
                <div>
                  <label className="block mb-1">フリガナ</label>
                  <input type="text" name="customer_kana" placeholder="ヤマダ ハナコ" className="w-full h-8 px-2 border border-slate-300 rounded focus:bg-blue-50" />
                </div>
                <div>
                  <label className="block mb-1">電話番号</label>
                  <input type="tel" name="customer_phone" placeholder="090-0000-0000" className="w-full h-8 px-2 border border-slate-300 rounded focus:bg-blue-50" />
                </div>
                <div>
                  <label className="block mb-1">顧客区分</label>
                  <select name="customer_type" className="w-full h-8 px-2 border border-slate-300 rounded bg-white">
                    <option value="新規">新規</option>
                    <option value="再来">再来</option>
                    <option value="モデル">モデル</option>
                    <option value="不明">不明</option>
                  </select>
                </div>
              </div>
            </div>

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
                  <input required type="time" name="start_time" defaultValue={defaultTime} className="w-full h-8 px-2 border border-slate-300 rounded bg-white" />
                </div>
                <div>
                  <label className="block mb-1">所要時間（分）</label>
                  <input required type="number" step="15" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full h-8 px-2 border border-slate-300 rounded bg-white" />
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
                <div>
                  <label className="block mb-1">使用ベッド</label>
                  <select name="bed_number" className="w-full h-8 px-2 border border-slate-300 rounded bg-white">
                    <option value="auto">自動割り当て</option>
                    <option value="1">ベッド 1</option>
                    <option value="2">ベッド 2</option>
                    <option value="3">ベッド 3</option>
                  </select>
                </div>
              </div>

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

              <div>
                <label className="block mb-1">予約メモ（スタッフ間共有）</label>
                <textarea name="memo" rows={2} className="w-full p-2 border border-slate-300 rounded focus:bg-blue-50"></textarea>
              </div>
            </div>

            {/* フラグ・連携ブロック */}
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
