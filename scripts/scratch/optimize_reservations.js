const fs = require('fs');

// 1. Optimize reservations/page.tsx
let pageContent = fs.readFileSync('src/app/reservations/page.tsx', 'utf-8');
pageContent = pageContent.replace(
  'import { getMonthlyShifts, ShiftRecord } from "@/app/shifts/actions";',
  'import { getShiftsForDate, ShiftRecord } from "@/app/shifts/actions";'
);
pageContent = pageContent.replace(
  'getMonthlyShifts(date.getFullYear(), date.getMonth() + 1),',
  'getShiftsForDate(dateStr),'
);
pageContent = pageContent.replace(
  'const dailyShifts = shiftsData.filter(s => s.date === dateStr);',
  'const dailyShifts = shiftsData;'
);
fs.writeFileSync('src/app/reservations/page.tsx', pageContent);

// 2. Optimize reservations/actions.ts
let actionsContent = fs.readFileSync('src/app/reservations/actions.ts', 'utf-8');

const oldFetchBlock = `      // Better to fetch individually if few, or bulk fetch if many. Let's do simple getDoc for now since daily reservations aren't massive.
      await Promise.all(customerIds.map(async id => {
        const cRef = doc(db, 'customers', id);
        const cSnap = await getDoc(cRef);
        if (cSnap.exists()) {
          const data = cSnap.data();
          counts[id] = data.same_day_cancel_count || 0;
          customerInfo[id] = {
            notes: data.notes || "",
            allergies: data.allergies || []
          };
        }
      }));`;

const newFetchBlock = `      const { collection, getDocs, query, where, documentId } = await import('firebase/firestore');
      
      // Chunk into 10s for 'in' queries
      const chunkSize = 10;
      const chunks = [];
      for (let i = 0; i < customerIds.length; i += chunkSize) {
        chunks.push(customerIds.slice(i, i + chunkSize));
      }
      
      await Promise.all(chunks.map(async chunk => {
        const q = query(collection(db, 'customers'), where(documentId(), 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach(cSnap => {
          const data = cSnap.data();
          counts[cSnap.id] = data.same_day_cancel_count || 0;
          customerInfo[cSnap.id] = {
            notes: data.notes || "",
            allergies: data.allergies || []
          };
        });
      }));`;

if (actionsContent.includes(oldFetchBlock)) {
   actionsContent = actionsContent.replace(oldFetchBlock, newFetchBlock);
   fs.writeFileSync('src/app/reservations/actions.ts', actionsContent);
   console.log("Optimized actions.ts fetch");
} else {
   console.log("Could not find fetch block in actions.ts");
}

console.log("Done optimizing.");
