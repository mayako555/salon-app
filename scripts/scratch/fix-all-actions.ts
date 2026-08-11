import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else {
      if (file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.d.ts')) {
        fileList.push(path.join(dir, file));
      }
    }
  }
  return fileList;
}

const files = walk('./src/app');

let count = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  // Replace imports from firebase/firestore
  if (content.includes('from "firebase/firestore"')) {
    content = content.replace(/from "firebase\/firestore"/g, 'from "@/lib/firestore-admin-wrapper"');
    changed = true;
  }
  if (content.includes("from 'firebase/firestore'")) {
    content = content.replace(/from 'firebase\/firestore'/g, 'from "@/lib/firestore-admin-wrapper"');
    changed = true;
  }

  // Replace imports for db from lib/firebase
  if (content.includes('from "@/lib/firebase"')) {
    content = content.replace(/from "@\/lib\/firebase"/g, 'from "@/lib/firestore-admin-wrapper"');
    changed = true;
  }
  if (content.includes("from '@/lib/firebase'")) {
    content = content.replace(/from '@\/lib\/firebase'/g, 'from "@/lib/firestore-admin-wrapper"');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated: ${file}`);
    count++;
  }
}
console.log(`Total files updated: ${count}`);
