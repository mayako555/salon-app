import { getContractsList } from "./src/app/contracts/actions";

async function check() {
  const contracts = await getContractsList();
  const higuchi = contracts.find(c => c.staff_name === "樋口知奈美");
  console.log(JSON.stringify(higuchi, null, 2));
}

check();
