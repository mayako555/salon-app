"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from "lucide-react";
import { importHotPepperCsv } from "./actions";
import { useAuth } from "@/lib/auth-context";

export default function CSVUploadButton() {
  const { availableStores } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [store, setStore] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("csv_file", file);
      formData.append("store_name", store);

      const result = await importHotPepperCsv(formData);
      
      if (result.success) {
        alert(`CSVの取り込みに成功しました。\n${result.count}件の売上データを登録しました。`);
        // Force refresh to show new data
        window.location.reload();
      } else {
        alert(`エラーが発生しました: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("アップロード中にエラーが発生しました。");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    if (!store) {
      alert("CSVを取り込む店舗を選択してください。");
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center gap-2">
      <select 
        value={store} 
        onChange={(e) => setStore(e.target.value)}
        className="h-9 px-3 py-1 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="" disabled>店舗を選択</option>
        {availableStores.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button 
        onClick={handleUploadClick}
        disabled={isUploading}
        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 md:flex-none"
      >
        {isUploading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
        <span>{isUploading ? "取込中..." : "CSVを取込"}</span>
      </Button>
    </div>
  );
}
