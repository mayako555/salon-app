"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteReservation, Reservation, updateReservationStatus } from "@/app/reservations/actions";

import { getSaleByReservationId, mapReservationToSalesRecord, SalesRecord } from "@/app/sales/actions";
import { updateReservation } from "@/app/reservations/actions";
import { getStaffList, StaffProfile } from "@/app/staff/actions";
import { getMasterItems } from "@/app/sales/master-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle, Calendar, Clock, MapPin, Tag, MessageSquare, CreditCard, Edit, Search, FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Props = {
  reservation: Reservation;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
  onNextBooking?: (res: Reservation) => void;
  onOptimisticUpdate?: (res: Reservation) => void;
};

export default function ReservationDetailDialog({ reservation, isOpen, onClose, onEdit, onRefresh, onNextBooking, onOptimisticUpdate }: Props) {
  const [staffs, setStaffs] = useState<StaffProfile[]>([]);
  const [updatingStaff, setUpdatingStaff] = useState(false);
  
  const [checkoutData, setCheckoutData] = useState<SalesRecord | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["未入力", "現金", "クレジットカード", "PayPay", "楽天Pay", "ミニモ事前決済", "スマート支払い", "複合決済", "その他"]);
  const [paymentMethod, setPaymentMethod] = useState("未入力");
  const [splitPayments, setSplitPayments] = useState<{ method: string, amount: number }[]>([
    { method: "現金", amount: 0 },
    { method: "クレジットカード", amount: 0 }
  ]);
  const [isFetchingCheckout, setIsFetchingCheckout] = useState(false);

  const [hasNextBooking, setHasNextBooking] = useState(false);
  const [nextBookingDate, setNextBookingDate] = useState("");
  const [nextBookingTime, setNextBookingTime] = useState("10:00");
  const [nextBookingStaff, setNextBookingStaff] = useState(reservation.staff_name || "");
  const [remind2Days, setRemind2Days] = useState(true);
  const [sendLine, setSendLine] = useState(false);

  const [showLinePreview, setShowLinePreview] = useState(false);
  const [previewLineText, setPreviewLineText] = useState("");
  const [pendingCheckout, setPendingCheckout] = useState(false);

  const executeCheckout = async () => {
    setIsFetchingCheckout(true);
    try {
      let salesData;
      if (reservation.status === "completed") {
        const existing = await getSaleByReservationId(reservation.id, reservation.source_sales_id);
        if (existing) {
          salesData = { ...existing, payment_method: paymentMethod };
        } else {
          salesData = { ...(await mapReservationToSalesRecord(reservation)), payment_method: paymentMethod };
        }
      } else {
        salesData = { ...(await mapReservationToSalesRecord(reservation)), payment_method: paymentMethod };
      }
      
      const { checkoutReservation, updatePaymentInfo } = await import("@/app/sales/actions");
      
      let accountingId = salesData.id;
      if (salesData.id && salesData.id !== "new") {
        await updatePaymentInfo(
          salesData.id, 
          paymentMethod, 
          salesData.payment_status || "paid", 
          salesData.note || "",
          paymentMethod === "複合決済" ? splitPayments : undefined
        );
      } else {
        const res = await checkoutReservation(reservation.id, {
          ...salesData,
          payment_method: paymentMethod,
          payment_status: "paid",
          split_payments: paymentMethod === "複合決済" ? splitPayments : undefined,
          status: "closed"
        });
        accountingId = res.id;
      }

      // Handle next booking creation
      if (hasNextBooking && nextBookingDate && nextBookingTime && reservation.customer_id) {
        const { addReservation } = await import("@/app/reservations/actions");
        let treatmentMinutes = 60;
        if (reservation.start_time && reservation.end_time) {
          const [h1, m1] = reservation.start_time.split(":").map(Number);
          const [h2, m2] = reservation.end_time.split(":").map(Number);
          treatmentMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        }
        const [nh, nm] = nextBookingTime.split(":").map(Number);
        const endMins = nh * 60 + nm + treatmentMinutes;
        const endTime = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

        await addReservation({
          store_name: reservation.store_name,
          staff_id: "manual",
          staff_name: nextBookingStaff,
          type: "reservation",
          customer_id: reservation.customer_id,
          customer_name: reservation.customer_name,
          customer_kana: reservation.customer_kana || "",
          customer_type: "再来",
          date: nextBookingDate,
          start_time: nextBookingTime,
          end_time: endTime,
          menu_name: reservation.menu_name || "予定あり",
          status: "booked",
          is_next_booking: true,
          is_line_reminder: remind2Days,
          memo: ""
        });

        // Send LINE if requested
        if (sendLine && showLinePreview && accountingId) {
          const { sendAndLogLineMessage } = await import("@/lib/line");
          // NOTE: we need customer's line_user_id. For now, fetch it via the server action or pass it if available.
          const { getCustomerById } = await import("@/lib/customers");
          const customer = await getCustomerById(reservation.customer_id);
          if (customer?.line_user_id) {
            await sendAndLogLineMessage({
              customerId: reservation.customer_id,
              accountingId: accountingId,
              lineUserId: customer.line_user_id,
              messageType: "next_reservation_confirm",
              messageBody: previewLineText,
              storeName: reservation.store_name
            });
          }
        }
      }
      
      toast.success("会計を完了しました");
      setShowLinePreview(false);
      setPendingCheckout(false);
      if (onOptimisticUpdate) {
        onOptimisticUpdate({ ...reservation, status: "completed", is_confirmed: true });
      }
      onClose();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error.message || "会計処理に失敗しました");
    } finally {
      setIsFetchingCheckout(false);
    }
  };

  const handleCheckoutClick = async () => {
    if (hasNextBooking && nextBookingDate && nextBookingTime && sendLine && reservation.customer_id) {
      // Need to preview LINE first
      const { getCustomerById } = await import("@/lib/customers");
      const customer = await getCustomerById(reservation.customer_id);
      if (customer?.line_user_id) {
        const { generateBookingConfirmationText } = await import("@/lib/line");
        const text = await generateBookingConfirmationText(nextBookingDate, nextBookingTime, reservation.store_name);
        setPreviewLineText(text);
        setShowLinePreview(true);
        setPendingCheckout(true);
        return;
      }
    }
    
    await executeCheckout();
  };

  useEffect(() => {
    if (isOpen) {
      getStaffList().then(list => setStaffs(list)).catch(console.error);
      getMasterItems().then(items => {
        const pmItems = items.filter(item => item.itemType === "paymentMethod" && item.isActive !== false);
        if (pmItems.length > 0) {
          pmItems.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          const dbMethods = pmItems.map(p => p.name);
          const finalMethods = ["未入力", ...dbMethods];
          if (!finalMethods.includes("複合決済")) finalMethods.push("複合決済");
          if (!finalMethods.includes("その他")) finalMethods.push("その他");
          setPaymentMethods(finalMethods);
        }
      }).catch(console.error);

      if (reservation.status === 'completed') {
        getSaleByReservationId(reservation.id, reservation.source_sales_id).then(existing => {
          if (existing) {
            setPaymentMethod(existing.payment_method || "未入力");
          }
        }).catch(console.error);
      } else {
        setPaymentMethod("未入力");
      }
    }
  }, [isOpen, reservation]);

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
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[450px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50">
        <DialogHeader className="p-4 bg-white border-b border-slate-100 flex flex-row items-start justify-between shrink-0">
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                      disabled={updatingStaff || reservation.status === 'cancelled'} 
                      value={
                        (reservation.staff_id && reservation.staff_id !== "unknown") 
                          ? reservation.staff_id 
                          : (staffs.find(s => s.name === reservation.staff_name)?.id || undefined)
                      } 
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
                    <span className="font-bold text-slate-800 text-sm">{reservation.staff_name || "未定"}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Info */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
            <div className="flex items-start gap-3">
              <Tag className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-slate-500 text-xs font-bold mb-0.5">予約メニュー</p>
                  <p className="font-bold text-slate-800 leading-tight">{reservation.menu_name}</p>
                  {reservation.expected_price ? (
                    <p className="text-rose-600 font-bold mt-1 text-xs">予定金額: ¥{reservation.expected_price.toLocaleString()}</p>
                  ) : null}
                </div>
                
                {reservation.status !== 'cancelled' && (
                  <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-slate-500 text-xs font-bold w-1/3">支払方法</p>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="h-8 w-2/3 text-sm font-bold bg-slate-50 border-slate-200">
                          <SelectValue placeholder="支払方法" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map(pm => (
                            <SelectItem 
                              key={pm} 
                              value={pm} 
                              className={pm === "複合決済" ? "text-xs font-black text-emerald-700 bg-emerald-50 mt-1 border border-emerald-100" : "text-xs font-bold"}
                            >
                              {pm === "複合決済" ? "✨ 複合決済 (現金＋カード等)" : pm}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {paymentMethod === "複合決済" && (
                      <div className="pl-4 mt-2 space-y-2 border-l-2 border-slate-200">
                        {splitPayments.map((sp, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <Select 
                              value={sp.method} 
                              onValueChange={(val) => {
                                const newSp = [...splitPayments];
                                newSp[idx].method = val;
                                setSplitPayments(newSp);
                              }}
                            >
                              <SelectTrigger className="h-8 w-1/2 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.filter(pm => pm !== "未入力" && pm !== "複合決済" && pm !== "その他").map(pm => (
                                  <SelectItem key={pm} value={pm} className="text-xs">{pm}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="relative w-1/2 flex items-center">
                              <span className="absolute left-2 text-xs text-slate-500">¥</span>
                              <input 
                                type="number" 
                                className="h-8 w-full pl-6 pr-8 text-right text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500" 
                                value={sp.amount || ""}
                                onChange={(e) => {
                                  const newSp = [...splitPayments];
                                  newSp[idx].amount = parseInt(e.target.value) || 0;
                                  setSplitPayments(newSp);
                                }}
                              />
                              {idx > 1 && (
                                <button 
                                  className="absolute right-1 p-1 text-slate-400 hover:text-rose-500"
                                  onClick={() => {
                                    setSplitPayments(splitPayments.filter((_, i) => i !== idx));
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between items-center mt-1">
                          <button 
                            className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:text-blue-700"
                            onClick={() => {
                              setSplitPayments([...splitPayments, { method: "現金", amount: 0 }]);
                            }}
                          >
                            <Plus className="w-3 h-3" /> 決済方法を追加
                          </button>
                          {reservation.expected_price && (
                            <div className={`text-xs font-bold ${
                              splitPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0) === reservation.expected_price 
                              ? 'text-emerald-600' : 'text-rose-500'
                            }`}>
                              合計: ¥{splitPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

          <div className="mb-3 hidden">
            {onNextBooking ? (
              <Button 
                variant="outline" 
                className="w-full font-bold text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 h-10" 
                onClick={() => onNextBooking(reservation)}
              >
                <Calendar className="w-4 h-4 mr-1" /> このお客様の次回予約を取る
              </Button>
            ) : (
              <Button variant="outline" className="w-full font-bold bg-slate-50 border-slate-300 text-slate-400 h-10" disabled>
                <Calendar className="w-4 h-4 mr-1" /> このお客様の次回予約を取る
              </Button>
            )}
          </div>

          {reservation.customer_id && reservation.status !== 'completed' && reservation.status !== 'cancelled' && (
            <div className="mb-4 space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-start gap-2 bg-purple-50 p-3 rounded-lg border border-purple-100">
                <Checkbox 
                  id="createNextBooking" 
                  checked={hasNextBooking}
                  onCheckedChange={(c) => setHasNextBooking(!!c)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label htmlFor="createNextBooking" className="font-bold text-purple-900 cursor-pointer">
                    会計と同時に次回予約を登録する
                  </Label>
                  <p className="text-xs text-purple-700">
                    チェックを入れると、会計完了後に自動でカレンダーに次回予約が追加されます。
                  </p>
                </div>
              </div>

              {hasNextBooking && (
                <div className="pl-6 space-y-3 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">次回予約日</Label>
                      <input 
                        type="date" 
                        value={nextBookingDate}
                        onChange={e => setNextBookingDate(e.target.value)}
                        className="w-full h-8 px-2 text-sm border border-slate-200 rounded"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">次回予約時間</Label>
                      <input 
                        type="time" 
                        value={nextBookingTime}
                        onChange={e => setNextBookingTime(e.target.value)}
                        className="w-full h-8 px-2 text-sm border border-slate-200 rounded"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="remind2Days" 
                        checked={remind2Days}
                        onCheckedChange={(c) => setRemind2Days(!!c)}
                      />
                      <Label htmlFor="remind2Days" className="text-sm cursor-pointer">
                        2日前リマインドの対象にする
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="sendLine" 
                        checked={sendLine}
                        onCheckedChange={(c) => setSendLine(!!c)}
                      />
                      <Label htmlFor="sendLine" className="text-sm cursor-pointer text-emerald-700 font-bold">
                        会計と同時に予約確定LINEを送信
                      </Label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {reservation.status !== 'cancelled' && (
            <div className="mb-3">
              <Button 
                onClick={handleCheckoutClick}
                disabled={isFetchingCheckout}
                className={cn("w-full font-bold flex items-center gap-2 text-white h-11 shadow-sm", reservation.status === 'completed' ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700")}
              >
                {reservation.status === 'completed' ? <Search className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                {isFetchingCheckout ? "処理中..." : (reservation.status === 'completed' ? "会計を確定する" : "会計を確定する")}
              </Button>
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

      {/* LINE Preview Modal */}
      {showLinePreview && (
        <Dialog open={showLinePreview} onOpenChange={(open) => !open && setShowLinePreview(false)}>
          <DialogContent className="sm:max-w-[400px] bg-slate-50 p-0 overflow-hidden">
            <DialogHeader className="bg-emerald-600 px-4 py-3">
              <DialogTitle className="text-white text-base font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> LINE送信プレビュー
              </DialogTitle>
            </DialogHeader>
            <div className="p-4 bg-[#8bb5f8]">
              <div className="bg-[#74e877] p-3 rounded-2xl rounded-tl-sm text-sm font-medium whitespace-pre-wrap leading-relaxed shadow-sm text-slate-900 inline-block max-w-[90%]">
                {previewLineText}
              </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLinePreview(false)} className="font-bold border-slate-300 text-slate-600">
                キャンセル
              </Button>
              <Button 
                onClick={executeCheckout} 
                disabled={isFetchingCheckout}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isFetchingCheckout ? "送信中..." : "送信して会計を確定"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
    </>
  );
}
