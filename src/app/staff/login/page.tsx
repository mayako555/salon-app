"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Key, Mail, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function StaffLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let userCredential;
      // 1. Try with passcode suffix first
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password + "_salon");
      } catch (suffixErr) {
        // 2. Fallback to raw password (for standard password logins)
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      
      // Get ID token and set session cookie
      const idToken = await userCredential.user.getIdToken();
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      
      if (!sessionRes.ok) {
        throw new Error("セッションの作成に失敗しました");
      }

      toast.success("ログインしました");
      router.push("/staff-portal");
    } catch (error: any) {
      console.error(error);
      toast.error("ログインに失敗しました。メールアドレスまたは暗証番号を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="bg-white/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-xl border border-white/20 shadow-2xl">
            <Sparkles className="text-blue-400" size={32} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Staff Portal</h1>
          <p className="text-slate-400 font-medium">スタッフ専用ログイン</p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-2xl rounded-[32px] shadow-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest text-center">Authentication</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-4 text-slate-500" size={18} />
                  <Input 
                    type="email" 
                    placeholder="staff@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus:ring-blue-500 focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password / Passcode (PIN)</label>
                <div className="relative">
                  <Key className="absolute left-4 top-4 text-slate-500" size={18} />
                  <Input 
                    type="password" 
                    placeholder="パスワード または 4桁の暗証番号"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus:ring-blue-500 focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn size={20} />
                    <span>LOGIN</span>
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3">
              <AlertCircle className="text-amber-500 shrink-0" size={20} />
              <p className="text-[10px] text-amber-200/70 font-medium leading-relaxed">
                ログインできない場合は管理者にメールアドレスが正しく登録されているか確認してください。
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center mt-8 text-slate-600 text-xs font-bold">
          &copy; 2026 Digital Salon System. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
