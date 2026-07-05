"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Reservation, updateReservation } from "@/app/reservations/actions";
import { getStaffList, StaffProfile } from "@/app/staff/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle, Calendar, Clock, MapPin, Tag, MessageSquare, CreditCard, Edit, Search, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  reservation: Reservation;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
};

export default function ReservationDetailDialog({ reservation, isOpen, onClose, onEdit, onRefresh }: Props) {
  const [staffs, setStaffs] = useState<StaffProfile[]>([]);
  const [updatingStaff, setUpdatingStaff] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getStaffList().then(list => setStaffs(list)).catch(console.error);
    }
  }, [isOpen]);

  const handleStaffChange = async (staffId: string) => {
    const selectedStaff = staffs.find(s => s.id === staffId);
    if (!selectedStaff || !reservation) return;
    
    setUpdatingStaff(true);
    try {
      await updateReservation(reservation.id, {
        staff_id: selectedStaff.id,
        staff_name: selectedStaff.name
      });
      toast.success("担当スタッフを変更しました");
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      toast.error("スタッフの変更に失敗しました");
    } finally {
      setUpdatingStaff(false);
    }
  };

  if (!reservation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-slate-50">
        <DialogHeader className="p-4 bg-white border-b border-slate-100 flex flex-row items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {reservation.portal} 経由
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                reservation.status === 'completed' ? 'bg-slate-800 text-white' : 
                reservation.status === 'arrived' ? 'bg-emerald-100 text-emerald-800' :
                reservation.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {reservation.status === 'completed' ? '会計済' : 
                 reservation.status === 'arrived' ? '来店中' : 
                 reservation.status === 'cancelled' ? 'キャンセル済' : '予約中'}
              </span>
            </div>
            <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              <UserCircle className="text-slate-400" />
              {reservation.customer_name?.trim() ? reservation.customer_name : reservation.customer_kana} <span className="text-sm font-medium text-slate-500">様</span>
            </DialogTitle>
            {reservation.customer_name?.trim() && reservation.customer_kana && (
              <p className="text-xs text-slate-400 mt-0.5 ml-8">{reservation.customer_kana}</p>
            )}
            {reservation.customer_id && (
              <div className="mt-2 ml-8">
                <Link href={`/staff-portal/customers/${reservation.customer_id}`}>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold text-blue-600 border-blue-200 hover:bg-blue-50">
                    <UserCircle className="w-3 h-3 mr-1" /> 顧客詳細・来店履歴を見る
                  </Button>
                </Link>
              </div>
            )}
          </div>
          {onEdit && reservation.status !== 'completed' && reservation.status !== 'cancelled' && (
            <Button variant="ghost" size="icon" onClick={onEdit} className="text-blue-500 hover:bg-blue-50">
              <Edit className="w-5 h-5" />
            </Button>
          )}
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Schedule Info */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-slate-500 text-xs font-bold mb-0.5">予約日時</p>
                <p className="font-bold text-slate-800">{reservation.date} {reservation.start_time} 〜 {reservation.end_time}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 border-t border-slate-50 pt-3">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-slate-500 text-xs font-bold mb-1">担当・店舗</p>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">{reservation.store_name}店 / </span>
                  {staffs.length > 0 ? (
                    <Select 
                      disabled={updatingStaff || reservation.status === 'completed' || reservation.status === 'cancelled'} 
                      value={reservation.staff_id || "unknown"} 
                      onValueChange={handleStaffChange}
                    >
                      <SelectTrigger className="h-7 w-[160px] text-xs font-bold bg-slate-50 border-slate-200">
                        <SelectValue placeholder="担当者を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffs.map(s => (
                          <SelectItem key={s.id} value={s.id} className="text-xs font-bold">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="font-bold text-slate-800 text-sm">{reservation.staff_name}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Info */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Tag className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-slate-500 text-xs font-bold mb-0.5">予約メニュー</p>
                <p className="font-bold text-slate-800 leading-tight">{reservation.menu_name}</p>
                {reservation.expected_price ? (
                  <p className="text-rose-600 font-bold mt-1 text-xs">予定金額: ¥{reservation.expected_price.toLocaleString()}</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Memo */}
          {reservation.memo && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-amber-800 text-xs font-bold mb-1">サロンボードからのメモ</p>
                  <p className="text-amber-900 text-xs whitespace-pre-wrap leading-relaxed">{reservation.memo}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {onEdit && reservation.status !== 'completed' && reservation.status !== 'cancelled' ? (
              <Button variant="outline" className="w-full font-bold bg-slate-50 border-slate-300 hover:bg-slate-100 h-10" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-1" /> 予約詳細/変更
              </Button>
            ) : (
              <Button variant="outline" className="w-full font-bold bg-slate-50 border-slate-300 text-slate-400 h-10" disabled>
                <Edit className="w-4 h-4 mr-1" /> 予約詳細/変更
              </Button>
            )}

            {reservation.status !== 'cancelled' && reservation.status !== 'completed' ? (
              <Button 
                variant="outline" 
                className="w-full font-bold text-rose-600 border-rose-200 hover:bg-rose-50 h-10"
                onClick={async () => {
                  if (confirm('この予約をキャンセルしますか？')) {
                    const { updateReservationStatus } = await import('@/app/reservations/actions');
                    await updateReservationStatus(reservation.id, 'cancelled');
                    onClose();
                    if (onRefresh) onRefresh();
                  }
                }}
              >
                キャンセル
              </Button>
            ) : (
              <Button variant="outline" className="w-full font-bold bg-slate-50 border-slate-300 text-slate-400 h-10" disabled>
                キャンセル
              </Button>
            )}

            {reservation.customer_id ? (
              <Link href={`/staff-portal/customers/${reservation.customer_id}`} className="w-full">
                <Button variant="outline" className="w-full font-bold bg-slate-50 border-slate-300 hover:bg-slate-100 h-10">
                  <UserCircle className="w-4 h-4 mr-1" /> お客様情報
                </Button>
              </Link>
            ) : (
              <Button variant="outline" className="w-full font-bold bg-slate-50 border-slate-300 text-slate-400 h-10" disabled>
                <UserCircle className="w-4 h-4 mr-1" /> お客様情報
              </Button>
            )}

            {reservation.customer_id ? (
              <Link href={`/staff-portal/customers/${reservation.customer_id}/karte/new?reservation_id=${reservation.id}`} className="w-full">
                <Button variant="outline" className="w-full font-bold bg-slate-50 border-slate-300 hover:bg-slate-100 h-10">
                  <FileText className="w-4 h-4 mr-1" /> カルテ
                </Button>
              </Link>
            ) : (
              <Button variant="outline" className="w-full font-bold bg-slate-50 border-slate-300 text-slate-400 h-10" disabled>
                <FileText className="w-4 h-4 mr-1" /> カルテ
              </Button>
            )}
          </div>

          {reservation.status !== 'cancelled' && (
            <div className="mb-3">
              <Link href={`/staff-portal/sales?res_id=${reservation.id}`} className="block w-full">
                <Button className={cn("w-full font-bold flex items-center gap-2 text-white h-11 shadow-sm", reservation.status === 'completed' ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700")}>
                  {reservation.status === 'completed' ? <Search className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                  {reservation.status === 'completed' ? "お会計を編集する" : "お会計（レジ）へ進む"}
                </Button>
              </Link>
            </div>
          )}

          <div className="flex gap-2 w-full justify-between mt-2 pt-2 border-t border-slate-100">
            <Button 
              variant="ghost" 
              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs px-2"
              onClick={async () => {
                if (confirm('この予約を完全に削除しますか？この操作は取り消せません。')) {
                  const { deleteReservation } = await import('@/app/reservations/actions');
                  await deleteReservation(reservation.id);
                  onClose();
                  if (onRefresh) onRefresh();
                }
              }}
            >
              完全削除
            </Button>
            <Button variant="ghost" className="w-24 shrink-0 font-bold bg-slate-100" onClick={onClose}>閉じる</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
