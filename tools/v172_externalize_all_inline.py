#!/usr/bin/env python3
from pathlib import Path
import re,hashlib

root=Path(__file__).resolve().parents[1]
idx=root/'index.html'
html=idx.read_text(encoding='utf-8')

# Domain classification is only for physical ownership. Source order is preserved in index.
def domain(text, ident=''):
    s=(ident+' '+text[:12000]).lower()
    scores={
      'panapass':sum(s.count(k) for k in ['panapass','pagos','negativos','ranking','recurrent','ena','cobra','recorrido','fondeo']),
      'revisados':sum(s.count(k) for k in ['revisados','ecarcheck','revisado','cupos attt','fotos']),
      'control-auto':sum(s.count(k) for k in ['control-auto','control de auto','control_auto','ca6','ca7','v75control','v11unit','auditoria']),
      'gps':sum(s.count(k) for k in ['gps','geotab','rastreo']),
      'usuarios':sum(s.count(k) for k in ['usuarios','admin-user','user activity','actividad usuario']),
      'core':sum(s.count(k) for k in ['portal','login','session','shell','sidebar','router','modal-safety','home'])
    }
    best=max(scores,key=scores.get)
    return best if scores[best]>0 else 'core'

def safe(v):
    v=re.sub(r'[^a-zA-Z0-9._-]+','-',v).strip('-').lower()
    return v[:100] or 'inline'

# Collect all inline style/script blocks and replace from end to start.
items=[]
for i,m in enumerate(re.finditer(r'<style(?P<attrs>[^>]*)>(?P<body>.*?)</style>',html,re.S|re.I),1):
    attrs=m.group('attrs');body=m.group('body')
    im=re.search(r'\bid=["\']([^"\']+)',attrs,re.I); ident=im.group(1) if im else f'inline-style-{i}'
    items.append(('style',m.start(),m.end(),attrs,body,ident,domain(body,ident),i))
for i,m in enumerate(re.finditer(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>',html,re.S|re.I),1):
    attrs=m.group('attrs');body=m.group('body')
    if re.search(r'\bsrc\s*=',attrs,re.I): continue
    # Ignore non-executable structured-data script tags if ever present.
    tm=re.search(r'\btype=["\']([^"\']+)',attrs,re.I)
    if tm and tm.group(1).lower() not in ('text/javascript','application/javascript','module'):
        continue
    im=re.search(r'\bid=["\']([^"\']+)',attrs,re.I); ident=im.group(1) if im else f'inline-script-{i}'
    items.append(('script',m.start(),m.end(),attrs,body,ident,domain(body,ident),i))

created=[]
for kind,start,end,attrs,body,ident,dom,n in sorted(items,key=lambda x:x[1],reverse=True):
    digest=hashlib.sha1(body.encode()).hexdigest()[:8]
    name=f'{n:03d}-{safe(ident)}-{digest}'
    if kind=='style':
        path=root/'css'/'runtime'/dom/(name+'.css')
        path.parent.mkdir(parents=True,exist_ok=True);path.write_text(body.strip()+'\n',encoding='utf-8')
        repl=f'<link rel="stylesheet" data-rym-owner="{dom}" data-rym-source="{ident}" href="/css/runtime/{dom}/{name}.css?v=172-clean">'
    else:
        path=root/'modules'/dom/'runtime'/(name+'.js')
        path.parent.mkdir(parents=True,exist_ok=True);path.write_text(body.strip()+'\n',encoding='utf-8')
        repl=f'<script data-rym-owner="{dom}" data-rym-source="{ident}" src="/modules/{dom}/runtime/{name}.js?v=172-clean"></script>'
    html=html[:start]+repl+html[end:]
    created.append(str(path.relative_to(root)))

idx.write_text(html,encoding='utf-8')
# Hard zero-inline checks.
if re.search(r'<style(?:\s|>)',html,re.I): raise SystemExit('inline style remains')
for m in re.finditer(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>',html,re.S|re.I):
    if not re.search(r'\bsrc\s*=',m.group('attrs'),re.I) and m.group('body').strip():
        raise SystemExit('inline script remains')
print('externalized',len(created),'blocks')
print('index bytes',len(html.encode()))
