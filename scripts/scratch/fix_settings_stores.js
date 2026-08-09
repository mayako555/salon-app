const fs = require('fs');
const file = 'src/app/admin/settings/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Ensure availableStores is extracted from useAuth
if (!content.includes('availableStores')) {
    content = content.replace('const { profile, isAdmin } = useAuth();', 'const { profile, isAdmin, availableStores } = useAuth();');
    // Just in case it was 'const { profile } = useAuth();'
    content = content.replace('const { profile } = useAuth();', 'const { profile, isAdmin, availableStores } = useAuth();');
}

// Replace the mapping over settings.stores with mapping over availableStores
const oldStoreMap1 = '{Object.entries(settings.stores).filter(([store]) => store !== "共通").map(([store, storeSettings]) => (';
const newStoreMap1 = '{availableStores.filter(store => store !== "共通" && store !== "全店舗").map(store => { const storeSettings = settings.stores[store] || { startHour: 8, endHour: 22, slotDuration: 30 }; return (';

const oldStoreMap1End = '          </Card>\n        ))}';
const newStoreMap1End = '          </Card>\n        ); })}';

if (content.includes(oldStoreMap1)) {
    content = content.replace(oldStoreMap1, newStoreMap1);
    
    // We need to replace the first `</Card>\n        ))}` we find
    content = content.replace(oldStoreMap1End, newStoreMap1End);
}

const oldStoreMap2 = '{Object.keys(settings.stores).filter(store => store !== "共通").map((store) => (';
const newStoreMap2 = '{availableStores.filter(store => store !== "共通" && store !== "全店舗").map((store) => (';

if (content.includes(oldStoreMap2)) {
    content = content.replace(oldStoreMap2, newStoreMap2);
}

fs.writeFileSync(file, content);
console.log("Updated settings page to use availableStores.");
