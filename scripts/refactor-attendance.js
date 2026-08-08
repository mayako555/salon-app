const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/attendance/actions.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Rename functions to internal ones and add context parameter
content = content.replace(/export async function recordClockIn\(staffId: string, staffName: string, store\?: string\) \{/, 
  "export async function recordClockIn(staffId: string, staffName: string, store?: string) {\n  const ctx = await getCurrentUserContext();\n  return _recordClockIn(staffId, staffName, store, ctx);\n}\n\nasync function _recordClockIn(staffId: string, staffName: string, store: string | undefined, ctx: any) {");

content = content.replace(/export async function recordFcClockIn\(staffId: string, staffName: string, store\?: string\) \{/, 
  "export async function recordFcClockIn(staffId: string, staffName: string, store?: string) {\n  const ctx = await getCurrentUserContext();\n  return _recordFcClockIn(staffId, staffName, store, ctx);\n}\n\nasync function _recordFcClockIn(staffId: string, staffName: string, store: string | undefined, ctx: any) {");

content = content.replace(/export async function recordClockOut\(staffId: string\) \{/, 
  "export async function recordClockOut(staffId: string) {\n  const ctx = await getCurrentUserContext();\n  return _recordClockOut(staffId, ctx);\n}\n\nasync function _recordClockOut(staffId: string, ctx: any) {");

content = content.replace(/export async function recordFcClockOut\(staffId: string\) \{/, 
  "export async function recordFcClockOut(staffId: string) {\n  const ctx = await getCurrentUserContext();\n  return _recordFcClockOut(staffId, ctx);\n}\n\nasync function _recordFcClockOut(staffId: string, ctx: any) {");

// 2. Remove `const ctx = await getCurrentUserContext();` from the internal functions
// Wait, I can just replace `const ctx = await getCurrentUserContext();` with `` inside these 4 internal functions.
// I will use regex to find and remove them. But since I only want to remove the ones in these functions, I will just do a global replace for all occurrences that might be inside them. But I shouldn't remove it from other functions.
// Actually, it's safer to just replace `const ctx = await getCurrentUserContext();` with `// const ctx = await getCurrentUserContext();` everywhere in those functions? No, I'll do it manually.

// Let's just find the indexes and replace carefully.
const funcs = ["_recordClockIn", "_recordFcClockIn", "_recordClockOut", "_recordFcClockOut"];
for (const fn of funcs) {
  const startIdx = content.indexOf(`async function ${fn}`);
  if (startIdx === -1) continue;
  const match = content.indexOf("const ctx = await getCurrentUserContext();", startIdx);
  if (match !== -1 && match < startIdx + 500) {
    content = content.substring(0, match) + "// ctx passed in" + content.substring(match + 42);
  }
}

// 3. Update recordKioskAction
content = content.replace(
  /if \(actionType === "IN"\) \{\s*if \(linkWithShifts\) \{\s*return await recordClockIn\(staffId, staffName, storeId\);\s*\} else \{\s*return await recordFcClockIn\(staffId, staffName, storeId\);\s*\}\s*\}/,
  `if (actionType === "IN") {
      const kioskCtx = { companyId, role: "staff", isImpersonating: false };
      if (linkWithShifts) {
        return await _recordClockIn(staffId, staffName, storeId, kioskCtx);
      } else {
        return await _recordFcClockIn(staffId, staffName, storeId, kioskCtx);
      }
    }`
);

content = content.replace(
  /if \(actionType === "OUT"\) \{\s*if \(linkWithShifts\) \{\s*return await recordClockOut\(staffId\);\s*\} else \{\s*return await recordFcClockOut\(staffId\);\s*\}\s*\}/,
  `if (actionType === "OUT") {
      const kioskCtx = { companyId, role: "staff", isImpersonating: false };
      if (linkWithShifts) {
        return await _recordClockOut(staffId, kioskCtx);
      } else {
        return await _recordFcClockOut(staffId, kioskCtx);
      }
    }`
);

fs.writeFileSync(filePath, content);
console.log("Refactored attendance actions.");
