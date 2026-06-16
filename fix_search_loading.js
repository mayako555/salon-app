const fs = require('fs');
const file = 'src/components/reservations/ReservationFormDialog.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. Add state
content = content.replace(
`  const [searchQuery, setSearchQuery] = useState("");`,
`  const [searchQuery, setSearchQuery] = useState("");
  const [isFetchingCustomers, setIsFetchingCustomers] = useState(false);`
);

// 2. Update handleSearchMode
content = content.replace(
`    if (!hasLoadedCustomers) {
      const data = await getAllCustomers();
      setCustomers(data);
      setHasLoadedCustomers(true);
    }`,
`    if (!hasLoadedCustomers) {
      setIsFetchingCustomers(true);
      const data = await getAllCustomers();
      setCustomers(data);
      setHasLoadedCustomers(true);
      setIsFetchingCustomers(false);
    }`
);

// 3. Update UI rendering
const targetSearchUI = `{searchQuery && filteredCustomers.length > 0 && (
                    <div className="border border-slate-300 bg-white shadow-sm max-w-2xl mx-auto text-xs">`;

const replacementSearchUI = `{isFetchingCustomers && (
                    <div className="text-center py-4 text-blue-600 font-bold animate-pulse">
                      顧客データを検索中...
                    </div>
                  )}
                  {!isFetchingCustomers && searchQuery && filteredCustomers.length > 0 && (
                    <div className="border border-slate-300 bg-white shadow-sm max-w-2xl mx-auto text-xs">`;

content = content.replace(targetSearchUI, replacementSearchUI);

content = content.replace(
`                  {searchQuery && filteredCustomers.length === 0 && (`,
`                  {!isFetchingCustomers && searchQuery && filteredCustomers.length === 0 && (`
);

content = content.replace(
`                  {!searchQuery && (`,
`                  {!isFetchingCustomers && !searchQuery && (`
);

fs.writeFileSync(file, content);
console.log("Fixed search loading UX");
