import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const BASE_URL = "http://localhost:3005";

async function runTest() {
  try {
    console.log("=== Testing Tenant Isolation & Impersonation ===");
    
    // 1. Login as systemOwner (maya)
    const userCredential = await signInWithEmailAndPassword(auth, "maya@jasmine-lash.com", "Maya_0405_salon");
    const idToken = await userCredential.user.getIdToken();
    
    // 2. Create Session Cookie by calling the app's session login endpoint
    const loginRes = await fetch(`${BASE_URL}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });
    
    const setCookieHeader = loginRes.headers.get("set-cookie");
    if (!setCookieHeader) throw new Error("Failed to get session cookie");
    
    // Extract session cookie
    const sessionMatch = setCookieHeader.match(/session=([^;]+)/);
    const sessionCookie = sessionMatch ? sessionMatch[1] : "";
    
    console.log("Logged in successfully. Session cookie obtained.");

    // Test 1: Normal systemOwner context
    const ctxRes1 = await fetch(`${BASE_URL}/api/test-context`, {
      headers: { Cookie: `session=${sessionCookie}` }
    });
    const ctxData1 = await ctxRes1.json();
    console.log("\n--- Test 1: Normal Login ---");
    console.log(ctxData1.context);

    // Test 2: Impersonating Tenant B
    const impersonatedCompanyId = "company_lumichan_test";
    const cookieStr = `session=${sessionCookie}; impersonated_company_id=${impersonatedCompanyId}`;
    
    const ctxRes2 = await fetch(`${BASE_URL}/api/test-context`, {
      headers: { Cookie: cookieStr }
    });
    const ctxData2 = await ctxRes2.json();
    console.log(`\n--- Test 2: Impersonating ${impersonatedCompanyId} ---`);
    console.log(ctxData2.context);

    if (ctxData1.context.companyId !== "company_default") {
      console.error("Test 1 Failed: Expected company_default");
    }
    if (ctxData2.context.companyId !== impersonatedCompanyId) {
      console.error(`Test 2 Failed: Expected ${impersonatedCompanyId}`);
    }
    
    if (ctxData2.context.isImpersonating !== true) {
      console.error("Test 2 Failed: Expected isImpersonating to be true");
    }

    console.log("\n✅ Context Tests Passed!");

  } catch (err) {
    console.error("Test failed:", err);
  }
}

runTest();

