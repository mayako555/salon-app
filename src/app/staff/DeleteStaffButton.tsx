"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteStaff } from "./actions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function DeleteStaffButton({ id, uid, name }: { id: string, uid?: string, name: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteStaff(id, uid);
    if (result.success) {
      toast.success(`${name}を削除しました`);
      setOpen(false);
    } else {
      toast.error(result.error || "削除に失敗しました");
    }
    setIsDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 px-0 text-slate-500 hover:text-rose-600">
          <Trash2 size={16} />
          <span className="sr-only">削除</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>本当に削除しますか？</DialogTitle>
          <DialogDescription>
            <strong>{name}</strong> さんのデータを完全に削除します。<br />
            ※ 削除すると、ログインができなくなります。<br />
            ※ 過去の売上や勤怠データは表示上残りますが、スタッフ一覧からは消えます。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-2xl font-bold">キャンセル</Button>
          <Button
            variant="destructive"
            className="rounded-2xl font-black bg-rose-600"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "削除中..." : "削除する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
