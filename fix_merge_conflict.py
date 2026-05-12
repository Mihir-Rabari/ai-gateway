import re

with open('apps/web/src/app/auth/popup/page.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'<<<<<<< HEAD\n=======\n<<<<<<< HEAD\n          setLoading\(false\);\n=======\n>>>>>>> origin/main\n>>>>>>> origin/main', '          setLoading(false);', content, flags=re.DOTALL)

with open('apps/web/src/app/auth/popup/page.tsx', 'w') as f:
    f.write(content)
