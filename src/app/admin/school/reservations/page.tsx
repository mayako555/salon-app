"use client";

import { useEffect, useState } from "react";
import { getReservations, addReservation, updateReservation, deleteReservation, addPayment, getPaymentsByReservation } from "../reservation-actions";
import { getCourses, getStudents } from "../actions";
import { getStaffList } from "@/app/staff/actions";
import { SchoolReservation, SchoolCourse, SchoolStudent, SchoolPayment } from "../types";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, CalendarDays, Wallet, User, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";

export default function ReservationsPage() {
  const { schoolEnabled } = useAuth();
  const [reservations, setReservations] = useState<SchoolReservation[]>([]);
  const [courses, setCourses] = useState<SchoolCourse[]>([]);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<any>({
    student_id: "",
    course_id: "",
    staff_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "10:00",
    end_time: "12:00",
    course_price: 0,
    discount_amount: 0,
    status: "reserved",
    memo: ""
  });

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<SchoolReservation | null>(null);
  const [payments, setPayments] = useState<SchoolPayment[]>([]);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: "cash",
    payment_type: "full",
    memo: ""
  });

  useEffect(() => {
    if (schoolEnabled) {
      loadData();
    }
  }, [schoolEnabled]);

  const loadData = async () => {
    setLoading(true);
    const [resData, courseData, studentData, staffData] = await Promise.all([
      getReservations(),
      getCourses(),
      getStudents(),
      getStaffList()
    ]);
    setReservations(resData);
    setCourses(courseData);
    setStudents(studentData);
    setStaffList(staffData);
    setLoading(false);
  };

  // Auto-calculate final amount
  const finalAmount = (Number(formData.course_price) || 0) - (Number(formData.discount_amount) || 0);

  const handleCourseChange = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setFormData({ ...formData, course_id: courseId, course_price: course.price });
    }
  };

  const handleSave = async () => {
    if (!formData.student_id || !formData.course_id || !formData.staff_id) {
      toast.error("受講生、講座、担当講師は必須です");
      return;
    }

    const student = students.find(s => s.id === formData.student_id);
    const course = courses.find(c => c.id === formData.course_id);
    const staff = staffList.find(s => s.id === formData.staff_id);

    const payload = {
      ...formData,
      student_name: student?.name || "",
      course_name: course?.name || "",
      staff_name: staff?.name || "",
      final_amount: finalAmount,
      tax_rate: 10,
      tax_amount: Math.round(finalAmount * 0.1),
      paid_amount: editingId ? formData.paid_amount : 0,
      remaining_amount: editingId ? formData.remaining_amount : finalAmount,
      payment_status: editingId ? formData.payment_status : "unpaid"
    };

    if (editingId) {
      const res = await updateReservation(editingId, payload);
      if (res.success) {
        toast.success("予約情報を更新しました");
        setIsDialogOpen(false);
        loadData();
      } else {
        toast.error("更新に失敗しました");
      }
    } else {
      const res = await addReservation(payload);
      if (res.success) {
        toast.success("予約を追加しました");
        setIsDialogOpen(false);
        loadData();
      } else {
        toast.error("追加に失敗しました");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？\n（入金履歴や売上データも削除される場合があります）")) return;
    const res = await deleteReservation(id);
    if (res.success) {
      toast.success("削除しました");
      loadData();
    } else {
      toast.error("削除に失敗しました");
    }
  };

  const openAddDialog = () => {
    setEditingId(null);
    setFormData({
      student_id: "",
      course_id: "",
      staff_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      start_time: "10:00",
      end_time: "12:00",
      course_price: 0,
      discount_amount: 0,
      status: "reserved",
      memo: ""
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (res: SchoolReservation) => {
    setEditingId(res.id);
    setFormData({
      student_id: res.student_id,
      course_id: res.course_id,
      staff_id: res.staff_id,
      date: res.date,
      start_time: res.start_time,
      end_time: res.end_time,
      course_price: res.course_price,
      discount_amount: res.discount_amount || 0,
      status: res.status,
      memo: res.memo || "",
      paid_amount: res.paid_amount,
      remaining_amount: res.remaining_amount,
      payment_status: res.payment_status
    });
    setIsDialogOpen(true);
  };

  const openPaymentDialog = async (res: SchoolReservation) => {
    setSelectedReservation(res);
    setPaymentData({
      amount: res.remaining_amount,
      payment_method: "cash",
      payment_type: res.paid_amount > 0 ? "balance" : "full",
      memo: ""
    });
    setIsPaymentDialogOpen(true);
    const pData = await getPaymentsByReservation(res.id);
    setPayments(pData);
  };

  const handleAddPayment = async () => {
    if (!selectedReservation) return;
    if (paymentData.amount <= 0) {
      toast.error("有効な金額を入力してください");
      return;
    }

    const payload = {
      reservation_id: selectedReservation.id,
      student_id: selectedReservation.student_id,
      payment_date: format(new Date(), "yyyy-MM-dd"),
      amount: Number(paymentData.amount),
      payment_method: paymentData.payment_method,
      payment_type: paymentData.payment_type as any,
      memo: paymentData.memo
    };

    const res = await addPayment(payload);
    if (res.success) {
      toast.success("入金を記録しました");
      setIsPaymentDialogOpen(false);
      loadData();
    } else {
      toast.error("記録に失敗しました");
    }
  };

  if (!schoolEnabled) {
    return <div className="p-8 text-center text-slate-500">スクール機能が有効ではありません</div>;
  }

  const statusMap: any = {
    reserved: { label: "予約中", color: "bg-blue-100 text-blue-800" },
    completed: { label: "受講済", color: "bg-emerald-100 text-emerald-800" },
    cancelled: { label: "キャンセル", color: "bg-rose-100 text-rose-800" },
    no_show: { label: "無断キャンセル", color: "bg-slate-100 text-slate-800" }
  };

  const paymentStatusMap: any = {
    unpaid: { label: "未入金", color: "bg-rose-100 text-rose-800" },
    partial: { label: "一部入金", color: "bg-amber-100 text-amber-800" },
    paid: { label: "入金済", color: "bg-emerald-100 text-emerald-800" },
    refunded: { label: "返金済", color: "bg-slate-100 text-slate-800" }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <CalendarDays className="text-indigo-600" /> スクール予約・受講管理
          </h1>
          <p className="text-slate-500 font-medium mt-1">受講予約とステータス、入金状態を管理します</p>
        </div>
        <Button onClick={openAddDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
          <Plus size={18} className="mr-2" />
          新規予約
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-bold">読み込み中...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-black">受講日・時間</th>
                  <th className="px-6 py-4 font-black">受講生</th>
                  <th className="px-6 py-4 font-black">講座</th>
                  <th className="px-6 py-4 font-black">担当</th>
                  <th className="px-6 py-4 font-black">金額・入金状況</th>
                  <th className="px-6 py-4 font-black">状態</th>
                  <th className="px-6 py-4 text-right font-black">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.map(res => (
                  <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {res.date} <span className="text-slate-500 font-normal ml-1">{res.start_time}-{res.end_time}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400" /> {res.student_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-slate-400" /> {res.course_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{res.staff_name}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 mb-1">¥{res.final_amount.toLocaleString()}</div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${paymentStatusMap[res.payment_status]?.color}`}>
                        {paymentStatusMap[res.payment_status]?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${statusMap[res.status]?.color}`}>
                        {statusMap[res.status]?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openPaymentDialog(res)} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                          <Wallet size={14} className="mr-1" /> 入金
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(res)} className="text-slate-500 hover:text-indigo-600">
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(res.id)} className="text-slate-400 hover:text-rose-600">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {reservations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">予約がありません</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reservation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editingId ? "予約の編集" : "新規予約"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500">受講日</label>
                <Input 
                  type="date"
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="font-bold h-11"
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="space-y-2 flex-1">
                  <label className="text-xs font-black text-slate-500">開始時間</label>
                  <Input 
                    type="time"
                    value={formData.start_time} 
                    onChange={e => setFormData({...formData, start_time: e.target.value})}
                    className="font-bold h-11"
                  />
                </div>
                <span className="pb-3 text-slate-400">-</span>
                <div className="space-y-2 flex-1">
                  <label className="text-xs font-black text-slate-500">終了時間</label>
                  <Input 
                    type="time"
                    value={formData.end_time} 
                    onChange={e => setFormData({...formData, end_time: e.target.value})}
                    className="font-bold h-11"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">受講生</label>
              <select
                className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={formData.student_id}
                onChange={e => setFormData({...formData, student_id: e.target.value})}
              >
                <option value="">選択してください</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">講座</label>
              <select
                className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={formData.course_id}
                onChange={e => handleCourseChange(e.target.value)}
              >
                <option value="">選択してください</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name} (¥{c.price.toLocaleString()})</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">担当講師</label>
              <select
                className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={formData.staff_id}
                onChange={e => setFormData({...formData, staff_id: e.target.value})}
              >
                <option value="">選択してください</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500">講座料金</label>
                <Input 
                  type="number"
                  value={formData.course_price} 
                  onChange={e => setFormData({...formData, course_price: Number(e.target.value)})}
                  className="font-bold h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500">値引</label>
                <Input 
                  type="number"
                  value={formData.discount_amount} 
                  onChange={e => setFormData({...formData, discount_amount: Number(e.target.value)})}
                  className="font-bold h-11 text-rose-600"
                />
              </div>
            </div>
            
            <div className="bg-slate-100 p-3 rounded-lg flex justify-between items-center">
              <span className="text-sm font-bold text-slate-600">最終請求金額</span>
              <span className="text-lg font-black text-slate-900">¥{finalAmount.toLocaleString()}</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">予約ステータス</label>
              <select
                className={`flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-950 ${
                  formData.status === 'completed' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : ''
                }`}
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="reserved">予約中</option>
                <option value="completed">受講済 (売上計上されます)</option>
                <option value="cancelled">キャンセル</option>
                <option value="no_show">無断キャンセル</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">メモ</label>
              <Textarea 
                value={formData.memo} 
                onChange={e => setFormData({...formData, memo: e.target.value})}
                placeholder="特記事項"
                className="resize-none"
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-11">キャンセル</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white h-11">
              {editingId ? "更新する" : "追加する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Wallet className="text-indigo-600" /> 入金管理
            </DialogTitle>
          </DialogHeader>
          
          {selectedReservation && (
            <div className="space-y-6 py-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">請求総額:</span>
                  <span className="font-bold text-slate-800">¥{selectedReservation.final_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">入金済:</span>
                  <span className="font-bold text-emerald-600">¥{selectedReservation.paid_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="text-slate-900 font-bold">残金:</span>
                  <span className="font-black text-rose-600 text-lg">¥{selectedReservation.remaining_amount.toLocaleString()}</span>
                </div>
              </div>

              {selectedReservation.remaining_amount > 0 && (
                <div className="space-y-4 bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                  <h4 className="font-bold text-sm text-indigo-900">新規入金記録</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500">入金種別</label>
                      <select
                        className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-950"
                        value={paymentData.payment_type}
                        onChange={e => setPaymentData({...paymentData, payment_type: e.target.value})}
                      >
                        <option value="deposit">申込金</option>
                        <option value="balance">残金</option>
                        <option value="full">一括</option>
                        <option value="refund">返金</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500">支払方法</label>
                      <select
                        className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-950"
                        value={paymentData.payment_method}
                        onChange={e => setPaymentData({...paymentData, payment_method: e.target.value})}
                      >
                        <option value="cash">現金</option>
                        <option value="credit">クレジットカード</option>
                        <option value="transfer">銀行振込</option>
                        <option value="other">その他</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500">金額</label>
                    <Input 
                      type="number"
                      value={paymentData.amount} 
                      onChange={e => setPaymentData({...paymentData, amount: Number(e.target.value)})}
                      className="font-bold h-11 text-lg"
                    />
                  </div>
                  <Button onClick={handleAddPayment} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 font-bold">
                    入金を記録する
                  </Button>
                </div>
              )}

              {payments.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-slate-700 mb-3">入金履歴</h4>
                  <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                    {payments.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                        <div>
                          <div className="text-xs text-slate-500">{p.payment_date} · {p.payment_type === 'refund' ? '返金' : '入金'}</div>
                          <div className="text-sm font-bold text-slate-800">{p.payment_method}</div>
                        </div>
                        <div className={`font-black ${p.payment_type === 'refund' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {p.payment_type === 'refund' ? '-' : '+'}¥{p.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
