#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/'index.html'
LOADER=ROOT/'modules/v172-clean-loader.js'

def extract(html,tag,element_id):
    pat=re.compile(rf'<{tag}\s+id=["\']{re.escape(element_id)}["\'][^>]*>(.*?)</{tag}>',re.S|re.I)
    m=pat.search(html)
    if not m: raise SystemExit(f'missing {tag}#{element_id}')
    return m.group(1).strip()+"\n",html[:m.start()]+html[m.end():]

def write(path,content):
    p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content,encoding='utf-8')

html=INDEX.read_text(encoding='utf-8')
css,html=extract(html,'style','rym-v66-friendly-css')
js,html=extract(html,'script','rym-v66-friendly-js')

js=js.replace("    $$('#v66Nav [data-v66-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.v66Tab;preset={};render()});\n",'',1)
js=js.replace("    $('#v66Back').onclick=()=>{document.body.classList.remove('v66-revisados');if(typeof window.v36PortalHome==='function')window.v36PortalHome()};\n",'',1)

old="  window.v60OpenRevisados=async function(){const app=appEl();if(!app)return;tab='dashboard';preset={};document.body.classList.remove('v60-revisados');document.body.classList.add('v66-revisados');const userKey=String((typeof state!=='undefined'&&state?.profile?.id)||'')+'|'+N((typeof state!=='undefined'&&state?.profile?.rol)||'');if(data&&cacheUserKey===userKey&&(Date.now()-dataLoadedAt)<120000){shell();render();return}if(cacheUserKey!==userKey){data=null;incidents=[];incidentTypes=[];cacheUserKey=userKey;dataLoadedAt=0}app.innerHTML='<div style=\"padding:30px;font-family:Inter,system-ui\">Cargando Revisados...</div>';try{await load(false);shell();render()}catch(e){document.body.classList.remove('v66-revisados');app.innerHTML=`<div class=\"wrap\"><div class=\"alert\">Revisados: ${E(e.message||e)}</div><button onclick=\"window.v36PortalHome&&window.v36PortalHome()\">Volver</button></div>`}}\n"
new="  async function openApp(){const app=appEl();if(!app)return;tab='dashboard';preset={};document.body.classList.remove('v60-revisados');document.body.classList.add('v66-revisados');const userKey=String((typeof state!=='undefined'&&state?.profile?.id)||'')+'|'+N((typeof state!=='undefined'&&state?.profile?.rol)||'');if(data&&cacheUserKey===userKey&&(Date.now()-dataLoadedAt)<120000){shell();render();return}if(cacheUserKey!==userKey){data=null;incidents=[];incidentTypes=[];cacheUserKey=userKey;dataLoadedAt=0}app.innerHTML='<div style=\"padding:30px;font-family:Inter,system-ui\">Cargando Revisados...</div>';try{await load(false);shell();render()}catch(e){document.body.classList.remove('v66-revisados');app.innerHTML=`<div class=\"wrap\"><div class=\"alert\">Revisados: ${E(e.message||e)}</div><button onclick=\"window.v36PortalHome&&window.v36PortalHome()\">Volver</button></div>`}}\n  async function openTab(route){tab=String(route||'dashboard');preset={};render();return tab}\n  window.RYM_REVISADOS_APP=Object.freeze({open:openApp,openTab,refresh:()=>refresh(),prefetch:()=>load(false),active:()=>tab});\n  window.v60OpenRevisados=openApp;\n"
if old not in js: raise SystemExit('V66 open function signature changed')
js=js.replace(old,new,1)

write('modules/revisados/app.js',js)
write('css/revisados-v66.css',css)

loader=LOADER.read_text(encoding='utf-8')
if "'/css/revisados-v66.css'" not in loader:
    loader=loader.replace("    '/css/revisados.css',","    '/css/revisados.css',\n    '/css/revisados-v66.css',",1)
if "'/modules/revisados/app.js'" not in loader:
    loader=loader.replace("    '/modules/revisados/router.js',","    '/modules/revisados/app.js',\n    '/modules/revisados/router.js',",1)
LOADER.write_text(loader,encoding='utf-8')
INDEX.write_text(html,encoding='utf-8')

final=INDEX.read_text(encoding='utf-8')
for forbidden in ['rym-v66-friendly-css','rym-v66-friendly-js']:
    if forbidden in final: raise SystemExit('legacy Revisados inline owner remains: '+forbidden)
print('V172 Revisados extraction OK')
print('index bytes:',INDEX.stat().st_size)
print('app bytes:',(ROOT/'modules/revisados/app.js').stat().st_size)
print('css bytes:',(ROOT/'css/revisados-v66.css').stat().st_size)

# trigger extraction v1
