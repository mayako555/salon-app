import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, getDocs, orderBy } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const colRef = collection(db, "companies");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    console.log(`Query succeeded! Found ${snap.size} companies.`);
  } catch (e) {
    console.error("Query failed:", e);
  }
}
test();
