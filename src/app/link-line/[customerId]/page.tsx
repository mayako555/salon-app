"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import liff from "@line/liff";
import { getCustomerById, updateCustomer } from "@/lib/customers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export default function LinkLinePage() {
  const { customerId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "linking" | "success" | "error">("idle");
  const [customerName, setCustomerName] = useState("");
  const store = searchParams.get("store");

  useEffect(() => {
    const initLiff = async () => {
      try {
        let liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        
        if (store === '六甲道') liffId = process.env.NEXT_PUBLIC_LIFF_ID_ROKKO || liffId;
        else if (store === '神戸') liffId = process.env.NEXT_PUBLIC_LIFF_ID_KOBE || liffId;
        else if (store === '元町') liffId = process.env.NEXT_PUBLIC_LIFF_ID_MOTOMACHI || liffId;

        if (!liffId) {
          console.error("LIFF ID is missing in environment variables");
          setCustomerName("【設定エラー: LIFF ID未設定】");
          setStatus("error");
          setLoading(false);
          return;
        }

        await liff.init({ liffId });
        
        // Use customerId from useParams()
        const targetId = customerId as string;
        
        if (targetId) {
          const customer = await getCustomerById(targetId);
          if (customer) {
            setCustomerName(customer.name);
          } else {
            throw new Error("Customer not found");
          }
        }

        setLoading(false);
      } catch (err: any) {
        console.error("LIFF Init Error:", err);
        setStatus("error");
        setLoading(false);
      }
    };

    initLiff();
  }, [customerId, store]);

  const handleLink = async () => {
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    setStatus("linking");
    try {
      const profile = await liff.getProfile();
      const lineUserId = profile.userId;

      if (typeof customerId === 'string') {
        const res = await updateCustomer(customerId, { line_user_id: lineUserId });
        if (res.success) {
          setStatus("success");
          toast.success("LINE連携が完了しました");
        } else {
          throw new Error(res.error);
        }
      }
    } catch (err: any) {
      console.error("Linking Error:", err);
      setStatus("error");
      toast.error("連携に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
          <p className="text-slate-500 font-bold">準備中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <Card className="w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border-none text-center space-y-8">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <LinkIcon size={40} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-800">LINEアカウント連携</h1>
          <p className="text-sm text-slate-500 font-bold">
            {customerName ? `${customerName} 様の` : ""}カルテとLINEを連携します。
          </p>
        </div>

        {status === "idle" && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-left">
              <p className="text-xs text-blue-700 font-bold leading-relaxed">
                連携すると、サロンからの予約確認メッセージをLINEで受け取れるようになります。
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                className="w-full h-14 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white font-black text-lg shadow-lg shadow-emerald-200"
                onClick={handleLink}
              >
                LINEでログインして連携
              </Button>
              
              <p className="text-[10px] text-slate-400 font-bold">
                ※まだお友達追加されていない場合は、連携後に自動的にお友達追加画面が表示されるか、トーク画面が開きます。
              </p>
            </div>
          </div>
        )}

        {status === "linking" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <p className="text-slate-500 font-bold">連携処理中...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 py-4">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-black text-slate-800">連携完了！</p>
              <p className="text-sm text-slate-500 font-bold">この画面を閉じてください。</p>
            </div>
            <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => liff.closeWindow()}>
              閉じる
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6 py-4">
            <div className="w-16 h-16 bg-rose-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-rose-200">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-black text-slate-800">エラーが発生しました</p>
              <p className="text-sm text-slate-500 font-bold">もう一度やり直してください。</p>
            </div>
            <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => window.location.reload()}>
              再試行
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
