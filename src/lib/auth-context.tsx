"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { StaffProfile, StaffRole } from "@/app/staff/actions";
import { SalesMasterItem, AttendancePolicy, FeatureKey, FeatureSettings, ensureFeatureDefaults } from "@/types/master";

interface AuthContextType {
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
  hasFeature: (feature: FeatureKey) => boolean;
}

const AuthContext = createContext<AuthContextType>({
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
  hasFeature: () => false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

  // Stop impersonating function
  const stopImpersonating = () => {
    document.cookie = "impersonated_company_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/admin/master/system/tenants";
  };

  const hasFeature = (feature: FeatureKey) => {
    return !!features[feature];
  };
  const [loading, setLoading] = useState(true);

  // Persistence for selected store
  useEffect(() => {
    const saved = localStorage.getItem("selected_store");
    if (saved) setSelectedStoreState(saved);
  }, []);

  const setSelectedStore = (store: string) => {
    setSelectedStoreState(store);
    localStorage.setItem("selected_store", store);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser && firebaseUser.email) {
        try {
          // Ensure session cookie is set for server actions
          const token = await firebaseUser.getIdToken();
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: token })
          }).catch(err => console.error("Failed to set session cookie:", err));

          const staffRef = collection(db, "staff_profiles");
          const q = query(staffRef, where("email", "==", firebaseUser.email));
          
          // Add timeout to prevent infinite hang if Firestore fails to connect
          const getDocsWithTimeout = Promise.race([
            getDocs(q),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore auth fetch timeout")), 8000))
          ]);
          
          const snapshot = await getDocsWithTimeout as any;
          
          if (!snapshot.empty) {
            const staffDoc = snapshot.docs[0];
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

            if (!companyIdToUse && data.role !== "systemOwner") {
              console.error("会社情報が未設定です");
              setProfile(null);
              setLoading(false);
              return;
            }
            
            if (companyIdToUse) {
              try {
                const companyDoc = await getDoc(doc(db, "companies", companyIdToUse));
                const companyData = companyDoc.exists() ? companyDoc.data() : {};
                
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
                const storeQ = query(masterRef, where("itemType", "==", "store"));
                const storeSnap = await getDocs(storeQ);
                const storeObjects = storeSnap.docs
                  .map(d => ({ id: d.id, ...d.data() } as SalesMasterItem))
                  .filter(d => d.companyId === companyIdToUse && d.isActive !== false)
                  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
                  
                const stores = storeObjects.map(d => d.name);
                setAvailableStores(stores);
                setAvailableStoreObjects(storeObjects);

                const savedStore = localStorage.getItem("selected_store");
                if (savedStore && stores.includes(savedStore)) {
                  setSelectedStoreState(savedStore);
                } else if (data.store_name && stores.includes(data.store_name)) {
                  setSelectedStore(data.store_name);
                } else if (stores.length > 0) {
                  setSelectedStore(stores[0]);
                }
              } catch (e) {
                console.error("Failed to fetch company info:", e);
              }
            }
          } else {
            const fallbackName = firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : "ゲスト");
            setProfile({
              id: "guest_" + firebaseUser.uid,
              name: fallbackName,
              role: "guest",
              companyId: undefined,
              employment_status: "active",
              is_active: true,
              is_trainee: false,
              employment_type: "employee",
              max_holiday_requests: 3
            } as any);
            setAvailableStores([]);
          }
        } catch (error) {
          console.error("Error fetching staff profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    companyId: impersonatingCompanyId || profile?.companyId,
    loading,
    isAdmin: profile?.role === "admin" || profile?.role === "systemOwner" || profile?.role === "companyOwner",
    isSystemOwner: profile?.role === "systemOwner",
    isManager: profile?.role === "manager" || profile?.role === "storeManager" || profile?.role === "admin" || profile?.role === "systemOwner" || profile?.role === "companyOwner",
    isStaff: true,
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
    hasFeature,
    isAccountant,
    impersonatingCompanyId,
    stopImpersonating
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
