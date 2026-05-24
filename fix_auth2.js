require("dotenv").config({ path: ".env.local" }); // Load env vars first

// Now require firebase-admin which will use the env vars
const { adminAuth, adminDb } = require("./src/lib/firebase-admin");

async function run() {
  const email = "suzuka110607@icloud.com";
  console.log("Checking DB for:", email);

  const snap = await adminDb.collection("staff_profiles").where("email", "==", email).get();
  if (snap.empty) {
    console.log("No staff profile found for", email);
    return;
  }
  
  const staffDoc = snap.docs[0];
  const staff = staffDoc.data();
  const pwd = staff.passcode + "_salon";
  
  console.log("Found staff:", staff.name, "Passcode:", staff.passcode);
  
  try {
    const user = await adminAuth.getUserByEmail(email);
    console.log("User exists in Auth:", user.uid);
    await adminAuth.updateUser(user.uid, { password: pwd });
    console.log("Updated password successfully to:", pwd);
    
    // Make sure uid is linked
    if (staff.uid !== user.uid) {
      await adminDb.collection("staff_profiles").doc(staffDoc.id).update({ uid: user.uid });
      console.log("Linked UID to profile");
    }
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      console.log("User not found in Auth. Creating new user...");
      const newUser = await adminAuth.createUser({
        email,
        password: pwd,
        displayName: staff.name
      });
      console.log("Created user:", newUser.uid);
      await adminDb.collection("staff_profiles").doc(staffDoc.id).update({ uid: newUser.uid });
      console.log("Linked new UID to profile");
    } else {
      console.error("Auth Error:", e);
    }
  }
}

run().catch(console.error);
