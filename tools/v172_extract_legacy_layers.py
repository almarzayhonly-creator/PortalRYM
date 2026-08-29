#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/'index.html'
VERSIONS=('v92','v93','v99','v123','v124','v154','v155')

html=INDEX.read_text(encoding='utf-8')
changed=[]

def safe_name(value):
    return re.sub(r'[^a-zA-Z0-9._-]+','-',value).strip('-')

# Extract scripts with matching ids, preserving exact source order by replacing
# inline blocks in place with external script tags.
script_pat=re.compile(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>',re.S|re.I)
script_matches=[]
for m in script_pat.finditer(html):
    attrs=m.group('attrs'); body=m.group('body')
    im=re.search(r'\bid=["\']([^"\']+)',attrs,re.I)
    if not im: continue
    sid=im.group(1)
    if not any(v in sid.lower() for v in VERSIONS): continue
    if 'src=' in attrs.lower(): continue
    script_matches.append((m,sid,body))

for m,sid,body in reversed(script_matches):
    name=safe_name(sid)+'.js'
    path=ROOT/'modules'/'legacy'/name
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text('/* V172 clean externalized legacy layer: '+sid+' */\n'+body.strip()+'\n',encoding='utf-8')
    repl=f'<script id="{sid}" src="/modules/legacy/{name}?v=172-clean"></script>'
    html=html[:m.start()]+repl+html[m.end():]
    changed.append(str(path.relative_to(ROOT)))

# Extract styles the same way.
style_pat=re.compile(r'<style(?P<attrs>[^>]*)>(?P<body>.*?)</style>',re.S|re.I)
style_matches=[]
for m in style_pat.finditer(html):
    attrs=m.group('attrs'); body=m.group('body')
    im=re.search(r'\bid=["\']([^"\']+)',attrs,re.I)
    if not im: continue
    sid=im.group(1)
    if not any(v in sid.lower() for v in VERSIONS): continue
    style_matches.append((m,sid,body))

for m,sid,body in reversed(style_matches):
    name=safe_name(sid)+'.css'
    path=ROOT/'css'/'legacy'/name
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text('/* V172 clean externalized legacy layer: '+sid+' */\n'+body.strip()+'\n',encoding='utf-8')
    repl=f'<link id="{sid}" rel="stylesheet" href="/css/legacy/{name}?v=172-clean">'
    html=html[:m.start()]+repl+html[m.end():]
    changed.append(str(path.relative_to(ROOT)))

INDEX.write_text(html,encoding='utf-8')

# Assertions: no matching inline versioned script/style remains.
for v in VERSIONS:
    bad_script=re.search(rf'<script[^>]+id=["\'][^"\']*{re.escape(v)}[^"\']*["\'][^>]*>(?!\s*</script>)',html,re.I)
    bad_style=re.search(rf'<style[^>]+id=["\'][^"\']*{re.escape(v)}[^"\']*["\']',html,re.I)
    if bad_script: raise SystemExit(f'inline legacy script remains for {v}')
    if bad_style: raise SystemExit(f'inline legacy style remains for {v}')

print('externalized files:',len(changed))
for p in changed: print(p)
print('index bytes:',INDEX.stat().st_size)
