const fs = require('fs');
const file = 'src/app/admin/settings/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// replace profile?.role !== "admin" with !isAdmin
// also need to extract isAdmin from useAuth

if (content.includes('const { profile } = useAuth();')) {
   content = content.replace('const { profile } = useAuth();', 'const { profile, isAdmin } = useAuth();');
}

if (content.includes('if (profile?.role !== "admin") {')) {
   content = content.replace('if (profile?.role !== "admin") {', 'if (!isAdmin) {');
   fs.writeFileSync(file, content);
   console.log("Updated settings auth to use isAdmin");
} else {
   console.log("Could not find auth check in settings page.");
}
