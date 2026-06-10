require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

let app;
if (privateKey && clientEmail) {
  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey })
  });
} else {
  app = initializeApp({ projectId });
}
const db = getFirestore(app);

async function run() {
  console.log("Fetching sales...");
  const sales = await db.collection('sales').where('source_reservation_id', '!=', null).get();
  
  let count = 0;
  for (const sale of sales.docs) {
    const data = sale.data();
    if (data.source_reservation_id && data.customer_id) {
      const resDoc = await db.collection('reservations').doc(data.source_reservation_id).get();
      if (resDoc.exists) {
        const resData = resDoc.data();
        if (!resData.customer_id) {
          console.log(`Fixing reservation ${data.source_reservation_id} -> customer ${data.customer_id}`);
          await db.collection('reservations').doc(data.source_reservation_id).update({
            customer_id: data.customer_id
          });
          count++;
        }
      }
    }
  }
  console.log(`Fixed ${count} reservations.`);
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
