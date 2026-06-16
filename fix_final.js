const fs = require('fs');

function fix(file, funcName) {
  let c = fs.readFileSync(file, 'utf-8');
  if (!c.includes('const { availableStores } = useAuth();')) {
     c = c.replace(`export default function ${funcName}() {`, `export default function ${funcName}() {\n  const { availableStores } = useAuth();`);
     fs.writeFileSync(file, c);
     console.log("Fixed", file);
  }
}

fix('src/app/admin/master-data/page.tsx', 'MasterDataPage');
fix('src/app/admin/import/page.tsx', 'SalonBoardImportPage');
fix('src/app/admin/reviews/import/page.tsx', 'ImportReviewsPage');

