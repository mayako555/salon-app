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
  
  // Just test one collection to see if it hangs
  db.collection('sales').limit(1).get().then(() => {
     console.log("Sales queried fine");
     process.exit(0);
  });
} catch (e) {
  console.log("Setup error:", e);
  process.exit(1);
}
