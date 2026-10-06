import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { stitch, StitchError } from '@google/stitch-sdk';

const root=path.resolve(process.cwd(),'../..');
const activeProjectPath=path.join(root,'.stitch','active-project.json');
let projectId=String(process.env.STITCH_PROJECT_ID||'').trim();
if(!projectId){
  const active=JSON.parse(await fs.readFile(activeProjectPath,'utf8'));
  projectId=String(active?.projectId||'').trim();
}
if(!projectId)throw new Error('No Stitch project ID available');

const reference=`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Portal RYM · Operaciones · Emitidos hoy</title>
<style>
:root{--bg:#F4F7FB;--card:#fff;--line:#D8E3F2;--navy:#0A1B4D;--blue:#244AA5;--sky:#53B7E8;--green:#047857;--muted:#62708C}
*{box-sizing:border-box}body{margin:0;padding:34px;font-family:Inter,Segoe UI,Arial,sans-serif;background:var(--bg);color:var(--navy)}
.block{max-width:1450px;margin:auto;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
.top{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center}.kicker{font-size:10px;font-weight:900;letter-spacing:.12em;color:var(--blue)}
h1{margin:6px 0 2px;font-size:26px}.meta{font-size:11px;color:var(--muted)}.score{width:78px;height:78px;border:7px solid #78aaf4;border-radius:50%;display:grid;place-items:center}.score b{font-size:22px}.score span{font-size:8px;color:var(--muted)}
.bar{height:8px;margin:14px 0;border-radius:999px;background:#e5edf7;overflow:hidden}.bar i{display:block;width:97%;height:100%;background:#5794ee}
.share{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#f8fbff;font-size:10px;color:var(--muted)}button{border:0;border-radius:8px;padding:10px 14px;font-weight:900}.ws{background:#effcf5;color:var(--green);border:1px solid #b9e4cd}
.listHead{display:flex;justify-content:space-between;align-items:center;margin-top:14px}.listHead h2{font-size:17px;margin:0}.listHead p{font-size:9px;color:var(--muted);margin:3px 0 0}.link{background:transparent;color:var(--blue)}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.item{position:relative;padding:12px;border:1px solid var(--line);border-radius:10px;background:#fbfdff}.item b{font-family:monospace;font-size:11px}.item p{font-size:8px;color:#4f647f}.item small{font-size:7px;color:#8391a3}
</style>
</head>
<body>
<section class="block">
  <div class="top">
    <div><div class="kicker">CAPACIDAD DIARIA ECARCHECK</div><h1>Emitidos hoy <span>32 / 33</span></h1><div class="meta">Queda 1 cupo disponible hoy.</div></div>
    <div class="score"><div><b>97</b><span>% del día</span></div></div>
  </div>
  <div class="bar"><i></i></div>
  <div class="share"><span>Resumen operativo listo para compartir</span><button class="ws">Copiar WS</button></div>
  <div class="listHead"><div><h2>Emitidos recientes</h2><p>Últimos revisados emitidos hoy dentro de tu alcance.</p></div><button class="link">Ver todos →</button></div>
  <div class="grid">
    <div class="item"><b>I218 · EI2050</b><p>CATALINA SA · LEIBY</p><small>10/06/2026, 01:41 p. m.</small></div>
    <div class="item"><b>V499 · CX0269</b><p>ATALAYA COMPANY S.A. · ROXANA</p><small>10/06/2026, 12:29 p. m.</small></div>
    <div class="item"><b>V828 · EM5186</b><p>TABOGA, S.A. · ROXANA</p><small>10/06/2026, 01:08 p. m.</small></div>
    <div class="item"><b>V840 · EM5046</b><p>TABOGA, S.A. · MARIFEL</p><small>10/06/2026, 01:00 p. m.</small></div>
  </div>
</section>
</body></html>`;

const outDir=path.join(root,'.stitch','generated');
await fs.mkdir(outDir,{recursive:true});
const refPath=path.join(outDir,'operations-emitted-main-contract.html');
await fs.writeFile(refPath,reference);

const project=stitch.project(projectId);
const uploaded=await project.upload(refPath,{title:'Portal RYM - Operaciones - Emitidos hoy contract'});
if(!uploaded?.length)throw new Error('Stitch upload returned no screen');

const source=uploaded[0];
const prompt=`
Create a genuinely stronger visual proposal for this exact Portal RYM component: OPERACIONES > EMITIDOS HOY.

This is NOT a request to copy the reference styling. The reference is only the functional contract.

MUST PRESERVE EXACTLY:
- Daily limit counter: emitted today / operational limit.
- Daily completion percentage.
- Remaining daily capacity/cupos.
- A clear progress visualization.
- A dedicated action to copy TODAY'S EMITTED VEHICLES for WhatsApp.
- A "Ver todos / Ver menos" interaction for the emitted-today list.
- Recent emitted vehicle cards/items showing unit, plate, company, supervisor and timestamp.
- Clicking an emitted item must conceptually open its vehicle record.
- This component belongs inside Operaciones; do not turn it into a separate page.
- Do not add fake KPIs, fake statuses, filters or workflows.

DESIGN DIRECTION:
- Keep Portal RYM recognizable, enterprise, light and operational.
- Use the modern Stitch language already explored for Portal RYM: Space Grotesk headlines, Inter UI, JetBrains Mono for plate/unit/time data.
- Be more innovative than a plain replica. Introduce a distinctive but practical visual idea for daily capacity and recent emissions.
- Prioritize information density and immediate scanning on a 1440–1920px desktop.
- Avoid giant empty whitespace, oversized cards, glassmorphism, neon, generic AI dashboard styling, or decorative charts.
- The WhatsApp action must be visually obvious without overpowering the block.
- "Ver todos" must feel connected to the emitted list.
- Prefer a compact command-strip / timeline / capacity-ribbon concept if it improves usability.
- Preserve Portal RYM colors: navy/blue foundation, restrained green for success/WhatsApp, neutral light surfaces.

Return a polished production-oriented screen/component proposal that can be translated into Vue 3.
`.trim();

let variants;
try{
  variants=await source.variants(prompt,{
    variantCount:3,
    creativeRange:'EXPLORE',
    aspects:['LAYOUT','COLOR_SCHEME']
  });
}catch(error){
  if(error instanceof StitchError&&error.code==='CLARIFICATION_REQUIRED'){
    const reply=error.clarification?.suggestions?.[0]||'Keep every required function and create three distinct enterprise desktop variants.';
    variants=await source.variants(reply,{
      variantCount:3,
      creativeRange:'EXPLORE',
      aspects:['LAYOUT','COLOR_SCHEME']
    });
  }else throw error;
}

const screens=Array.isArray(variants)?variants:(Array.isArray(variants?.screens)?variants.screens:[]);
if(!screens.length)throw new Error('Stitch variants returned no screens');

async function htmlContent(screen){
  const asset=await screen.getHtml();
  if(typeof asset==='string'&&/^https?:\/\//i.test(asset)){
    const response=await fetch(asset);
    if(!response.ok)throw new Error('Variant HTML download failed: '+response.status);
    return await response.text();
  }
  return String(asset||'');
}
async function imageBytes(screen){
  const asset=await screen.getImage();
  if(typeof asset==='string'&&/^https?:\/\//i.test(asset)){
    const response=await fetch(asset);
    if(!response.ok)throw new Error('Variant image download failed: '+response.status);
    return Buffer.from(await response.arrayBuffer());
  }
  return Buffer.from(asset);
}
for(let index=0;index<screens.length;index++){
  const screen=screens[index];
  const number=index+1;
  await fs.writeFile(path.join(outDir,'operations-emitted-variant-'+number+'.html'),await htmlContent(screen));
  await fs.writeFile(path.join(outDir,'operations-emitted-variant-'+number+'.png'),await imageBytes(screen));
}

await fs.writeFile(path.join(outDir,'operations-emitted-stitch-latest.json'),JSON.stringify({
  generatedAt:new Date().toISOString(),
  projectId,
  sourceScreenId:String(source.id||source.screenId||''),
  variantScreenIds:screens.map(screen=>String(screen.id||screen.screenId||'')),
  method:'upload-functional-contract-then-explore-variants',
  creativeRange:'EXPLORE',
  aspects:['LAYOUT','COLOR_SCHEME'],
  functionalContract:['emitted/limit','percentage','remaining capacity','progress','copy WhatsApp','view all','recent emitted list','open vehicle']
},null,2)+'\n');

console.log('Stitch emitted-today source:',String(source.id||source.screenId||'unknown'));
console.log('Stitch emitted-today variants:',screens.map(screen=>String(screen.id||screen.screenId||'')).join(','));
