const fs = require('fs');
const admin = require('firebase-admin');

const env = fs.readFileSync('.env.local', 'utf-8');
const getEnv = (key) => {
  const match = env.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].replace(/^"|"$/g, '').replace(/\\n/g, '\n') : null;
};

const key = getEnv('FIREBASE_PRIVATE_KEY');
let parsedKey = key;
if (key.trim().startsWith('{')) {
  try {
    const parsed = JSON.parse(key);
    parsedKey = parsed.privateKey || parsed.private_key || key;
  } catch (e) {
    console.error("Failed to parse JSON key", e);
  }
}
parsedKey = parsedKey.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
      clientEmail: getEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey: parsedKey,
    })
  });
}

const db = admin.firestore();

async function run() {
  const satoSnap = await db.collection("staff_profiles").where("email", "==", "ruuumiii10612vv@gmail.com").get();
  if (satoSnap.empty) {
    console.log("Sato not found");
    return;
  }
  const satoDoc = satoSnap.docs[0];
  console.log("Sato current data:", satoDoc.data());
  
  await satoDoc.ref.update({ companyId: "company_lumichan_test" });
  console.log("Sato companyId updated successfully!");
}

run().catch(console.error);
