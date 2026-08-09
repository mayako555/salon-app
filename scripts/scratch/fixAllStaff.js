const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const admin = require("firebase-admin");

let pk = process.env.FIREBASE_PRIVATE_KEY;
if (pk && pk.trim().startsWith('{')) {
  try {
    const parsed = JSON.parse(pk);
    if (parsed.private_key) pk = parsed.private_key;
  } catch (e) {}
}
pk = pk.replace(/\\n/g, "\n").replace(/\"/g, "").trim();

let email = process.env.FIREBASE_CLIENT_EMAIL;
if (!email && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.trim().startsWith('{')) {
  try {
    const parsed = JSON.parse(process.env.FIREBASE_PRIVATE_KEY);
    if (parsed.client_email) email = parsed.client_email;
  } catch (e) {}
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "salonapp-ee4d2",
    clientEmail: email,
    privateKey: pk
  })
});

const auth = admin.auth();
const db = admin.firestore();

async function run() {
  const staffSnap = await db.collection("staff_profiles").get();
  console.log(`Found ${staffSnap.size} staff in Firestore.`);
  
  for (const doc of staffSnap.docs) {
    const data = doc.data();
    if (!data.email) {
      console.log(`Skipping ${data.name}: No email`);
      continue;
    }
    const passcode = data.passcode || "1234";
    const password = passcode + "_salon";
    
    try {
      const user = await auth.getUserByEmail(data.email);
      await auth.updateUser(user.uid, { password: password });
      console.log(`[OK] Updated ${data.name} (${data.email})`);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        try {
          await auth.createUser({
            email: data.email,
            password: password,
            displayName: data.name
          });
          console.log(`[CREATED] ${data.name} (${data.email})`);
        } catch (createErr) {
          console.error(`[ERROR creating ${data.name}]`, createErr.message);
        }
      } else {
        console.error(`[ERROR fetching ${data.name}]`, e.message);
      }
    }
  }
}
run();
