const { assertFails, assertSucceeds, initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const fs = require("fs");

async function run() {
  const testEnv = await initializeTestEnvironment({
    projectId: "demo-test",
    firestore: {
      rules: `
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{col}/{docId} {
              allow read, write: if col != 'users' && col != 'staff_profiles';
            }
            match /users/{userId} {
              allow read: if request.auth != null;
              allow write: if false;
            }
          }
        }
      `
    }
  });

  const unauthed = testEnv.unauthenticatedContext().firestore();
  
  console.log("Testing sales...");
  await assertSucceeds(unauthed.collection("sales").doc("test").get());
  
  console.log("Testing users...");
  await assertFails(unauthed.collection("users").doc("test").get());
  
  console.log("All passed!");
  process.exit(0);
}
run().catch(console.error);
