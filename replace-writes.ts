import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const root = path.join(process.cwd(), "src/app");

function walk(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      processFile(full);
    }
  }
}

function processFile(file: string) {
  let content = fs.readFileSync(file, "utf8");
  
  // Only process if it imports addDoc or setDoc from firebase/firestore
  if (!content.includes('from "firebase/firestore"')) return;
  
  let modified = false;
  
  if (content.includes("addDoc(")) {
    content = content.replace(/\baddDoc\(/g, "addTenantOwnedDoc(");
    modified = true;
  }
  
  if (content.includes("setDoc(")) {
    content = content.replace(/\bsetDoc\(/g, "setTenantOwnedDoc(");
    modified = true;
  }
  
  if (modified) {
    // Add import to tenant-ownership if not present
    if (!content.includes("addTenantOwnedDoc") && !content.includes("setTenantOwnedDoc")) {
        // already replaced, but check if import exists
    }
    
    // Check if we need to add imports
    let needsImport = "";
    if (content.includes("addTenantOwnedDoc") && !content.includes("addTenantOwnedDoc")) {
      // Logic error above. Let's just do a blanket regex:
    }
    
    const hasAdd = content.includes("addTenantOwnedDoc(");
    const hasSet = content.includes("setTenantOwnedDoc(");
    
    if (hasAdd && !content.includes("addTenantOwnedDoc")) {
       // will handle later
    }
    
    // We'll just append to existing tenant-ownership import or add a new one
    if (hasAdd || hasSet) {
      if (content.includes("@/lib/tenant-ownership")) {
        if (hasAdd && !content.includes("addTenantOwnedDoc") && content.match(/import\s+{([^}]*)}\s+from\s+["']@\/lib\/tenant-ownership["']/)) {
            content = content.replace(/import\s+{([^}]*)}\s+from\s+["']@\/lib\/tenant-ownership["']/, (match, p1) => {
                if (!p1.includes("addTenantOwnedDoc")) return `import { ${p1}, addTenantOwnedDoc } from "@/lib/tenant-ownership"`;
                return match;
            });
        }
        if (hasSet && !content.includes("setTenantOwnedDoc") && content.match(/import\s+{([^}]*)}\s+from\s+["']@\/lib\/tenant-ownership["']/)) {
             content = content.replace(/import\s+{([^}]*)}\s+from\s+["']@\/lib\/tenant-ownership["']/, (match, p1) => {
                if (!p1.includes("setTenantOwnedDoc")) return `import { ${p1}, setTenantOwnedDoc } from "@/lib/tenant-ownership"`;
                return match;
            });
        }
      } else {
        const imports = [];
        if (hasAdd) imports.push("addTenantOwnedDoc");
        if (hasSet) imports.push("setTenantOwnedDoc");
        content = `import { ${imports.join(", ")} } from "@/lib/tenant-ownership";\n` + content;
      }
      
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
}

walk(root);
