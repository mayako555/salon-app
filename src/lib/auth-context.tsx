"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { StaffProfile, StaffRole } from "@/app/staff/actions";

interface AuthContextType {
  user: User | null;
  profile: StaffProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSystemOwner: boolean;
  isManager: boolean;
  isStaff: boolean;
  selectedStore: string;
  setSelectedStore: (store: string) => void;
  availableStores: string[];
  tenantPlan: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isSystemOwner: false,
  isManager: false,
  isStaff: false,
  selectedStore: "",
  setSelectedStore: () => {},
  availableStores: [],
  tenantPlan: "Standard",
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [selectedStore, setSelectedStoreState] = useState<string>("");
  const [availableStores, setAvailableStores] = useState<string[]>([]);
  const [tenantPlan, setTenantPlan] = useState<string>("Standard");
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
            
            // Fetch tenant plan
            let currentPlan = "Standard";
            const companyIdToUse = data.companyId || "company_default";
            
            if (companyIdToUse !== "company_default") {
              try {
                const companyDoc = await getDoc(doc(db, "companies", companyIdToUse));
                if (companyDoc.exists()) {
                  currentPlan = companyDoc.data().plan || "Standard";
                }
              } catch (e) {
                console.error("Failed to fetch company plan:", e);
              }
            }
            setTenantPlan(currentPlan);

            // Fetch available stores for this company
            try {
              const masterRef = collection(db, "sales_master");
              // Query all stores, filter by companyId in memory in case of missing compound index
              const storeQ = query(masterRef, where("itemType", "==", "store"));
              const storeSnap = await getDocs(storeQ);
              const stores = storeSnap.docs
                .map(d => d.data())
                .filter(d => (d.companyId || "company_default") === companyIdToUse && d.isActive !== false)
                .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                .map(d => d.name);
                
              const finalStores = stores.length > 0 ? stores : ["六甲店", "神戸店", "元町店"]; // Fallback
              setAvailableStores(finalStores);

              const savedStore = localStorage.getItem("selected_store");
              if (savedStore && finalStores.includes(savedStore)) {
                setSelectedStoreState(savedStore);
              } else if (data.store_name && finalStores.includes(data.store_name)) {
                setSelectedStore(data.store_name);
              } else if (finalStores.length > 0) {
                setSelectedStore(finalStores[0]);
              }
            } catch (err) {
              console.error("Error fetching stores:", err);
              const defaultStores = ["六甲店", "神戸店", "元町店"];
              setAvailableStores(defaultStores);
              setSelectedStore(defaultStores[0]);
            }
          } else {
            // No profile found, but user is authenticated via Auth. Give them default systemOwner access.
            const defaultStores = ["六甲店", "神戸店", "元町店"];
            const fallbackName = firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : "管理者");
            setProfile({
              id: "admin_" + firebaseUser.uid,
              name: fallbackName,
              role: "systemOwner",
              companyId: "company_default",
              employment_status: "active",
              is_active: true,
              is_trainee: false,
              employment_type: "employee",
              max_holiday_requests: 3
            } as any);
            setAvailableStores(defaultStores);
            setSelectedStore(defaultStores[0]);
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
    loading,
    isAdmin: profile?.role === "admin" || profile?.role === "systemOwner",
    isSystemOwner: profile?.role === "systemOwner" || (profile?.role === "admin" && (!profile?.companyId || profile?.companyId === "company_default")),
    isManager: profile?.role === "manager" || profile?.role === "storeManager" || profile?.role === "admin" || profile?.role === "systemOwner",
    isStaff: true,
    selectedStore,
    setSelectedStore,
    availableStores,
    tenantPlan
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
