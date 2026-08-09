const fs = require('fs');

// expenses/page.tsx
let expensesContent = fs.readFileSync('src/app/admin/expenses/page.tsx', 'utf-8');
expensesContent = expensesContent.replace(/\{STORES\.map/g, '{availableStores.map');
expensesContent = expensesContent.replace(/STORES\.map/g, 'availableStores.map');
fs.writeFileSync('src/app/admin/expenses/page.tsx', expensesContent);

// import/page.tsx
let importContent = fs.readFileSync('src/app/admin/import/page.tsx', 'utf-8');
if (!importContent.includes('const { availableStores } = useAuth();')) {
    importContent = importContent.replace('export default function AdminImportPage() {', 'export default function AdminImportPage() {\n  const { availableStores } = useAuth();');
    if (!importContent.includes('import { useAuth }')) {
        importContent = importContent.replace('import { useState } from "react";', 'import { useState } from "react";\nimport { useAuth } from "@/lib/auth-context";');
    }
}
importContent = importContent.replace(/availableStores\.map\(\(s\)/g, 'availableStores.map((s: string)');
fs.writeFileSync('src/app/admin/import/page.tsx', importContent);

// master-data/page.tsx
let masterDataContent = fs.readFileSync('src/app/admin/master-data/page.tsx', 'utf-8');
masterDataContent = masterDataContent.replace(/\{STORES\.map/g, '{availableStores.map');
if (!masterDataContent.includes('const { availableStores } = useAuth();')) {
    masterDataContent = masterDataContent.replace('export default function AdminMasterData() {', 'export default function AdminMasterData() {\n  const { availableStores } = useAuth();');
}
masterDataContent = masterDataContent.replace(/availableStores\.map\(\(store\)/g, 'availableStores.map((store: string)');
fs.writeFileSync('src/app/admin/master-data/page.tsx', masterDataContent);

// reviews/import/page.tsx
let reviewsContent = fs.readFileSync('src/app/admin/reviews/import/page.tsx', 'utf-8');
if (!reviewsContent.includes('const { availableStores } = useAuth();')) {
    reviewsContent = reviewsContent.replace('export default function ImportReviewsPage() {', 'export default function ImportReviewsPage() {\n  const { availableStores } = useAuth();');
    if (!reviewsContent.includes('import { useAuth }')) {
        reviewsContent = reviewsContent.replace('import { useState } from "react";', 'import { useState } from "react";\nimport { useAuth } from "@/lib/auth-context";');
    }
}
reviewsContent = reviewsContent.replace(/\{STORES\.map/g, '{availableStores.map');
reviewsContent = reviewsContent.replace(/availableStores\.map\(\(s\)/g, 'availableStores.map((s: string)');
fs.writeFileSync('src/app/admin/reviews/import/page.tsx', reviewsContent);

console.log("Fixed errors");
