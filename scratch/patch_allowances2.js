const fs = require('fs');
const path = './src/app/allowances/actions.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/console\.log\(/g, `require('fs').appendFileSync('scratch/allowance_log.txt', `);
code = code.replace(/getMonthlyAllowanceTasks called/g, `getMonthlyAllowanceTasks called\\n`);
code = code.replace(/Fetching staff list.../g, `Fetching staff list...\\n`);
code = code.replace(/Staff list fetched:/g, `Staff list fetched: `);
code = code.replace(/Fetching allowances.../g, `Fetching allowances...\\n`);
code = code.replace(/Allowances fetched:/g, `Allowances fetched: `);
code = code.replace(/Fetching monthly sales.../g, `Fetching monthly sales...\\n`);
code = code.replace(/Monthly sales fetched:/g, `Monthly sales fetched: `);
code = code.replace(/Fetching monthly reviews.../g, `Fetching monthly reviews...\\n`);
code = code.replace(/Monthly reviews fetched:/g, `Monthly reviews fetched: `);

// Also add a log at the end
code = code.replace('return tasks;', "require('fs').appendFileSync('scratch/allowance_log.txt', 'Returning tasks...\\n'); return tasks;");

fs.writeFileSync(path, code);
