require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

try {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.log("No FIREBASE_PROJECT_ID found");
    process.exit(1);
  }
  
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
    console.log("No admin credentials found");
    process.exit(1);
  }
  
  const auth = getAuth(app);
  
  const email = 'jasminelash555@gmail.com';
  const password = '1234_salon';

  auth.getUserByEmail(email)
    .then(async user => {
      console.log("User exists. Updating password...");
      await auth.updateUser(user.uid, { password: password });
      console.log("Password updated successfully.");
      process.exit(0);
    })
    .catch(async error => {
      if (error.code === 'auth/user-not-found') {
        console.log("User not found in Auth. Creating...");
        try {
          const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: "店舗用 アカウント",
          });
          console.log("Created Auth user with uid:", userRecord.uid);
          process.exit(0);
        } catch (createErr) {
          console.error("Failed to create user:", createErr.message);
          process.exit(1);
        }
      } else {
        console.log("Error:", error.message);
        process.exit(1);
      }
    });
} catch (e) {
  console.log("Setup error:", e);
  process.exit(1);
}
