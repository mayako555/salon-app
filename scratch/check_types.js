require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

try {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  let app;
  if (privateKey && clientEmail) {
    app = initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey
      })
    });
  } else {
    app = initializeApp({ projectId });
  }
  
  const db = getFirestore(app);
  
  db.collection('sales_master').limit(10).get().then(snap => {
    snap.forEach(doc => {
      console.log(doc.data().name, "| type:", doc.data().itemType);
    });
    process.exit(0);
  }).catch(err => {
    console.error("Firestore Error:", err);
    process.exit(1);
  });
} catch (e) {
  console.log("Setup error:", e);
  process.exit(1);
}
