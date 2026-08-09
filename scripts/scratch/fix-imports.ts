import * as fs from "fs";
import * as path from "path";

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
  let modified = false;
  
  const hasAdd = content.includes("addTenantOwnedDoc(");
  const hasSet = content.includes("setTenantOwnedDoc(");
  
  if (hasAdd || hasSet) {
      const match = content.match(/import\s+{([^}]*)}\s+from\s+["']@\/lib\/tenant-ownership["']/);
      if (match) {
          let imports = match[1];
          let updated = false;
          if (hasAdd && !imports.includes("addTenantOwnedDoc")) {
              imports += ", addTenantOwnedDoc";
              updated = true;
          }
          if (hasSet && !imports.includes("setTenantOwnedDoc")) {
              imports += ", setTenantOwnedDoc";
              updated = true;
          }
          if (updated) {
              content = content.replace(match[0], `import { ${imports.trim()} } from "@/lib/tenant-ownership"`);
              modified = true;
          }
      } else {
          // Add the import line
          const toAdd = [];
          if (hasAdd) toAdd.push("addTenantOwnedDoc");
          if (hasSet) toAdd.push("setTenantOwnedDoc");
          content = `import { ${toAdd.join(", ")} } from "@/lib/tenant-ownership";\n` + content;
          modified = true;
      }
  }
  
  if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Fixed imports in ${file}`);
  }
}

walk(root);
