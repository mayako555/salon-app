const fs = require('fs');
let pageContent = fs.readFileSync('src/app/admin/expenses/page.tsx', 'utf-8');

// Insert states
const stateInsertionPoint = `  const [pasteText, setPasteText] = useState("");`;
const newStates = `
  const [pasteText, setPasteText] = useState("");
  const [requireColumnMapping, setRequireColumnMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[][]>([]);
  const [colMapping, setColMapping] = useState({ date: "", amount: "", desc: "" });
  const [importStats, setImportStats] = useState<any>(null);
`;
pageContent = pageContent.replace(stateInsertionPoint, newStates);

// Write back to check sizes
fs.writeFileSync('src/app/admin/expenses/page.tsx', pageContent);
console.log("States added.");
