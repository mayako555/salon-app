"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";

export function usePageTracking() {
  const pathname = usePathname();
  const { user, profile, tenantPlan } = useAuth();
  const startTimeRef = useRef<number>(Date.now());
  const currentPathRef = useRef<string>(pathname);

  useEffect(() => {
    if (!user || !profile?.companyId || tenantPlan !== "Test") return;

    // パスが変わった場合、前のページの滞在時間を記録
    if (currentPathRef.current !== pathname) {
      const timeSpent = Date.now() - startTimeRef.current;
      
      // ログ記録
      const logPageLeave = async () => {
        try {
          await addDoc(collection(db, "page_views"), {
            companyId: profile.companyId,
            userId: user.uid,
            path: currentPathRef.current,
            timeSpentMs: timeSpent,
            timestamp: serverTimestamp()
          });
        } catch (error) {
          console.error("Failed to log page view", error);
        }
      };
      
      logPageLeave();

      // 新しいページのトラッキングを開始
      currentPathRef.current = pathname;
      startTimeRef.current = Date.now();
    }
  }, [pathname, user, profile, tenantPlan]);

  // コンポーネントアンマウント時（ブラウザを閉じる直前など）の処理も可能だが、
  // ReactのuseEffectクリーンアップだと確実ではないため、今回はSPAのルーティング遷移時をメインとする
}
