import * as fs from "fs";

let rules = fs.readFileSync("firestore.rules", "utf8");

// Insert staff_profiles rule before General Collections
const staffRule = `
    // --- Staff Profiles ---
    // Users can read their own staff profile (required for auth context initialization)
    match /staff_profiles/{profileId} {
      allow read: if isSystemOwner() || (isSignedIn() && resource.data.email == request.auth.token.email);
      allow write: if false; 
    }
`;

rules = rules.replace("// --- General Collections", staffRule + "\n    // --- General Collections");

fs.writeFileSync("firestore.rules", rules);
console.log("Updated firestore.rules");
