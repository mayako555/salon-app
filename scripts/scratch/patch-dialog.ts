import * as fs from "fs";
import * as path from "path";

const filePath = "/Users/mayako/.gemini/antigravity/scratch/salon-app/src/app/attendance/page.tsx";
let content = fs.readFileSync(filePath, "utf8");

// 1. DialogContent className replacement
const oldDialogContent = `<DialogContent className="max-w-md">`;
const newDialogContent = `<DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">`;

// 2. DialogHeader wrapping replacement
const oldHeader = `          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editingRecord?.staff_name} さんの勤怠編集</DialogTitle>
          </DialogHeader>`;
const newHeader = `          <DialogHeader className="p-6 pb-2 border-b border-slate-100">
            <DialogTitle className="text-xl font-black">{editingRecord?.staff_name} さんの勤怠編集</DialogTitle>
          </DialogHeader>`;

// 3. Form tag & scrollable div wrapper
const oldFormStart = `          <form onSubmit={handleUpdate} className="space-y-6 py-4">`;
const newFormStart = `          <form onSubmit={handleUpdate} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">`;

// 4. Form end and DialogFooter wrapping replacement
const oldFooter = `            <DialogFooter className="pt-4">
               <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>キャンセル</Button>
               <Button type="submit" className="bg-slate-900 text-white font-black px-8">修正を保存</Button>
             </DialogFooter>
           </form>`;

const newFooter = `            </div>
            <DialogFooter className="p-6 pt-2 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>キャンセル</Button>
              <Button type="submit" className="bg-slate-900 text-white font-black px-8">修正を保存</Button>
            </DialogFooter>
          </form>`;

// 5. Replace state updater inside individual record deletion
const oldDeleteBlock = `                               if (res.success) {
                                 toast.success("削除しました");
                                 setEditingGroup(prev => prev.filter(p => p.id !== r.id));
                                 loadData();
                               } else {`;

const newDeleteBlock = `                               if (res.success) {
                                 toast.success("削除しました");
                                 const updatedGroup = editingGroup.filter(p => p.id !== r.id);
                                 setEditingGroup(updatedGroup);
                                 if (updatedGroup.length > 0) {
                                   const latestRecord = updatedGroup[updatedGroup.length - 1];
                                   setEditingRecord({
                                     ...latestRecord,
                                     effective_clock_in: latestRecord.effective_clock_in || latestRecord.clock_in,
                                     effective_clock_out: latestRecord.effective_clock_out || latestRecord.clock_out,
                                     break_minutes: latestRecord.break_minutes
                                   });
                                 } else {
                                   setIsEditDialogOpen(false);
                                 }
                                 loadData();
                               } else {`;

if (!content.includes(oldDialogContent)) console.error("Error: oldDialogContent not found");
if (!content.includes(oldHeader)) console.error("Error: oldHeader not found");
if (!content.includes(oldFormStart)) console.error("Error: oldFormStart not found");
if (!content.includes(oldFooter)) console.error("Error: oldFooter not found");
if (!content.includes(oldDeleteBlock)) console.error("Error: oldDeleteBlock not found");

content = content.replace(oldDialogContent, newDialogContent);
content = content.replace(oldHeader, newHeader);
content = content.replace(oldFormStart, newFormStart);
content = content.replace(oldFooter, newFooter);
content = content.replace(oldDeleteBlock, newDeleteBlock);

fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully patched page.tsx!");
