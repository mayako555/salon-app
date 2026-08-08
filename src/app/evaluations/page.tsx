"use client";

import { useEffect, useState } from "react";
import { getStaffList, StaffProfile } from "@/app/staff/actions";
import { getAllEvaluations } from "./actions";
import { StaffEvaluation } from "./shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Loader2, Plus, ArrowRight, User } from "lucide-react";
import EvaluationFormDialog from "./EvaluationFormDialog";
import Link from "next/link";

export default function EvaluationsPage() {
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [evaluations, setEvaluations] = useState<StaffEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, evalsRes] = await Promise.all([
        getStaffList({ includeResigned: true }),
        getAllEvaluations()
      ]);
      setStaffList(staffRes.filter(s => s.is_active && s.employment_status !== "retired"));
      setEvaluations(evalsRes);
    } catch (error) {
      console.error("Error fetching evaluations data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openEvaluationDialog = (staff: StaffProfile) => {
    setSelectedStaff(staff);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="text-emerald-500" />
            スタッフ評価・育成
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">キャリアマップに基づく年4回の評価と育成状況の可視化</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffList.map(staff => {
          const staffEvals = evaluations.filter(e => e.staff_id === staff.id);
          const latestEval = staffEvals[0];

          return (
            <Card key={staff.id} className="overflow-hidden border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    {staff.name_kana && <p className="text-[10px] text-slate-400 font-bold">{staff.name_kana}</p>}
                    <h3 className="font-bold text-lg text-slate-800">{staff.name}</h3>
                  </div>
                  {latestEval ? (
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 font-bold mb-1">最新: {latestEval.target_year}年 Q{latestEval.target_quarter}</div>
                      <Badge variant="outline" className={`font-black text-sm px-3 py-1 ${
                        latestEval.rank === "S" ? "border-amber-200 bg-amber-50 text-amber-700" :
                        latestEval.rank === "A" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                        latestEval.rank === "B" ? "border-blue-200 bg-blue-50 text-blue-700" :
                        "border-slate-200 bg-slate-50 text-slate-700"
                      }`}>
                        総合 {latestEval.rank} ({latestEval.calculated_scores?.total || 0}点)
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="outline" className="border-slate-200 text-slate-400">未評価</Badge>
                  )}
                </div>

                <div className="space-y-2 mb-5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1">キャリアコース</p>
                  <div className="flex flex-wrap gap-1">
                    {staff.j_course ? <Badge variant="outline" className="text-[10px] border-indigo-200 bg-indigo-50 text-indigo-700">{staff.j_course}</Badge> : <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-100">J未設定</Badge>}
                    {staff.p_course ? <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-700">{staff.p_course}</Badge> : <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-100">P未設定</Badge>}
                    {staff.m_course && <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">{staff.m_course}</Badge>}
                    {staff.e_course && <Badge variant="outline" className="text-[10px] border-rose-200 bg-rose-50 text-rose-700">{staff.e_course}</Badge>}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold h-9 text-xs"
                    onClick={() => openEvaluationDialog(staff)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    評価入力
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold h-9 text-xs"
                    asChild
                  >
                    <Link href={`/evaluations/${staff.id}`}>
                      成長カルテ <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedStaff && (
        <EvaluationFormDialog 
          isOpen={isDialogOpen} 
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedStaff(null);
          }}
          onRefresh={fetchData}
          staff={selectedStaff}
          existingEvaluations={evaluations.filter(e => e.staff_id === selectedStaff.id)}
        />
      )}
    </div>
  );
}
