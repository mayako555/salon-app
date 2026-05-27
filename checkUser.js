const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const auth = admin.auth();
const db = admin.firestore();

async function check() {
  const email = "reonene72@docomo.ne.jp";
  try {
    const user = await auth.getUserByEmail(email);
    console.log("Found in Auth:", user.uid, "Email:", user.email);
  } catch (e) {
    console.log("Not found in Auth:", email);
  }

  const snap = await db.collection("staff").where("email", "==", email).get();
  if (snap.empty) {
    console.log("Not found in Firestore (email)");
  } else {
    snap.forEach(doc => {
      console.log("Found in Firestore:", doc.id, doc.data().name, doc.data().email, doc.data().passcode);
    });
  }
}
check();
