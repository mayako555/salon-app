const fs = require('fs');

let adminExpensesContent = fs.readFileSync('src/app/admin/expenses/page.tsx', 'utf-8');
adminExpensesContent = adminExpensesContent.replace(
  'const { profile } = useAuth();',
  'const { profile, availableStores } = useAuth();'
);
fs.writeFileSync('src/app/admin/expenses/page.tsx', adminExpensesContent);

console.log("Fixed expenses page.");
