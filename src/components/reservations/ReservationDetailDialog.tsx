"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Reservation } from "@/app/reservations/actions";
import { UserCircle, Calendar, Clock, MapPin, Tag, MessageSquare, CreditCard, Edit, Search, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  reservation: Reservation;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
};

export default function ReservationDetailDialog({ reservation, isOpen, onClose, onEdit, onRefresh }: Props) {
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
              <div>
                <p className="text-slate-500 text-xs font-bold mb-0.5">担当・店舗</p>
                <p className="font-bold text-slate-800">{reservation.store_name}店 / {reservation.staff_name}</p>
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

        <div className="p-4 bg-white border-t border-slate-200 flex flex-col gap-3">
          {reservation.status !== 'cancelled' && (
            <div className="flex gap-2 w-full">
              {reservation.customer_id && (
                <Link href={`/staff-portal/customers/${reservation.customer_id}/karte/new?reservation_id=${reservation.id}`} className="flex-1">
                  <Button className="w-full font-bold flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white h-11">
                    <FileText className="w-4 h-4" /> カルテ記入
                  </Button>
                </Link>
              )}
              <Link href={`/staff-portal/sales?res_id=${reservation.id}`} className="flex-1">
                <Button className={cn("w-full font-bold flex items-center gap-2 text-white h-11", reservation.status === 'completed' ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700")}>
                  {reservation.status === 'completed' ? <Search className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                  {reservation.status === 'completed' ? "お会計を編集" : "お会計へ進む"}
                </Button>
              </Link>
            </div>
          )}

          <div className="flex gap-2 w-full">
            <div className="flex-1 flex gap-2">
              {reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
                <Button 
                  variant="outline" 
                  className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50"
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
              )}
              <Button 
                variant="destructive" 
                className="flex-1"
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
            </div>
            <Button variant="outline" className="w-24 shrink-0" onClick={onClose}>閉じる</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
