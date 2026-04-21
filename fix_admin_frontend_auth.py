import re

def fix_admin_frontend(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # The helper to get the token
    token_helper = """
const getAuthToken = () => {
    if (typeof window === 'undefined') return '';
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const key = url ? `sb-${url.split('//')[1].split('.')[0]}-auth-token` : '';
        const tokenStr = key ? localStorage.getItem(key) : null;
        return tokenStr ? JSON.parse(tokenStr).access_token : '';
    } catch { return ''; }
};
"""

    if "const getAuthToken" not in content:
        # Insert after imports
        imports_end = content.rfind("from 'sonner';") + len("from 'sonner';")
        content = content[:imports_end] + "\n" + token_helper + content[imports_end:]

    # Replace fetch calls with auth headers

    # 1. GET requests
    content = re.sub(
        r"await fetch\(`\$\{process.env.NEXT_PUBLIC_API_URL \|\| ''\}/api/admin\?([^`]+)`\)",
        r"await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin?\1`, { headers: { 'Authorization': `Bearer ${getAuthToken()}` } })",
        content
    )

    # 2. POST/PUT/DELETE requests with headers
    content = re.sub(
        r"headers: \{ 'Content-Type': 'application/json' \}",
        r"headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` }",
        content
    )

    # 3. specific fetch calls without headers object defined
    # e.g., await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/packages`, { method: 'POST', body: JSON.stringify(body) });
    content = re.sub(
        r"method: '(POST|PUT|DELETE)', body: JSON.stringify",
        r"method: '\1', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` }, body: JSON.stringify",
        content
    )

    # e.g., await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/packages?id=${pkg.id}`, { method: 'DELETE' });
    content = re.sub(
        r"\{ method: 'DELETE' \}",
        r"{ method: 'DELETE', headers: { 'Authorization': `Bearer ${getAuthToken()}` } }",
        content
    )

    # Check for direct calls
    content = re.sub(
        r"fetch\(`\$\{process.env.NEXT_PUBLIC_API_URL \|\| ''\}/api/admin/packages`\)",
        r"fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/packages`, { headers: { 'Authorization': `Bearer ${getAuthToken()}` } })",
        content
    )

    content = re.sub(
        r"fetch\(`\$\{process.env.NEXT_PUBLIC_API_URL \|\| ''\}/api/admin/crm`\)",
        r"fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/crm`, { headers: { 'Authorization': `Bearer ${getAuthToken()}` } })",
        content
    )

    with open(file_path, 'w') as f:
        f.write(content)
    print(f"Fixed {file_path}")

fix_admin_frontend('src/app/admin/page.tsx')
fix_admin_frontend('src/app/admin/users/[id]/page.tsx')
