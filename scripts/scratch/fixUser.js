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

async function fix() {
  const targetEmail = "reonene72@docomo.ne.jp";
  const targetPasscode = "1234";
  
  // Create or Update Auth
  try {
    const user = await auth.getUserByEmail(targetEmail);
    console.log("User already exists in Auth:", user.uid);
    await auth.updateUser(user.uid, { password: targetPasscode + "_salon" });
    console.log("Password updated!");
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      const newUser = await auth.createUser({
        email: targetEmail,
        password: targetPasscode + "_salon",
        displayName: "Staff User"
      });
      console.log("Created user in Auth:", newUser.uid);
    } else {
      console.error(e);
    }
  }

  // Check Firestore
  const snap = await db.collection("staff").where("email", "==", targetEmail).get();
  if (!snap.empty) {
    const doc = snap.docs[0];
    await doc.ref.update({ passcode: targetPasscode });
    console.log("Updated passcode in Firestore to", targetPasscode);
  } else {
    console.log("User not found in Firestore!");
  }
}
fix();
