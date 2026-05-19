"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { updateStatementStatus } from "./actions";
import { toast } from "sonner";

export default function StatusToggleButton({ id, status, staffName }: { id: string; status: "draft" | "closed"; staffName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const nextStatus = status === "closed" ? "draft" : "closed";
    try {
      const res = await updateStatementStatus(id, nextStatus);
      if (res.success) {
        toast.success(`${staffName}様の明細書を${nextStatus === "closed" ? "確定" : "一時保存（下書き）"}に変更しました！`);
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

  if (status === "closed") {
    return (
      <Button
        onClick={handleToggle}
        disabled={loading}
        variant="ghost"
        size="sm"
        className="h-8 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 font-bold gap-1 rounded-lg border border-red-100 px-2"
        title="一時保存（編集可能）に戻す"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <Unlock size={11} />}
        <span>一時保存に戻す</span>
      </Button>
    );
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={loading}
      variant="ghost"
      size="sm"
      className="h-8 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold gap-1 rounded-lg border border-emerald-100 px-2"
      title="個別に確定（ロック）する"
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Lock size={11} />}
      <span>個別に確定</span>
    </Button>
  );
}
