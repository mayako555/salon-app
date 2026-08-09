import { doc, getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";

const app = initializeApp({ projectId: "test" });
const db = getFirestore(app);
const ref = doc(db, "reservations", "123");
console.log("Path:", ref.path);
