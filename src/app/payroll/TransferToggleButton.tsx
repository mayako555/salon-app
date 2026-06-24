"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toggleTransferStatus } from "./actions";
import { toast } from "sonner";

export default function TransferToggleButton({ id, status, isTransferred, staffName }: { id: string; status: string; isTransferred: boolean; staffName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // If status is not closed, we can't transfer yet
  if (status !== "closed") {
    return <span className="text-[10px] text-slate-300 font-medium">未確定</span>;
  }

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await toggleTransferStatus(id, !!isTransferred);
      if (res.success) {
        toast.success(`${staffName}様の振込ステータスを更新しました`);
        router.refresh();
      } else {
        toast.error(`エラー: ${res.error}`);
      }
    } catch {
      toast.error("ステータス変更中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleToggle}
      disabled={loading}
      variant="ghost"
      size="sm"
      className={`h-8 text-[11px] font-bold gap-1 rounded-lg border px-2 ${
        isTransferred 
          ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 bg-blue-50" 
          : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-slate-200"
      }`}
      title={isTransferred ? "受付済み（クリックで未受付に戻す）" : "未受付（クリックで受付済みにする）"}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : isTransferred ? <CheckCircle2 size={13} /> : <Circle size={13} />}
      <span>{isTransferred ? "振込受付済" : "未受付"}</span>
    </Button>
  );
}
