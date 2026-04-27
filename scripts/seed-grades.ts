import { initializeApp } from "firebase/app";
import { getFirestore, collection, writeBatch, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBox-c3ZDIe0TNoAR3wDNlypyP-HA1tF98",
  authDomain: "salonapp-ee4d2.firebaseapp.com",
  projectId: "salonapp-ee4d2",
  storageBucket: "salonapp-ee4d2.firebasestorage.app",
  messagingSenderId: "380205074998",
  appId: "1:380205074998:web:f1c3f646ea04f61ce4a697",
  measurementId: "G-PF5G5BNCD5"
};

const SALARY_GRADES: Record<string, any> = {
  "J1": { title: "スクール生", hourly: 1116, base: 0, role: 0, attendance: 0, service: 0 },
  "J2": { title: "パーマ合格", hourly: 1130, base: 200000, role: 0, attendance: 0, service: 0 },
  "P1": { title: "シングル合格", hourly: 1160, base: 200000, role: 5000, attendance: 5000, service: 0 },
  "P2": { title: "ボリューム合格", hourly: 1190, base: 205000, role: 5000, attendance: 10000, service: 0 },
  "P3": { title: "アンドヘルシー合格", hourly: 1250, base: 210000, role: 10000, attendance: 10000, service: 0 },
  "P4_0": { title: "アイブロウ合格", hourly: 1300, base: 220000, role: 10000, attendance: 10000, service: 0 },
  "P4_1y": { title: "アイリスト1年", hourly: 1360, base: 220000, role: 10000, attendance: 10000, service: 10000 },
  "P4_2y": { title: "アイリスト2年", hourly: 1400, base: 220000, role: 10000, attendance: 10000, service: 20000 },
  "P4_3y": { title: "アイリスト3年", hourly: 1470, base: 220000, role: 10000, attendance: 10000, service: 30000 },
  "P4_4y": { title: "アイリスト4年", hourly: 1500, base: 220000, role: 10000, attendance: 10000, service: 40000 },
  "P4_5y": { title: "アイリスト5年", hourly: 1590, base: 220000, role: 10000, attendance: 10000, service: 50000 },
  "P4_6y": { title: "アイリスト6年", hourly: 1640, base: 220000, role: 10000, attendance: 10000, service: 60000 },
};

async function seedGrades() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const batch = writeBatch(db);
  const colRef = collection(db, "salary_grades");

  console.log("Migrating salary grades...");
  
  Object.entries(SALARY_GRADES).forEach(([code, data], index) => {
    const docRef = doc(colRef, code); // Use code as ID for consistency
    batch.set(docRef, {
      ...data,
      code,
      display_order: index,
      created_at: new Date(),
      updated_at: new Date()
    });
  });

  await batch.commit();
  console.log("Migration completed!");
}

seedGrades().then(() => process.exit());
