import { useState, useRef, useEffect } from "react";
import { Reservation, updateReservationTime } from "@/app/reservations/actions";
import { HOUR_WIDTH, ROW_HEIGHT } from "./ReservationTimeline";
import { User, Scissors, Star, Tag, MessageSquare, Phone, MapPin, Eye, AlertCircle } from "lucide-react";

function timeToPixels(timeStr: string, startHour: number, totalHours: number): number {
  const [h, m] = timeStr.split(":").map(Number);
  const hourOffset = h - startHour;
  if (hourOffset < 0 || hourOffset > totalHours) return -1;
  return (hourOffset * HOUR_WIDTH) + ((m / 60) * HOUR_WIDTH);
}

function pixelsToTime(px: number, startHour: number, totalHours: number): string {
  const clampedPx = Math.max(0, Math.min(px, totalHours * HOUR_WIDTH));
  const totalMinutes = (clampedPx / HOUR_WIDTH) * 60;
  const snappedMinutes = Math.round(totalMinutes / 15) * 15;
  const h = startHour + Math.floor(snappedMinutes / 60);
  const m = snappedMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getColorClasses(res: Reservation) {
  if (res.type === "schedule") return "bg-slate-200/80 border-slate-300 text-slate-700 shadow-none";

  if (res.status === 'cancelled') return "bg-slate-100 border-slate-200 text-slate-400 opacity-50 line-through";
  if (res.status === 'completed') return "bg-slate-200 border-slate-300 text-slate-500 opacity-60";
  
  if (res.is_caution) return "bg-rose-100 border-rose-300 text-rose-800";
  if (res.is_next_booking) return "bg-purple-100 border-purple-300 text-purple-800";
  
  switch (res.customer_type) {
    case "新規": return "bg-blue-50 border-blue-300 text-blue-900";
    case "再来": return "bg-green-50 border-green-300 text-green-900";
    case "モデル": return "bg-slate-100 border-slate-300 text-slate-700";
    default: return "bg-white border-slate-300 text-slate-800"; // fallback
  }
}

function getMenuIcon(menuName: string, isSchedule = false) {
  if (isSchedule) return <AlertCircle className="w-2.5 h-2.5" />;
  if (!menuName) return <Tag className="w-2.5 h-2.5" />;
  if (menuName.includes('アイブロウ') || menuName.includes('眉')) return <Eye className="w-2.5 h-2.5" />;
  if (menuName.includes('パーマ') || menuName.includes('カール')) return <Scissors className="w-2.5 h-2.5" />;
  if (menuName.includes('エクステ') || menuName.includes('ボリューム')) return <Star className="w-2.5 h-2.5" />;
  return <Tag className="w-2.5 h-2.5" />;
}

type Props = {
  res: Reservation;
  staffList: string[];
  currentStaffIndex: number;
  onClick: (res: Reservation) => void;
  onUpdateComplete: () => void;
  startHour: number;
  totalHours: number;
};

export default function DraggableReservation({ res, staffList, currentStaffIndex, onClick, onUpdateComplete, startHour, totalHours }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showHover, setShowHover] = useState(false);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);
  
  const [currentLeft, setCurrentLeft] = useState(timeToPixels(res.start_time, startHour, totalHours));
  const [currentWidth, setCurrentWidth] = useState(timeToPixels(res.end_time, startHour, totalHours) - timeToPixels(res.start_time, startHour, totalHours));
  const [currentTop, setCurrentTop] = useState(0); 
  
  useEffect(() => {
    if (!isDragging && !isResizing) {
      const initialLeft = timeToPixels(res.start_time, startHour, totalHours);
      const initialWidth = timeToPixels(res.end_time, startHour, totalHours) - initialLeft;
      setCurrentLeft(initialLeft);
      setCurrentWidth(initialWidth);
      setCurrentTop(0);
    }
  }, [res.start_time, res.end_time, isDragging, isResizing, startHour, totalHours]);

  const handlePointerDown = (e: React.PointerEvent, type: 'move' | 'resize') => {
    if (e.button === 2) return; // Ignore right click
    e.stopPropagation();
    e.preventDefault();
    setShowHover(false);
    
    if (res.status === 'completed') {
      if (type === 'move') onClick(res);
      return;
    }

    if (type === 'move') setIsDragging(true);
    else setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initialLeft = currentLeft;
    const initialWidth = currentWidth;
    const initialTop = currentTop;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      if (type === 'resize') {
        const newWidth = Math.max(HOUR_WIDTH / 4, initialWidth + dx); 
        setCurrentWidth(newWidth);
      } else {
        const dy = moveEvent.clientY - startY;
        setCurrentLeft(initialLeft + dx);
        setCurrentTop(initialTop + dy);
      }
    };

    const handlePointerUp = async (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      
      setIsDragging(false);
      setIsResizing(false);

      if (type === 'move') {
        const dx = upEvent.clientX - startX;
        const dy = upEvent.clientY - startY;

        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
          onClick(res);
          return;
        }

        const rowOffset = Math.round(dy / ROW_HEIGHT);
        const newStaffIndex = Math.max(0, Math.min(staffList.length - 1, currentStaffIndex + rowOffset));
        const newStaff = staffList[newStaffIndex];

        const newStart = pixelsToTime(currentLeft + dx, startHour, totalHours);
        const newStartPx = timeToPixels(newStart, startHour, totalHours);
        const newEnd = pixelsToTime(newStartPx + initialWidth, startHour, totalHours);

        await updateReservationTime(res.id, newStaff, newStart, newEnd);
        onUpdateComplete();
      } else {
        const dx = upEvent.clientX - startX;
        if (Math.abs(dx) < 3) return; 

        const newEnd = pixelsToTime(initialLeft + initialWidth + dx, startHour, totalHours);
        await updateReservationTime(res.id, res.staff_name, res.start_time, newEnd);
        onUpdateComplete();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const isCompleted = res.status === 'completed';
  const colorClass = getColorClasses(res);

  return (
    <>
      <div
        onPointerDown={(e) => handlePointerDown(e, 'move')}
        onContextMenu={handleContextMenu}
        onDoubleClick={(e) => { e.stopPropagation(); onClick(res); }}
        onMouseEnter={() => !isDragging && !isResizing && setShowHover(true)}
        onMouseLeave={() => setShowHover(false)}
        style={{ 
          left: currentLeft, 
          width: currentWidth,
          transform: `translateY(${currentTop}px)`,
          zIndex: isDragging ? 50 : (showHover ? 40 : 10)
        }}
        className={`absolute top-0.5 bottom-0.5 rounded-sm border flex flex-col p-0.5 overflow-hidden transition-colors text-left select-none shadow-sm
          ${colorClass}
          ${!isCompleted ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
          ${isDragging ? 'opacity-90 scale-[1.02] shadow-xl ring-2 ring-blue-500' : ''}
          ${isResizing ? 'bg-blue-50 border-blue-400' : ''}
        `}
      >
        <div className="flex items-center gap-1 text-[8px] font-bold opacity-90 leading-none pointer-events-none mb-0.5">
          <span className={`px-0.5 rounded flex items-center gap-0.5 border border-black/5 ${res.type === 'schedule' ? 'bg-slate-300/50' : 'bg-white/60'}`}>
            {getMenuIcon(res.menu_name || "", res.type === 'schedule')} {res.type !== 'schedule' ? res.portal : ""}
          </span>
          {res.type !== 'schedule' && res.customer_type && (
            <span className={`px-0.5 rounded text-white ${res.customer_type === '新規' ? 'bg-blue-500' : res.customer_type === '再来' ? 'bg-green-500' : 'bg-slate-500'}`}>
              {res.customer_type.charAt(0)}
            </span>
          )}
          {res.type !== 'schedule' && res.is_caution && <AlertCircle className="w-2.5 h-2.5 text-red-500 fill-white" />}
          {res.type !== 'schedule' && res.status === 'arrived' && <span className="bg-emerald-500 text-white px-0.5 rounded">来</span>}
          {res.type !== 'schedule' && res.status === 'completed' && <span className="bg-slate-800 text-white px-0.5 rounded">済</span>}
        </div>
        <span className="text-[10px] font-black truncate leading-tight pointer-events-none tracking-tight">
          {res.type === 'schedule' ? res.menu_name : res.customer_name}
        </span>
        {res.type !== 'schedule' && (
          <span className="text-[8px] truncate opacity-80 leading-tight mt-px pointer-events-none">{res.menu_name}</span>
        )}
        
        {!isCompleted && (
          <div 
            onPointerDown={(e) => handlePointerDown(e, 'resize')}
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/10 flex items-center justify-center group"
          >
            <div className="w-px h-3 bg-black/20 group-hover:bg-black/40 rounded-full" />
          </div>
        )}
      </div>

      {/* Hover Card */}
      {showHover && !contextMenu && (
        <div 
          className="fixed z-[100] bg-white border border-slate-200 shadow-xl rounded-lg p-3 w-64 pointer-events-none text-xs"
          style={{ 
            left: Math.min(currentLeft + currentWidth + 240 > window.innerWidth ? window.innerWidth - 260 : currentLeft + 140, window.innerWidth - 260),
            top: Math.min(100 + currentTop + ROW_HEIGHT * currentStaffIndex, window.innerHeight - 200)
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span className="font-bold text-sm">{res.customer_name} 様</span>
            <span className="bg-slate-100 text-slate-500 px-1 rounded text-[10px]">{res.customer_type || "不明"}</span>
          </div>
          <div className="space-y-1.5 text-slate-600">
            <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400" /> <span className="flex-1">{res.menu_name}</span></div>
            <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> 090-XXXX-XXXX</div>
            <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-slate-400" /> 担当: {res.staff_name}</div>
            
            <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-slate-400 block">前回来店</span>
                <span className="font-bold text-slate-700">2026/04/10</span>
              </div>
              <div>
                <span className="text-slate-400 block">来店回数</span>
                <span className="font-bold text-slate-700">5回</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">注意事項・アレルギー</span>
                <span className="font-bold text-rose-600">テープかぶれあり。右目目尻上がりやすい。</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[110]" onClick={(e) => { e.stopPropagation(); setContextMenu(null); }} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div 
            className="fixed z-[120] bg-white border border-slate-200 shadow-xl rounded-md py-1 w-48 text-xs font-bold"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2" onClick={() => { onClick(res); setContextMenu(null); }}>
              <MessageSquare className="w-4 h-4 text-slate-400" /> 詳細・編集を開く
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <button className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-emerald-700 flex items-center gap-2" onClick={() => { alert('来店処理しました'); setContextMenu(null); }}>
              <User className="w-4 h-4 text-emerald-500" /> 来店済にする
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <button className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-700 flex items-center gap-2" onClick={() => { alert('削除しました'); setContextMenu(null); }}>
              <AlertCircle className="w-4 h-4 text-rose-500" /> 予約をキャンセル
            </button>
          </div>
        </>
      )}
    </>
  );
}
