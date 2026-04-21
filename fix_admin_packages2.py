import re

with open('src/app/api/admin/packages/route.ts', 'r') as f:
    content = f.read()

# Let's fix the extra `supabase` instance I accidentally added
search = """export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  );

  // Ensure the column exists silently to avoid errors if missing
  try {
     await supabase.rpc('exec_sql', { sql: 'ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS service_allowances JSONB DEFAULT \'{}\'::jsonb;' });
  } catch(e) {}

  const supabase = createClient("""

replace = """export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  );

  // Ensure the column exists silently to avoid errors if missing
  try {
     await supabase.rpc('exec_sql', { sql: 'ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS service_allowances JSONB DEFAULT \'{}\'::jsonb;' });
  } catch(e) {}
"""

content = content.replace(search, replace)

with open('src/app/api/admin/packages/route.ts', 'w') as f:
    f.write(content)
print("Cleaned up API route")
