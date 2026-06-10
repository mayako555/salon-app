require('dotenv').config({ path: '.env.local' });
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dummy';
process.env.FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || 'dummy';
process.env.FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || 'dummy';

// We can't easily test Next.js server actions directly this way because they import next/headers and context.
// But we can just write a quick fetch to the NextJS server if it's running.
