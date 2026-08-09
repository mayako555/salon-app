const fs = require('fs');
const admin = require('firebase-admin');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    val = val.replace(/\\n/g, '\n');
    env[match[1].trim()] = val;
  }
});

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY,
  }),
  storageBucket: "salonapp-ee4d2.firebasestorage.app",
});

const bucket = admin.storage().bucket();
bucket.setCorsConfiguration([
  {
    origin: ['*'],
    method: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
    maxAgeSeconds: 3600
  }
]).then(() => {
  console.log("Successfully updated CORS configuration for " + bucket.name);
  process.exit(0);
}).catch(err => {
  console.error("Failed to update CORS:", err);
  process.exit(1);
});
