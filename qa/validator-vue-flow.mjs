import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/almar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { createServer } = await import('../vue-next/node_modules/vite/dist/node/index.js');
const harness = path.resolve('vue-next/validator-qa-local.html');
fs.writeFileSync(harness, `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module">
import {createApp} from 'vue';
import Quick from './src/components/UnitValidator.vue';
import Standalone from './src/views/ValidatorAppView.vue';
const row={unidad:'QA100',placa_unica:'QA-PLATE',estatus:'ACTIVO'};
const mode=new URLSearchParams(location.search).get('mode');
window.calls=[];
const card=(key)=>({key,title:key,tone:'ok',badge:'VERIFICADO',value:'VIGENTE',details:[],note:''});
const api={search:async(q)=>{window.calls.push(q);await new Promise(r=>setTimeout(r,q==='slow'?500:30));if(q==='error')throw Error('Servicio no disponible');return [q==='slow'?{...row,unidad:'OLD'}:row]},load:async()=>({unit:'QA100',plate:'QA-PLATE',owner:'QA',operator:'QA',supervisor:'QA',galera:'QA',active:true,status:'ACTIVO',overall:'ACTIVA',controlRecord:{chasis:'CH-100',mes_revisado:'OCTUBRE'},revisadoRecord:{estado:'VIGENTE',cantidad_fotos:2,ultimo_revisado:'2026-10-01'},gpsRecord:{nivel:'NORMAL',razon:'Normal',gps1:{installed:true,ok:true,label:'Reportando',last:'2026-10-20T10:00:00Z',imei:'IMEI-1',metadata:{device:'one'}},gps2:{installed:true,ok:true,label:'Reportando',last:'2026-10-20T10:00:00Z'}},cards:['panapass','revisados','gps','control'].map(card)}),enrich:async(d)=>{await new Promise(r=>setTimeout(r,100));d.revisadoRecord.estado='VIGENTE';return d},ficha:async()=>({oficial:{chasis:'CH-200'}})};
createApp(mode==='standalone'?Standalone:Quick,{api,access:'allowed'}).mount('#app');
</script></body></html>`);
const server = await createServer({root:path.resolve('vue-next'),configFile:path.resolve('vue-next/vite.config.ts'),server:{host:'127.0.0.1',port:4198,strictPort:true}});
let browser;
try {
  await server.listen();
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const base='http://127.0.0.1:4198/vue-next/dist/validator-qa-local.html';
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base);
  const input=page.locator('#v101ValidatorQ');
  await input.fill('QA100');await input.press('Enter');await page.locator('.uv-dialog').waitFor();
  await page.waitForFunction(()=>document.querySelector('.uv-check-card.revisados')?.innerText.includes('VIGENTE'));
  assert.equal(await page.locator('.uv-check-card').count(),4);
  assert.equal(await page.locator('.uv-identity-main h3').innerText(),'QA100');
  assert.equal(await page.locator('.uv-check-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length),4);
  assert.deepEqual(await page.locator('.uv-check-card').evaluateAll(cards=>cards.map(card=>['panapass','revisados','gps','control'].find(key=>card.classList.contains(key)))),['panapass','revisados','gps','control']);
  assert.equal(await page.locator('.uv-identity').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
  assert.equal(await page.locator('.uv-check-card.panapass').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(245, 249, 255)');
  assert.equal(await page.locator('.uv-card-select').first().evaluate(el=>getComputedStyle(el).color),'rgb(22, 58, 96)');
  assert.equal(await page.locator('.uv-identity').evaluate(el=>el.getBoundingClientRect().bottom<=document.querySelector('.uv-section-label').getBoundingClientRect().top),true,'Identity header overlaps service section');
  fs.mkdirSync('.sandbox/validator-qa',{recursive:true});await page.screenshot({path:'.sandbox/validator-qa/vue-quick-1440.png',fullPage:true});
  const review=page.locator('.uv-check-card.revisados');assert.doesNotMatch(await review.innerText(),/Fotos/i,'Obsolete photo data appeared in Revisado');await review.locator('.uv-card-select').click();const reviewDetail=page.locator('.uv-active-detail.revisados');assert.equal(await reviewDetail.locator('.uv-extra-field').filter({hasText:'Fotos'}).count(),0);
  const gps=page.locator('.uv-check-card.gps');assert.match(await gps.innerText(),/2 DE 2 REPORTANDO/);await gps.locator('.uv-card-select').click();const gpsDetail=page.locator('.uv-active-detail.gps');await gpsDetail.locator('.uv-extra-section').filter({hasText:'información del equipo'}).first().locator('summary').click();assert.match(await gpsDetail.innerText(),/IMEI-1/);assert.match(await gpsDetail.innerText(),/Metadata/);
  await page.locator('.uv-close').click();await page.locator('.uv-dialog').waitFor({state:'hidden'});
  await input.fill('error');await input.press('Enter');await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/Servicio no disponible/);
  await input.fill('slow');await page.waitForFunction(()=>window.calls.includes('slow'));await input.fill('QA100');await input.press('Enter');await page.locator('.uv-dialog').waitFor();await page.waitForTimeout(600);assert.equal(await page.locator('.uv-identity h3').innerText(),'QA100');
  for(const width of [390,768,1440]){
    await page.setViewportSize({width,height:900});await page.goto(base+'?mode=standalone');
    await page.locator('#vua-query').fill('QA100');await page.locator('#vua-query').press('Enter');await page.locator('.vua-card').nth(3).waitFor();
    await page.locator('.vua-card.control .vua-detail-toggle').click();await page.waitForFunction(()=>document.querySelector('.vua-card.control')?.innerText.includes('CH-200'));
    assert.match(await page.locator('.vua-card.control').innerText(),/Diferencia/);
    assert.equal(await page.locator('.vua-app').evaluate(el=>el.scrollWidth>el.clientWidth),false,'Overflow at '+width);
    fs.mkdirSync('.sandbox/validator-qa',{recursive:true});await page.screenshot({path:'.sandbox/validator-qa/improved-'+width+'.png',fullPage:true});
    await page.locator('.vua-footer button').click();assert.equal(await page.locator('#vua-query').inputValue(),'');
  }
  assert.deepEqual(errors,[]);console.log('PASS quick Enter, search error, stale search, four systems, obsolete photo fields omitted, shared details, comparison and responsive 390/768/1440.');
} finally {await browser?.close();await server.close();fs.unlinkSync(harness)}

