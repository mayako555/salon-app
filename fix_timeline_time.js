const fs = require('fs');
const file = 'src/components/reservations/ReservationTimeline.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Ensure START_HOUR is treated as a number
content = content.replace(
`  const START_HOUR = storeSettings.startHour;
  const END_HOUR = storeSettings.endHour;`,
`  const START_HOUR = Number(storeSettings.startHour) || 8;
  const END_HOUR = Number(storeSettings.endHour) || 22;`
);

// Update input type in ReservationFormDialog to be controlled or have proper default
const formFile = 'src/components/reservations/ReservationFormDialog.tsx';
let formContent = fs.readFileSync(formFile, 'utf-8');

// Also fix the time input to use initialData if present
formContent = formContent.replace(
`defaultValue={isAllDay ? "09:00" : defaultTime}`,
`defaultValue={initialData?.start_time || (isAllDay ? "09:00" : defaultTime)}`
);

fs.writeFileSync(file, content);
fs.writeFileSync(formFile, formContent);
console.log("Fixed timeline parsing and form input defaults");
