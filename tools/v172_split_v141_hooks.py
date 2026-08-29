#!/usr/bin/env python3
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'modules/revisados/runtime/063-rym-v141-activity-cupos-mail-js-80ed7e76.js'
s=p.read_text(encoding='utf-8')
old="  const openUsersBase=window.v70OpenUsers;\n"
if old not in s: raise SystemExit('openUsersBase marker missing')
s=s.replace(old,'',1)
old="  if(typeof openUsersBase==='function')window.v70OpenUsers=async function(...args){const r=await openUsersBase.apply(this,args);installActivity141();heartbeat141();return r};"
new="  (window.__RYM_USERS_PENDING_AFTER__ ||= []).push(async function(){installActivity141();heartbeat141()});"
if old not in s: raise SystemExit('Users V141 wrapper missing')
s=s.replace(old,new,1)
old="  const cuposBase=window.v94ControlCuposATTT;\n  if(typeof cuposBase==='function')window.v94ControlCuposATTT=async function(...args){const r=await cuposBase.apply(this,args);try{if(role141()==='ADMIN_TOTAL'){const hero=document.querySelector('.v94-cupos-hero');if(hero&&!hero.querySelector('#v141CuposMailBtn')){const b=document.createElement('button');b.id='v141CuposMailBtn';b.className='v141-mail-btn';b.textContent='Enviar reporte';b.onclick=cuposMail141;hero.appendChild(b)}}}catch(_){}heartbeat141();return r};"
new="  (window.__RYM_CONTROL_PENDING_AFTER__ ||= []).push(['cupos',async function(){try{if(role141()==='ADMIN_TOTAL'){const hero=document.querySelector('.v94-cupos-hero');if(hero&&!hero.querySelector('#v141CuposMailBtn')){const b=document.createElement('button');b.id='v141CuposMailBtn';b.className='v141-mail-btn';b.textContent='Enviar reporte';b.onclick=cuposMail141;hero.appendChild(b)}}}catch(_){}heartbeat141()}]);"
if old not in s: raise SystemExit('Cupos V141 wrapper missing')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('V141 Usuarios and Cupos wrappers converted to canonical lifecycle hooks')
