"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Settings, Plus, Trash2 } from "lucide-react";
import { StaffContract } from "./constants";
import { upsertContract } from "./actions";
import { StaffProfile, getStaffList } from "../staff/actions";
import { getSalaryGrades, SalaryGrade } from "../admin/salary-grades/actions";
import Link from "next/link";

interface ContractFormDialogProps {
  contract?: StaffContract;
  onClose: () => void;
  isOpen: boolean;
}

export default function ContractFormDialog({ contract, onClose, isOpen }: ContractFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [dbGrades, setDbGrades] = useState<SalaryGrade[]>([]);
  const [contractType, setContractType] = useState<StaffContract["contract_type"]>(
    contract?.contract_type || "outsourcing"
  );
  const [saveMode, setSaveMode] = useState<"add_history" | "overwrite">("add_history");

  // Auto-fill states
  const [grade, setGrade] = useState(contract?.grade || "");
  const [jobTitle, setJobTitle] = useState(contract?.job_title || "");
  const [hourlyWage, setHourlyWage] = useState(contract?.hourly_wage || 0);
  const [baseSalary, setBaseSalary] = useState(contract?.monthly_base_salary || 0);
  const [roleAllowance, setRoleAllowance] = useState(contract?.business_allowance || 0);
  const [attendanceAllowance, setAttendanceAllowance] = useState(contract?.attendance_allowance || 0);
  const [serviceAllowance, setServiceAllowance] = useState(contract?.service_year_allowance || 0);
  const [techSalesThreshold, setTechSalesThreshold] = useState(contract?.tech_sales_threshold || 500000);
  const [techSalesRatio, setTechSalesRatio] = useState(contract?.tech_sales_ratio || (contract?.contract_type === 'outsourcing' ? 50 : 0));
  const [customAllowances, setCustomAllowances] = useState<{name: string, amount: number}[]>(contract?.custom_allowances || []);

  useEffect(() => {
    if (isOpen) {
      getStaffList().then(setStaffList);
      getSalaryGrades().then(setDbGrades);
    }
  }, [isOpen]);

  // Handle grade change
  const handleGradeChange = (newGrade: string) => {
    setGrade(newGrade);
    if (!newGrade) return;

    const data = dbGrades.find(g => g.code === newGrade);
    if (data) {
      setJobTitle(data.title);
      setHourlyWage(data.hourly);
      setBaseSalary(data.base);
      setRoleAllowance(data.role);
      setAttendanceAllowance(data.attendance);
      setServiceAllowance(data.service);
      
      // Default Tech Ratio settings for standard grades
      if (contractType === 'outsourcing') {
        setTechSalesRatio(50);
        setTechSalesThreshold(0);
      } else if (contractType === 'tier_monthly') {
        setTechSalesRatio(10);
        setTechSalesThreshold(500000);
      } else {
        setTechSalesRatio(0);
        setTechSalesThreshold(0);
      }
    }
  };

  const addCustomAllowance = () => {
    setCustomAllowances([...customAllowances, { name: "", amount: 0 }]);
  };

  const updateCustomAllowance = (index: number, field: 'name' | 'amount', value: string | number) => {
    const newList = [...customAllowances];
    newList[index] = { ...newList[index], [field]: value };
    setCustomAllowances(newList);
  };

  const removeCustomAllowance = (index: number) => {
    setCustomAllowances(customAllowances.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const data: Partial<StaffContract> = {
        id: contract?.id,
        staff_id: formData.get("staff_id") as string,
        contract_type: formData.get("contract_type") as any,
        grade: grade,
        job_title: jobTitle,
        hourly_wage: Number(hourlyWage),
        monthly_base_salary: contractType === "outsourcing" ? 0 : Number(baseSalary),
        business_allowance: contractType === "outsourcing" ? 0 : Number(roleAllowance),
        attendance_allowance: contractType === "outsourcing" ? 0 : Number(attendanceAllowance),
        service_year_allowance: contractType === "outsourcing" ? 0 : Number(serviceAllowance),
        tech_sales_quota: Number(formData.get("tech_sales_quota")),
        tech_sales_threshold: Number(techSalesThreshold),
        tech_sales_ratio: Number(techSalesRatio),
        product_sales_ratio: Number(formData.get("product_sales_ratio")),
        nomination_fee: Number(formData.get("nomination_fee")),
        transport_fee_limit: Number(formData.get("transport_fee_limit")),
        deduction_consumption_tax: formData.get("deduction_consumption_tax") === "on",
        deduction_cashless_ratio: Number(formData.get("deduction_cashless_ratio")),
        deduction_minimo_fee: formData.get("deduction_minimo_fee") === "on",
        deduction_rakuten_fee: formData.get("deduction_rakuten_fee") === "on",
        deduction_nailie_fee: formData.get("deduction_nailie_fee") === "on",
        deduction_nomination_fee: formData.get("deduction_nomination_fee") === "on",
        valid_from: formData.get("valid_from") as string,
        valid_to: (formData.get("valid_to") as string) || null,
        custom_allowances: customAllowances,
      };

      const res = await upsertContract(data, saveMode);
      if (res.success) {
        onClose();
        window.location.reload();
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-slate-800">
              {contract ? "契約情報の編集" : "新規契約の登録"}
            </h3>
            {grade && (
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                <Sparkles size={12} />
                {dbGrades.find(g => g.code === grade)?.title || "カスタム"}
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200 bg-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">対象スタッフ</label>
              <select name="staff_id" required defaultValue={contract?.staff_id} className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm">
                <option value="">選択してください</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">契約種別</label>
              <select 
                name="contract_type" 
                value={contractType}
                onChange={(e) => setContractType(e.target.value as any)}
                className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              >
                <option value="outsourcing">業務委託（完全歩合）</option>
                <option value="hourly">時給（パート・アルバイト）</option>
                <option value="monthly">月給（正社員・固定）</option>
                <option value="tier_monthly">月給＋歩合（固定＋出来高）</option>
              </select>
            </div>
          </div>

          {contractType !== "outsourcing" && (
            <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 space-y-4">
              <div className="flex justify-between items-center border-b border-emerald-100 pb-2 mb-2">
                <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                  給与グレード/適用ランク
                </h4>
                <Link 
                  href="/admin/salary-grades" 
                  className="text-[10px] text-emerald-600 font-medium hover:underline flex items-center gap-1"
                >
                  <Settings size={10} />
                  等級マスタを編集
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-emerald-700 mb-1 text-xs">等級グレード</label>
                  <select 
                    value={grade}
                    onChange={(e) => handleGradeChange(e.target.value)}
                    className="w-full h-9 px-2 border border-emerald-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm shadow-sm"
                  >
                    <option value="">カスタム（手動設定）</option>
                    {dbGrades.map(g => (
                      <option key={g.id} value={g.code}>{g.code}: {g.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-emerald-700 mb-1 text-xs">役職・ランク名</label>
                  <input 
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="マネージャー 等" 
                    className="w-full h-9 px-2 border border-emerald-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm shadow-sm" 
                  />
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
            <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 mb-4">基本報酬・給与設定</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {(contractType === "hourly") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">基本時給（円）</label>
                  <input type="number" value={hourlyWage} onChange={(e) => setHourlyWage(Number(e.target.value))} className="w-full h-10 px-3 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
              )}
              
              {(contractType === "monthly" || contractType === "tier_monthly") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ベース給（円）</label>
                  <input type="number" value={baseSalary} onChange={(e) => setBaseSalary(Number(e.target.value))} className="w-full h-10 px-3 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
              )}

              {(contractType === "monthly" || contractType === "tier_monthly") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">業務手当（役職等）</label>
                    <input type="number" value={roleAllowance} onChange={(e) => setRoleAllowance(Number(e.target.value))} className="w-full h-10 px-3 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">皆勤手当</label>
                    <input type="number" value={attendanceAllowance} onChange={(e) => setAttendanceAllowance(Number(e.target.value))} className="w-full h-10 px-3 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">勤務年数手当</label>
                    <input type="number" value={serviceAllowance} onChange={(e) => setServiceAllowance(Number(e.target.value))} className="w-full h-10 px-3 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                  </div>
                </>
              )}

              {(contractType === "outsourcing" || contractType === "tier_monthly") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">技術売上還元率（％）</label>
                    <input type="number" step="0.1" value={techSalesRatio} onChange={(e) => setTechSalesRatio(Number(e.target.value))} className="w-full h-10 px-3 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">還元発生しきい値（円）</label>
                    <input type="number" value={techSalesThreshold} onChange={(e) => setTechSalesThreshold(Number(e.target.value))} placeholder="500,000" className="w-full h-10 px-3 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">店販還元率（％）</label>
                <input name="product_sales_ratio" type="number" defaultValue={contract?.product_sales_ratio || 10} className="w-full h-10 px-3 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">指名料手当（1件あたり円）</label>
                <input name="nomination_fee" type="number" defaultValue={contract?.nomination_fee || 300} className="w-full h-10 px-3 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">共通控除・交通費設定</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">交通費上限（円）</label>
                <input name="transport_fee_limit" type="number" defaultValue={contract?.transport_fee_limit || 15000} className="w-full h-10 px-3 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              {contractType === "outsourcing" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">キャッシュレス決済手数料（％）</label>
                <input name="deduction_cashless_ratio" type="number" step="0.1" defaultValue={contract?.deduction_cashless_ratio || 3.6} className="w-full h-10 px-3 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              )}
            </div>

            {contractType === "outsourcing" && (
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" name="deduction_consumption_tax" defaultChecked={contract?.deduction_consumption_tax} className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                報酬から消費税を控除する
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" name="deduction_minimo_fee" defaultChecked={contract?.deduction_minimo_fee} className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                ミニモ手数料を控除する
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" name="deduction_rakuten_fee" defaultChecked={contract?.deduction_rakuten_fee} className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                楽天/ホットペッパー手数料を控除する
              </label>
            </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h4 className="font-bold text-sm text-slate-900">個別追加手当</h4>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addCustomAllowance}
                className="h-7 text-[10px] font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50 px-2 rounded-md"
              >
                <Plus size={12} className="mr-1" />
                手当を追加
              </Button>
            </div>
            
            {customAllowances.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic text-center py-2">個別手当はありません</p>
            ) : (
              <div className="space-y-2">
                {customAllowances.map((allowance, index) => (
                  <div key={index} className="flex gap-2 items-center animate-in slide-in-from-left-2 duration-200">
                    <input 
                      type="text" 
                      placeholder="手当名 (例: 住宅手当)" 
                      value={allowance.name}
                      onChange={(e) => updateCustomAllowance(index, 'name', e.target.value)}
                      className="flex-1 h-9 px-3 border border-slate-200 rounded-md text-xs outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500"
                    />
                    <div className="relative w-32">
                      <input 
                        type="number" 
                        placeholder="金額" 
                        value={allowance.amount}
                        onChange={(e) => updateCustomAllowance(index, 'amount', Number(e.target.value))}
                        className="w-full h-9 px-3 border border-slate-200 rounded-md text-xs outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 pr-6"
                      />
                      <span className="absolute right-2 top-2.5 text-[10px] text-slate-400 font-bold">¥</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeCustomAllowance(index)}
                      className="h-9 w-9 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">適用開始日</label>
              <input name="valid_from" type="date" required defaultValue={contract?.valid_from || new Date().toISOString().split('T')[0]} className="w-full h-10 px-3 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">適用終了日（任意）</label>
              <input name="valid_to" type="date" defaultValue={contract?.valid_to || ""} className="w-full h-10 px-3 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
          </div>

          {contract && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 space-y-3">
              <h4 className="font-bold text-sm text-amber-900">保存方法の選択</h4>
              <div className="flex flex-col gap-2">
                <label className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${saveMode === 'add_history' ? 'bg-white border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="save_mode" value="add_history" checked={saveMode === 'add_history'} onChange={() => setSaveMode('add_history')} className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">新しい履歴として追加する（推奨）</span>
                    <span className="block text-[10px] text-slate-500 mt-1">昇給や条件変更など。現在の契約の適用終了日を自動で前日に設定し、キャリアマップに履歴を残します。</span>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${saveMode === 'overwrite' ? 'bg-white border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="save_mode" value="overwrite" checked={saveMode === 'overwrite'} onChange={() => setSaveMode('overwrite')} className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">現在のデータを修正する</span>
                    <span className="block text-[10px] text-slate-500 mt-1">単なる入力ミスの修正など。履歴を残さずに元のデータを上書きします。</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white pb-2 border-t border-slate-100 pt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
              {isSubmitting ? "保存中..." : contract ? "契約を更新" : "契約を登録"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
