"use client";

import { usePageTracking } from "@/hooks/usePageTracking";

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  usePageTracking();
  return <>{children}</>;
}
