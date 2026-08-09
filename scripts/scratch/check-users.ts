import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { adminDb } from "./src/lib/firebase-admin";

async function main() {
  const users = await adminDb.collection("users").get();
  console.log("users docs:", users.docs.length);
  
  const staff = await adminDb.collection("staff_profiles").get();
  console.log("staff docs:", staff.docs.length);
}
main();
