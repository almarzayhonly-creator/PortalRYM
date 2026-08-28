#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/'index.html'
LOADER=ROOT/'modules/v172-clean-loader.js'


def extract(html, tag, element_id):
    pat=re.compile(rf'<{tag}\s+id=["\']{re.escape(element_id)}["\'][^>]*>(.*?)</{tag}>', re.S|re.I)
    m=pat.search(html)
    if not m:
        raise SystemExit(f'missing {tag}#{element_id}')
    return m.group(1).strip()+"\n", html[:m.start()]+html[m.end():]


def remove_once(text, old, label):
    n=text.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    return text.replace(old,'',1)


def write(path, content):
    p=ROOT/path
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(content,encoding='utf-8')

html=INDEX.read_text(encoding='utf-8')

# V80 Validador eCarCheck: move JS/CSS out of index and remove wrappers that
# reassigned canonical Control views. The validator may still invoke Units as
# a prerequisite until Units itself is extracted, but it no longer owns tabs.
v80_css,html=extract(html,'style','rym-v80-control-ecarcheck-css')
v80_js,html=extract(html,'script','rym-v80-control-ecarcheck-js')
old_decl="  const oldUnits=window.v75ControlUnits,oldAudit=window.v75ControlAudit,oldDash=window.v75ControlDashboard;\n"
v80_js=remove_once(v80_js,old_decl,'v80 old view captures')
for old,label in [
("  if(typeof oldUnits==='function')window.v75ControlUnits=async function(){clearTimer();const r=await oldUnits.apply(this,arguments);addNav('unidades');return r};\n",'v80 units wrapper'),
("  if(typeof oldAudit==='function')window.v75ControlAudit=async function(){clearTimer();const r=await oldAudit.apply(this,arguments);addNav('auditoria');document.querySelector('#v75AuditValidate')?.remove();return r};\n",'v80 audit wrapper'),
("  if(typeof oldDash==='function')window.v75ControlDashboard=async function(){clearTimer();const r=await oldDash.apply(this,arguments);addNav('dashboard');return r};\n",'v80 dashboard wrapper')]:
    v80_js=remove_once(v80_js,old,label)
v80_js=remove_once(v80_js,"await oldUnits();","v80 validator preload")
v80_js=v80_js.replace("window.__v75ControlMode=true;addNav('validator');","window.__v75ControlMode=true;if(typeof window.v75ControlUnits==='function')await window.v75ControlUnits();addNav('validator');",1)
write('modules/control-auto/validador.js',v80_js)
write('css/control-auto-validador.css',v80_css)

# V83 only existed to repair/duplicate Control navigation. Its CSS hiding the
# internal audit hook remains useful, but JS ownership is retired entirely.
v83_css,html=extract(html,'style','rym-v83-control-nav-fix-css')
_v83_js,html=extract(html,'script','rym-v83-control-nav-fix-js')
base_css=(ROOT/'css/control-auto.css').read_text(encoding='utf-8').rstrip()+"\n\n/* V172 clean: internal functional hook, navigation owned by router.js */\n"+v83_css
write('css/control-auto.css',base_css)

# V94 Cupos: move whole feature out, remove wrapper layer around other tabs,
# and stop preloading the Units screen before rendering Cupos.
v94_css,html=extract(html,'style','rym-v94-cupos-attt-css')
v94_js,html=extract(html,'script','rym-v94-cupos-attt-js')
wrap94="  function wrap94(name,active){const fn=window[name];if(typeof fn!=='function'||fn.__v94cupos)return;const w=async function(){const r=await fn.apply(this,arguments);ensureNav94(active);return r};w.__v94cupos=true;window[name]=w;try{if(name==='v75ControlDashboard')v75ControlDashboard=w;if(name==='v75ControlUnits')v75ControlUnits=w;if(name==='v75ControlAudit')v75ControlAudit=w}catch(_){}}\n  wrap94('v75ControlDashboard','dashboard');wrap94('v75ControlUnits','unidades');wrap94('v75ControlAudit','auditoria');wrap94('v80OpenEcarValidator','validator');\n\n"
v94_js=remove_once(v94_js,wrap94,'v94 wrappers')
v94_js=v94_js.replace("    if(typeof window.v75ControlUnits==='function')await window.v75ControlUnits();\n",'',1)
write('modules/control-auto/cupos.js',v94_js)
write('css/control-auto-cupos.css',v94_css)

# Activate the clean source loader directly in source, never via workflow-time
# recovery/injection. It is intentionally placed after legacy definitions while
# migration is in progress.
loader_tag='<script id="rym-v172-clean-loader" src="/modules/v172-clean-loader.js?v=172-clean"></script>'
if loader_tag not in html:
    pos=html.lower().rfind('</body>')
    if pos<0:
        raise SystemExit('missing </body>')
    html=html[:pos]+loader_tag+'\n'+html[pos:]

# Loader order: feature code first, then the scoped router, then module entry.
loader=LOADER.read_text(encoding='utf-8')
needle="    '/modules/revisados/index.js',\n    '/modules/control-auto/router.js',\n    '/modules/control-auto/index.js',"
replacement="    '/modules/revisados/index.js',\n    '/modules/control-auto/validador.js',\n    '/modules/control-auto/cupos.js',\n    '/modules/control-auto/router.js',\n    '/modules/control-auto/index.js',"
if needle not in loader:
    raise SystemExit('loader control insertion point missing')
loader=loader.replace(needle,replacement,1)
cssneedle="    '/css/control-auto.css',\n    '/css/gps.css',"
cssreplacement="    '/css/control-auto.css',\n    '/css/control-auto-validador.css',\n    '/css/control-auto-cupos.css',\n    '/css/gps.css',"
if cssneedle not in loader:
    raise SystemExit('loader css insertion point missing')
loader=loader.replace(cssneedle,cssreplacement,1)
LOADER.write_text(loader,encoding='utf-8')

INDEX.write_text(html,encoding='utf-8')

# Hard ownership checks. These legacy patch markers must be gone from source.
final=INDEX.read_text(encoding='utf-8')
for forbidden in ['__v83wrapped','__v94cupos','rym-v80-control-ecarcheck-js','rym-v83-control-nav-fix-js','rym-v94-cupos-attt-js']:
    if forbidden in final:
        raise SystemExit(f'legacy control ownership remains: {forbidden}')

print('V172 Control extraction OK')
print('index bytes:',INDEX.stat().st_size)
print('validador bytes:',(ROOT/'modules/control-auto/validador.js').stat().st_size)
print('cupos bytes:',(ROOT/'modules/control-auto/cupos.js').stat().st_size)

# trigger: control extraction contract v1
