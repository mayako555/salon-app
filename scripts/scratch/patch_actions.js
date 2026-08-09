const fs = require('fs');
const actionsContent = fs.readFileSync('src/app/admin/expenses/actions.ts', 'utf-8');
const replacementContent = fs.readFileSync('replacement_parser.ts', 'utf-8');

// Extract just the function from replacement
const funcRegex = /export async function parseYayoiTextAction[\s\S]+/;
const match = replacementContent.match(funcRegex);
if (!match) throw new Error("Could not find function in replacement");
const newFunc = match[0];

// Replace in actions.ts
// It goes from "export async function parseYayoiTextAction" up to but not including "const PETTY_CASH_COLLECTION"
const targetRegex = /export async function parseYayoiTextAction[\s\S]*?(?=\nconst PETTY_CASH_COLLECTION)/;
if (!targetRegex.test(actionsContent)) throw new Error("Could not find target in actions.ts");

const updatedContent = actionsContent.replace(targetRegex, newFunc);
fs.writeFileSync('src/app/admin/expenses/actions.ts', updatedContent);
console.log("Patched actions.ts successfully!");
