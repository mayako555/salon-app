const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const app = admin.initializeApp({
  projectId: 'salonapp-ee4d2'
});

const defaultDb = getFirestore(app);
const customDb = getFirestore(app, 'fc-rumi');

console.log('Default:', !!defaultDb);
console.log('Custom:', !!customDb);
process.exit(0);
