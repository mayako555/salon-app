"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Bell, Search, User, LogOut, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <div className="min-h-screen bg-slate-950">{children}</div>;
  }

  if (
    pathname.startsWith("/staff-portal") || 
    pathname.startsWith("/customers/intake") || 
    pathname.startsWith("/entry") || 
    pathname.startsWith("/attendance/kiosk") ||
    pathname.startsWith("/staff/login") ||
    pathname.startsWith("/link-line")
  ) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="app-shell flex w-full bg-slate-50 overflow-hidden text-slate-900">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer (Sidebar overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="relative z-50 md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            {/* Drawer Container */}
            <div className="fixed inset-0 flex">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative flex w-full max-w-xs flex-1 flex-col bg-white"
              >
                {/* Close Button */}
                <div className="absolute right-3 top-3 z-10">
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Sidebar Drawer Body */}
                <div className="h-full overflow-y-auto" onClick={() => setIsMobileMenuOpen(false)}>
                  <Sidebar />
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8 shadow-sm z-10">
          <div className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 md:hidden transition-colors"
              aria-label="メニューを開く"
            >
              <Menu className="h-5 w-5" />
            </button>
            <form className="flex w-full md:ml-0" action="#" method="GET">
              <label htmlFor="search-field" className="sr-only">Search</label>
              <div className="relative w-full text-slate-400 focus-within:text-slate-600">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </div>
                <input
                  id="search-field"
                  className="block h-full w-full border-transparent py-2 pl-8 pr-3 text-slate-900 placeholder-slate-400 focus:border-transparent focus:placeholder-slate-300 focus:outline-none focus:ring-0 sm:text-sm bg-transparent"
                  placeholder="スタッフや売上を検索..."
                  type="search"
                  name="search"
                />
              </div>
            </form>
          </div>
          <div className="ml-4 flex items-center md:ml-6 gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-xs font-bold text-slate-700">{profile?.name || user?.email || "ゲスト"}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{profile?.role || "閲覧のみ"}</span>
            </div>
            
            <button
              onClick={handleLogout}
              type="button"
              className="rounded-full bg-white p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 focus:outline-none transition-colors"
              title="ログアウト"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
            
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-md">
                <User size={18} />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto focus:outline-none">
          <div className="py-4 md:py-8 px-4 md:px-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
