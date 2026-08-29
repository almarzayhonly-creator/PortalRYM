#!/usr/bin/env python3
from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
idx=root/'index.html'
html=idx.read_text(encoding='utf-8')
links=[]
for m in re.finditer(r'<link\b[^>]*rel=["\']stylesheet["\'][^>]*>',html,re.I):
    tag=m.group(0)
    hm=re.search(r'href=["\']([^"\']+)',tag,re.I)
    if not hm: continue
    href=hm.group(1).split('?')[0]
    if not href.startswith('/css/'): continue
    p=root/href.lstrip('/')
    if not p.exists(): raise SystemExit(f'missing CSS asset: {href}')
    links.append((m.start(),m.end(),href,p))
if not links: raise SystemExit('no local CSS links found')
parts=[]
for _,_,href,p in links:
    body=p.read_text(encoding='utf-8').strip()
    parts.append(f'/* source: {href} */\n{body}\n')
bundle=root/'css/portal-rym.css'
bundle.write_text('\n'.join(parts),encoding='utf-8')
# Replace all local stylesheet links with one canonical bundle at first position.
first=links[0][0]
for start,end,_,_ in reversed(links):
    html=html[:start]+html[end:]
insert='<link id="rym-v172-css" rel="stylesheet" href="/css/portal-rym.css?v=172-clean">'
# Recompute safe insertion: after title to keep deterministic head placement.
marker='</title>'
pos=html.find(marker)
if pos<0: raise SystemExit('title marker missing')
html=html[:pos+len(marker)]+'\n'+insert+html[pos+len(marker):]
idx.write_text(html,encoding='utf-8')
print('bundled',len(links),'CSS assets')
print('bundle bytes',len(bundle.read_bytes()))
print('index bytes',len(html.encode()))
