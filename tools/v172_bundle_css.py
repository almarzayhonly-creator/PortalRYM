#!/usr/bin/env python3
from pathlib import Path
import re

BUNDLE_VERSION='1.1'
root=Path(__file__).resolve().parents[1]
idx=root/'index.html'; loader=root/'modules/v172-clean-loader.js'
html=idx.read_text(encoding='utf-8'); ls=loader.read_text(encoding='utf-8')
links=[]
for m in re.finditer(r'<link\b[^>]*rel=["\']stylesheet["\'][^>]*>',html,re.I):
    tag=m.group(0);hm=re.search(r'href=["\']([^"\']+)',tag,re.I)
    if not hm: continue
    href=hm.group(1).split('?')[0]
    if not href.startswith('/css/'): continue
    p=root/href.lstrip('/')
    if not p.exists(): raise SystemExit(f'missing CSS asset: {href}')
    links.append((m.start(),m.end(),href,p))

# CSS injected by the clean loader is logically later in the cascade, so append it later.
cm=re.search(r"const css=\[(.*?)\];",ls,re.S)
if not cm: raise SystemExit('loader css array missing')
loader_hrefs=re.findall(r"['\"](/css/[^'\"]+)['\"]",cm.group(1))
seen={x[2] for x in links};ordered=[(x[2],x[3]) for x in links]
for href in loader_hrefs:
    href=href.split('?')[0]
    if href in seen: continue
    p=root/href.lstrip('/')
    if not p.exists(): raise SystemExit(f'missing loader CSS asset: {href}')
    ordered.append((href,p));seen.add(href)
if not ordered: raise SystemExit('no CSS assets found')

parts=[]
for href,p in ordered:
    body=p.read_text(encoding='utf-8').strip()
    parts.append(f'/* source: {href} */\n{body}\n')
bundle=root/'css/portal-rym.css';bundle.write_text('\n'.join(parts),encoding='utf-8')

for start,end,_,_ in reversed(links):html=html[:start]+html[end:]
insert='<link id="rym-v172-css" rel="stylesheet" href="/css/portal-rym.css?v=172-clean">'
marker='</title>';pos=html.find(marker)
if pos<0: raise SystemExit('title marker missing')
html=html[:pos+len(marker)]+'\n'+insert+html[pos+len(marker):]
idx.write_text(html,encoding='utf-8')
ls=ls[:cm.start()]+"const css=[];"+ls[cm.end():]
loader.write_text(ls,encoding='utf-8')
print('bundle version',BUNDLE_VERSION)
print('bundled',len(ordered),'CSS assets')
print('bundle bytes',len(bundle.read_bytes()))
print('index bytes',len(html.encode()))
