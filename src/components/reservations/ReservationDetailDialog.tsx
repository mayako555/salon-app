"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Reservation } from "@/app/reservations/actions";
import { UserCircle, Calendar, Clock, MapPin, Tag, MessageSquare, CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  reservation: Reservation;
  isOpen: boolean;
  onClose: () => void;
};

export default function ReservationDetailDialog({ reservation, isOpen, onClose }: Props) {
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
              {reservation.customer_name} <span className="text-sm font-medium text-slate-500">様</span>
            </DialogTitle>
            {reservation.customer_kana && (
              <p className="text-xs text-slate-400 mt-0.5 ml-8">{reservation.customer_kana}</p>
            )}
          </div>
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

        <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
          {reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={async () => {
                if (confirm('この予約をキャンセルしますか？')) {
                  const { updateReservationStatus } = await import('@/app/reservations/actions');
                  await updateReservationStatus(reservation.id, 'cancelled');
                  onClose();
                  window.location.reload();
                }
              }}
            >
              キャンセル
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={onClose}>閉じる</Button>
          
          {reservation.status !== 'completed' && reservation.status !== 'cancelled' && (
            <Link href={`/staff-portal/sales?res_id=${reservation.id}`} className="flex-[2]">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> お会計へ進む
              </Button>
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
