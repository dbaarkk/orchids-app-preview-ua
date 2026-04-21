import re

with open('src/app/api/admin/packages/route.ts', 'r') as f:
    content = f.read()

search = """export async function PUT(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  );"""

replace = """export async function PUT(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  );

  // Ensure the column exists silently to avoid errors if missing
  try {
     await supabase.rpc('exec_sql', { sql: 'ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS service_allowances JSONB DEFAULT \'{}\'::jsonb;' });
  } catch(e) {}"""

content = content.replace(search, replace)
with open('src/app/api/admin/packages/route.ts', 'w') as f:
    f.write(content)
