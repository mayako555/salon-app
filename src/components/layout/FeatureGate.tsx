"use client";

import { useAuth } from "@/lib/auth-context";
import { FeatureKey } from "@/types/master";

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { hasFeature } = useAuth();
  
  if (!hasFeature(feature)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
