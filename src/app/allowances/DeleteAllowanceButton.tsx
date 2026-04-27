"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteAllowance } from "./actions";

export default function DeleteAllowanceButton({ id }: { id: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("この手当データを削除します。よろしいですか？")) return;
    
    setIsSubmitting(true);
    try {
      const res = await deleteAllowance(id);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error);
      }
    } catch {
      alert("削除中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleDelete}
      disabled={isSubmitting}
      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
    >
      <Trash2 size={16} />
    </Button>
  );
}
