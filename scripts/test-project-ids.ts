import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocsFromServer, limit, query } from "firebase/firestore";

const configs = [
  { name: "Current", projectId: "salonapp-ee4d2" },
  { name: "With Dash", projectId: "salon-app-ee4d2" },
  { name: "With Typo", projectId: "salonapp-e4d2" },
  { name: "No Suffix", projectId: "salonapp" },
  { name: "With Dash No Suffix", projectId: "salon-app" }
];

async function testConfigs() {
  for (const config of configs) {
    console.log(`\nTesting Config: ${config.name} (${config.projectId})...`);
    try {
      const app = initializeApp({ projectId: config.projectId }, config.name);
      const db = getFirestore(app);
      const colRef = collection(db, "staff_profiles");
      const q = query(colRef, limit(1));
      
      // Use getDocsFromServer to force a server check
      const snapshot = await getDocsFromServer(q);
      console.log(`SUCCESS for ${config.name}! Found ${snapshot.size} docs.`);
    } catch (error: any) {
      console.log(`FAILED for ${config.name}. Error: ${error.message}`);
    }
  }
}

testConfigs().then(() => process.exit());
