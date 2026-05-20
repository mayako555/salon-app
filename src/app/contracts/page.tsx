"use client";

import { useState, useEffect } from "react";
import { getContractsList } from "./actions";
import { StaffContract } from "./constants";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, AlertCircle, Settings } from "lucide-react";
import { format } from "date-fns";
import ContractFormDialog from "./ContractFormDialog";
import ContractHistoryDialog from "./ContractHistoryDialog";
import ContractDetailDialog from "./ContractDetailDialog";
import { Eye } from "lucide-react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<StaffContract[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<StaffContract | undefined>();
  const [historyStaffId, setHistoryStaffId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setIsLoading(true);
    const data = await getContractsList();
    setContracts(data);
    setIsLoading(false);
  };

  const handleOpenAdd = () => {
    setSelectedContract(undefined);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (contract: StaffContract) => {
    setSelectedContract(contract);
    setIsDialogOpen(true);
  };

  const handleOpenHistory = (staffId: string) => {
    setHistoryStaffId(staffId);
    setIsHistoryDialogOpen(true);
  };

  const handleOpenDetail = (contract: StaffContract) => {
    setSelectedContract(contract);
    setIsDetailOpen(true);
  };

  // Group contracts by staff and prioritize the currently active contract
  const latestContractsMap = new Map<string, StaffContract>();
  
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  // 1. Separate active, future, and past contracts
  const activeContractsList = contracts.filter(c => c.valid_from <= todayStr && (!c.valid_to || c.valid_to >= todayStr));
  const otherContractsList = contracts.filter(c => !(c.valid_from <= todayStr && (!c.valid_to || c.valid_to >= todayStr)));
  
  // Sort function: newest valid_from first, then newest created_at first
  const sortFunc = (a: StaffContract, b: StaffContract) => {
    const timeA = new Date(a.valid_from).getTime();
    const timeB = new Date(b.valid_from).getTime();
    if (timeA !== timeB) return timeB - timeA;
    const createdA = a.created_at?.toMillis?.() || a.created_at || 0;
    const createdB = b.created_at?.toMillis?.() || b.created_at || 0;
    return createdB - createdA;
  };
  
  const sortedActive = [...activeContractsList].sort(sortFunc);
  const sortedOthers = [...otherContractsList].sort(sortFunc);
  
  // First, pre-fill with sorted active contracts
  sortedActive.forEach(contract => {
    if (!latestContractsMap.has(contract.staff_id)) {
      latestContractsMap.set(contract.staff_id, contract);
    }
  });
  
  // Then, fill remaining staff with the latest of other contracts (past/future)
  sortedOthers.forEach(contract => {
    if (!latestContractsMap.has(contract.staff_id)) {
      latestContractsMap.set(contract.staff_id, contract);
    }
  });
  
  const displayContracts = Array.from(latestContractsMap.values());

  return (
    <AuthGuard requireRole="admin">
      <div className="space-y-6">
        <div className="flex flex-row justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">契約・給与設定管理</h1>
            <p className="text-slate-500 mt-1 text-sm">スタッフ（正社員・パート・業務委託）ごとの報酬・給与条件を管理します。</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/salary-grades">
              <Button variant="outline" className="gap-2 border-slate-200 text-slate-600">
                <Settings size={16} />
                <span>等級設定を編集</span>
              </Button>
            </Link>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleOpenAdd}>
              <Plus size={16} />
              <span>新規契約登録</span>
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[150px]">対象スタッフ</TableHead>
                <TableHead>等級 / 役職</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>基本給・手当</TableHead>
                <TableHead>歩合条件</TableHead>
                <TableHead>適用開始日</TableHead>
                <TableHead>控除設定</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayContracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-bold text-slate-900 min-w-[140px]">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {contract.staff_name}
                      {contract.is_probation && (
                        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-black border border-amber-200 animate-pulse whitespace-nowrap">
                          試用期間
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800">{contract.grade || "なし"}</span>
                      <span className="text-[10px] text-slate-500">{contract.job_title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      contract.contract_type === 'outsourcing' ? 'bg-emerald-100 text-emerald-800' :
                      contract.contract_type === 'hourly' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {contract.contract_type === 'outsourcing' ? '業務委託' :
                       contract.contract_type === 'hourly' ? '時給' :
                       contract.contract_type === 'monthly' ? '月給' : '月給+歩合'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {contract.contract_type === "hourly" ? (
                      <div className="font-bold text-slate-800">
                        {contract.hourly_wage?.toLocaleString()}円 / 時
                      </div>
                    ) : (
                      <div>
                        {(() => {
                          const base = contract.monthly_base_salary || 0;
                          const fixedAllowances = (contract.business_allowance || 0) + (contract.attendance_allowance || 0) + (contract.service_year_allowance || 0);
                          const customAllowancesTotal = (contract.custom_allowances || []).reduce((sum, a) => sum + (a.amount || 0), 0);
                          const total = base + fixedAllowances + customAllowancesTotal;
                          
                          return (
                            <>
                              <div className="font-bold text-slate-900 text-base">
                                {total.toLocaleString()}円
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                基本: {base.toLocaleString()}円 / 手当: {(fixedAllowances + customAllowancesTotal).toLocaleString()}円
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600 text-xs text-[10px]">
                    {contract.tech_sales_ratio}% ({'>'}{(contract.tech_sales_threshold || 0).toLocaleString()}) / 店:{contract.product_sales_ratio}%
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {format(new Date(contract.valid_from), "yyyy/MM/dd")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {contract.deduction_consumption_tax && <span className="bg-amber-50 text-amber-700 border border-amber-100 px-1 rounded">税</span>}
                      {contract.deduction_cashless_ratio > 0 && <span className="bg-slate-50 text-slate-600 border border-slate-200 px-1 rounded">決済{contract.deduction_cashless_ratio}%</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg"
                        onClick={() => handleOpenDetail(contract)}
                        title="詳細を表示"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50"
                        onClick={() => handleOpenHistory(contract.staff_id)}
                      >
                        履歴
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-1 text-slate-500 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50"
                        onClick={() => handleOpenEdit(contract)}
                      >
                        <Edit2 size={14} />
                        <span>編集</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {displayContracts.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-6 w-6 text-slate-400" />
                      <p>契約情報が登録されていません</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-slate-400">
                    読み込み中...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <ContractFormDialog 
          key={selectedContract?.id || "new"}
          isOpen={isDialogOpen} 
          contract={selectedContract} 
          onClose={() => setIsDialogOpen(false)} 
        />

        {historyStaffId && (
          <ContractHistoryDialog
            isOpen={isHistoryDialogOpen}
            onClose={() => setIsHistoryDialogOpen(false)}
            staffName={contracts.find(c => c.staff_id === historyStaffId)?.staff_name || ""}
            contracts={contracts.filter(c => c.staff_id === historyStaffId)}
          />
        )}

        <ContractDetailDialog 
          contract={selectedContract || null}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
        />
      </div>
    </AuthGuard>
  );
}
