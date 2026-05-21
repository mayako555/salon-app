const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all .ts and .tsx files in src/app and src/lib
const findFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, fileList);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
};

const allFiles = findFiles('./src');

let count = 0;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Add "use server" to specific lib files
  if (['src/lib/customers.ts', 'src/lib/counseling.ts', 'src/lib/karte.ts', 'src/lib/notifications.ts', 'src/lib/staff_targets.ts'].includes(file)) {
    if (!content.includes('"use server"')) {
      content = '"use server";\n\n' + content;
      changed = true;
    }
  }

  // 2. Replace firebase/firestore imports
  if (content.includes('from "firebase/firestore"') || content.includes("from 'firebase/firestore'")) {
    content = content.replace(/from\s+["']firebase\/firestore["']/g, 'from "@/lib/firestore-server"');
    changed = true;
  }

  // 3. Remove import { db } from "@/lib/firebase" because it's no longer used
  if (content.includes('import { db } from "@/lib/firebase"')) {
    // We can't just blindly remove it if they use `auth` or `storage`. Let's just safely replace `db` with a dummy or remove it from the destructured import.
    // Easiest is to provide a dummy `db` from firestore-server.
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Refactored ${file}`);
    count++;
  }
}

console.log(`Refactored ${count} files.`);
