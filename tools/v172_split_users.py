#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PORTAL=ROOT/'modules/core/portal-v70.js'
USERS=ROOT/'modules/usuarios/app.js'
INDEX=ROOT/'modules/usuarios/index.js'
LOADER=ROOT/'modules/v172-clean-loader.js'

src=PORTAL.read_text(encoding='utf-8')
start=src.find('  let AD=null,selected=null,adminView=\'users\';')
end=src.find('  if(state.token&&state.profile){rememberModules();phase2NormalizeModules();v36PortalHome()}')
if start<0 or end<0 or end<=start:
    if USERS.exists() and 'RYM_USERS_APP' in USERS.read_text(encoding='utf-8'):
        print('Users already split')
        raise SystemExit(0)
    raise SystemExit('Users admin block markers not found')
block=src[start:end]
if 'window.v70OpenUsers=async function' not in block or 'adminApi' not in block or 'renderAdmin' not in block:
    raise SystemExit('Unexpected Users block')

open_old="window.v70OpenUsers=async function(){rememberModules();if(role70()!=='ADMIN_TOTAL'||!rymHasModule('admin.usuarios'))return;"
open_new="async function openUsers(){if(usersRole()!=='ADMIN_TOTAL'||!usersHasModule('admin.usuarios'))return;"
if open_old not in block:
    raise SystemExit('Users open function marker not found')
block=block.replace(open_old,open_new,1)
# The original function closes with `};` immediately before the boot block marker.
last=block.rfind('};')
if last<0:
    raise SystemExit('Users open function end not found')
block=block[:last+2]+"\n  window.v70OpenUsers=openUsers;\n  window.RYM_USERS_APP=Object.freeze({open:openUsers});\n"+block[last+2:]

prefix="""/* Portal RYM V172 clean - Users application */
(function(w,d){
  'use strict';
  if(w.RYM_USERS_APP)return;
  function usersRole(){return String(state.profile?.rol||'').trim().toUpperCase()}
  function usersHasModule(code){
    if(typeof w.rymHasModule==='function')return !!w.rymHasModule(code);
    const all=Array.isArray(state.allModules)&&state.allModules.length?state.allModules:(Array.isArray(state.modules)?state.modules:[]);
    return all.includes(String(code));
  }
"""
suffix="\n})(window,document);\n"
USERS.parent.mkdir(parents=True,exist_ok=True)
USERS.write_text(prefix+block.strip()+suffix,encoding='utf-8')

# Remove ownership from portal; preserve boot line.
src=src[:start]+src[end:]
PORTAL.write_text(src,encoding='utf-8')

INDEX.write_text("""/* Portal RYM V172 clean - Usuarios module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES)return;
  w.RYM_MODULES.register('usuarios',{
    open:function(ctx={}){
      d.body.dataset.rymModule='usuarios';
      if(!w.RYM_USERS_APP||typeof w.RYM_USERS_APP.open!=='function')throw new Error('Usuarios app unavailable');
      return w.RYM_USERS_APP.open(ctx);
    }
  });
})(window,document);
""",encoding='utf-8')

loader=LOADER.read_text(encoding='utf-8')
needle="    '/modules/usuarios/index.js'"
if "'/modules/usuarios/app.js'" not in loader:
    if needle not in loader: raise SystemExit('Users loader marker missing')
    loader=loader.replace(needle,"    '/modules/usuarios/app.js',\n"+needle,1)
LOADER.write_text(loader,encoding='utf-8')

print('V172 Users split OK')
print('portal bytes:',PORTAL.stat().st_size)
print('users app bytes:',USERS.stat().st_size)
