const fs = require('fs');

const files = [
  'src/app/admin/master/system/tenant-actions.ts',
  'src/app/admin/master/system/test-tenants/actions.ts',
  'src/app/admin/master/system/contracts/actions.ts',
  'src/app/admin/master/system/billing/actions.ts',
  'src/app/admin/system/actions.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Convert firebase/firestore imports to firestore-admin-wrapper
  content = content.replace(/from\s+['"]firebase\/firestore['"]/g, 'from "@/lib/firestore-admin-wrapper"');
  content = content.replace(/from\s+['"]@\/lib\/firebase['"]/g, 'from "@/lib/firestore-admin-wrapper"');
  
  // 2. Map the functions
  content = content.replace(/\bgetDocs\b/g, 'getDocsUnfiltered');
  content = content.replace(/\bgetDoc\b/g, 'getDocUnfiltered');
  content = content.replace(/\baddDoc\b/g, 'addDocUnfiltered');
  content = content.replace(/\bupdateDoc\b/g, 'updateDocUnfiltered');
  content = content.replace(/\bdeleteDoc\b/g, 'deleteDocUnfiltered');
  content = content.replace(/\bsetDoc\b/g, 'setDocUnfiltered');

  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed', file);
}
