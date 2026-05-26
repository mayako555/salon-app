"use client";

import { useMemo, useState } from "react";
import { Reservation } from "@/app/reservations/actions";
import { StaffProfile } from "@/app/staff/actions";
import ReservationDetailDialog from "./ReservationDetailDialog";
import ReservationFormDialog from "./ReservationFormDialog";
import DraggableReservation from "./DraggableReservation";

type Props = {
  reservations: Reservation[];
  staffList: StaffProfile[];
  date: string; // YYYY-MM-DD
  storeName?: string; // Add store name prop for new reservations
  onRefresh?: () => void; // Add refresh callback
};

export const START_HOUR = 8;
export const END_HOUR = 22;
export const TOTAL_HOURS = END_HOUR - START_HOUR;
export const HOUR_WIDTH = 120; // 120px per hour
export const ROW_HEIGHT = 48; // h-12 = 48px
export const TOTAL_WIDTH = TOTAL_HOURS * HOUR_WIDTH;

// 削除: function timeToPixels() & getPortalColor() (DraggableReservation内に移動したため)

export default function ReservationTimeline({ reservations, staffList, date, storeName = "六甲", onRefresh }: Props) {
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [clickData, setClickData] = useState({ staff: "", time: "" });
  
  // Group reservations by staff
  const grouped = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    staffList.forEach(s => map[s.name] = []);
    reservations.forEach(r => {
      if (map[r.staff_name]) {
        map[r.staff_name].push(r);
      } else {
        // Unassigned or unknown staff
        if (!map["不明"]) map["不明"] = [];
        map["不明"].push(r);
      }
    });
    return map;
  }, [reservations, staffList]);

  const activeStaffList = Object.keys(grouped);

  const handleRowClick = (e: React.MouseEvent, staff: string) => {
    // If they clicked on a button (reservation block), ignore
    if ((e.target as HTMLElement).closest('button')) return;

    // Calculate clicked time
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hourFraction = x / HOUR_WIDTH;
    const hour = START_HOUR + Math.floor(hourFraction);
    const minute = Math.floor((hourFraction % 1) * 60);
    // Round to nearest 15 mins for cleaner default
    const roundedMin = Math.round(minute / 15) * 15;
    const finalMin = roundedMin === 60 ? 0 : roundedMin;
    const finalHour = roundedMin === 60 ? hour + 1 : hour;
    
    setClickData({
      staff,
      time: `${finalHour.toString().padStart(2, '0')}:${finalMin.toString().padStart(2, '0')}`
    });
    setFormOpen(true);
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex">
      <div className="w-36 flex-shrink-0 border-r border-slate-300 bg-white z-10 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
        <div className="h-8 border-b border-slate-300 flex items-center justify-center bg-slate-100 text-[10px] font-bold text-slate-500 sticky top-0 z-20">
          スタッフ / ベッド
        </div>
        {activeStaffList.map((staff, i) => (
          <div key={staff} className="h-12 border-b border-slate-200 flex flex-col justify-center px-2 bg-white relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 truncate">{staff}</span>
              <div className="flex gap-1">
                <span className="w-4 h-4 bg-emerald-100 text-emerald-700 flex items-center justify-center rounded text-[8px] font-black" title="指名可">指</span>
                <span className="w-4 h-4 bg-slate-100 text-slate-500 flex items-center justify-center rounded text-[9px] font-black border border-slate-200" title="ベッド番号">{i + 1}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
               <span className="text-[9px] text-slate-400">出勤 (10:00-19:00)</span>
            </div>
          </div>
        ))}
      </div>

      {/* Right Column (Timeline) */}
      <div className="flex-1 overflow-auto relative no-scrollbar bg-slate-50">
        <div style={{ width: TOTAL_WIDTH }} className="relative min-h-full">
          
          {/* Header (Time axis) */}
          <div className="h-8 border-b border-slate-300 flex bg-slate-100 sticky top-0 z-10">
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

          {/* Grid Lines */}
          <div className="absolute top-8 bottom-0 left-0 right-0 pointer-events-none flex">
            {Array.from({ length: TOTAL_HOURS * 2 }).map((_, i) => (
              <div 
                key={i} 
                style={{ width: HOUR_WIDTH / 2 }} 
                className={`flex-shrink-0 h-full border-r ${i % 2 === 0 ? 'border-slate-200 border-dashed' : 'border-slate-300'}`}
              />
            ))}
          </div>

          {/* Staff Rows & Reservations */}
          <div className="relative pt-[32px] z-0">
            {activeStaffList.map((staff, rowIndex) => (
              <div 
                key={staff} 
                className="h-12 border-b border-slate-200 relative group hover:bg-slate-100/50 transition-colors cursor-pointer"
                onClick={(e) => handleRowClick(e, staff)}
              >
                {grouped[staff].map(res => (
                  <DraggableReservation
                    key={res.id}
                    res={res}
                    staffList={activeStaffList}
                    currentStaffIndex={rowIndex}
                    onClick={() => setSelectedRes(res)}
                    onUpdateComplete={() => { if(onRefresh) onRefresh(); }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedRes && (
        <ReservationDetailDialog 
          reservation={selectedRes} 
          isOpen={!!selectedRes} 
          onClose={() => setSelectedRes(null)} 
        />
      )}

      {formOpen && (
        <ReservationFormDialog 
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          onSuccess={() => {
            setFormOpen(false);
            if (onRefresh) onRefresh();
          }}
          defaultStaff={clickData.staff}
          defaultTime={clickData.time}
          defaultDate={date}
          storeName={storeName}
        />
      )}
    </div>
  );
}
