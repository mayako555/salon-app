require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

try {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  let app;
  if (privateKey && clientEmail) {
    app = initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey
      })
    });
  } else {
    app = initializeApp({ projectId });
  }
  
  const db = getFirestore(app);
  
  const colRef = db.collection('sales_master');
  colRef.get().then(snapshot => {
    let items = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    });
    console.log("Total items:", items.length);

    const ctx = { role: 'admin', companyId: 'company_default' };
    
    if (ctx.role !== "admin" && ctx.role !== "systemOwner") {
      items = items.filter(item => {
        const itemCompanyId = item.companyId || "company_default";
        return itemCompanyId === ctx.companyId;
      });
    }

    console.log("After role filter:", items.length);
    process.exit(0);
  }).catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
} catch (e) {
  console.log("Setup error:", e);
  process.exit(1);
}
