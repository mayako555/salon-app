import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const admin = require("firebase-admin");
let cert = process.env.FIREBASE_PRIVATE_KEY;
if (cert) cert = cert.replace(/\\n/g, '\n').replace(/"/g, '').trim();
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: cert
  })
});

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, getDocs, orderBy, connectFirestoreEmulator } = require("firebase/firestore");
const { getAuth, signInWithCustomToken, connectAuthEmulator } = require("firebase/auth");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099');

async function test() {
  try {
    const uid = "QAAB6p98oJTac5rBfzRzHEwT8h23"; // systemOwner
    const customToken = await admin.auth().createCustomToken(uid);
    await signInWithCustomToken(auth, customToken);
    
    console.log("Signed in successfully as systemOwner.");
    
    const colRef = collection(db, "companies");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    console.log(`Query succeeded! Found ${snap.size} companies.`);
  } catch (e) {
    console.error("Query failed:", e);
  }
}
test();
