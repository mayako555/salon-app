"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import { generateStatements } from "./actions";

export default function GenerateButton({ year, month, disabled }: { year: number, month: number, disabled?: boolean }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await generateStatements(year, month);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error);
      }
    } catch {
      alert("計算処理中にエラーが発生しました");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      onClick={handleGenerate} 
      disabled={isGenerating || disabled}
      className="gap-2 bg-slate-800 text-white hover:bg-slate-700 font-medium whitespace-nowrap"
    >
      <Calculator size={16} />
      <span>{isGenerating ? "集計中..." : "最新データで再計算"}</span>
    </Button>
  );
}
