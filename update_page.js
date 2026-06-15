const fs = require('fs');
const file = 'src/app/admin/master/system/tenants/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Update imports
content = content.replace(
  'import { getTenants, addTenant, updateTenant, createTenantAdmin, CompanyTenant } from "../tenant-actions";',
  'import { getTenants, addTenant, updateTenant, createTenantAdmin, CompanyTenant, getTenantAdmins, updateTenantAdmin } from "../tenant-actions";'
);

// Add state
content = content.replace(
  'const [userFormData, setUserFormData] = useState({ name: "", email: "", password: "" });',
  `const [userFormData, setUserFormData] = useState({ name: "", email: "", password: "" });
  const [admins, setAdmins] = useState<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);`
);

// Update openUserDialog
content = content.replace(
  `  const openUserDialog = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setUserFormData({ name: "", email: "", password: "" });
    setIsUserDialogOpen(true);
  };`,
  `  const openUserDialog = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setUserFormData({ name: "", email: "", password: "" });
    setAdmins([]);
    setEditingUserId(null);
    setIsUserDialogOpen(true);
    const res = await getTenantAdmins(tenantId);
    if (res.success && res.users) {
      setAdmins(res.users);
    }
  };`
);

// Update handleCreateUser
content = content.replace(
  `  const handleCreateUser = async () => {
    if (!userFormData.name || !userFormData.email || !userFormData.password) {
      toast.error("全ての項目を入力してください");
      return;
    }
    if (userFormData.password.length < 6) {
      toast.error("パスワードは6文字以上にしてください");
      return;
    }
    if (!selectedTenantId) return;

    setUserLoading(true);
    const res = await createTenantAdmin({
      ...userFormData,
      companyId: selectedTenantId
    });
    setUserLoading(false);

    if (res.success) {
      toast.success("初期アカウントを発行しました");
      setIsUserDialogOpen(false);
    } else {
      toast.error("アカウント発行に失敗しました: " + res.error);
    }
  };`,
  `  const handleCreateUser = async () => {
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
  };`
);

// Update button text
content = content.replace(
  '初期アカウント発行\n                  </Button>',
  'アカウント管理\n                  </Button>'
);

// Update Dialog content
content = content.replace(
  `<DialogTitle className="text-xl font-black">初期アカウント発行</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              このテナントの管理者（オーナー）としてログインするためのアカウントを作成します。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">`,
  `<DialogTitle className="text-xl font-black">{editingUserId ? "アカウント情報の編集" : admins.length > 0 ? "アカウント管理" : "初期アカウント発行"}</DialogTitle>
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
            <div className="space-y-4 py-4">`
);

// Update password label and input
content = content.replace(
  '<label className="text-xs font-black text-slate-500">初期パスワード (6文字以上)</label>',
  '<label className="text-xs font-black text-slate-500">{editingUserId ? "新しいパスワード (変更する場合のみ)" : "初期パスワード (6文字以上)"}</label>'
);
content = content.replace(
  'placeholder="password123"',
  'placeholder={editingUserId ? "（変更しない場合は空欄）" : "password123"}'
);

// Update Dialog Footer
content = content.replace(
  `          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)} className="h-11">キャンセル</Button>
            <Button onClick={handleCreateUser} disabled={userLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white h-11">
              {userLoading ? "作成中..." : "発行する"}
            </Button>
          </DialogFooter>`,
  `          </div>
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
          </DialogFooter>`
);

fs.writeFileSync(file, content);
