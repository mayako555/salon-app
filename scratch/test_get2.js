require('dotenv').config({ path: '.env.local' });
const { getMasterItems } = require('./src/app/sales/master-actions');
// Oh wait, getMasterItems uses next/headers inside getCurrentUserContext, so we can't run it in Node.
