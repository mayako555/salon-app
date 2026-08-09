const admin = require('firebase-admin');
const dotenv = require('dotenv');
const fs = require('fs');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: envConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: envConfig.FIREBASE_CLIENT_EMAIL,
    privateKey: envConfig.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, ''),
  })
});

async function run() {
  try {
    const email = 'suzuka110607@icloud.com';
    const user = await admin.auth().getUserByEmail(email).catch(() => null);
    
    if (user) {
      console.log('User found in Auth:', user.uid);
      
      const db = admin.firestore();
      const snapshot = await db.collection('staff_profiles').where('email', '==', email).get();
      if (!snapshot.empty) {
        const staff = snapshot.docs[0].data();
        console.log('Found staff profile. passcode:', staff.passcode);
        
        await admin.auth().updateUser(user.uid, {
          password: staff.passcode + "_salon"
        });
        console.log('Successfully updated Firebase Auth password to:', staff.passcode + "_salon");
      } else {
        console.log('No staff profile found for this email.');
      }
    } else {
      console.log('User NOT found in Auth. Creating...');
      const db = admin.firestore();
      const snapshot = await db.collection('staff_profiles').where('email', '==', email).get();
      if (!snapshot.empty) {
        const staff = snapshot.docs[0].data();
        const newUser = await admin.auth().createUser({
          email: email,
          password: staff.passcode + "_salon",
          displayName: staff.name
        });
        console.log('Created Firebase Auth user:', newUser.uid);
        
        // Update profile with uid
        await db.collection('staff_profiles').doc(snapshot.docs[0].id).update({
          uid: newUser.uid
        });
        console.log('Updated profile with UID');
      } else {
         console.log('Could not create because profile not found.');
      }
    }
  } catch (err) {
    console.error(err);
  }
}
run();
