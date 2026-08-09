import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Override isBuild to false manually so firebase-admin initializes correctly
process.env.npm_lifecycle_event = "";
process.env.NEXT_PHASE = "";

const admin = require("firebase-admin");

if (!admin.apps.length) {
  let cert = process.env.FIREBASE_PRIVATE_KEY;
  if (cert) {
    cert = cert.replace(/\\n/g, '\n').replace(/"/g, '').trim();
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: cert
    }),
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function main() {
  const args = process.argv.slice(2);
  const isRepair = args.includes("--repair");

  console.log("Starting User Sync Audit...");
  if (isRepair) console.log("REPAIR MODE: Will fix inconsistencies automatically.");

  const staffSnap = await db.collection("staff_profiles").get();
  const usersSnap = await db.collection("users").get();
  
  const authUsers = new Map();
  let authPageToken;
  do {
    const listResult = await auth.listUsers(1000, authPageToken);
    listResult.users.forEach((u: any) => authUsers.set(u.uid, u));
    authPageToken = listResult.pageToken;
  } while (authPageToken);

  const staffProfiles = new Map();
  staffSnap.docs.forEach((doc: any) => staffProfiles.set(doc.id, { id: doc.id, ...doc.data() }));

  const usersDocs = new Map();
  usersSnap.docs.forEach((doc: any) => usersDocs.set(doc.id, { id: doc.id, ...doc.data() }));

  let issues = 0;
  let repaired = 0;

  console.log(`\nFound ${staffProfiles.size} staff profiles, ${usersDocs.size} user docs, ${authUsers.size} auth users.`);

  // 1. Check all staff profiles
  for (const [id, staff] of staffProfiles) {
    let uid = staff.uid;
    
    // Check missing UID
    if (!uid) {
      if (staff.email) {
        // Try to find in Auth
        const authMatch = Array.from(authUsers.values()).find(u => u.email === staff.email);
        if (authMatch) {
          console.log(`[Issue] Missing UID in staff_profiles for ${staff.name} but exists in Auth (${authMatch.uid})`);
          issues++;
          if (isRepair) {
            await db.collection("staff_profiles").doc(id).update({ uid: authMatch.uid });
            uid = authMatch.uid;
            console.log(`  -> Repaired: Added UID to staff_profile`);
            repaired++;
          }
        } else {
          console.log(`[Warning] Missing UID and Auth account for ${staff.name} (${staff.email})`);
        }
      } else {
        console.log(`[Warning] No email and no UID for ${staff.name}`);
      }
    }

    if (uid) {
      const authUser = authUsers.get(uid);
      if (!authUser) {
        console.log(`[Issue] UID ${uid} found in staff_profile (${staff.name}) but NOT found in Auth!`);
        issues++;
      }

      const userDoc = usersDocs.get(uid);
      const isActive = staff.is_active !== false && staff.employment_status !== "retired";
      
      if (!userDoc) {
        console.log(`[Issue] Missing users/${uid} doc for ${staff.name}`);
        issues++;
        if (isRepair) {
          await db.collection("users").doc(uid).set({
            role: staff.role,
            companyId: staff.companyId,
            email: staff.email || null,
            active: isActive,
            accessibleStoreIds: staff.salonIds || [],
            updatedAt: new Date()
          });
          console.log(`  -> Repaired: Created users/${uid}`);
          repaired++;
        }
      } else {
        // Check inconsistencies
        const mismatches = [];
        if (userDoc.role !== staff.role) mismatches.push(`role (${userDoc.role} != ${staff.role})`);
        if (userDoc.companyId !== staff.companyId) mismatches.push(`companyId (${userDoc.companyId} != ${staff.companyId})`);
        if (!!userDoc.active !== isActive) mismatches.push(`active (${userDoc.active} != ${isActive})`);
        
        if (mismatches.length > 0) {
          console.log(`[Issue] Inconsistent users/${uid} for ${staff.name}: ${mismatches.join(", ")}`);
          issues++;
          if (isRepair) {
            await db.collection("users").doc(uid).update({
              role: staff.role,
              companyId: staff.companyId,
              email: staff.email || null,
              active: isActive,
              accessibleStoreIds: staff.salonIds || [],
              updatedAt: new Date()
            });
            console.log(`  -> Repaired: Synced users/${uid}`);
            repaired++;
          }
        }
      }
      
      // Remove from map to track orphans
      usersDocs.delete(uid);
    }
  }

  // 2. Check orphaned users docs
  for (const [uid, userDoc] of usersDocs) {
    console.log(`[Issue] Orphaned users/${uid} doc (no matching staff_profile)!`);
    issues++;
    if (isRepair) {
      await db.collection("users").doc(uid).delete();
      console.log(`  -> Repaired: Deleted orphaned users/${uid}`);
      repaired++;
    }
  }

  // 3. Check orphaned Auth users
  for (const [uid, authUser] of authUsers) {
    const isMatched = Array.from(staffProfiles.values()).some(s => s.uid === uid || s.email === authUser.email);
    if (!isMatched) {
      console.log(`[Issue] Orphaned Auth user found: UID=${uid}, Email=${authUser.email}, Name=${authUser.displayName}`);
      issues++;
      // We don't automatically delete Auth users in repair mode, as it's destructive.
    }
  }

  console.log(`\nAudit Complete. Found ${issues} issues. Repaired ${repaired} issues.`);
  process.exit(issues > 0 && !isRepair ? 1 : 0);
}

main().catch(e => {
  console.error("Audit failed:", e);
  process.exit(1);
});
