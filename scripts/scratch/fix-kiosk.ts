import fs from "fs";
import path from "path";

const pagePath = path.join(process.cwd(), "src/app/attendance/kiosk/page.tsx");
let pageContent = fs.readFileSync(pagePath, "utf-8");

pageContent = pageContent.replace(
  'import { getStaffList } from "@/app/staff/actions";',
  'import { getKioskStaffList } from "../actions";'
);
pageContent = pageContent.replace(
  'getStaffList(),',
  'getKioskStaffList(),'
);

fs.writeFileSync(pagePath, pageContent);
console.log("Updated kiosk page");
