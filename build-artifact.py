# makes artifact/ : the page body for the claude.ai preview (skeleton is added on publish)
import re, shutil, os
src='site'; out='artifact'
shutil.rmtree(out, ignore_errors=True); shutil.copytree(src, out)
h=open(f'{src}/index.html').read()
h=re.sub(r'<!doctype html>\s*<html lang="hu">\s*<head>\s*','',h)
h=re.sub(r'<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*','',h)
h=h.replace('</head>\n<body>\n','').replace('</body>\n</html>\n','')
h=re.sub(r'\?v=\d+','',h)
h=h.replace("<script>document.documentElement.classList.add('js')</script>","<script>document.documentElement.classList.add('js');document.documentElement.lang='hu'</script>")
h=h.replace("<title>kettő: weboldalak kis cégeknek</title>","<title>kettő v7</title>")
h=h.replace('<meta name="robots" content="noindex">\n','')
open(f'{out}/index.html','w').write(h)
print(h[:300])
