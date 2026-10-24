import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=process.cwd(),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),moduleSrc=fs.readFileSync(path.join(root,'modules/control-auto/ecarcheck-restriction-export.js'),'utf8');
const start=html.indexOf('function restrictionRows111(gal)'),end=html.indexOf('async function enhanceGaleraManual(force=false){',start);
assert.ok(start>=0&&end>start,'export functions found in validator source');
const exportCode=html.slice(start,end);
const enhanceEnd=html.indexOf('const obs=new MutationObserver',end),enhanceCode=html.slice(end,enhanceEnd);
assert.ok(enhanceEnd> end,'validator enhancer found in source');
const filterStart=html.indexOf("document.addEventListener('change',e=>{if(e.target?.id!=='v111ExportGal')"),filterEnd=html.indexOf('\nconst obs=',filterStart),filterCode=html.slice(filterStart,filterEnd);
assert.ok(filterStart>=0&&filterEnd>filterStart,'gallery filter handler found in source');
const galleries=['VCARS','VCOMP','VIPCO','VINDU'];
const alerts=galleries.map((galera,i)=>({tipo:'RESTRICCION_ECARCHECK',galera,unidad:'U-'+galera,placa:'ABC-'+i,empresa:'Empresa '+galera,supervisora:'Supervisora '+galera,detalle:{consultadoEn:'2026-10-24T10:30:00-05:00',boletas:{boletasPorPlaca:{cantidad:1,desglose:[{tipo:'Colisión y fuga'}]},boletasPorDocumento:{cantidad:0,desglose:[]},infraccionesEna:{cantidad:0,desglose:[]}}}}));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
  const page=await browser.newPage({acceptDownloads:true,viewport:{width:1440,height:900}}),consoleErrors=[];page.on('pageerror',e=>consoleErrors.push(e.message));
  await page.setContent('<main class="v80-validator"><section class="v80-policy"><h2>Validador</h2></section><section class="v86-ex"><div class="v86-ex-list">'+galleries.map(g=>'<div class="v86-ex-row"><div><b>'+g+'</b> · U-'+g+'</div></div>').join('')+'</div></section><p>Otras opciones del validador</p></main>');
  await page.addScriptTag({content:moduleSrc});
  await page.addScriptTag({content:`let manualPanel=${JSON.stringify({periodo:{label:'Quincena 2 · octubre 2026'},alertas:alerts})},manualRun=null;function loadManualPanel(){return new Promise(()=>{})}function statusText111(){return 'loading'}${exportCode}${enhanceCode}${filterCode}enhanceGaleraManual();`});
  const toolbar=page.locator('#v111RestrictionExport');assert.equal(await toolbar.count(),1);assert.equal(await toolbar.locator('select option').count(),5);
  assert.equal(await toolbar.locator('button').count(),2);assert.ok(await toolbar.isVisible());
  assert.equal(await page.locator('#v111RestrictionExport').evaluate(el=>el.nextElementSibling.classList.contains('v86-ex')),true);
  for(const gal of galleries){await toolbar.locator('select').selectOption(gal);assert.equal(await toolbar.locator('select').inputValue(),gal);assert.equal(await page.locator('.v86-ex-row:not([hidden])').count(),1,gal+' filter updates the visible coverage rows');}
  await toolbar.locator('select').selectOption('TODAS');assert.equal(await page.locator('.v86-ex-row:not([hidden])').count(),4);
  await page.setViewportSize({width:390,height:844});assert.ok(await toolbar.isVisible());
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'rym-export-browser-'));
  try {
    await toolbar.locator('select').selectOption('VCARS');
    for(const [button,extension,signature] of [['Exportar PDF','.pdf','%PDF-1.4'],['Exportar Excel','.xlsx','PK']]){
      const pending=page.waitForEvent('download');await toolbar.getByRole('button',{name:button}).click();const download=await pending,target=path.join(out,'report'+extension);await download.saveAs(target);const data=fs.readFileSync(target);assert.ok(data.subarray(0,signature.length).toString().startsWith(signature));
      if(extension==='.pdf'){const contents=data.toString('latin1');assert.match(contents,/VCARS/);assert.match(contents,/Empresa VCARS/);assert.match(contents,/Colisi/);assert.doesNotMatch(contents,/Empresa VCOMP/)}
      else {const z=data.toString('latin1');assert.match(z,/xl\/worksheets\/sheet1.xml/);assert.match(z,/VCARS/);assert.doesNotMatch(z,/Empresa VCOMP/)}
    }
  } finally {fs.rmSync(out,{recursive:true,force:true});}
  assert.deepEqual(consoleErrors,[]);
  console.log('Browser UI: toolbar mounts without .v86-ex, stays visible at 390px, filters to VCARS, and downloads PDF/XLSX.');
} finally {await browser.close();}
