#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/'index.html'
RUNTIME=ROOT/'modules/core/runtime.js'
PORTAL=ROOT/'modules/core/portal-v70.js'
PORTAL_CSS=ROOT/'css/portal-v70.css'

html=INDEX.read_text(encoding='utf-8')
runtime=RUNTIME.read_text(encoding='utf-8')

# 1) Canonical owner for Ranking/Recurrentes in the base renderer.
old_rank="if(state.active==='ranking')return ranking(v);"
new_rank="if(state.active==='ranking')return RYM_MODULES.open('panapass-ranking',{target:v});"
old_rec="if(state.active==='recurrentes')return recurrentes(v);"
new_rec="if(state.active==='recurrentes')return RYM_MODULES.open('panapass-recurrentes',{target:v});"
if old_rank in runtime:
    runtime=runtime.replace(old_rank,new_rank,1)
elif new_rank not in runtime:
    raise SystemExit('Base ranking route not found')
if old_rec in runtime:
    runtime=runtime.replace(old_rec,new_rec,1)
elif new_rec not in runtime:
    raise SystemExit('Base recurrentes route not found')
RUNTIME.write_text(runtime,encoding='utf-8')

# 2) Move V70 portal/admin implementation out of index 1:1.
script_tag='<script id="rym-v70-stable-js" src="/modules/core/portal-v70.js?v=172-clean"></script>'
css_tag='<link id="rym-v70-stable-css" rel="stylesheet" href="/css/portal-v70.css?v=172-clean">'

if script_tag not in html:
    sm=re.search(r'<script\s+id=["\']rym-v70-stable-js["\'][^>]*>(.*?)</script>',html,re.S|re.I)
    if not sm: raise SystemExit('V70 script block not found')
    body=sm.group(1).strip()+'\n'
    if len(body.encode())<15000 or 'window.v70OpenUsers' not in body or 'v36PortalHome' not in body:
        raise SystemExit('Unexpected V70 script content')
    PORTAL.parent.mkdir(parents=True,exist_ok=True)
    PORTAL.write_text('/* Portal RYM V172 clean - externalized V70 portal/admin */\n'+body,encoding='utf-8')
    html=html[:sm.start()]+script_tag+html[sm.end():]

if css_tag not in html:
    styles=list(re.finditer(r'<style(?P<attrs>[^>]*)>(?P<body>.*?)</style>',html,re.S|re.I))
    candidates=[]
    for m in styles:
        b=m.group('body')
        score=sum(token in b for token in ('.v70-portal','.v70-admin','.v70-control','.v70-admin-app','.v70-admin-side'))
        if score>=2:
            candidates.append((score,len(b),m))
    if not candidates: raise SystemExit('V70 stylesheet not found')
    _,_,cm=max(candidates,key=lambda x:(x[0],x[1]))
    css=cm.group('body').strip()+'\n'
    if len(css.encode())<3000: raise SystemExit('Unexpected V70 stylesheet size')
    PORTAL_CSS.parent.mkdir(parents=True,exist_ok=True)
    PORTAL_CSS.write_text('/* Portal RYM V172 clean - externalized V70 portal/admin */\n'+css,encoding='utf-8')
    html=html[:cm.start()]+css_tag+html[cm.end():]

INDEX.write_text(html,encoding='utf-8')

final=INDEX.read_text(encoding='utf-8')
if final.count(script_tag)!=1: raise SystemExit('V70 script tag not unique')
if final.count(css_tag)!=1: raise SystemExit('V70 css tag not unique')
if re.search(r'<script\s+id=["\']rym-v70-stable-js["\'][^>]*>\s*[^<]',final,re.I):
    raise SystemExit('Inline V70 JS still present')

print('V172 canonical routing + V70 extraction OK')
print('index bytes:',INDEX.stat().st_size)
print('runtime bytes:',RUNTIME.stat().st_size)
print('portal bytes:',PORTAL.stat().st_size)
print('portal css bytes:',PORTAL_CSS.stat().st_size)
