import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_schema_info', {});
  console.log("If RPC fails, trying direct query if possible, or just look at a row:");
  const { data: row, error: rowErr } = await supabase.from('user_packages').select('*').limit(1);
  console.log(row, rowErr);
}
run();
