const fs = require('fs');

// 1. Update ReservationTimeline.tsx
const timelineFile = 'src/components/reservations/ReservationTimeline.tsx';
let timelineContent = fs.readFileSync(timelineFile, 'utf-8');

timelineContent = timelineContent.replace(
`          storeName={storeName}
          initialData={editRes || undefined}
        />`,
`          storeName={storeName}
          initialData={editRes || undefined}
          staffList={staffList}
        />`
);

fs.writeFileSync(timelineFile, timelineContent);

// 2. Update ReservationFormDialog.tsx
const dialogFile = 'src/components/reservations/ReservationFormDialog.tsx';
let dialogContent = fs.readFileSync(dialogFile, 'utf-8');

if (!dialogContent.includes('import { StaffProfile }')) {
    dialogContent = dialogContent.replace(
        'import { getAllCustomers, Customer } from "@/lib/customers";',
        'import { getAllCustomers, Customer } from "@/lib/customers";\nimport { StaffProfile } from "@/app/staff/actions";'
    );
}

dialogContent = dialogContent.replace(
`  storeName: string;
  initialData?: Reservation;
};`,
`  storeName: string;
  initialData?: Reservation;
  staffList: StaffProfile[];
};`
);

dialogContent = dialogContent.replace(
`export default function ReservationFormDialog({ isOpen, onClose, onSuccess, defaultStaff, defaultTime, defaultDate, storeName, initialData }: Props) {`,
`export default function ReservationFormDialog({ isOpen, onClose, onSuccess, defaultStaff, defaultTime, defaultDate, storeName, initialData, staffList }: Props) {`
);

const selectTarget = `<select name="staff_name" defaultValue={initialData?.staff_name || defaultStaff} className="w-full h-8 px-2 border border-slate-300 rounded bg-white">
                    <option value={defaultStaff}>{defaultStaff}</option>
                    <option value="大谷奈津子">大谷奈津子</option>
                    <option value="山田花子">山田花子</option>
                  </select>`;

const selectReplacement = `<select name="staff_name" defaultValue={initialData?.staff_name || defaultStaff} className="w-full h-8 px-2 border border-slate-300 rounded bg-white">
                    {staffList.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                    {!staffList.some(s => s.name === defaultStaff) && defaultStaff && (
                      <option value={defaultStaff}>{defaultStaff}</option>
                    )}
                    {initialData?.staff_name && !staffList.some(s => s.name === initialData.staff_name) && initialData.staff_name !== defaultStaff && (
                      <option value={initialData.staff_name}>{initialData.staff_name}</option>
                    )}
                  </select>`;

dialogContent = dialogContent.replace(selectTarget, selectReplacement);

fs.writeFileSync(dialogFile, dialogContent);

console.log("Updated staff list in reservation dialog");
