const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Parse .env.local
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.replace(/\\n/g, '\n');
  }
});

initializeApp({
  credential: cert({
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY
  })
});

const db = getFirestore();

async function run() {
  const shibataStaffId = 'UmP1gr0tV2OExqpxT8S9';
  console.log("=== Contracts (staff_contracts) for Shibata ===");
  const contractsSnapshot = await db.collection('staff_contracts')
    .where('staff_id', '==', shibataStaffId)
    .get();
  contractsSnapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}
run();
