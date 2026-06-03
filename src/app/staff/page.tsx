"use client";

import { useEffect, useState } from "react";
import { getStaffList, updateStaffOrder, deleteStaff, StaffProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Edit2, 
  FileText, 
  GripVertical, 
  Users, 
  ChevronRight, 
  Clock, 
  Check, 
  X,
  Mail,
  Briefcase
} from "lucide-react";
import StaffFormDialog from "./StaffFormDialog";
import DeleteStaffButton from "./DeleteStaffButton";
import Link from "next/link";
import { format } from "date-fns";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- Sortable Staff Item ---
function SortableStaffItem({ 
  staff, 
  onDelete 
}: { 
  staff: StaffProfile; 
  onDelete: (id: string, uid?: string, name?: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: staff.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as any,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={cn(
        "group border-none shadow-sm hover:shadow-xl transition-all rounded-2xl overflow-hidden bg-white mb-3",
        isDragging && "shadow-2xl ring-2 ring-blue-500 ring-offset-2 scale-[1.01] z-50",
        staff.employment_status === "retired" && "opacity-60 bg-slate-100 grayscale-[0.5]"
      )}>
        <CardContent className="p-4 flex items-center gap-4">
          {/* Drag Handle */}
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-slate-600 transition-colors">
            <GripVertical size={20} />
          </div>

          <div className="flex-1 min-w-0 flex items-center gap-4">
            <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center text-slate-400 shrink-0">
              <Users size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  staff.employment_type === 'employee' ? 'bg-blue-100 text-blue-700' :
                  staff.employment_type === 'part_time' ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                )}>
                  {staff.employment_type === 'employee' ? '正社員' : 
                   staff.employment_type === 'part_time' ? 'パート' : '業務委託'}
                </span>
                {staff.is_invoice_registered && (
                  <Badge variant="outline" className="text-[9px] font-bold border-emerald-200 text-emerald-600 h-5">インボイス登録</Badge>
                )}
                {staff.employment_status === "leave" && (
                  <Badge variant="outline" className="text-[9px] font-bold border-amber-200 bg-amber-50 text-amber-700 h-5">休職中</Badge>
                )}
                {staff.employment_status === "retired" && (
                  <Badge variant="outline" className="text-[9px] font-bold border-slate-300 bg-slate-200 text-slate-600 h-5">退職済</Badge>
                )}
              </div>
              {staff.name_kana && (
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5 leading-none">{staff.name_kana}</p>
              )}
              <h3 className="font-black text-slate-800 truncate text-lg leading-tight">{staff.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[10px] text-slate-400 flex items-center gap-1"><Mail size={10} /> {staff.email || "メール未設定"}</p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1"><Briefcase size={10} /> {staff.role}</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-end gap-1 px-4 border-l border-slate-50 min-w-[90px]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">基本時給</p>
            <p className="text-sm font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-2.5 py-0.5 tracking-wider tabular-nums">¥{(staff.hourly_wage ?? 0).toLocaleString()}</p>
          </div>

          <div className="hidden md:flex flex-col items-end gap-1 px-4 border-l border-slate-50 min-w-[100px]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">暗証番号 (PIN)</p>
            <p className="text-sm font-black text-blue-600 bg-blue-50 border border-blue-100 rounded px-2.5 py-0.5 tracking-wider tabular-nums">{staff.passcode || "1234"}</p>
          </div>

          <div className="hidden md:flex flex-col items-end gap-1 px-4 border-l border-slate-50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">希望休上限</p>
            <p className="text-lg font-black text-slate-900 tracking-tight">{staff.max_holiday_requests ?? 3}日</p>
          </div>

          <div className="hidden md:flex flex-col items-end gap-1 px-4 border-l border-slate-50 min-w-[70px]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">有給残</p>
            <p className="text-lg font-black text-amber-600 tracking-tight">{staff.paid_leave_balance ?? 0}日</p>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              href={`/contracts?staffId=${staff.id}`}
              className="rounded-xl h-10 px-4 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-1 transition-all"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">契約</span>
            </Link>
            <StaffFormDialog staff={staff} />
            <DeleteStaffButton id={staff.id} uid={staff.uid} name={staff.name} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helpers
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

import { Card, CardContent } from "@/components/ui/card";

export default function StaffPage() {
  const { loading: authLoading } = useAuth();
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      loadStaff();
    }
  }, [authLoading]);

  async function loadStaff() {
    setLoading(true);
    const data = await getStaffList();
    setStaffList(data);
    setLoading(false);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = staffList.findIndex(s => s.id === active.id);
    const newIndex = staffList.findIndex(s => s.id === over.id);

    const newStaff = arrayMove(staffList, oldIndex, newIndex);
    
    // Optimistic update
    setStaffList(newStaff);

    // Persist
    toast.promise(
      updateStaffOrder(newStaff.map(s => s.id)),
      {
        loading: '並び順を保存中...',
        success: '並び順を保存しました',
        error: '保存に失敗しました'
      }
    );
  };

  return (
    <AuthGuard requireRole="admin">
      <div className="p-6 max-w-5xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Users className="text-blue-600" /> スタッフ管理
            </h1>
            <p className="text-slate-500 font-medium">サロンに在籍するスタッフの情報を管理します。</p>
          </div>
          <div className="flex gap-3">
            <StaffFormDialog />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 font-bold">データを読み込み中...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={staffList.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {staffList.map((staff) => (
                  <SortableStaffItem 
                    key={staff.id} 
                    staff={staff} 
                    onDelete={() => loadStaff()} 
                  />
                ))}
              </SortableContext>
            </DndContext>

            {staffList.length === 0 && (
              <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-100">
                <p className="text-slate-400 font-bold">スタッフが登録されていません</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
