"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { closeMonthlyStatements } from "./actions";

export default function CloseButton({ year, month, hasData, disabled }: { year: number, month: number, hasData: boolean, disabled?: boolean }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = async () => {
    if (!hasData) {
      alert("確定するデータがありません。先に再計算を実行してください。");
      return;
    }
    if (!confirm(`${year}年${month}月の給与・報酬データを確定（ロック）します。\n以後、勤怠や売上の修正は給与計算に反映されなくなりますがよろしいですか？`)) return;
    
    setIsSubmitting(true);
    try {
      const res = await closeMonthlyStatements(year, month);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error);
      }
    } catch {
      alert("確定処理中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button 
      onClick={handleClose} 
      disabled={isSubmitting || disabled}
      variant="outline"
      className="gap-2 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 font-bold"
    >
      <Lock size={16} />
      <span>{isSubmitting ? "確定中..." : "月次データを確定する"}</span>
    </Button>
  );
}
