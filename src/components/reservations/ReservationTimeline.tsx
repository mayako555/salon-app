"use client";

import { useMemo, useState } from "react";
import { Reservation } from "@/app/reservations/actions";
import { StaffProfile } from "@/app/staff/actions";
import { ShiftRecord } from "@/app/shifts/actions";
import { ReservationSettings } from "@/app/admin/settings/actions";
import ReservationDetailDialog from "./ReservationDetailDialog";
import ReservationFormDialog from "./ReservationFormDialog";
import DraggableReservation from "./DraggableReservation";

type Props = {
  reservations: Reservation[];
  staffList: StaffProfile[];
  shifts?: ShiftRecord[];
  date: string; // YYYY-MM-DD
  storeName?: string; // Add store name prop for new reservations
  settings?: ReservationSettings;
  onRefresh?: () => void; // Add refresh callback
  onOptimisticUpdate?: (updated: Reservation) => void;
};

export const HOUR_WIDTH = 120; // 120px per hour
export const ROW_HEIGHT = 48; // h-12 = 48px

export default function ReservationTimeline({ reservations, staffList, shifts = [], date, storeName = "メイン店舗", settings, onRefresh, onOptimisticUpdate }: Props) {
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [editRes, setEditRes] = useState<Reservation | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [clickData, setClickData] = useState({ staff: "", time: "" });
  
  const storeSettings = settings?.stores[storeName] || settings?.stores["共通"] || { startHour: 8, endHour: 22, slotDuration: 30 };
  const START_HOUR = Number(storeSettings.startHour) || 8;
  const END_HOUR = Number(storeSettings.endHour) || 22;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const TOTAL_WIDTH = TOTAL_HOURS * HOUR_WIDTH;
  const slotDuration = storeSettings.slotDuration;
  const numSlotsPerHour = 60 / slotDuration;
  const slotWidth = HOUR_WIDTH / numSlotsPerHour;

  // Group reservations by staff
  const { grouped, sortedStaff } = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    const staffWithRes = new Set(reservations.map(r => r.staff_name));
    
    // Calculate display status for all staff
    const displayStaff = staffList.map(s => {
      // 1. 退職者は、予約がある場合のみ
      if (s.employment_status === "retired" && !staffWithRes.has(s.name)) return null;
      
      const shift = shifts?.find(sh => sh.staff_id === s.id);
      
      // 2. 「全店舗」なら全員がWorkingHere扱い
      // storeNameは「六甲店」のように「店」がつく場合があるが、shiftのstoreは「六甲」のような形式のため正規化する
      const normalizedStoreName = storeName.replace(/店$/, "");
      const isWorkingHere = storeName === "全店舗" || 
        (shift?.type === "work" && shift.segments?.some(seg => {
           const normalizedSegStore = seg.store.replace(/店$/, "");
           return normalizedSegStore === normalizedStoreName;
        }));
      const hasReservation = staffWithRes.has(s.name);
      
      const isOffOrOtherStore = !isWorkingHere && !hasReservation;
      
      return {
        ...s,
        isOffOrOtherStore,
        shift
      };
    }).filter(Boolean) as (StaffProfile & { isOffOrOtherStore: boolean; shift?: ShiftRecord })[];

    // Sort: Working here / Has Reservation First, then others
    displayStaff.sort((a, b) => {
      if (a.isOffOrOtherStore === b.isOffOrOtherStore) {
        return (a.sort_order ?? 999) - (b.sort_order ?? 999);
      }
      return a.isOffOrOtherStore ? 1 : -1;
    });

    displayStaff.forEach(s => map[s.name] = []);
    reservations.forEach(r => {
      if (map[r.staff_name]) {
        map[r.staff_name].push(r);
      } else {
        if (!map["不明"]) map["不明"] = [];
        map["不明"].push(r);
      }
    });

    return { grouped: map, sortedStaff: displayStaff };
  }, [reservations, staffList, shifts, storeName]);

  const activeStaffList = [
    ...sortedStaff.map(s => ({ id: s.id, name: s.name })),
    ...(grouped["不明"] ? [{ id: "manual", name: "不明" }] : [])
  ];

  const handleRowClick = (e: React.MouseEvent, staff: string) => {
    if ((e.target as HTMLElement).closest('button')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hourFraction = x / HOUR_WIDTH;
    const hour = START_HOUR + Math.floor(hourFraction);
    const minute = Math.floor((hourFraction % 1) * 60);
    
    const roundedMin = Math.round(minute / slotDuration) * slotDuration;
    const finalMin = roundedMin === 60 ? 0 : roundedMin;
    const finalHour = roundedMin === 60 ? hour + 1 : hour;
    
    setClickData({
      staff,
      time: `${finalHour.toString().padStart(2, '0')}:${finalMin.toString().padStart(2, '0')}`
    });
    setFormOpen(true);
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex h-full">
      <div className="w-36 flex-shrink-0 border-r border-slate-300 bg-white z-20 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
        <div className="h-8 border-b border-slate-300 flex items-center justify-center bg-slate-100 text-[10px] font-bold text-slate-500 sticky top-0 z-40">
          スタッフ / ベッド
        </div>
        {activeStaffList.map((staffObjItem, i) => {
          const staffName = staffObjItem.name;
          const staffObj = sortedStaff.find(s => s.name === staffName);
          const shift = staffObj?.shift;
          const isOffOrOther = staffObj?.isOffOrOtherStore;
          
          let shiftDisplay = "未設定";
          let shiftColor = "text-slate-400";
          let dotColor = "bg-slate-300";
          
          if (shift) {
            if (shift.type === "work") {
              const seg = shift.segments?.find(s => s.store === storeName) || shift.segments?.[0];
              if (seg) {
                shiftDisplay = `${seg.store !== storeName ? seg.store + ' ' : ''}出勤 (${seg.start_time}-${seg.end_time})`;
                shiftColor = isOffOrOther ? "text-slate-400" : "text-slate-600";
                dotColor = isOffOrOther ? "bg-slate-300" : "bg-emerald-500";
              }
            } else if (shift.type === "holiday" || shift.type === "requested_holiday") {
              shiftDisplay = "公休";
              shiftColor = isOffOrOther ? "text-rose-300" : "text-rose-500 font-bold";
              dotColor = isOffOrOther ? "bg-rose-300" : "bg-rose-500";
            } else if (shift.type === "paid_leave" || shift.type === "requested_paid_leave") {
              shiftDisplay = "有休";
              shiftColor = isOffOrOther ? "text-amber-300" : "text-amber-500 font-bold";
              dotColor = isOffOrOther ? "bg-amber-300" : "bg-amber-500";
            }
          } else if (staffName === "不明") {
            shiftDisplay = "-";
            dotColor = "bg-transparent";
          }

          return (
            <div key={staffName} className={`h-12 border-b border-slate-200 flex flex-col justify-center px-2 bg-white relative transition-opacity ${isOffOrOther ? 'opacity-50 grayscale' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 truncate">{staffName}</span>
                <div className="flex gap-1">
                  <span className="w-4 h-4 bg-emerald-100 text-emerald-700 flex items-center justify-center rounded text-[8px] font-black" title="指名可">指</span>
                  <span className="w-4 h-4 bg-slate-100 text-slate-500 flex items-center justify-center rounded text-[9px] font-black border border-slate-200" title="ベッド番号">{i + 1}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                 <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
                 <span className={`text-[9px] ${shiftColor} truncate`}>{shiftDisplay}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto relative no-scrollbar bg-slate-50">
        <div style={{ width: TOTAL_WIDTH }} className="relative min-h-full">
          
          <div className="h-8 border-b border-slate-300 flex bg-slate-100 sticky top-0 z-30">
            {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
              <div 
                key={i} 
                style={{ width: HOUR_WIDTH }} 
                className="flex-shrink-0 border-r border-slate-300 flex items-center pl-1 text-[10px] font-bold text-slate-500 bg-slate-100"
              >
                {START_HOUR + i}:00
              </div>
            ))}
          </div>

          <div className="absolute top-8 bottom-0 left-0 right-0 pointer-events-none flex">
            {Array.from({ length: TOTAL_HOURS * numSlotsPerHour }).map((_, i) => (
              <div 
                key={i} 
                style={{ width: slotWidth }} 
                className={`flex-shrink-0 h-full border-r ${i % numSlotsPerHour === (numSlotsPerHour - 1) ? 'border-slate-300' : 'border-slate-200 border-dashed'}`}
              />
            ))}
          </div>

          <div className="relative z-0">
            {activeStaffList.map((staffObjItem, rowIndex) => {
              const staffName = staffObjItem.name;
              const staffObj = sortedStaff.find(s => s.name === staffName);
              const isOffOrOther = staffObj?.isOffOrOtherStore;

              return (
                <div 
                  key={staffName} 
                  className={`h-12 border-b border-slate-200 relative group cursor-pointer ${
                    isOffOrOther ? 'bg-slate-200/30' : ''
                  }`}
                  onClick={(e) => handleRowClick(e, staffName)}
                >
                  {/* Hover effect cells */}
                  <div className="absolute inset-0 flex pointer-events-none">
                     {Array.from({ length: TOTAL_HOURS * numSlotsPerHour }).map((_, i) => (
                      <div 
                        key={i} 
                        style={{ width: slotWidth }} 
                        className="h-full pointer-events-auto hover:bg-blue-100/50 transition-colors"
                      />
                    ))}
                  </div>

                  {isOffOrOther && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 overflow-hidden">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="text-xl font-black text-slate-500 rotate-[-15deg] whitespace-nowrap mx-8 select-none">
                          {staffObj?.shift?.type?.includes('holiday') || staffObj?.shift?.type?.includes('leave') ? 'OFF' : `${staffObj?.shift?.segments?.[0]?.store || '他'}店勤務`}
                        </div>
                      ))}
                    </div>
                  )}

                  {grouped[staffName]?.map(res => (
                    <DraggableReservation
                      key={res.id}
                      res={res}
                      staffList={activeStaffList}
                      currentStaffIndex={rowIndex}
                      onClick={() => setSelectedRes(res)}
                      onUpdateComplete={() => { if(onRefresh) onRefresh(); }}
                      startHour={START_HOUR}
                      totalHours={TOTAL_HOURS}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedRes && (
        <ReservationDetailDialog 
          reservation={selectedRes} 
          isOpen={!!selectedRes} 
          onClose={() => setSelectedRes(null)} 
          onRefresh={onRefresh}
          onOptimisticUpdate={onOptimisticUpdate}
          onEdit={() => {
            setClickData({ staff: selectedRes.staff_name, time: selectedRes.start_time });
            setFormOpen(true);
            setSelectedRes(null);
            setEditRes(selectedRes);
          }}
          onNextBooking={(res) => {
            setClickData({ staff: res.staff_name, time: res.start_time });
            setFormOpen(true);
            setSelectedRes(null);
            setEditRes({
              ...res,
              id: "", // Important: empty ID means new reservation
              date: "", // Leave date empty so user picks it
              status: "booked",
              is_next_booking: true
            });
          }}
        />
      )}

      {formOpen && (
        <ReservationFormDialog 
          isOpen={formOpen}
          onClose={() => { setFormOpen(false); setEditRes(null); }}
          onSuccess={() => {
            setFormOpen(false);
            setEditRes(null);
            if (onRefresh) onRefresh();
          }}
          defaultStaff={clickData.staff}
          defaultTime={clickData.time}
          defaultDate={date}
          storeName={storeName}
          initialData={editRes || undefined}
          staffList={staffList}
        />
      )}
    </div>
  );
}
