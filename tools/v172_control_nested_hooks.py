#!/usr/bin/env python3
from pathlib import Path
root=Path(__file__).resolve().parents[1]

# Auditoria: unit-list wrapper only decorates after the base list is rendered.
p=root/'modules/control-auto/runtime/030-rym-control-auto-auditoria-js-363fa89a.js'
s=p.read_text(encoding='utf-8')
s=s.replace(" const old=window.v11UnitList;if(typeof old!=='function')return;\n",'',1)
old=" window.v11UnitList=async function(){await old();if(!allowed.has(role()))return;const tabs=document.querySelector('.ca6-tabs');if(!tabs||document.querySelector('#ca6Audit'))return;const b=document.createElement('button');b.id='ca6Audit';b.className='soft-btn';b.textContent='Auditoría';tabs.appendChild(b);b.onclick=()=>{tabs.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');audit()};['ca6Active','ca6Other'].forEach(id=>{const x=document.querySelector('#'+id);if(x)x.addEventListener('click',()=>document.querySelector('.section-tools')?.style.removeProperty('display'))})};\n try{v11UnitList=window.v11UnitList}catch{}"
new=" (window.__RYM_CONTROL_PENDING_AFTER__ ||= []).push(['unidades',async function(){if(!allowed.has(role()))return;const tabs=document.querySelector('.ca6-tabs');if(!tabs||document.querySelector('#ca6Audit'))return;const b=document.createElement('button');b.id='ca6Audit';b.className='soft-btn';b.textContent='Auditoría';tabs.appendChild(b);b.onclick=()=>{tabs.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');audit()};['ca6Active','ca6Other'].forEach(id=>{const x=document.querySelector('#'+id);if(x)x.addEventListener('click',()=>document.querySelector('.section-tools')?.style.removeProperty('display'))})}]);"
if old not in s: raise SystemExit('audit v11 wrapper marker missing')
s=s.replace(old,new,1);p.write_text(s,encoding='utf-8')

# Manual transfer: only adds a button after Units has rendered.
p=root/'modules/control-auto/runtime/043-rym-v95-transfer-manual-js-00f2c1df.js'
s=p.read_text(encoding='utf-8')
old=" const oldV11=window.v11UnitList;\n if(typeof oldV11==='function'){\n   window.v11UnitList=async function(){const z=await oldV11.apply(this,arguments);ensureManualButton();return z};\n   try{v11UnitList=window.v11UnitList}catch{}\n }"
new=" (window.__RYM_CONTROL_PENDING_AFTER__ ||= []).push(['unidades',async function(){ensureManualButton()}]);"
if old not in s: raise SystemExit('manual v11 wrapper marker missing')
s=s.replace(old,new,1);p.write_text(s,encoding='utf-8')
print('nested Control unit-list wrappers moved to after hooks')
