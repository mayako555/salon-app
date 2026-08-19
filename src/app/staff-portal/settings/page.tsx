"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ProfileSettingsPage() {
  const { user, profile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (newPassword.length < 6) {
      setError("新しいパスワードは6文字以上で入力してください。");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("新しいパスワードと確認用パスワードが一致しません。");
      return;
    }
    
    if (!user || !user.email) {
      setError("ユーザー情報が取得できません。再ログインしてください。");
      return;
    }

    setLoading(true);
    try {
      // 1. 再認証
      // Note: If the staff has _salon appended in their auth logic, we need to check if they logged in with _salon
      let credential = EmailAuthProvider.credential(user.email, currentPassword);
      try {
        await reauthenticateWithCredential(user, credential);
      } catch (authErr: any) {
        if (authErr.code === "auth/invalid-credential" || authErr.code === "auth/wrong-password") {
          // Try with _salon appended
          credential = EmailAuthProvider.credential(user.email, currentPassword + "_salon");
          try {
            await reauthenticateWithCredential(user, credential);
          } catch (authErr2: any) {
            throw authErr2;
          }
        } else {
          throw authErr;
        }
      }

      // 2. パスワード更新
      // Admin/Owner users might have standard password, staff might have _salon appended.
      // We will save it without _salon if they want, but the login page appends _salon automatically.
      // To be consistent, if they re-authenticated with _salon, we should probably set new password with _salon.
      const usesSalonPassword = profile?.role === "staff" || profile?.role === "manager" || profile?.role === "storeManager";
      await updatePassword(user, usesSalonPassword ? newPassword + "_salon" : newPassword);
      
      setSuccess("パスワードを更新しました。");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("現在のパスワードが正しくありません。");
      } else {
        setError("パスワードの更新に失敗しました。時間をおいて再試行してください。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">プロフィール設定</h1>
        <p className="text-slate-500 text-sm font-bold mt-1">アカウント情報の確認やセキュリティ設定を変更します。</p>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-800">
            <KeyRound className="text-slate-500" size={20} />
            パスワード変更
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleChangePassword}>
          <CardContent className="space-y-4 pt-6">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm font-bold flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 text-sm font-bold flex items-center gap-2">
                <CheckCircle2 size={16} /> {success}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">現在のパスワード</label>
              <Input 
                type="password" 
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                className="bg-slate-50 border-slate-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">新しいパスワード</label>
              <Input 
                type="password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="bg-slate-50 border-slate-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">新しいパスワード（確認用）</label>
              <Input 
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="bg-slate-50 border-slate-200"
              />
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 py-4 flex justify-end">
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              パスワードを更新
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
