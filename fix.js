require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

async function fix() {
  const email = 'suzuka110607@icloud.com';
  try {
    let user;
    try {
      user = await getAuth().getUserByEmail(email);
      console.log('User exists:', user.uid);
      await getAuth().updateUser(user.uid, { password: '1106_salon' });
      console.log('Password updated to 1106_salon');
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        user = await getAuth().createUser({
          email,
          password: '1106_salon',
          displayName: 'Admin'
        });
        console.log('Created user:', user.uid);
      } else {
        throw e;
      }
    }
  } catch (err) {
    console.error(err);
  }
}
fix();
