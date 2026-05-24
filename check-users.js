const admin = require('firebase-admin');
const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

admin.auth().listUsers(100).then(list => {
  list.users.forEach(u => console.log(u.email));
}).catch(console.error);
