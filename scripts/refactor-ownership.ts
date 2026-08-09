import fs from 'fs';
import path from 'path';

function walk(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, fileList);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = walk('./src');

let count = 0;
for (const file of allFiles) {
  // Skip the helper itself and setup actions (which manipulate company docs directly)
  if (file.includes('tenant-ownership.ts') || file.includes('setup/actions.ts') || file.includes('admin/master/system/tenant-actions.ts')) continue;
  
  let content = fs.readFileSync(file, 'utf-8');
  
  // Only process server actions
  if (!content.includes('"use server"') && !content.includes("'use server'")) continue;
  
  let changed = false;

  // Replace updateDoc with updateTenantOwnedDoc
  if (content.includes('updateDoc(')) {
    content = content.replace(/updateDoc\(/g, 'updateTenantOwnedDoc(');
    changed = true;
  }

  // Replace deleteDoc with deleteTenantOwnedDoc
  if (content.includes('deleteDoc(')) {
    content = content.replace(/deleteDoc\(/g, 'deleteTenantOwnedDoc(');
    changed = true;
  }

  if (changed) {
    // Add import if not exists
    if (!content.includes('tenant-ownership')) {
      const importStatement = `\nimport { updateTenantOwnedDoc, deleteTenantOwnedDoc } from "@/lib/tenant-ownership";\n`;
      // Insert after last import or at top after "use server"
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextLineIndex) + importStatement + content.slice(nextLineIndex);
      } else {
        content = content.replace(/"use server";?/, `"use server";\n${importStatement}`);
      }
    }
    fs.writeFileSync(file, content, 'utf-8');
    count++;
    console.log(`Updated ${file}`);
  }
}

console.log(`Refactored ${count} files.`);
