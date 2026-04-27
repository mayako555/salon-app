const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const match = envFile.match(/FIREBASE_PRIVATE_KEY=(.*)/);

if (match) {
  let key = match[1];
  console.log("Found in file (raw):", key.substring(0, 50) + "...");
  
  const parsed = key.replace(/\\n/g, "\n").replace(/^"(.*)"$/, '$1').trim();
  console.log("Parsed (first 100):");
  console.log(parsed.substring(0, 100));
  
  if (parsed.startsWith("-----BEGIN PRIVATE KEY-----") && parsed.endsWith("-----END PRIVATE KEY-----")) {
    console.log("Format looks CORRECT");
  } else {
    console.log("Format looks WRONG");
    console.log("Starts with:", JSON.stringify(parsed.substring(0, 30)));
    console.log("Ends with:", JSON.stringify(parsed.substring(parsed.length - 30)));
  }
} else {
  console.log("FIREBASE_PRIVATE_KEY not found in .env.local");
}
