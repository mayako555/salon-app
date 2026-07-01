import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  projectId: "salon-manager-8df21" // waiting for actual check if needed
};

// We don't need to run it if we just ask the user.
