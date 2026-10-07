import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { stitch, StitchError } from '@google/stitch-sdk';

const root=path.resolve(process.cwd(),'../..');
const active=JSON.parse(await fs.readFile(path.join(root,'.stitch','active-project.json'),'utf8'));
const projectId=String(process.env.STITCH_PROJECT_ID||active?.projectId||'').trim();
if(!projectId)throw new Error('No Stitch project ID available');

const mainPath=process.env.MAIN_INDEX_HTML||path.join(root,'.stitch','main-index-reference.html');
const main=await fs.readFile(mainPath,'utf8');
const required=[
  'control_auto.validar_ecarcheck',
  '/functions/v1/control-auto-auditoria-validar',
  'Validador por selección',
  'START_SELECTION',
  'SEARCH_UNITS',
  'START_JORNADA',
  'limite_proteccion_2_selecciones_por_dia',
  'Máximo 50 unidades por selección'
];
for(const token of required){
  if(!main.includes(token))throw new Error('Main validator contract changed; missing: '+token);
}

const reference=`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Portal RYM · Validador de Unidad · Tablet Contract</title>
<style>
:root{--navy:#0A1B4D;--blue:#244AA5;--sky:#53B7E8;--orange:#F47C20;--bg:#F4F7FB;--line:#D8E3F2;--text:#10224E;--muted:#62708C;--green:#047857}
*{box-sizing:border-box}body{margin:0;background:var(--bg);font-family:Inter,Arial,sans-serif;color:var(--text)}header{height:72px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px}.brand{display:flex;gap:12px;align-items:center}.logo{width:44px;height:44px;border-radius:14px;background:var(--navy);color:#fff;display:grid;place-items:center;font-weight:900}.user{font-size:12px;color:var(--muted)}main{padding:22px;max-width:1180px;margin:auto}.card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:20px;margin-bottom:14px}.primary{border:2px solid #c9daf2}.head{display:flex;justify-content:space-between;align-items:start;gap:16px}.head h1{margin:0;font-size:24px}.head p{margin:5px 0 0;color:var(--muted);font-size:12px}.pill{background:#eef5ff;border:1px solid #c9daf2;color:var(--blue);padding:9px 12px;border-radius:999px;font-weight:800}.search{display:grid;grid-template-columns:1fr 230px;gap:10px;margin-top:16px}.search input,.search select{height:52px;border:1px solid #bbcbe0;border-radius:14px;padding:0 14px;font-size:15px}.rows{border:1px solid var(--line);border-radius:16px;overflow:hidden;margin-top:12px}.row{min-height:58px;display:grid;grid-template-columns:42px 110px 110px 100px 1fr 1fr;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #edf1f6;font-size:12px}.actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}.actions button{height:48px;border-radius:13px;padding:0 18px;border:1px solid var(--line);font-weight:900}.actions .go{background:var(--blue);color:#fff}.galeras{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.galera{background:#fff;border:1px solid var(--line);border-radius:18px;padding:15px}.progress{height:8px;background:#edf1f6;border-radius:999px;margin:10px 0}.progress i{display:block;width:72%;height:100%;background:var(--blue);border-radius:inherit}.exceptions{background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px}
</style></head><body>
<header><div class="brand"><div class="logo">R</div><div><b>Validador de Unidad</b><div class="user">Portal RYM · app dedicada</div></div></div><div class="user">Personal autorizado · Salir</div></header>
<main>
<section class="card primary"><div class="head"><div><h1>Validador por selección</h1><p>Buscar y seleccionar unidades para validar contra eCarCheck.</p></div><div class="pill">0 / 50</div></div>
<div class="search"><input placeholder="Buscar unidad, placa, empresa o supervisora"><select><option>Todas las galeras</option></select></div>
<div class="rows"><div class="row"><span>□</span><b>V123</b><span>AB1234</span><span>VCARS</span><span>Empresa</span><span>Supervisora</span></div><div class="row"><span>□</span><b>I456</b><span>CD5678</span><span>VIPCO</span><span>Empresa</span><span>Supervisora</span></div></div>
<div class="actions"><button>Limpiar</button><button class="go">Validar seleccionadas</button></div></section>
<section class="card"><div class="head"><div><b>Auditoría mensual automática</b><p>La automatización conserva los horarios, lotes y protecciones existentes.</p></div><div class="pill">Automático activo</div></div></section>
<section class="galeras"><article class="galera"><b>VCARS</b><h2>72 / 100</h2><small>OK este mes · 28 pendientes</small><div class="progress"><i></i></div><button>Procesar ahora</button></article><article class="galera"><b>VIPCO</b><h2>91 / 100</h2><small>OK este mes · 9 pendientes</small><div class="progress"><i style="width:91%"></i></div><button>Procesar ahora</button></article></section>
<section class="exceptions"><b>Auditoría / excepciones de eCarCheck</b><p>Errores, sin ficha, bloqueos o sesiones fallidas permanecen visibles hasta resolverse.</p></section>
</main></body></html>`;

const outDir=path.join(root,'.stitch','generated');
await fs.mkdir(outDir,{recursive:true});
const referencePath=path.join(outDir,'unit-validator-tablet-main-contract.html');
await fs.writeFile(referencePath,reference);

const project=stitch.project(projectId);
const uploaded=await project.upload(referencePath,{title:'Portal RYM - Validador de Unidad - Tablet Main Contract'});
const source=uploaded?.[0];
if(!source)throw new Error('Stitch upload returned no screen');

const prompt=`
Design THREE production-grade TABLET variants for the exact Portal RYM Validador de Unidad shown in the functional reference.

THIS IS A VISUAL / UX EXPLORATION ONLY. MAIN IS THE BUSINESS CONTRACT.

HARD PARITY RULES:
- The user sees ONLY the validator app. No Portal dashboard, no Panapass, no Revisados, no admin, no unrelated navigation.
- Preserve exactly the existing permission boundary: control_auto.validar_ecarcheck.
- Preserve the existing backend workflow and states. Do not invent endpoints or actions.
- Manual selection: search by unit/plate/company/supervisor, galera filter, select up to 50, clear, validate selected.
- Preserve the protection of maximum 2 manual selections per day.
- Preserve automatic per-galera monthly validation, daily batch behavior, protected pause/session locking, progress, pending count, changes, no-file and error counts.
- Preserve exception visibility and run/status feedback.
- Do not invent KPIs, approvals, maps, telemetry, AI recommendations, QR flows, cameras, new statuses or new business rules.
- Sample numbers are layout placeholders only.

TABLET UX:
- Device target is TABLET, landscape-first 1024x768 and excellent at portrait 768x1024.
- Touch targets >= 48px, readable from arm's length, no tiny 9px operational text.
- Make Validador por selección the primary task and reduce cognitive load.
- Keep automatic galera progress visible but secondary; exceptions become prominent only when there are open alerts.
- Use a compact sticky app header with Portal RYM identity, connection state, signed-in user and Salir.
- Consider innovative but practical interaction patterns: selection tray, sticky action dock, progressive disclosure for monthly automation, status ribbon, smart density. Do not use decorative charts.
- Must feel like a real enterprise field app, not a generic AI dashboard.

PORTAL RYM VISUAL DNA:
- Navy #0A1B4D, blue #244AA5, sky #53B7E8, orange accent #F47C20, bg #F4F7FB, border #D8E3F2, text #10224E, muted #62708C, green #047857, red #DC2626.
- Light surfaces, strong hierarchy, restrained shadows, 14-20px radii.
- Modern typography; plate/unit values may use a compact mono face.
- Avoid dark command-center styling, neon, glassmorphism, giant empty cards, unnecessary gradients and excessive badges.

Goal: propose truly stronger tablet interaction ideas while keeping 100% functional parity with main.
`.trim();

let generation;
try{
  generation=await source.variants(prompt,{variantCount:3,creativeRange:'EXPLORE',aspects:['LAYOUT','COLOR_SCHEME','TEXT_FONT']},{deviceType:'TABLET'});
}catch(error){
  if(error instanceof StitchError&&error.code==='CLARIFICATION_REQUIRED'){
    generation=await source.variants('Keep every functional rule unchanged. Explore only layout, hierarchy and touch-first tablet interaction.',{variantCount:3,creativeRange:'EXPLORE',aspects:['LAYOUT','COLOR_SCHEME','TEXT_FONT']},{deviceType:'TABLET'});
  }else throw error;
}
const screens=generation?.screens||[];
if(!screens.length)throw new Error('Stitch returned no tablet variants');

for(let i=0;i<screens.length;i++){
  const screen=screens[i],n=i+1;
  await fs.writeFile(path.join(outDir,`unit-validator-tablet-variant-${n}.html`),await screen.getHtml());
  await fs.writeFile(path.join(outDir,`unit-validator-tablet-variant-${n}.png`),Buffer.from(await screen.getImage()));
}
await fs.writeFile(path.join(outDir,'unit-validator-tablet-latest.json'),JSON.stringify({
  generatedAt:new Date().toISOString(),projectId,sourceScreenId:String(source.id||source.screenId||''),
  variantScreenIds:screens.map(s=>String(s.id||s.screenId||'')),deviceType:'TABLET',
  sourceBranch:'main',contract:'control_auto.validar_ecarcheck + control-auto-auditoria-validar'
},null,2)+'\n');
console.log('Generated tablet validator variants:',screens.map(s=>String(s.id||s.screenId||'')).join(','));
