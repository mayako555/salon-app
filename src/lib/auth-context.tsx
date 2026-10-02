"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import type { DocumentData, Query, QuerySnapshot } from "firebase/firestore";
import { StaffProfile, StaffRole } from "@/app/staff/actions";
import { SalesMasterItem, AttendancePolicy, FeatureKey, FeatureSettings, ensureFeatureDefaults } from "@/types/master";
import { resolveStaffProfileCandidate } from "@/lib/staff-profile-resolution";
import { normalizeTenantStatus, type TenantStatus } from "@/lib/tenant-access";

import { usePathname, useRouter } from "next/navigation";
import { sessionQueue, storeSelectionKey, isPublicAuthPath, createAuthRevision } from "./auth-transition";

interface AuthContextType {
  logout: (destination?: string) => Promise<void>;
  user: User | null;
  profile: StaffProfile | null;
  companyId?: string;
  loading: boolean;
  isAdmin: boolean;
  isSystemOwner: boolean;
  isAccountant: boolean;
  impersonatingCompanyId: string | null;
  stopImpersonating: () => void;
  isManager: boolean;
  isStaff: boolean;
  selectedStore: string;
  setSelectedStore: (store: string) => void;
  availableStores: string[];
  availableStoreObjects: SalesMasterItem[];
  tenantPlan: string;
  isCompanyOwner: boolean;
  schoolEnabled: boolean;
  schoolName: string;
  isSystemOwnerCompany: boolean;
  attendancePolicy: AttendancePolicy;
  companyStatus: TenantStatus;
  isCompanyActive: boolean;
  hasFeature: (feature: FeatureKey) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  logout: async () => {},
  user: null,
  profile: null,
  companyId: undefined,
  loading: true,
  isAdmin: false,
  isSystemOwner: false,
  isAccountant: false,
  impersonatingCompanyId: null,
  stopImpersonating: () => {},
  isManager: false,
  isStaff: false,
  selectedStore: "",
  setSelectedStore: () => {},
  availableStores: [],
  availableStoreObjects: [],
  tenantPlan: "Standard",
  isCompanyOwner: false,
  schoolEnabled: false,
  schoolName: "",
  isSystemOwnerCompany: false,
  attendancePolicy: { roundingEnabled: false, roundingIntervalMinutes: 0 },
  companyStatus: "active",
  isCompanyActive: true,
  hasFeature: () => false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const generation = useRef(createAuthRevision());
  const [renderRevision, setRenderRevision] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [selectedStore, setSelectedStoreState] = useState<string>("");
  const [availableStores, setAvailableStores] = useState<string[]>([]);
  const [availableStoreObjects, setAvailableStoreObjects] = useState<SalesMasterItem[]>([]);
  const [tenantPlan, setTenantPlan] = useState<string>("Standard");
  const [schoolEnabled, setSchoolEnabled] = useState<boolean>(false);
  const [schoolName, setSchoolName] = useState<string>("");
  const [isSystemOwner, setIsSystemOwner] = useState(false);
  const [isAccountant, setIsAccountant] = useState(false);
  const [impersonatingCompanyId, setImpersonatingCompanyId] = useState<string | null>(null);
  const [isSystemOwnerCompany, setIsSystemOwnerCompany] = useState<boolean>(false);
  const [attendancePolicy, setAttendancePolicy] = useState<AttendancePolicy>({ roundingEnabled: false, roundingIntervalMinutes: 0 });
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [companyStatus, setCompanyStatus] = useState<TenantStatus>("active");

  // Stop impersonating function
  const stopImpersonating = () => {
    document.cookie = "impersonated_company_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/admin/master/system/tenants";
  };

  const featureCompanyId = impersonatingCompanyId || profile?.companyId;
  useEffect(() => {
    if (!user || !featureCompanyId || isPublicAuthPath(pathname)) return;
    let live=true;
    const unsubscribe=onSnapshot(doc(db,'companies',featureCompanyId),snapshot=>{
      if(!live)return;
      if(!snapshot.exists()){setFeatures({});return;}
      const data=snapshot.data();
      setFeatures(ensureFeatureDefaults(data.features,data.companyType==='system_owner'));
    },()=>{if(live)setFeatures({});});
    return()=>{live=false;unsubscribe();};
  },[user,featureCompanyId,pathname]);

  const hasFeature = (feature: FeatureKey) => {
    if (profile?.role === "systemOwner" && !impersonatingCompanyId && !profile.companyId) return true;
    return !!features[feature];
  };
  const [loading, setLoading] = useState(true);

  const setSelectedStore = (store: string) => {
    setSelectedStoreState(store);
    if (user && (impersonatingCompanyId || profile?.companyId)) {
      localStorage.setItem(storeSelectionKey(user.uid, impersonatingCompanyId || profile!.companyId!), store);
    }
  };

  const logout = async (destination = "/login") => {
    generation.current.next();
    setLoading(true);
    setProfile(null);
    setSelectedStoreState("");
    try {
      await signOut(auth);
      await sessionQueue.run(async () => {
        const response = await fetch("/api/auth/session", { method: "DELETE" });
        if (!response.ok) throw new Error("ログアウト処理に失敗しました");
      });
      window.location.replace(destination);
    } catch (error) {
      console.error("Logout failed", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user && !isPublicAuthPath(pathname)) {
      router.replace(pathname.startsWith("/staff-portal") ? "/staff/login" : "/login");
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    let disposed = false;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const currentGeneration = generation.current.next();
      setRenderRevision(currentGeneration);
      const isCurrent = () => !disposed && generation.current.isCurrent(currentGeneration) && auth.currentUser?.uid === firebaseUser?.uid;
      setSelectedStoreState("");
      setUser(firebaseUser);
      setLoading(true);
      setProfile(null);
      setFeatures({});
      setCompanyStatus("active");
      setAvailableStores([]);
      setAvailableStoreObjects([]);
      setTenantPlan("Standard");
      setSchoolEnabled(false);
      setSchoolName("");
      setIsSystemOwner(false);
      setIsAccountant(false);
      setImpersonatingCompanyId(null);
      setIsSystemOwnerCompany(false);
      setAttendancePolicy({ roundingEnabled: false, roundingIntervalMinutes: 0 });
      
      if (firebaseUser && firebaseUser.email) {
        try {
          // Ensure session cookie is set for server actions
          await sessionQueue.run(async () => {
            if (!isCurrent()) return;
            const token = await firebaseUser.getIdToken();
            if (!isCurrent()) return;
            const response = await fetch("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: token })
            });
            if (!response.ok) throw new Error("セッションを確認できませんでした");
          });
          if (!isCurrent()) return;

          const staffRef = collection(db, "staff_profiles");
          const fetchWithTimeout = (staffQuery: Query<DocumentData>): Promise<QuerySnapshot<DocumentData>> => Promise.race([
            getDocs(staffQuery),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Firestore auth fetch timeout")), 8000))
          ]);

          // Firestore rules allow a signed-in staff member to query their own
          // email. Resolve the authoritative UID only within those permitted
          // candidates, with a single unbound legacy profile as fallback.
          const snapshot = await fetchWithTimeout(
            query(staffRef, where("email", "==", firebaseUser.email)),
          );
          if (!isCurrent()) return;
          const resolvedCandidate = resolveStaffProfileCandidate(
            snapshot.docs.map((staffDoc) => ({
              id: staffDoc.id,
              uid: staffDoc.data().uid,
              staffDoc,
            })),
            firebaseUser.uid,
          );
          
          if (resolvedCandidate) {
            const staffDoc = resolvedCandidate.staffDoc;
            const data = staffDoc.data();
            setProfile({ id: staffDoc.id, ...data } as StaffProfile);
            
            // Fetch tenant plan and settings
            let currentPlan = "Standard";
            let currentSchoolEnabled = false;
            let currentSchoolName = "";
            let companyIdToUse = data.companyId;

            setIsSystemOwner(data.role === "systemOwner");
            setIsAccountant(data.role === "accountant");
            setTenantPlan(currentPlan);
            
            // Impersonation logic for systemOwner
            if (data.role === "systemOwner") {
              const cookies = document.cookie.split(';');
              const impCookie = cookies.find(c => c.trim().startsWith('impersonated_company_id='));
              if (impCookie) {
                const impId = impCookie.split('=')[1];
                if (impId) {
                  companyIdToUse = impId;
                  setImpersonatingCompanyId(impId);
                }
              }
            }

            const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
            const serverIdentity = await sessionResponse.json();
            if (!isCurrent()) return;
            if (!sessionResponse.ok || !serverIdentity.success || serverIdentity.uid !== firebaseUser.uid || serverIdentity.companyId !== (companyIdToUse || "")) {
              throw new Error("ブラウザとサーバーのサロン情報が一致しません。再度ログインしてください。");
            }

            if (!companyIdToUse && data.role !== "systemOwner") {
              console.error("会社情報が未設定です");
              setProfile(null);
              setLoading(false);
              return;
            }
            
            if (companyIdToUse) {
              try {
                const companyDoc = await getDoc(doc(db, "companies", companyIdToUse));
                if (!isCurrent()) return;
                if (!companyDoc.exists()) throw new Error("サロン情報が存在しません");
                const companyData = companyDoc.data();
                setCompanyStatus(normalizeTenantStatus(companyData.status));
                
                const isSystemOwnerContext = companyData.companyType === "system_owner" || companyIdToUse === "company_default";
                
                currentPlan = companyData.plan || "Standard";
                currentSchoolEnabled = isSystemOwnerContext || data.role === "systemOwner" ? true : !!companyData.schoolEnabled;
                currentSchoolName = companyData.schoolName || "";
                

                setIsSystemOwnerCompany(isSystemOwnerContext);
                setAttendancePolicy(companyData.attendancePolicy || (
                  isSystemOwnerContext 

                    ? { roundingEnabled: true, roundingIntervalMinutes: 30, linkWithShifts: true }
                    : { roundingEnabled: false, roundingIntervalMinutes: 0, linkWithShifts: false }
                ));

                // Load features or apply defaults
                const safeFeatures = ensureFeatureDefaults(companyData.features, isSystemOwnerContext);
                setFeatures(safeFeatures);

                setTenantPlan(currentPlan);
                setSchoolEnabled(currentSchoolEnabled);
                setSchoolName(currentSchoolName);

                // Fetch available stores for this company
                const masterRef = collection(db, "sales_master");
                const storeQ = query(
                  masterRef,
                  where("companyId", "==", companyIdToUse),
                  where("itemType", "==", "store")
                );
                const storeSnap = await getDocs(storeQ);
                if (!isCurrent()) return;
                const storeObjects = storeSnap.docs
                  .map(d => ({ id: d.id, ...d.data() } as SalesMasterItem))
                  .filter(d => d.isActive !== false)
                  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
                  
                const stores = storeObjects.map(d => d.name);
                setAvailableStores(stores);
                setAvailableStoreObjects(storeObjects);

                const savedStore = localStorage.getItem(storeSelectionKey(firebaseUser.uid, companyIdToUse));
                if (savedStore && stores.includes(savedStore)) {
                  setSelectedStoreState(savedStore);
                } else if (data.store_name && stores.includes(data.store_name)) {
                  setSelectedStoreState(data.store_name);
                } else if (stores.length > 0) {
                  setSelectedStoreState(stores[0]);
                }
              } catch (e) {
                throw e;
              }
            }
          } else {
            setProfile(null);
            setAvailableStores([]);
          }
        } catch (error) {
          if (!isCurrent()) return;
          console.error("Error fetching staff profile:", error);
          setProfile(null);
        }
      } else {
        try {
          await sessionQueue.run(async () => {
            if (!isCurrent()) return;
            const response = await fetch("/api/auth/session", { method: "DELETE" });
            if (!response.ok) throw new Error("セッションを終了できませんでした");
          });
        } catch (error) {
          console.error("Session cleanup failed", error);
        }
        if (!isCurrent()) return;
        setProfile(null);
      }
      
      if (isCurrent()) setLoading(false);
    });

    return () => { disposed = true; generation.current.next(); unsubscribe(); };
  }, []);

  const value = {
    logout,
    user,
    profile,
    companyId: impersonatingCompanyId || profile?.companyId,
    loading,
    isAdmin: profile?.role === "admin" || profile?.role === "systemOwner" || profile?.role === "companyOwner",
    isSystemOwner: profile?.role === "systemOwner",
    isManager: profile?.role === "manager" || profile?.role === "storeManager" || profile?.role === "admin" || profile?.role === "systemOwner" || profile?.role === "companyOwner",
    isStaff: !!profile,
    isCompanyOwner: profile?.role === "companyOwner",
    selectedStore,
    setSelectedStore,
    availableStores,
    availableStoreObjects,
    tenantPlan,
    schoolEnabled,
    schoolName,
    isSystemOwnerCompany,
    attendancePolicy,
    companyStatus,
    isCompanyActive: profile?.role === "systemOwner" || companyStatus === "active",
    hasFeature,
    isAccountant,
    impersonatingCompanyId,
    stopImpersonating
  };

  // Do not mount private pages (including their data-fetching effects) until
  // Firebase identity, the server session and tenant settings agree.
  const publicPage = isPublicAuthPath(pathname);
  const ready = !loading && !!user && auth.currentUser?.uid === user.uid && !!profile;
  return <AuthContext.Provider value={value}>
    {publicPage || ready ? (
      <React.Fragment key={publicPage ? "public" : `${user!.uid}:${impersonatingCompanyId || profile?.companyId || "system"}:${renderRevision}`}>
        {children}
      </React.Fragment>
    ) : (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50" role="status">
        <p>{loading ? "サロン情報を確認中…" : !user ? "ログイン画面へ移動中…" : "サロン情報を確認できませんでした。再度ログインしてください。"}</p>
        {!loading && <button onClick={() => void logout()}>ログインし直す</button>}
      </div>
    )}
  </AuthContext.Provider>;
}
