const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
admin.auth().getUserByEmail('suzuka110607@icloud.com')
  .then(user => console.log('User found:', user.uid))
  .catch(err => console.error('Error:', err.message));
