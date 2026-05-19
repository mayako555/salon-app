"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { deleteStatement } from "./actions";
import { toast } from "sonner";

export default function DeleteStatementButton({ id, staffName }: { id: string; staffName: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const ok = window.confirm(`${staffName}様の給与明細を削除してもよろしいですか？\n※この操作は取り消せません。`);
    if (!ok) return;

    setIsDeleting(true);
    try {
      const res = await deleteStatement(id);
      if (res.success) {
        toast.success(`${staffName}様の明細書を削除しました`);
        router.refresh();
      } else {
        toast.error(`削除できませんでした: ${res.error}`);
      }
    } catch (err) {
      toast.error("削除処理中にエラーが発生しました");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleDelete}
      disabled={isDeleting}
      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
    >
      {isDeleting ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Trash2 size={14} />
      )}
      <span className="sr-only">削除</span>
    </Button>
  );
}
