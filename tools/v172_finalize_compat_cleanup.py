#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s):
    q=ROOT/p;q.parent.mkdir(parents=True,exist_ok=True);q.write_text(s,encoding='utf-8')
def unlink(p):
    q=ROOT/p
    if q.exists(): q.unlink()

def replace_index(old,new):
    p=ROOT/'index.html';s=p.read_text(encoding='utf-8')
    if old in s:s=s.replace(old,new)
    p.write_text(s,encoding='utf-8')

# ---------- Control Auto: move V123 supervisor summary to a router hook ----------
v123=read('modules/core/experience-v123.js')
start=v123.find('  async function supervisorSummary(){')
end=v123.find('  const wrapControl=',start)
if start==-1 or end==-1: raise SystemExit('V123 supervisorSummary block not found')
super_block=v123[start:end].rstrip()
control123="""/* Portal RYM V172 clean - Control Auto supervisor summary enhancement */
(function(w){
  'use strict';
  if(w.__RYM_CONTROL_SUPERVISOR_V123__)return;w.__RYM_CONTROL_SUPERVISOR_V123__=true;
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
"""+super_block.replace('  async function supervisorSummary(){','  async function supervisorSummary(){')+"""
  function openUnitsForSupervisor(row){
    if(!w.RYM_CONTROL_ROUTER)return;
    return w.RYM_CONTROL_ROUTER.open('unidades').then(()=>{setTimeout(()=>{const q=document.querySelector('#ca6Q');if(q){q.value=row.supervisora;q.dispatchEvent(new Event('input',{bubbles:true}));q.focus()}},80)});
  }
  // Replace only the internal navigation callback installed by the historical block.
  const original=supervisorSummary;
  async function hooked(){
    await original();
    const root=document.querySelector('.v75-control-dashboard');
    const host=root?.querySelector('#v123SupervisorPanel');
    if(!host)return;
    const buttons=[...host.querySelectorAll('[data-v123-sup]')];
    // Original handlers called window.v75ControlUnits. Route them through the canonical router.
    buttons.forEach(btn=>{const prev=btn.onclick;btn.onclick=async()=>{const idx=Number(btn.dataset.v123Sup),cards=[...host.querySelectorAll('.v123-supervisor-card')],card=cards[idx];const name=card?.querySelector('h4')?.textContent||'';await w.RYM_CONTROL_ROUTER.open('unidades');setTimeout(()=>{const q=document.querySelector('#ca6Q');if(q){q.value=name;q.dispatchEvent(new Event('input',{bubbles:true}));q.focus()}},80)}});
  }
  if(!w.RYM_CONTROL_ROUTER?.after)throw new Error('Control router hook API unavailable');
  w.RYM_CONTROL_ROUTER.after('dashboard',hooked);
})(window);
"""
write('modules/control-auto/enhancements/supervisor-summary-v123.js',control123)

# Remove supervisor summary + wrapper block from Core V123, keep only portal UX/home transition.
wrap_end=v123.find('  const oldHome=',end)
v123_clean=v123[:start]+v123[wrap_end:]
write('modules/core/experience-v123.js',v123_clean)

# ---------- V154: split sections by domain ----------
v154=read('modules/core/compat-v154.js')
control_marker=' /* ---------------- Control de Auto: filtros sin reemplazar tabla/ficha ---------------- */'
cupos_marker=' /* ---------------- Cupos ATTT: KPI + filtros sobre dataset completo antes de paginar ---------------- */'
gps_marker=' /* ---------------- GPS: alcance por perfil, sin descartar filas por estatus_control ---------------- */'
rev_marker=' /* ---------------- Revisados: filtros dependientes activados solo al entrar/cambiar tab ---------------- */'
home_marker=' /* ---------------- Home: GPS/Usuarios por permiso + prioridades clickeables ---------------- */'
for m in [control_marker,cupos_marker,gps_marker,rev_marker,home_marker]:
    if m not in v154: raise SystemExit('Missing V154 marker: '+m)
prefix=v154[:v154.index(control_marker)]
control=v154[v154.index(control_marker):v154.index(cupos_marker)]
cupos=v154[v154.index(cupos_marker):v154.index(gps_marker)]
rev=v154[v154.index(rev_marker):v154.index(home_marker)]
home=v154[v154.index(home_marker):]
# strip final closure from home for reuse
home=home.rsplit('})();',1)[0]
common="""(function(w){
 'use strict';
 const E=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
 const N=v=>String(v??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim().toUpperCase();
 const fmt=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('es-PA',{timeZone:'America/Panama',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch(_){return String(v)}};
"""
# Control units enhancement: remove global wrapper and register hook.
control_body=control
control_body=re.sub(r"\n const ctlOpen=window\.v75ControlUnits;.*?\n\n?$",'\n',control_body,flags=re.S)
control_file="""/* Portal RYM V172 clean - Control Auto unit filters */
"""+common+control_body+"""
 if(!w.RYM_CONTROL_ROUTER?.after)throw new Error('Control router hook API unavailable');
 w.RYM_CONTROL_ROUTER.after('unidades',enhanceControl);
})(window);
"""
write('modules/control-auto/enhancements/unidades-v154.js',control_file)

# Cupos enhancement: remove wrapper and register route hook.
cupos_body=cupos
cupos_body=re.sub(r"\n if\(typeof cuposOld==='function'.*?\n\n?$",'\n',cupos_body,flags=re.S)
cupos_body=cupos_body.replace(" const cuposOld=window.v147OpenCuposATTT||window.v94ControlCuposATTT;let cuposCache=null,cuposAt=0;"," let cuposCache=null,cuposAt=0;")
cupos_file="""/* Portal RYM V172 clean - Control Auto Cupos filters */
"""+common+cupos_body+"""
 async function enhanceCupos(){try{installCuposControl(await cuposData())}catch(e){console.warn('V154 Cupos',e)}}
 if(!w.RYM_CONTROL_ROUTER?.after)throw new Error('Control router hook API unavailable');
 w.RYM_CONTROL_ROUTER.after('cupos',enhanceCupos);
})(window);
"""
write('modules/control-auto/enhancements/cupos-v154.js',cupos_file)

# Revisados enhancement: remove v60 wrapper and hook every tab after render.
rev_body=rev
rev_body=re.sub(r"\n const revOpen=window\.v60OpenRevisados;.*?\n\n?$",'\n',rev_body,flags=re.S)
rev_file="""/* Portal RYM V172 clean - Revisados dependent filters */
"""+common+rev_body+"""
 async function hook(){setTimeout(enhanceRev,80)}
 if(!w.RYM_REVISADOS_ROUTER?.after)throw new Error('Revisados router hook API unavailable');
 w.RYM_REVISADOS_ROUTER.routes().forEach(route=>w.RYM_REVISADOS_ROUTER.after(route,hook));
})(window);
"""
write('modules/revisados/enhancements-v154.js',rev_file)

# Home enhancement: use canonical module router; no wrapping v36PortalHome, no legacy open functions.
home_body=home
home_body=re.sub(r"\n const homeOld=window\.v36PortalHome;.*?\n if\(!window\.__v154PriorityBound\)","\n if(!window.__v154PriorityBound)",home_body,flags=re.S)
home_body=home_body.replace("b.onclick=()=>window.v113OpenGps()","b.onclick=()=>w.RYM_ROUTER?.open('gps')")
home_body=home_body.replace("c.querySelector('button').onclick=()=>window.v113OpenGps()","c.querySelector('button').onclick=()=>w.RYM_ROUTER?.open('gps')")
home_body=home_body.replace("x.onclick=()=>window.v113OpenGps()","x.onclick=()=>w.RYM_ROUTER?.open('gps')")
home_body=home_body.replace("x.onclick=()=>window.v70OpenUsers?.()","x.onclick=()=>w.RYM_ROUTER?.open('usuarios')")
home_body=home_body.replace("await window.v60OpenRevisados?.();","await w.RYM_ROUTER?.open('revisados',{tab:'operations'});")
home_body=home_body.replace("await window.v70OpenPanapass?.();setTimeout(()=>window.v87BajasPanapass?.(document.querySelector('#view')).then?.(()=>setTimeout(()=>document.querySelector('[data-v99bt=\"processed\"]')?.click(),60)),60)","await w.RYM_ROUTER?.open('panapass',{tab:'bajas_panapass'});setTimeout(()=>document.querySelector('[data-v99bt=\"processed\"]')?.click(),80)")
home_body=home_body.replace("await window.v70OpenPanapass?.();setTimeout(()=>window.v87BajasPanapass?.(document.querySelector('#view')).then?.(()=>setTimeout(()=>document.querySelector('[data-v99bt=\"alerts\"]')?.click(),60)),60)","await w.RYM_ROUTER?.open('panapass',{tab:'bajas_panapass'});setTimeout(()=>document.querySelector('[data-v99bt=\"alerts\"]')?.click(),80)")
home_file="""/* Portal RYM V172 clean - portal home permission decorations */
(function(w){
 'use strict';
 const E=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
 const N=v=>String(v??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim().toUpperCase();
 const role=()=>N(state?.profile?.rol||'');
 const modules=()=>[...new Set([...(state?.allModules||[]),...(state?.modules||[])].map(String))];
 const has=m=>modules().includes(m);
 const canGps=()=>{const m=modules(),known=m.some(x=>x==='portal.gps'||x.startsWith('gps.'));if(known)return has('portal.gps')||has('gps.dashboard');return ['ADMIN_TOTAL','ADMIN','GERENTE_GALERA','SUPERVISORA','SISTEMA'].includes(role())};
"""+home_body+"""
 w.RYM_HOME_V154=Object.freeze({decorate:decorateHome});
})(window);
"""
write('modules/core/home-v154.js',home_file)

# ---------- Revisados router: add hook lifecycle ----------
rr=read('modules/revisados/router.js')
if 'const hooks=new Map();' not in rr:
    rr=rr.replace("  let current='dashboard',busy=false,queued=null;","  let current='dashboard',busy=false,queued=null;\n  const hooks=new Map();")
rr=rr.replace("await a.openTab(current);bind();return current}","await a.openTab(current);for(const fn of (hooks.get(current)||[]))await fn({route:current});bind();return current}")
if 'function after(route,fn)' not in rr:
    rr=rr.replace("  const active=()=>current,rebind=()=>{bind();return true};","  function after(route,fn){const key=normalize(route);if(!routes().includes(key)||typeof fn!=='function')throw new Error('Hook Revisados invalido');const list=hooks.get(key)||[];list.push(fn);hooks.set(key,list);return()=>hooks.set(key,(hooks.get(key)||[]).filter(x=>x!==fn))}\n  const active=()=>current,rebind=()=>{bind();return true};")
rr=rr.replace("Object.freeze({open,leave,active,routes,rebind})","Object.freeze({open,leave,active,routes,rebind,after})")
write('modules/revisados/router.js',rr)

# ---------- Core router: latest-wins queue + canonical portal ----------
cr=read('modules/core/router.js')
if 'let queued=null;' not in cr:
    cr=cr.replace('  let navigating=false;','  let navigating=false;\n  let queued=null;')
cr=cr.replace("    if(navigating) return false;","    if(navigating){queued={name:target,ctx};return false;}")
cr=cr.replace("    }finally{\n      navigating=false;\n    }","    }finally{\n      navigating=false;\n    }\n    if(queued){const next=queued;queued=null;if(next.name!==current)return open(next.name,next.ctx)}")
write('modules/core/router.js',cr)

# ---------- Canonical Portal module ----------
portal_module="""/* Portal RYM V172 clean - canonical portal module */
(function(w,d){
 'use strict';
 if(!w.RYM_MODULES||w.RYM_MODULES.has('portal'))return;
 w.RYM_MODULES.register('portal',{
   open:async function(){
     d.body.dataset.rymModule='portal';
     if(typeof w.v36PortalHome!=='function')throw new Error('Portal home renderer unavailable');
     const out=await w.v36PortalHome();
     setTimeout(()=>w.RYM_HOME_V154?.decorate?.(),50);
     return out;
   }
 });
})(window,document);
"""
write('modules/core/portal-module.js',portal_module)

# ---------- Route-aware return buttons in module apps ----------
gps=read('modules/gps/app.js').replace("qsel('#v157Back').onclick=()=>{window.__RYM_ROUTE_V155='PORTAL';window.v36PortalHome?.()}","qsel('#v157Back').onclick=()=>w.RYM_ROUTER?.home()")
gps=gps.replace("R.tab='dashboard';R.focus='';R.page=1;R.auditPage=1;window.__RYM_ROUTE_V155='GPS';","R.tab='dashboard';R.focus='';R.page=1;R.auditPage=1;")
write('modules/gps/app.js',gps)

users=read('modules/usuarios/app.js').replace("document.querySelector('#v70Back').onclick=()=>v36PortalHome()","document.querySelector('#v70Back').onclick=()=>w.RYM_ROUTER?.home()")
users=users.replace("<button onclick=\"v36PortalHome()\">Volver al Portal</button>","<button id=\"v70ErrorBack\">Volver al Portal</button>")
users=users.replace("app.innerHTML=`<div class=\"alert\">${E(e.message||e)}</div><button id=\"v70ErrorBack\">Volver al Portal</button>`}};","app.innerHTML=`<div class=\"alert\">${E(e.message||e)}</div><button id=\"v70ErrorBack\">Volver al Portal</button>`;document.querySelector('#v70ErrorBack')?.addEventListener('click',()=>w.RYM_ROUTER?.home())}};")
write('modules/usuarios/app.js',users)

# ---------- Split CSS ----------
css=read('css/core-compat-v154.css')
# first two lines are Control/Cupos; GPS block starts at body.v154-gps; home rule is body.v99-home
pos_gps=css.find('body.v154-gps')
pos_home=css.find('body.v99-home')
if pos_gps==-1 or pos_home==-1: raise SystemExit('V154 CSS markers missing')
control_css=css[:pos_gps].rstrip()+'\n'
gps_css=css[pos_gps:pos_home].rstrip()+'\n'
home_css=css[pos_home:].rstrip()+'\n'
# Remove GPS media clauses from home piece and keep control responsive clauses with control.
media=home_css.find('@media(max-width:1100px)')
if media!=-1:
    responsive=home_css[media:]
    home_css=home_css[:media]
    # retain only control/cupos responsive rules, dropping gps/rank/prio selectors.
    rc='\n'.join(line for line in responsive.splitlines() if 'v154-gps' not in line and 'v154-rank' not in line and 'v154-priority' not in line and 'v154-pager' not in line)
    control_css+=rc+'\n'
write('css/control-auto-v154.css',control_css)
write('css/gps-v154.css',gps_css)
write('css/core-home-v154.css',home_css)

# Move V123 Control-specific CSS from core stylesheet.
c123=read('css/core-experience-v123.css')
marker='/* Control de Auto:'
pos=c123.find(marker)
if pos!=-1:
    corepart=c123[:pos].rstrip()+'\n'
    controlpart=c123[pos:]
    # transition overlay belongs in core; split at transition marker
    tm='/* Transiciones estables'
    tp=controlpart.find(tm)
    if tp!=-1:
        trans=controlpart[tp:]
        controlpart=controlpart[:tp].rstrip()+'\n'
        corepart+='\n'+trans
    write('css/core-experience-v123.css',corepart)
    write('css/control-auto-v123.css',controlpart)

# ---------- Loader owns all canonical enhancements ----------
loader=read('modules/v172-clean-loader.js')
for href in ['/css/core-home-v154.css','/css/control-auto-v123.css','/css/control-auto-v154.css']:
    if href not in loader: loader=loader.replace("    '/css/control-auto.css',",f"    '{href}',\n    '/css/control-auto.css',")
# GPS v154 stylesheet is obsolete because V157 is canonical; do not load it.
for src,anchor in [
('/modules/core/home-v154.js',"    '/modules/core/router.js',"),
('/modules/core/portal-module.js',"    '/modules/core/home-v154.js',"),
('/modules/control-auto/enhancements/supervisor-summary-v123.js',"    '/modules/control-auto/router.js',"),
('/modules/control-auto/enhancements/unidades-v154.js',"    '/modules/control-auto/enhancements/supervisor-summary-v123.js',"),
('/modules/control-auto/enhancements/cupos-v154.js',"    '/modules/control-auto/enhancements/unidades-v154.js',"),
('/modules/revisados/enhancements-v154.js',"    '/modules/revisados/router.js',")]:
    if src not in loader: loader=loader.replace(anchor,anchor+f"\n    '{src}',")
write('modules/v172-clean-loader.js',loader)

# ---------- Replace old direct index references ----------
idx=read('index.html')
# Remove deprecated compat scripts/styles completely. Canonical loader now owns their replacements.
patterns=[
 r'<script[^>]+src=["\']/modules/core/compat-v154\.js[^>]*></script>',
 r'<script[^>]+src=["\']/modules/gps/v155\.js[^>]*></script>',
 r'<link[^>]+href=["\']/css/core-compat-v154\.css[^>]*>',
 r'<link[^>]+href=["\']/css/gps-v155\.css[^>]*>'
]
for p in patterns: idx=re.sub(p,'',idx,flags=re.I)
write('index.html',idx)

# ---------- Delete obsolete compatibility owners ----------
for p in ['modules/core/compat-v154.js','css/core-compat-v154.css','modules/gps/v155.js','css/gps-v155.css','css/gps-v154.css']:
    unlink(p)

# ---------- Hard assertions ----------
alltxt='\n'.join(read(p) for p in ['modules/core/experience-v123.js','modules/core/home-v154.js','modules/control-auto/enhancements/unidades-v154.js','modules/control-auto/enhancements/cupos-v154.js','modules/revisados/enhancements-v154.js'])
for bad in ['const wrapControl=','__RYM_ROUTE_V155','window.v75ControlUnits=','window.v94ControlCuposATTT=','window.v60OpenRevisados=','window.v36PortalHome=']:
    if bad in alltxt: raise SystemExit('Forbidden compatibility owner remains: '+bad)
print('V172 final compatibility cleanup complete')
print('index bytes', (ROOT/'index.html').stat().st_size)
