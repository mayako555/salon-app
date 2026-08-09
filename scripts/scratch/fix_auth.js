const fs = require('fs');

function fixAuth(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('availableStores') && !content.includes('const { availableStores } = useAuth();')) {
    // try to find where useAuth is called
    if (content.includes('const { profile } = useAuth();')) {
       content = content.replace('const { profile } = useAuth();', 'const { profile, availableStores } = useAuth();');
    } else if (content.includes('useAuth();')) {
       content = content.replace('const auth = useAuth();', 'const auth = useAuth();\n  const { availableStores } = auth;');
    } else {
       // Just insert it at the beginning of the component
       content = content.replace('export default function', 'import { useAuth } from "@/lib/auth-context";\nexport default function');
       content = content.replace('export default function AdminImportPage() {', 'export default function AdminImportPage() {\n  const { availableStores } = useAuth();');
       content = content.replace('export default function ImportReviewsPage() {', 'export default function ImportReviewsPage() {\n  const { availableStores } = useAuth();');
       content = content.replace('export default function AdminMasterData() {', 'export default function AdminMasterData() {\n  const { availableStores } = useAuth();');
    }
  }
  
  // also handle master/operations
  if (filePath.includes('operations')) {
     if (content.includes('availableStores') && !content.includes('availableStores } = useAuth();')) {
         content = content.replace('export default function MasterOperationsPage() {', 'export default function MasterOperationsPage() {\n  const { availableStores } = useAuth();');
         content = content.replace('import { useState, useEffect } from "react";', 'import { useState, useEffect } from "react";\nimport { useAuth } from "@/lib/auth-context";');
     }
  }
  
  fs.writeFileSync(filePath, content);
}

fixAuth('src/app/admin/master-data/page.tsx');
fixAuth('src/app/admin/import/page.tsx');
fixAuth('src/app/admin/reviews/import/page.tsx');
fixAuth('src/app/admin/master/operations/page.tsx');
fixAuth('src/app/shifts/ShiftsView.tsx'); // Check shifts view as well

console.log("Fixed auth imports");
