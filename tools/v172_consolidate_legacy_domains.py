#!/usr/bin/env python3
from pathlib import Path
import re, shutil

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/'index.html'
html=INDEX.read_text(encoding='utf-8')


def remove_tag_by_id(text, tag, sid):
    pat=re.compile(rf'<{tag}\b[^>]*\bid=["\']{re.escape(sid)}["\'][^>]*>(?:.*?</{tag}>)?',re.S|re.I)
    text,n=pat.subn('',text,1)
    if n!=1: print('WARN missing tag',tag,sid)
    return text


def replace_src(text, old, new):
    if old in text: return text.replace(old,new)
    print('WARN missing src',old)
    return text


def move(src,dst):
    s=ROOT/src; d=ROOT/dst; d.parent.mkdir(parents=True,exist_ok=True)
    if not s.exists(): print('WARN missing',src); return
    shutil.move(str(s),str(d))

# V92/V93 were superseded by canonical Panapass Ranking/Recurrentes/Bajas modules.
for sid in ['v92-consolidated-behavior','v93-polish-behavior']:
    html=remove_tag_by_id(html,'script',sid)
for sid in ['v92-consolidated-css','v93-polish-css']:
    html=remove_tag_by_id(html,'link',sid)
for p in ['modules/legacy/v92-consolidated-behavior.js','modules/legacy/v93-polish-behavior.js','css/legacy/v92-consolidated-css.css','css/legacy/v93-polish-css.css']:
    q=ROOT/p
    if q.exists(): q.unlink()

# V99 is Portal/Core.
move('modules/legacy/rym-v99-centro-control-js.js','modules/core/portal-home-v99.js')
move('css/legacy/rym-v99-centro-control-css.css','css/core-portal-v99.css')
html=replace_src(html,'/modules/legacy/rym-v99-centro-control-js.js','/modules/core/portal-home-v99.js')
html=replace_src(html,'/css/legacy/rym-v99-centro-control-css.css','/css/core-portal-v99.css')

# V155 is GPS + route guards. Keep route guards temporarily here until Core router absorbs them.
move('modules/legacy/rym-v155-gps-fix-js.js','modules/gps/v155.js')
move('css/legacy/rym-v155-gps-fix-css.css','css/gps-v155.css')
html=replace_src(html,'/modules/legacy/rym-v155-gps-fix-js.js','/modules/gps/v155.js')
html=replace_src(html,'/css/legacy/rym-v155-gps-fix-css.css','/css/gps-v155.css')

# V124 is Control dashboard except obsolete Ranking pyramid enhancement.
src=ROOT/'modules/legacy/rym-v124-dashboard-ranking-js.js'
if src.exists():
    body=src.read_text(encoding='utf-8')
    start=body.find('  function buildRankingPyramid()')
    end=body.find('  let timer=0;const enhance=',start)
    if start!=-1 and end!=-1:
        tail=body[end:]
        tail=re.sub(r'let timer=0;const enhance=.*?enhance\(\);',"let timer=0;const enhance=()=>{clearTimeout(timer);timer=setTimeout(()=>{fixControlKpis();fallbackSupervisorSummary()},90)};new MutationObserver(enhance).observe(document.documentElement,{subtree:true,childList:true});enhance();",tail,flags=re.S)
        body=body[:start]+tail
    dst=ROOT/'modules/control-auto/dashboard/v124.js';dst.parent.mkdir(parents=True,exist_ok=True);dst.write_text(body,encoding='utf-8');src.unlink()
html=replace_src(html,'/modules/legacy/rym-v124-dashboard-ranking-js.js','/modules/control-auto/dashboard/v124.js')
move('css/legacy/rym-v124-dashboard-ranking-css.css','css/control-auto-v124.css')
html=replace_src(html,'/css/legacy/rym-v124-dashboard-ranking-css.css','/css/control-auto-v124.css')
p=ROOT/'css/control-auto-v124.css'
if p.exists():
    c=p.read_text(encoding='utf-8'); marker='/* Ranking:'
    if marker in c: c=c.split(marker,1)[0].rstrip()+'\n'
    p.write_text(c,encoding='utf-8')

# V123: discard obsolete Recurrentes/Ranking decoration, keep portal + control experience.
src=ROOT/'modules/legacy/rym-v123-experience-js.js'
if src.exists():
    body=src.read_text(encoding='utf-8')
    body=re.sub(r'\n  function improveRanking\(\)\{.*?\n  \}\n','\n',body,count=1,flags=re.S)
    a=body.find('  recurrentes=async function(v){')
    b=body.find('  async function supervisorSummary(){',a)
    if a!=-1 and b!=-1: body=body[:a]+body[b:]
    a=body.find('  const oldDraw=window.draw113;')
    b=body.find('  let timer=0;const enhance=',a)
    if a!=-1 and b!=-1: body=body[:a]+body[b:]
    body=body.replace('decorateHome();ensureMobileLogout();improveRanking()','decorateHome();ensureMobileLogout()')
    dst=ROOT/'modules/core/experience-v123.js';dst.parent.mkdir(parents=True,exist_ok=True);dst.write_text(body,encoding='utf-8');src.unlink()
html=replace_src(html,'/modules/legacy/rym-v123-experience-js.js','/modules/core/experience-v123.js')
move('css/legacy/rym-v123-experience-css.css','css/core-experience-v123.css')
html=replace_src(html,'/css/legacy/rym-v123-experience-css.css','/css/core-experience-v123.css')
p=ROOT/'css/core-experience-v123.css'
if p.exists():
    c=p.read_text(encoding='utf-8')
    c=re.sub(r'/\* Ranking completo:.*?(?=/\* Recurrentes:)', '', c, flags=re.S)
    c=re.sub(r'/\* Recurrentes:.*?(?=/\* Control de Auto:)', '', c, flags=re.S)
    p.write_text(c,encoding='utf-8')

# V154 remains functionally important for Control/Cupos/GPS. Re-home it explicitly
# as compatibility under Core until its three sections are individually extracted.
move('modules/legacy/rym-v154-safe-js.js','modules/core/compat-v154.js')
move('css/legacy/rym-v154-safe-css.css','css/core-compat-v154.css')
html=replace_src(html,'/modules/legacy/rym-v154-safe-js.js','/modules/core/compat-v154.js')
html=replace_src(html,'/css/legacy/rym-v154-safe-css.css','/css/core-compat-v154.css')

# Canonical Bajas route: no legacy v87 owner.
rp=ROOT/'modules/panapass/router.js'
r=rp.read_text(encoding='utf-8')
r=r.replace("recurrentes:'panapass-recurrentes'","recurrentes:'panapass-recurrentes',\n    bajas_panapass:'panapass-bajas'")
r=r.replace("    bajas_panapass:'v87BajasPanapass'\n",'')
rp.write_text(r,encoding='utf-8')

# Control router lifecycle hooks replace future wrapper-style customization.
cp=ROOT/'modules/control-auto/router.js'
c=cp.read_text(encoding='utf-8')
c=c.replace("  let queued=null;\n","  let queued=null;\n  const hooks=new Map();\n")
c=c.replace("    await fn.call(w);\n    current=key;","    await fn.call(w);\n    const list=hooks.get(key)||[];\n    for(const hook of list) await hook({route:key});\n    current=key;")
c=c.replace("  function active(){return current}","  function after(route,fn){\n    const key=normalize(route);if(!routes[key]||typeof fn!=='function')throw new Error('Hook Control invalido');\n    const list=hooks.get(key)||[];list.push(fn);hooks.set(key,list);return()=>hooks.set(key,(hooks.get(key)||[]).filter(x=>x!==fn));\n  }\n\n  function active(){return current}")
c=c.replace("Object.freeze({open,leave,active,isBusy,rebind,routes})","Object.freeze({open,leave,active,isBusy,rebind,routes,after})")
cp.write_text(c,encoding='utf-8')

INDEX.write_text(html,encoding='utf-8')
for d in [ROOT/'modules/legacy',ROOT/'css/legacy']:
    if d.exists() and not any(d.iterdir()): d.rmdir()
final=INDEX.read_text(encoding='utf-8')
if '/modules/legacy/' in final or '/css/legacy/' in final: raise SystemExit('legacy reference remains in index')
if re.search(r'\branking\s*=\s*async function|\brecurrentes\s*=\s*async function',(ROOT/'modules/core/experience-v123.js').read_text(encoding='utf-8')): raise SystemExit('obsolete Panapass owner remains in V123')
print('V172 legacy domains consolidated')
print('index bytes',INDEX.stat().st_size)
# trigger: 2026-08-29T00:05Z
