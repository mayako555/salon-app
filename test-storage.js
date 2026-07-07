import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadString } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBox-c3ZDIe0TNoAR3wDNlypyP-HA1tF98",
  authDomain: "salonapp-ee4d2.firebaseapp.com",
  projectId: "salonapp-ee4d2",
  storageBucket: "salonapp-ee4d2.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const storageRef = ref(storage, 'test.txt');

uploadString(storageRef, 'hello world').then((snapshot) => {
  console.log('Uploaded a raw string!');
  process.exit(0);
}).catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
