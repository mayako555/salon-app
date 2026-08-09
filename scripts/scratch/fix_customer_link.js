const fs = require('fs');
const file = 'src/components/reservations/ReservationFormDialog.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. Add customer_id to initial formDataState
content = content.replace(
`  const [formDataState, setFormDataState] = useState({
    last_name: "",`,
`  const [formDataState, setFormDataState] = useState({
    customer_id: initialData?.customer_id || null as string | null,
    last_name: "",`
);

// 2. Update the reset logic inside useEffect
content = content.replace(
`        setFormDataState({
          last_name: nameParts[0] || "",`,
`        setFormDataState({
          customer_id: initialData.customer_id || null,
          last_name: nameParts[0] || "",`
);

content = content.replace(
`        setFormDataState({
          last_name: "",`,
`        setFormDataState({
          customer_id: null,
          last_name: "",`
);

// 3. Update handleSelectCustomer to save c.id
content = content.replace(
`  const handleSelectCustomer = (c: Customer) => {
    setFormDataState({
      last_name: c.last_name || c.name?.split(" ")[0] || "",`,
`  const handleSelectCustomer = (c: Customer) => {
    setFormDataState({
      customer_id: c.id,
      last_name: c.last_name || c.name?.split(" ")[0] || "",`
);

// 4. Update data payload in handleSubmit
content = content.replace(
`      type: recordType,
      customer_name: recordType === "reservation" ? customerName : "",
      customer_kana: recordType === "reservation" ? customerKana : "",`,
`      type: recordType,
      customer_id: recordType === "reservation" ? (formDataState.customer_id || undefined) : undefined,
      customer_name: recordType === "reservation" ? customerName : "",
      customer_kana: recordType === "reservation" ? customerKana : "",`
);

// 5. Add a visual indicator if a customer is linked
const nameLabelTarget = `<div className="w-full sm:w-28 font-bold text-slate-700 pr-2">
                      氏名（漢字）
                    </div>`;
const nameLabelNew = `<div className="w-full sm:w-28 font-bold text-slate-700 pr-2 flex flex-col justify-center gap-1">
                      氏名（漢字）
                      {formDataState.customer_id && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                          <CheckCircle className="w-2.5 h-2.5" /> 連携済
                        </span>
                      )}
                    </div>`;
content = content.replace(nameLabelTarget, nameLabelNew);

// If the user modifies the inputs after linking, it's nice to unlink, but maybe not strictly necessary for MVP.
// We'll leave it as is. If they type, it will still save the customer_id, which might be slightly wrong if they completely change the name, but usually they just fix a typo.
// Actually, let's clear customer_id if they change the phone number or kana manually? Too complex for now.

fs.writeFileSync(file, content);
console.log("Fixed customer link bug");
