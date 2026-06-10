require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

try {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.log("No FIREBASE_PROJECT_ID found");
    process.exit(1);
  }
  
  // Try initializing without credential if default credentials work,
  // or parse FIREBASE_SERVICE_ACCOUNT_KEY
  let app;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    app = initializeApp({ projectId });
  }
  
  const auth = getAuth(app);
  
  auth.getUserByEmail('jasminelash555@gmail.com')
    .then(user => {
      console.log("User found:", user.toJSON());
      process.exit(0);
    })
    .catch(error => {
      console.log("Error finding user:", error.message);
      process.exit(0);
    });
} catch (e) {
  console.log("Setup error:", e);
  process.exit(1);
}
