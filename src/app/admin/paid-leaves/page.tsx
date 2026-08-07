"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStaffList, StaffProfile } from "@/app/staff/actions";
import { getPaidLeaveTransactions, addPaidLeaveTransaction, PaidLeaveTransaction, getPaidLeaveShiftsForStaff } from "@/app/paid-leaves/actions";
import AuthGuard from "@/components/AuthGuard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CalendarDays, Gift, History, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { differenceInMonths, differenceInYears, parseISO, addMonths, addYears, format } from "date-fns";

export default function PaidLeavesPage() {
  const { isAdmin, isCompanyOwner } = useAuth();
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [transactions, setTransactions] = useState<Record<string, PaidLeaveTransaction[]>>({});
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  
  // History state
  const [activeHistory, setActiveHistory] = useState<PaidLeaveTransaction[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  // Grant Form states
  const [grantDays, setGrantDays] = useState<string>("10");
  const [grantReason, setGrantReason] = useState<string>("入社半年付与");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const staffs = await getStaffList();
    // Only active employees and part_timers typically get paid leave, but we'll show all who have > 0 balance or are active
    const activeStaffs = staffs.filter(s => s.employment_status !== "retired");
    setStaffList(activeStaffs);

    // Fetch transactions for all staff (or ideally, we'd fetch per staff when opened, but fetching all is fine for now)
    const allTxs = await getPaidLeaveTransactions();
    const txMap: Record<string, PaidLeaveTransaction[]> = {};
    allTxs.forEach(tx => {
      if (!txMap[tx.staff_id]) txMap[tx.staff_id] = [];
      txMap[tx.staff_id].push(tx);
    });
    setTransactions(txMap);

    setLoading(false);
  };

  const calculateSuggestedGrant = (staff: StaffProfile) => {
    if (!staff.hire_date) return null;
    
    const hireDate = parseISO(staff.hire_date);
    const now = new Date();
    const monthsDiff = differenceInMonths(now, hireDate);
    const yearsDiff = differenceInYears(now, hireDate);

    // Simplified labor law logic (Assuming full-time employee for suggestion)
    // 0.5 years -> 10 days
    // 1.5 years -> 11 days
    // 2.5 years -> 12 days
    // 3.5 years -> 14 days
    // 4.5 years -> 16 days
    // 5.5 years -> 18 days
    // 6.5+ years -> 20 days
    
    if (monthsDiff >= 6 && monthsDiff < 18) return { days: 10, title: "半年経過 (10日付与)" };
    if (monthsDiff >= 18 && monthsDiff < 30) return { days: 11, title: "1.5年経過 (11日付与)" };
    if (monthsDiff >= 30 && monthsDiff < 42) return { days: 12, title: "2.5年経過 (12日付与)" };
    if (monthsDiff >= 42 && monthsDiff < 54) return { days: 14, title: "3.5年経過 (14日付与)" };
    if (monthsDiff >= 54 && monthsDiff < 66) return { days: 16, title: "4.5年経過 (16日付与)" };
    if (monthsDiff >= 66 && monthsDiff < 78) return { days: 18, title: "5.5年経過 (18日付与)" };
    if (monthsDiff >= 78) return { days: 20, title: "6.5年以上経過 (20日付与)" };

    return null;
  };

  const getNextGrantSchedule = (staff: StaffProfile) => {
    if (!staff.hire_date) return null;
    const hireDate = parseISO(staff.hire_date);
    const now = new Date();
    
    const milestones = [6, 18, 30, 42, 54, 66];
    
    for (let i = 0; i < milestones.length; i++) {
      const grantDate = addMonths(hireDate, milestones[i]);
      if (grantDate > now) {
        return format(grantDate, "yyyy年MM月dd日");
      }
    }
    
    let baseDate = addMonths(hireDate, 6);
    while (baseDate <= now) {
      baseDate = addYears(baseDate, 1);
    }
    return format(baseDate, "yyyy年MM月dd日");
  };

  const getExpirationDate = (staffId: string) => {
    const staffTxs = transactions[staffId];
    if (!staffTxs || staffTxs.length === 0) return null;
    
    const grants = staffTxs.filter(tx => tx.type === 'grant');
    if (grants.length === 0) return null;
    
    grants.sort((a, b) => b.date.localeCompare(a.date));
    const latestGrantDate = parseISO(grants[0].date);
    
    const expiration = addYears(latestGrantDate, 2);
    return format(expiration, "yyyy年MM月dd日");
  };

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !grantDays || !grantReason) return;

    setIsSubmitting(true);
    try {
      const days = parseFloat(grantDays);
      const currentBalance = selectedStaff.paid_leave_balance || 0;
      
      const res = await addPaidLeaveTransaction(
        selectedStaff.id,
        selectedStaff.name,
        days >= 0 ? "grant" : "adjust",
        days,
        grantReason,
        currentBalance
      );

      if (res.success) {
        toast.success(`有給を ${days} 日付与しました`);
        setIsGrantOpen(false);
        // Optimistic UI update
        setStaffList(prev => prev.map(s => s.id === selectedStaff.id ? { ...s, paid_leave_balance: res.newBalance } : s));
        const newTx: PaidLeaveTransaction = {
          id: Math.random().toString(),
          staff_id: selectedStaff.id,
          staff_name: selectedStaff.name,
          type: days >= 0 ? "grant" : "adjust",
          days,
          reason: grantReason,
          date: new Date().toISOString().split("T")[0],
        };
        setTransactions(prev => ({
          ...prev,
          [selectedStaff.id]: [newTx, ...(prev[selectedStaff.id] || [])]
        }));
      } else {
        toast.error("付与に失敗しました: " + res.error);
      }
    } catch (error) {
      toast.error("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openGrantModal = (staff: StaffProfile) => {
    setSelectedStaff(staff);
    const suggestion = calculateSuggestedGrant(staff);
    if (suggestion) {
      setGrantDays(suggestion.days.toString());
      setGrantReason(suggestion.title);
    } else {
      setGrantDays("");
      setGrantReason("手動調整");
    }
    setIsGrantOpen(true);
  };

  const openHistoryModal = async (staff: StaffProfile) => {
    setSelectedStaff(staff);
    setIsHistoryOpen(true);
    setIsHistoryLoading(true);
    
    try {
      const shiftsAsTx = await getPaidLeaveShiftsForStaff(staff.id);
      const staffTxs = transactions[staff.id] || [];
      
      const merged = [...staffTxs, ...shiftsAsTx].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      setActiveHistory(merged);
    } catch (e) {
      console.error(e);
      setActiveHistory(transactions[staff.id] || []);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  return (
    <AuthGuard requireRole="admin" requireFeature="attendance">
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">有給管理</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">
                スタッフごとの有給残日数の管理と付与履歴を確認できます。
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-600">スタッフ名</TableHead>
                  <TableHead className="font-bold text-slate-600">雇用形態</TableHead>
                  <TableHead className="font-bold text-slate-600">入社日</TableHead>
                  <TableHead className="font-bold text-slate-600 text-center">現在の残日数</TableHead>
                  <TableHead className="font-bold text-slate-600">次回付与予定</TableHead>
                  <TableHead className="font-bold text-slate-600 text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-500 font-bold">読み込み中...</TableCell></TableRow>
                ) : (
                  staffList.map(staff => {
                    const suggestion = calculateSuggestedGrant(staff);
                    return (
                      <TableRow key={staff.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-bold text-slate-800">
                          {staff.name}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            staff.employment_type === 'employee' ? 'bg-blue-100 text-blue-700' :
                            staff.employment_type === 'part_time' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {staff.employment_type === 'employee' ? '正社員' : staff.employment_type === 'part_time' ? 'パート' : '業務委託'}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">
                          {staff.hire_date || <span className="text-slate-400">未設定</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <div>
                            <span className="text-lg font-black text-slate-800">{staff.paid_leave_balance || 0}</span>
                            <span className="text-sm font-bold text-slate-500 ml-1">日</span>
                          </div>
                          {(staff.paid_leave_balance || 0) > 0 && getExpirationDate(staff.id) && (
                            <div className="text-[10px] text-slate-400 font-bold mt-1">
                              有効期限: {getExpirationDate(staff.id)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {suggestion ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-fit">
                                <AlertCircle size={14} />
                                {suggestion.title} 対象
                              </div>
                            </div>
                          ) : getNextGrantSchedule(staff) ? (
                            <span className="text-xs font-bold text-slate-500">{getNextGrantSchedule(staff)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => openHistoryModal(staff)}
                              className="h-8 gap-1.5 font-bold text-slate-600"
                            >
                              <History size={14} />
                              履歴
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => openGrantModal(staff)}
                              className="h-8 gap-1.5 font-bold bg-blue-600 hover:bg-blue-500 text-white"
                            >
                              <Gift size={14} />
                              付与
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Grant Modal */}
        <Dialog open={isGrantOpen} onOpenChange={setIsGrantOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-black text-xl flex items-center gap-2">
                <Gift className="text-blue-500" />
                有給の付与・調整
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGrantSubmit} className="space-y-4 pt-4">
              <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center border border-slate-100">
                <span className="font-bold text-slate-600">対象スタッフ</span>
                <span className="font-black text-lg text-slate-800">{selectedStaff?.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">付与する日数</label>
                  <Input 
                    type="number" 
                    step="0.5" 
                    required
                    value={grantDays}
                    onChange={e => setGrantDays(e.target.value)}
                    className="font-bold text-lg h-12 bg-white"
                  />
                  <p className="text-[10px] text-slate-400">※ マイナス入力で減算も可能</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">現在の残日数</label>
                  <div className="h-12 flex items-center px-4 bg-slate-50 rounded-md font-bold text-lg text-slate-500">
                    {selectedStaff?.paid_leave_balance || 0} 日
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">付与の理由（メモ）</label>
                <Input 
                  type="text" 
                  required
                  value={grantReason}
                  onChange={e => setGrantReason(e.target.value)}
                  placeholder="例: 入社半年付与、手動調整など"
                  className="font-bold bg-white"
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsGrantOpen(false)}>キャンセル</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500 font-bold px-8">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : "確定する"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* History Modal */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-black text-xl flex items-center gap-2">
                <History className="text-slate-500" />
                {selectedStaff?.name} さんの有給履歴
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto mt-4 pr-2">
              <div className="space-y-3">
                {isHistoryLoading ? (
                  <div className="flex items-center justify-center py-12 text-slate-500">
                    <Loader2 className="animate-spin mr-2" /> 読み込み中...
                  </div>
                ) : selectedStaff && activeHistory?.length > 0 ? (
                  activeHistory.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === 'grant' ? 'bg-blue-100 text-blue-700' :
                            tx.type === 'consume' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {tx.type === 'grant' ? '付与' : tx.type === 'consume' ? '消化' : '調整'}
                          </span>
                          <span className="font-mono text-sm font-bold text-slate-600">{tx.date}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{tx.reason}</p>
                      </div>
                      <div className={`text-xl font-black ${
                        tx.days > 0 ? 'text-blue-600' : 'text-amber-600'
                      }`}>
                        {tx.days > 0 ? '+' : ''}{tx.days} <span className="text-sm font-bold">日</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    履歴はありません
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </AuthGuard>
  );
}
