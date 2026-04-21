const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'packages' }).catch(e => e);
  console.log("RPC Error (if any):", error);
  // Just try selecting one and see what it returns
  const res = await supabase.from('packages').select('*').limit(1);
  console.log("Columns from data:", Object.keys(res.data[0] || {}));
}
run();
