const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});

async function run() {
  try {
    const email = 'suzuka110607@icloud.com';
    const user = await admin.auth().getUserByEmail(email).catch(() => null);
    
    if (user) {
      console.log('User found in Auth:', user.uid);
      
      // Let's force update the password to "1234_salon" just to be safe if the PIN was 1234
      // We don't know the exact PIN, but wait, I shouldn't just guess. 
      // I can check the Firestore staff_profiles for this email to find their passcode!
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
