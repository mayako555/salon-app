"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Lock, Mail, Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      try {
        await signInWithEmailAndPassword(auth, email, password + "_salon");
        router.push("/dashboard");
      } catch (firstErr: any) {
        if (firstErr.code === "auth/invalid-credential" || firstErr.code === "auth/wrong-password" || firstErr.code === "auth/user-not-found") {
          // パスワード再設定済み・管理者アカウントは入力値をそのまま試す
          await signInWithEmailAndPassword(auth, email, password);
          router.push("/dashboard");
        } else {
          throw firstErr;
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("メールアドレスまたはパスワードが正しくありません。");
      } else if (err.code === "auth/too-many-requests") {
        setError("ログインの失敗が続いたため、一時的にロックされています。しばらく時間をおいてから再度お試しください。");
      } else {
        setError("ログイン中にエラーが発生しました。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError("メールアドレスを入力してください。");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        setError("登録されていないメールアドレスです。");
      } else {
        setError("メールの送信に失敗しました。時間をおいて再試行してください。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
      </div>

      <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-500">
        {isResetMode ? (
          <>
            <CardHeader className="space-y-2 text-center pb-8">
              <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
                <Lock className="text-blue-400 w-8 h-8" />
              </div>
              <CardTitle className="text-3xl font-bold text-white tracking-tight">パスワード再設定</CardTitle>
              <p className="text-slate-400 text-sm">登録したメールアドレスを入力してください</p>
            </CardHeader>
            <form onSubmit={handlePasswordReset}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm font-medium flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}
                {resetSuccess ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-center space-y-2">
                    <CheckCircle2 size={32} className="mx-auto mb-2" />
                    <p className="font-bold">メールを送信しました</p>
                    <p className="text-xs opacity-80">受信トレイのリンクからパスワードを再設定してください。</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Mail size={16} />
                      メールアドレス
                    </label>
                    <Input 
                      type="email" 
                      placeholder="staff@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 focus:ring-blue-500/30 focus:border-blue-500/50"
                    />
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-4 pb-8 flex flex-col gap-4">
                {!resetSuccess && (
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : "リセットメールを送信"}
                  </Button>
                )}
                <Button 
                  type="button" 
                  variant="ghost"
                  className="w-full h-12 text-slate-400 hover:text-white hover:bg-white/5"
                  onClick={() => {
                    setIsResetMode(false);
                    setResetSuccess(false);
                    setError("");
                  }}
                >
                  ログイン画面へ戻る
                </Button>
              </CardFooter>
            </form>
          </>
        ) : (
          <>
            <CardHeader className="space-y-2 text-center pb-8">
              <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/30">
                <Sparkles className="text-emerald-400 w-8 h-8" />
              </div>
              <CardTitle className="text-3xl font-bold text-white tracking-tight">SALON APP</CardTitle>
              <p className="text-slate-400 text-sm">サロン管理システムにログイン</p>
            </CardHeader>
            
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm font-medium animate-in shake-in duration-300">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Mail size={16} />
                    メールアドレス
                  </label>
                  <Input 
                    type="email" 
                    placeholder="staff@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Lock size={16} />
                    パスワード
                  </label>
                  <Input 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                  />
                </div>
              </CardContent>
              
              <CardFooter className="pt-4 pb-8 flex flex-col gap-4">
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg transition-all hover:scale-[1.02] active:scale-95"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin" size={20} />
                      <span>ログイン中...</span>
                    </div>
                  ) : (
                    "ログイン"
                  )}
                </Button>
                
                <div className="text-center">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setError("");
                      setResetEmail(email);
                    }}
                    className="text-slate-400 text-xs hover:text-white hover:underline transition-all"
                  >
                    パスワードをお忘れの方はこちら
                  </button>
                </div>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
