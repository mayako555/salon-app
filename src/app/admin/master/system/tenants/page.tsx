"use client";

import { useEffect, useState } from "react";
import { getTenants, addTenant, updateTenant, createTenantAdmin, CompanyTenant, getTenantAdmins, updateTenantAdmin } from "../tenant-actions";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, Edit2, ShieldCheck, Check, X, ArrowLeft, Key } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function TenantsPage() {
  const { isSystemOwner } = useAuth();
  const [tenants, setTenants] = useState<CompanyTenant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", plan: "Standard", status: "active" as "active"|"inactive", fee: 0, startDate: "", contractPdfUrl: "", termsPdfUrl: "" });

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState({ name: "", email: "", password: "" });
  const [admins, setAdmins] = useState<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isSystemOwner) {
      loadTenants();
    }
  }, [isSystemOwner]);

  const loadTenants = async () => {
    setLoading(true);
    const data = await getTenants();
    setTenants(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("企業名を入力してください");
      return;
    }

    if (editingId) {
      const res = await updateTenant(editingId, formData);
      if (res.success) {
        toast.success("テナント情報を更新しました");
        setIsDialogOpen(false);
        loadTenants();
      } else {
        toast.error("更新に失敗しました");
      }
    } else {
      const res = await addTenant(formData);
      if (res.success) {
        toast.success("テナントを追加しました");
        setIsDialogOpen(false);
        loadTenants();
      } else {
        toast.error("追加に失敗しました");
      }
    }
  };

  const openAddDialog = () => {
    setEditingId(null);
    setFormData({ name: "", plan: "Standard", status: "active", fee: 0, startDate: "", contractPdfUrl: "", termsPdfUrl: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (tenant: CompanyTenant) => {
    setEditingId(tenant.id);
    setFormData({ 
      name: tenant.name, 
      plan: tenant.plan, 
      status: tenant.status,
      fee: tenant.fee || 0,
      startDate: tenant.startDate || "",
      contractPdfUrl: tenant.contractPdfUrl || "",
      termsPdfUrl: tenant.termsPdfUrl || ""
    });
    setIsDialogOpen(true);
  };

  const openUserDialog = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setUserFormData({ name: "", email: "", password: "" });
    setAdmins([]);
    setEditingUserId(null);
    setIsUserDialogOpen(true);
    const res = await getTenantAdmins(tenantId);
    if (res.success && res.users) {
      setAdmins(res.users);
    }
  };

  const handleCreateUser = async () => {
    if (!userFormData.name || !userFormData.email) {
      toast.error("名前とメールアドレスは必須です");
      return;
    }
    if (!editingUserId && (!userFormData.password || userFormData.password.length < 6)) {
      toast.error("パスワードは6文字以上にしてください");
      return;
    }
    if (editingUserId && userFormData.password && userFormData.password.length < 6) {
      toast.error("パスワードは6文字以上にしてください");
      return;
    }
    if (!selectedTenantId) return;

    setUserLoading(true);
    let res;
    if (editingUserId) {
      res = await updateTenantAdmin(editingUserId, {
        name: userFormData.name,
        email: userFormData.email,
        password: userFormData.password || undefined
      });
    } else {
      res = await createTenantAdmin({
        ...userFormData,
        companyId: selectedTenantId
      });
    }
    setUserLoading(false);

    if (res.success) {
      toast.success(editingUserId ? "アカウント情報を更新しました" : "アカウントを発行しました");
      setIsUserDialogOpen(false);
    } else {
      toast.error((editingUserId ? "更新" : "発行") + "に失敗しました: " + res.error);
    }
  };

  if (!isSystemOwner) {
    return <div className="p-8 text-center text-slate-500 font-bold">権限がありません。</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin/master/system" className="text-slate-400 hover:text-indigo-600 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <Badge variant="outline" className="text-indigo-600 bg-indigo-50 border-indigo-200">System Master</Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="text-indigo-600" /> テナント管理
          </h1>
          <p className="text-slate-500 font-medium">SaaSを利用する各企業（会社ID）の追加と契約状態の管理</p>
        </div>
        <Button onClick={openAddDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md h-11 px-6">
          <Plus size={18} className="mr-2" />
          テナント追加
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-bold">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map(tenant => (
            <Card key={tenant.id} className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg font-black text-slate-800">{tenant.name}</CardTitle>
                  <CardDescription className="text-xs font-mono mt-1 text-slate-400">ID: {tenant.id}</CardDescription>
                </div>
                <Badge variant={tenant.status === 'active' ? "default" : "secondary"} className={tenant.status === 'active' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-300"}>
                  {tenant.status === 'active' ? "稼働中" : "停止中"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
                      <ShieldCheck size={16} className="text-indigo-400" />
                      プラン: {tenant.plan}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(tenant)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                      <Edit2 size={16} />
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openUserDialog(tenant.id)} 
                    className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold"
                  >
                    <Key size={14} className="mr-2" />
                    アカウント管理
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {tenants.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400 font-bold bg-white rounded-2xl border border-slate-200 border-dashed">
              登録されているテナントがありません
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editingId ? "テナントの編集" : "新規テナント追加"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">企業名 (テナント名)</label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="株式会社〇〇"
                className="font-bold h-11"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">契約プラン</label>
              <select
                className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.plan}
                onChange={e => setFormData({...formData, plan: e.target.value})}
              >
                <option value="Solo">Solo (ひとりサロン・スタッフなし)</option>
                <option value="Standard">Standard (スタッフ管理あり)</option>
                <option value="Premium">Premium (高度分析・全機能)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">ステータス</label>
              <select
                className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as "active"|"inactive"})}
              >
                <option value="active">稼働中</option>
                <option value="inactive">停止中</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">月額利用料金（円）</label>
              <Input 
                type="number"
                value={formData.fee} 
                onChange={e => setFormData({...formData, fee: Number(e.target.value)})}
                placeholder="10000"
                className="font-bold h-11"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">契約開始日</label>
              <Input 
                type="date"
                value={formData.startDate} 
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="font-bold h-11"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">契約書PDF URL</label>
              <Input 
                value={formData.contractPdfUrl} 
                onChange={e => setFormData({...formData, contractPdfUrl: e.target.value})}
                placeholder="https://..."
                className="font-bold h-11"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">利用規約PDF URL</label>
              <Input 
                value={formData.termsPdfUrl} 
                onChange={e => setFormData({...formData, termsPdfUrl: e.target.value})}
                placeholder="https://..."
                className="font-bold h-11"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-11">キャンセル</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white h-11">
              {editingId ? "更新する" : "追加する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* アカウント発行ダイアログ */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editingUserId ? "アカウント情報の編集" : admins.length > 0 ? "アカウント管理" : "初期アカウント発行"}</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              {editingUserId ? "パスワードを変更する場合は新しいパスワードを入力してください。" : admins.length > 0 ? "登録済みのアカウントを選択して編集するか、新規作成してください。" : "このテナントの管理者（オーナー）としてログインするためのアカウントを作成します。"}
            </DialogDescription>
          </DialogHeader>
          
          {!editingUserId && admins.length > 0 ? (
            <div className="space-y-3 py-4">
              <p className="text-xs font-bold text-slate-500">登録済みアカウント</p>
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                  <div>
                    <p className="font-bold text-sm text-slate-800">{admin.name}</p>
                    <p className="text-xs text-slate-500">{admin.email}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setEditingUserId(admin.id); setUserFormData({ name: admin.name || "", email: admin.email || "", password: "" }); }}>
                    編集
                  </Button>
                </div>
              ))}
              <div className="pt-4 flex justify-end">
                 <Button variant="outline" size="sm" onClick={() => { setEditingUserId(null); setUserFormData({ name: "", email: "", password: "" }); setAdmins([]); }}>
                    + 新規管理者を追加
                 </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">管理者名</label>
              <Input 
                value={userFormData.name} 
                onChange={e => setUserFormData({...userFormData, name: e.target.value})}
                placeholder="田中 太郎"
                className="font-bold h-11"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">メールアドレス (ログインID)</label>
              <Input 
                type="email"
                value={userFormData.email} 
                onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                placeholder="admin@example.com"
                className="font-bold h-11"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">{editingUserId ? "新しいパスワード (変更する場合のみ)" : "初期パスワード (6文字以上)"}</label>
              <Input 
                type="text"
                value={userFormData.password} 
                onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                placeholder={editingUserId ? "（変更しない場合は空欄）" : "password123"}
                className="font-bold h-11"
              />
            </div>
          </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { if (editingUserId && admins.length > 0) { setEditingUserId(null); } else { setIsUserDialogOpen(false); } }} className="h-11">
              {editingUserId && admins.length > 0 ? "戻る" : "キャンセル"}
            </Button>
            {(!admins.length || editingUserId) && (
              <Button onClick={handleCreateUser} disabled={userLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white h-11">
                {userLoading ? "処理中..." : editingUserId ? "更新する" : "発行する"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
