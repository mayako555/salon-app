const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyBox-c3ZDIe0TNoAR3wDNlypyP-HA1tF98",
  authDomain: "salonapp-ee4d2.firebaseapp.com",
  projectId: "salonapp-ee4d2",
  storageBucket: "salonapp-ee4d2.firebasestorage.app",
  messagingSenderId: "380205074998",
  appId: "1:380205074998:web:f1c3f646ea04f61ce4a697",
  measurementId: "G-PF5G5BNCD5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addStaff(name, email) {
  try {
    const staffRef = collection(db, "staff_profiles");
    const q = query(staffRef, where("email", "==", email));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      console.log(`Staff ${name} already exists.`);
      process.exit(0);
    }

    await addDoc(staffRef, {
      name: name,
      email: email,
      role: "staff",
      employment_type: "employee",
      max_holiday_requests: 3,
      is_active: true,
      created_at: serverTimestamp()
    });
    
    console.log(`Staff ${name} (${email}) registered!`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

addStaff("稲葉 涼花", "test_inaba@example.com");
