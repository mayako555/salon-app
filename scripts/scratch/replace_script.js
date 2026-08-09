const fs = require('fs');

function replaceInFile(filePath, search, replace) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.split(search).join(replace);
    fs.writeFileSync(filePath, content);
    console.log("Updated", filePath);
  } else {
    console.log("Not found", filePath);
  }
}

// 1. src/app/sales/page.tsx
let salesContent = fs.readFileSync('src/app/sales/page.tsx', 'utf-8');
salesContent = salesContent.replace(
  'const { profile, loading: authLoading } = useAuth();',
  'const { profile, loading: authLoading, availableStores } = useAuth();'
);
salesContent = salesContent.replace(
  'const stores = ["六甲", "元町", "神戸"];',
  'const stores = availableStores && availableStores.length > 0 ? availableStores : ["メイン店舗"];'
);
fs.writeFileSync('src/app/sales/page.tsx', salesContent);

// 2. src/app/entry/page.tsx
replaceInFile('src/app/entry/page.tsx', 'Jasmine Lash', '当サロン');

// 3. src/app/admin/settings/actions.ts
let settingsActionsContent = fs.readFileSync('src/app/admin/settings/actions.ts', 'utf-8');
settingsActionsContent = settingsActionsContent.replace(
  `const DEFAULT_STORE_SETTINGS: Record<string, any> = {
    "六甲": { startHour: 8, endHour: 22, slotDuration: 30 },
    "神戸": { startHour: 8, endHour: 22, slotDuration: 15 },
    "元町": { startHour: 8, endHour: 22, slotDuration: 5 }
  };`,
  `const DEFAULT_STORE_SETTINGS: Record<string, any> = {
    "メイン店舗": { startHour: 8, endHour: 22, slotDuration: 30 }
  };`
);
fs.writeFileSync('src/app/admin/settings/actions.ts', settingsActionsContent);

// 4. src/app/admin/expenses/page.tsx
let adminExpensesContent = fs.readFileSync('src/app/admin/expenses/page.tsx', 'utf-8');
adminExpensesContent = adminExpensesContent.replace(
  'const STORES = ["六甲", "元町", "神戸"];',
  '// STORES array removed'
);
adminExpensesContent = adminExpensesContent.replace(
  'const [newStore, setNewStore] = useState("六甲");',
  'const [newStore, setNewStore] = useState(availableStores[0] || "メイン店舗");'
);
// fix fallback
adminExpensesContent = adminExpensesContent.replace(
  'store_name: store === "すべて" ? "六甲" : store,',
  'store_name: store === "すべて" ? (availableStores[0] || "メイン店舗") : store,'
);
// replace mapping if any
adminExpensesContent = adminExpensesContent.replace(
  `{["すべて", "六甲", "元町", "神戸"].map(s =>`,
  `{["すべて", ...availableStores].map(s =>`
);
fs.writeFileSync('src/app/admin/expenses/page.tsx', adminExpensesContent);

// 5. src/app/admin/master-data/page.tsx
let adminMasterDataContent = fs.readFileSync('src/app/admin/master-data/page.tsx', 'utf-8');
adminMasterDataContent = adminMasterDataContent.replace(
  'const STORES = ["六甲", "神戸", "元町"];',
  ''
);
adminMasterDataContent = adminMasterDataContent.replace(
  'const [selectedStore, setSelectedStore] = useState<string>("六甲");',
  'const [selectedStore, setSelectedStore] = useState<string>(availableStores[0] || "メイン店舗");'
);
adminMasterDataContent = adminMasterDataContent.replace(
  '{STORES.map((s) => (',
  '{availableStores.map((s) => ('
);
fs.writeFileSync('src/app/admin/master-data/page.tsx', adminMasterDataContent);

// 6. src/app/admin/master/operations/page.tsx
let adminOpsContent = fs.readFileSync('src/app/admin/master/operations/page.tsx', 'utf-8');
adminOpsContent = adminOpsContent.replace(
  'store: category.includes("六甲") ? "六甲" : "共通",',
  'store: "共通",'
);
adminOpsContent = adminOpsContent.replace(
  `{["all", "共通", "六甲", "神戸", "元町"].map(s => (`,
  `{["all", "共通", ...availableStores].map(s => (`
);
adminOpsContent = adminOpsContent.replace(
  `<option value="六甲">六甲</option>
                      <option value="神戸">神戸</option>
                      <option value="元町">元町</option>`,
  `{availableStores.map(s => <option key={s} value={s}>{s}</option>)}`
);
fs.writeFileSync('src/app/admin/master/operations/page.tsx', adminOpsContent);

// 7. src/app/admin/import/actions.ts
replaceInFile('src/app/admin/import/actions.ts', 'main_store: c.main_store || "六甲",', 'main_store: c.main_store || "メイン店舗",');

// 8. src/app/admin/import/page.tsx
let adminImportContent = fs.readFileSync('src/app/admin/import/page.tsx', 'utf-8');
adminImportContent = adminImportContent.replace(
  'const [storeName, setStoreName] = useState("六甲");',
  'const [storeName, setStoreName] = useState(availableStores[0] || "メイン店舗");'
);
adminImportContent = adminImportContent.replace(
  `{["六甲", "元町", "神戸"].map((s) => (`,
  `{availableStores.map((s) => (`
);
fs.writeFileSync('src/app/admin/import/page.tsx', adminImportContent);

// 9. src/app/admin/reviews/import/page.tsx
let adminReviewsImportContent = fs.readFileSync('src/app/admin/reviews/import/page.tsx', 'utf-8');
adminReviewsImportContent = adminReviewsImportContent.replace(
  'const [storeName, setStoreName] = useState("六甲");',
  'const [storeName, setStoreName] = useState(availableStores[0] || "メイン店舗");'
);
adminReviewsImportContent = adminReviewsImportContent.replace(
  'const STORES = ["六甲", "元町", "神戸"];',
  ''
);
adminReviewsImportContent = adminReviewsImportContent.replace(
  'setStoreName((staff as any).store || "六甲");',
  'setStoreName((staff as any).store || availableStores[0] || "メイン店舗");'
);
adminReviewsImportContent = adminReviewsImportContent.replace(
  '{STORES.map((s) => (',
  '{availableStores.map((s) => ('
);
fs.writeFileSync('src/app/admin/reviews/import/page.tsx', adminReviewsImportContent);

// 10. src/app/staff-portal/sales/page.tsx
replaceInFile('src/app/staff-portal/sales/page.tsx', 'defaultStoreName="六甲"', 'defaultStoreName="メイン店舗"');

// 11. src/app/staff-portal/rules/page.tsx
replaceInFile('src/app/staff-portal/rules/page.tsx', 'Jasmine Lash', '当サロン');

// 12. src/app/manuals/page.tsx
replaceInFile('src/app/manuals/page.tsx', 'Jasmine Lash', '当サロン');

// 13. src/app/inventory/inventory-actions.ts
let invActionsContent = fs.readFileSync('src/app/inventory/inventory-actions.ts', 'utf-8');
invActionsContent = invActionsContent.replace(
  'return ["六甲", "神戸", "元町"];',
  'return ["メイン店舗"];'
);
invActionsContent = invActionsContent.replace(
  'return ["六甲"]; // フォールバック',
  'return ["メイン店舗"]; // フォールバック'
);
invActionsContent = invActionsContent.replace(
  'return ["六甲"];',
  'return ["メイン店舗"];'
);
fs.writeFileSync('src/app/inventory/inventory-actions.ts', invActionsContent);

// 14. src/app/shifts/ShiftsView.tsx
let shiftsViewContent = fs.readFileSync('src/app/shifts/ShiftsView.tsx', 'utf-8');
shiftsViewContent = shiftsViewContent.replace(
  `{["神戸", "元町", "六甲"].map((store) => {`,
  `{availableStores.map((store) => {`
);
fs.writeFileSync('src/app/shifts/ShiftsView.tsx', shiftsViewContent);

// 15. src/app/shifts/ShiftEditDialog.tsx
replaceInFile('src/app/shifts/ShiftEditDialog.tsx', 'availableStores[0] : "神戸";', 'availableStores[0] : "メイン店舗";');

// 16. src/app/shifts/BulkShiftDialog.tsx
replaceInFile('src/app/shifts/BulkShiftDialog.tsx', 'availableStores[0] : "神戸";', 'availableStores[0] : "メイン店舗";');

// 17. src/app/payroll/StatementDialog.tsx & EditStatementDialog.tsx
replaceInFile('src/app/payroll/StatementDialog.tsx', 'Jasmine Lash', '当サロン');
let editStatementContent = fs.readFileSync('src/app/payroll/EditStatementDialog.tsx', 'utf-8');
editStatementContent = editStatementContent.replace(/六甲/g, 'メイン店舗');
editStatementContent = editStatementContent.replace(/神戸/g, '店舗B');
editStatementContent = editStatementContent.replace(/元町/g, '店舗C');
fs.writeFileSync('src/app/payroll/EditStatementDialog.tsx', editStatementContent);

// 18. src/app/staff/StaffFormDialog.tsx
replaceInFile('src/app/staff/StaffFormDialog.tsx', '"Jasmine Lash"', '"当サロン"');

// 19. src/lib/line.ts
replaceInFile('src/lib/line.ts', '"六甲道"', '"メイン店舗"');
replaceInFile('src/lib/line.ts', 'Jasmine Lash ${storeName}店', '当サロン ${storeName}');

// 20. src/app/staff-portal/customers/[id]/page.tsx
let staffCustContent = fs.readFileSync('src/app/staff-portal/customers/[id]/page.tsx', 'utf-8');
staffCustContent = staffCustContent.replace(
  `const acc: any = {};
    if (store === '六甲道') acc[store] = process.env.NEXT_PUBLIC_LINE_OA_ROKKO || process.env.NEXT_PUBLIC_LINE_OA_ID || "@dummy_line_id";
    else if (store === '神戸') acc[store] = process.env.NEXT_PUBLIC_LINE_OA_KOBE || process.env.NEXT_PUBLIC_LINE_OA_ID || "@dummy_line_id";
    else if (store === '元町') acc[store] = process.env.NEXT_PUBLIC_LINE_OA_MOTOMACHI || process.env.NEXT_PUBLIC_LINE_OA_ID || "@dummy_line_id";
    else acc[store] = process.env.NEXT_PUBLIC_LINE_OA_ID || "@dummy_line_id";
    return acc;`,
  `const acc: any = {};
    acc[store] = process.env[\`NEXT_PUBLIC_LINE_OA_\${store}\`] || process.env.NEXT_PUBLIC_LINE_OA_ID || "@dummy_line_id";
    return acc;`
);
staffCustContent = staffCustContent.replace(
  `const acc: any = {};
    if (store === '六甲道') acc[store] = process.env.NEXT_PUBLIC_LIFF_ID_ROKKO || process.env.NEXT_PUBLIC_LIFF_ID || "2009912937-1KgShdZB";
    else if (store === '神戸') acc[store] = process.env.NEXT_PUBLIC_LIFF_ID_KOBE || process.env.NEXT_PUBLIC_LIFF_ID || "2009912937-1KgShdZB";
    else if (store === '元町') acc[store] = process.env.NEXT_PUBLIC_LIFF_ID_MOTOMACHI || process.env.NEXT_PUBLIC_LIFF_ID || "2009912937-1KgShdZB";
    else acc[store] = process.env.NEXT_PUBLIC_LIFF_ID || "2009912937-1KgShdZB";
    return acc;`,
  `const acc: any = {};
    acc[store] = process.env[\`NEXT_PUBLIC_LIFF_ID_\${store}\`] || process.env.NEXT_PUBLIC_LIFF_ID || "2009912937-1KgShdZB";
    return acc;`
);
fs.writeFileSync('src/app/staff-portal/customers/[id]/page.tsx', staffCustContent);

// 21. src/app/link-line/[customerId]/page.tsx
let linkLineContent = fs.readFileSync('src/app/link-line/[customerId]/page.tsx', 'utf-8');
linkLineContent = linkLineContent.replace(
  `        if (store === '六甲道') liffId = process.env.NEXT_PUBLIC_LIFF_ID_ROKKO || liffId;
        else if (store === '神戸') liffId = process.env.NEXT_PUBLIC_LIFF_ID_KOBE || liffId;
        else if (store === '元町') liffId = process.env.NEXT_PUBLIC_LIFF_ID_MOTOMACHI || liffId;`,
  `        liffId = process.env[\`NEXT_PUBLIC_LIFF_ID_\${store}\`] || liffId;`
);
fs.writeFileSync('src/app/link-line/[customerId]/page.tsx', linkLineContent);

console.log("Done refactoring hardcoded strings.");
