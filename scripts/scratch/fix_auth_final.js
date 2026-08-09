const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const i = line.indexOf('=');
  if(i > 0) acc[line.substring(0, i)] = line.substring(i+1);
  return acc;
}, {});

// Clean up private key
let key = env.FIREBASE_PRIVATE_KEY;
if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
key = key.replace(/\\n/g, '\n');

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: key
  })
});

async function run() {
  const email = "suzuka110607@icloud.com";
  const db = admin.firestore();
  
  const snap = await db.collection("staff_profiles").where("email", "==", email).get();
  if (snap.empty) {
    console.log("No staff profile found.");
    return;
  }
  
  const staffDoc = snap.docs[0];
  const staff = staffDoc.data();
  const pwd = staff.passcode + "_salon";
  
  console.log("Found staff:", staff.name, "Passcode:", staff.passcode);
  
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password: pwd });
    console.log("Updated password to", pwd);
    await db.collection("staff_profiles").doc(staffDoc.id).update({ uid: user.uid });
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      const newUser = await admin.auth().createUser({ email, password: pwd, displayName: staff.name });
      await db.collection("staff_profiles").doc(staffDoc.id).update({ uid: newUser.uid });
      console.log("Created user and linked uid", newUser.uid);
    } else {
      console.error(e);
    }
  }
}
run();
