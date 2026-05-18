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
  isManager: boolean;
  isStaff: boolean;
  selectedStore: string;
  setSelectedStore: (store: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isManager: false,
  isStaff: false,
  selectedStore: "六甲",
  setSelectedStore: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [selectedStore, setSelectedStoreState] = useState<string>("六甲");
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
          const staffRef = collection(db, "staff_profiles");
          const q = query(staffRef, where("email", "==", firebaseUser.email));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const staffDoc = snapshot.docs[0];
            const data = staffDoc.data();
            setProfile({ id: staffDoc.id, ...data } as StaffProfile);
            
            // If no store selected yet, use the profile's store
            if (!localStorage.getItem("selected_store") && data.store_name) {
              setSelectedStore(data.store_name);
            }
          } else {
            setProfile(null);
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
    isAdmin: profile?.role === "admin",
    isManager: profile?.role === "manager" || profile?.role === "admin",
    isStaff: !!profile,
    selectedStore,
    setSelectedStore,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
