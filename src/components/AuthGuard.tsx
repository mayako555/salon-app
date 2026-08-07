"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { FeatureKey } from "@/types/master";
import { FeatureDenied } from "@/components/layout/FeatureDenied";

interface AuthGuardProps {
  children: React.ReactNode;
  requireRole?: "admin" | "manager" | "staff" | "systemOwner" | "companyOwner";
  requireFeature?: FeatureKey;
}

export default function AuthGuard({ children, requireRole = "staff", requireFeature }: AuthGuardProps) {
  const { user, profile, loading, isAdmin, isManager, isStaff, isSystemOwner, isCompanyOwner, hasFeature } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in, redirect to login
        router.push(`/login?redirect=${pathname}`);
      } else if (requireRole === "admin" && !isAdmin) {
        // Admin required but user is not admin
        router.push("/staff-portal");
      } else if (requireRole === "manager" && !(isManager || isAdmin)) {
        // Manager required but user is not manager/admin
        router.push("/staff-portal");
      } else if (requireRole === "systemOwner" && !isSystemOwner) {
        router.push("/dashboard");
      } else if (requireRole === "staff" && !isStaff) {
        // Staff profile required but not found for this user
        router.push("/login?error=profile_not_found");
      }
    }
  }, [user, profile, loading, requireRole, router, pathname, isAdmin, isManager, isStaff, isSystemOwner]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
          <p className="text-slate-500 font-medium">認証情報を確認中...</p>
        </div>
      </div>
    );
  }

  // Check if we meet the requirements (respecting role hierarchy)
  const isAuthorized = 
    user && (
      (requireRole === "staff" && isStaff) ||
      (requireRole === "manager" && (isManager || isAdmin || isSystemOwner || isCompanyOwner)) ||
      (requireRole === "admin" && (isAdmin || isSystemOwner || isCompanyOwner)) ||
      (requireRole === "companyOwner" && (isCompanyOwner || isSystemOwner)) ||
      (requireRole === "systemOwner" && isSystemOwner)
    );

  if (!isAuthorized) {
    return null; // Will redirect in useEffect
  }

  if (requireFeature && !hasFeature(requireFeature)) {
    return <FeatureDenied />;
  }

  return <>{children}</>;
}
