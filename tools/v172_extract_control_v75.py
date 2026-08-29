#!/usr/bin/env python3
from pathlib import Path
import re

# trigger: final Control V75 extraction
root=Path(__file__).resolve().parents[1]
idx=root/'index.html'
loader=root/'modules/v172-clean-loader.js'
router=root/'modules/control-auto/router.js'
html=idx.read_text(encoding='utf-8')

blocks=list(re.finditer(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>',html,re.S|re.I))
target=None
for m in blocks:
    b=m.group('body')
    if 'window.v75ControlDashboard=async function()' in b and 'function controlNav(active)' in b and 'window.v70OpenControl=async function()' in b:
        target=m;break
if not target: raise SystemExit('Control V75 block not found')
body=target.group('body').strip()+"\n\n/* V172 canonical Control Auto application boundary. */\nwindow.RYM_CONTROL_APP=Object.freeze({\n  dashboard:()=>window.v75ControlDashboard(),\n  unidades:()=>window.v75ControlUnits(),\n  auditoria:()=>window.v75ControlAudit(),\n  cupos:()=>window.v94ControlCuposATTT(),\n  validador:()=>window.v80OpenEcarValidator()\n});\n"
out=root/'modules/control-auto/app-v75.js';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(body,encoding='utf-8')
html=html[:target.start()]+html[target.end():]
idx.write_text(html,encoding='utf-8')

ls=loader.read_text(encoding='utf-8')
needle="    '/modules/control-auto/validador.js',"
entry="    '/modules/control-auto/app-v75.js',\n"
if entry.strip() not in ls:
    if needle not in ls: raise SystemExit('loader Control marker missing')
    ls=ls.replace(needle,entry+needle,1)
loader.write_text(ls,encoding='utf-8')

rs=router.read_text(encoding='utf-8')
start=rs.index('  const routes=Object.freeze({')
end=rs.index('  });',start)+5
rs=rs[:start]+"  const routes=Object.freeze({dashboard:'dashboard',unidades:'unidades',cupos:'cupos',auditoria:'auditoria',validador:'validador'});"+rs[end:]
old="  function legacyView(name){\n    const key=normalize(name);\n    const fnName=routes[key];\n    if(!fnName) throw new Error('Ruta Control de Auto invalida: '+key);\n    const fn=w[fnName];\n    if(typeof fn!=='function') throw new Error('Vista Control de Auto no disponible: '+fnName);\n    return {key,fn};\n  }"
new="  function appView(name){\n    const key=normalize(name);\n    if(!routes[key]) throw new Error('Ruta Control de Auto invalida: '+key);\n    const fn=w.RYM_CONTROL_APP?.[key];\n    if(typeof fn!=='function') throw new Error('Vista Control de Auto no disponible: '+key);\n    return {key,fn};\n  }"
if old not in rs: raise SystemExit('legacyView marker missing')
rs=rs.replace(old,new,1).replace('const {key,fn}=legacyView(name);','const {key,fn}=appView(name);',1)
router.write_text(rs,encoding='utf-8')
print('extracted Control V75 block and routed through RYM_CONTROL_APP')
