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
  
  if (content.includes('"use server"') || content.includes("'use server'")) {
    const lines = content.split("\n");
    let useServerIndex = -1;
    let directive = "";
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '"use server";' || line === "'use server';" || line === '"use server"' || line === "'use server'") {
            useServerIndex = i;
            directive = line;
            break;
        }
    }
    
    // If "use server" is found but not at the very top (ignoring empty lines)
    if (useServerIndex > 0) {
        let needsMove = false;
        for (let i = 0; i < useServerIndex; i++) {
            if (lines[i].trim() !== "") {
                needsMove = true;
                break;
            }
        }
        
        if (needsMove) {
            lines.splice(useServerIndex, 1);
            lines.unshift(directive);
            fs.writeFileSync(file, lines.join("\n"));
            console.log(`Fixed use server in ${file}`);
        }
    }
  }
}

walk(root);
