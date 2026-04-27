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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isManager: false,
  isStaff: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser && firebaseUser.email) {
        // Fetch staff profile by email
        try {
          const staffRef = collection(db, "staff_profiles");
          const q = query(staffRef, where("email", "==", firebaseUser.email));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const staffDoc = snapshot.docs[0];
            setProfile({ id: staffDoc.id, ...staffDoc.data() } as StaffProfile);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
