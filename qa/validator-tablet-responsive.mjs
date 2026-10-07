import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/almar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),source=fs.readFileSync('index.html','utf8');
const originalStyles=[...source.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map(m=>m[0]).join('\n');
const core=source.match(/<script id="rym-v99-centro-control-js">([\s\S]*?)<\/script>/)[1];
const validator=core.slice(core.indexOf('  const E99='),core.indexOf('  function card99('));
const consistency=source.match(/<script id="rym-v125-consistency-js">([\s\S]*?)<\/script>/)[1];
const clean=consistency.slice(consistency.indexOf('  function cleanQuickQuery(){'),consistency.indexOf('  function improveControlSupervisorMobile('));
// Execute main's actual validator functions, with deterministic responses only in this test server.
const seed={unidad:'QA200',placa_unica:'QA14826',estatus:'ACTIVO',status2:'ACTIVO',panapass_numero:'1129235',ena_saldo:.25,empresa_duena:'EMPRESA QA',empresa_operadora:'OPERADORA QA',supervisora:'SUPERVISORA QA',galera:'GALERA QA',mes_revisado:'OCTUBRE',color:'Titan Grey',marca:'Hyundai'};
const cases=['ok','pan-negative','no-pan','rev-pending','rev-blocked','gps-alert','no-gps','stopped','closed','ena-error','not-found','no-permission'];
const sizes=[[360,800],[390,844],[412,915],[768,1024],[800,1280],[1024,768],[1280,800],[1440,900]];
let activeCase='ok';
function fixture(){
  return `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">${originalStyles}</head><body class="v99-home"><div id="app"><div class="v101-shell"><aside class="v101-side">Forbidden sidebar</aside><main class="v101-main"><header class="v101-top">Forbidden portal</header><div class="v101-content"><section class="v101-validator"><div class="v101-validator-head"><h3>Validador rápido de unidad</h3><p>Original helper</p></div><div class="v101-validator-tools"><div class="v101-validator-box"><input id="v101ValidatorQ" class="v101-validator-input"><div id="v101ValidatorList" class="v101-validator-list" style="display:none"></div></div><button id="v101ValidatorGo" class="v101-validator-go">Validar</button></div></section><section class="v99-grid">Forbidden dashboard</section></div></main></div></div><script>
  const testCase=${JSON.stringify(activeCase)},testSeed=${JSON.stringify(seed)},calls=[];
  const state={profile:{nombre:'Usuario QA',rol:'ADMIN_TOTAL'},allModules:testCase==='no-permission'?[]:['control_auto.validador_unidad_app']};
  window.rymHasModule=code=>state.allModules.includes(code);
  function clearSession(){state.profile=null;state.allModules=[]}
  function loginView(){document.body.className='';document.getElementById('app').innerHTML='<div class="login-card">Inicia sesión</div>'}
  window.v36PortalHome=async()=>{};
  function gpsDate116(v){return String(v)}
  async function rpc(name,args){calls.push({name,args});if(testCase==='not-found')return [];const s={...testSeed};if(testCase==='pan-negative')s.ena_saldo=-2;if(testCase==='no-pan')s.panapass_numero='';if(testCase==='stopped'){s.estatus='PARADO';s.status2='TALLER'}if(testCase==='closed')s.estatus='CERRADA';return [s]}
  async function req(url,opt){calls.push({url,opt});if(url.includes('revisados-final'))return {data:{ok:true,rows:[{unidad:testSeed.unidad,estado:testCase==='rev-pending'?'PENDIENTE':'VIGENTE',emitido:testCase!=='rev-pending',bloqueado:testCase==='rev-blocked',mes_revisado:'OCTUBRE',ultimo_revisado:'2026-10-01',fotos_disponibles:true,cantidad_fotos:2}]}};if(url.includes('ena-consulta')){if(testCase==='ena-error')throw Error('Sin respuesta ENA');return {data:{ok:true,results:[{result:'OK',summary:{saldo_texto:testCase==='pan-negative'?'-2.00':'0.25'}}]}}}if(url.includes('gps-rym-validator'))return {data:{ok:true,rows:[{unidad:testSeed.unidad,nivel:testCase==='gps-alert'?'ALERTA':'OK',gps1:{installed:testCase!=='no-gps',ok:true,last:'2026-10-07'},gps2:{installed:true,ok:true,last:'2026-10-07'},estado_operativo:'ACTIVO',razon:'Diagnóstico QA'}]}};throw Error('Unexpected request '+url)}
  ${validator}
  const E=E99,N=N99;
  ${clean}
  const cleanup=new MutationObserver(()=>{cleanup.disconnect();cleanQuickQuery();cleanup.observe(document.body,{childList:true,subtree:true})});
  cleanup.observe(document.body,{childList:true,subtree:true});
  bindValidator99();
  window.QA={calls,state,open:openValidator99};
  </script></body></html>`;
}
const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('worker.js','utf8')).toString('base64'))).default;
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
  try{
    const response=await worker.fetch(new Request('http://127.0.0.1:4179'+req.url),{ASSETS:{fetch:async request=>{
      const u=new URL(request.url);if(u.pathname==='/'&&u.searchParams.has('validator-host')&&activeCase!=='real-login')return new Response(fixture(),{headers:{'content-type':'text/html'}});
      const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
      return new Response(fs.readFileSync(file),{headers:{'content-type':mime[path.extname(file)]||'application/octet-stream'}});
    }}});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(e){res.writeHead(500);res.end(String(e))}
});
await new Promise(r=>server.listen(4179,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const out=path.join(root,'.sandbox/validator-qa');fs.mkdirSync(out,{recursive:true});
let count=0;const report=[],errors=[];
try{
for(const [width,height] of process.argv.includes('--smoke')?[]:sizes){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
  await context.route('https://drive.google.com/**',r=>r.abort());
  for(const scenario of cases){
    activeCase=scenario;
    const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4179/?app=validador-unidad');
    const host=page.frameLocator('#portal');await page.locator('#portal.ready').waitFor();
    if(scenario==='no-permission'){
      await host.locator('.uva-denied').waitFor();assert.equal(await host.locator('#v101ValidatorQ').count(),0);
      assert.equal(await host.locator('#v101CheckModal').count(),0);
      await page.screenshot({path:path.join(out,`${width}x${height}-${scenario}.png`)});
      await page.locator('#exit').click();await host.locator('.login-card').waitFor();
    }else{
      assert.equal(await host.locator('.v101-side').isVisible(),false);
      assert.equal(await host.locator('.v99-grid').isVisible(),false);
      if(width<=650){
        const button=await host.locator('#v101ValidatorGo').boundingBox(),input=await host.locator('#v101ValidatorQ').boundingBox();
        assert.equal(Math.round(button.width),Math.round(input.width),'Mobile Validate must fill the input width');
        assert.ok(button.height>=48);
        assert.equal(await host.locator('#v101ValidatorGo').evaluate(x=>getComputedStyle(x,':after').content),'none');
      }
      await host.locator('#v101ValidatorQ').fill(scenario==='not-found'?'ZZZZ':'QA200');
      if(scenario==='not-found'){
        await host.locator('#v101ValidatorGo').click();await host.locator('.v101-check-empty').waitFor();
        assert.match(await host.locator('#v101ValidatorList').innerText(),/Sin coincidencias/);
        await page.screenshot({path:path.join(out,`${width}x${height}-${scenario}.png`)});
      }else{
        if(count%3===0){await host.locator('[data-v101pick]').waitFor();await host.locator('[data-v101pick]').click()}
        else if(count%3===1)await host.locator('#v101ValidatorQ').press('Enter');
        else await host.locator('#v101ValidatorGo').click();
        await host.locator('#v117Overall:not(.pending)').waitFor();
        await host.locator('#v117GpsCard:not(.pending)').waitFor();
        await host.locator('#v117PanCard:not(.pending)').waitFor();
        assert.equal(await host.locator('.v117-status-card').count(),4);
        assert.equal(await host.locator('#v101OpenModule').isVisible(),false);
        const data=await host.locator('#v101CheckModal').evaluate(modal=>{
          const rect=modal.getBoundingClientRect(),again=modal.querySelector('#v101AgainCheck').getBoundingClientRect();
          const grid=modal.querySelector('.v117-quick-grid');
          const card=modal.querySelector('.v117-check-card');
          return {overflow:document.documentElement.scrollWidth>innerWidth,modalWidth:rect.width,viewWidth:innerWidth,againVisible:again.bottom<=innerHeight&&again.top>=0,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,scroll:card.scrollHeight>innerHeight,status:modal.querySelector('#v117Overall').textContent,
            fonts:[...modal.querySelectorAll('header small,header strong,.v117-card-value,.v117-meta>span')].map(x=>parseFloat(getComputedStyle(x).fontSize))};
        });
        assert.equal(data.overflow,false,`${width} ${scenario}: overflow`);assert.equal(data.againVisible,true);assert.equal(data.modalWidth,data.viewWidth);
        assert.ok(Math.min(...data.fonts)>=11);assert.equal(data.columns,width<=650?1:width<1000?2:4);
        // The historical closed-unit notice and expanded secondary data may require scrolling.
        if(scenario!=='closed')assert.equal(data.scroll,false,`${width} ${scenario}: unnecessary scroll`);
        const expect=scenario==='ok'||scenario==='rev-blocked'?'ACTIVA · TODO OK':scenario==='closed'?'CERRADA · HISTORICO':scenario==='stopped'?'PARADA · TALLER':scenario==='gps-alert'||scenario==='ena-error'?'ACTIVA · REVISAR':'ACTIVA · ALERTA';
        assert.equal(data.status,expect,scenario);
        await page.screenshot({path:path.join(out,`${width}x${height}-${scenario}.png`)});
        if(!await host.locator('.uva-details').first().evaluate(x=>x.open))await host.locator('.uva-details').first().locator('summary').click();
        assert.equal(await host.locator('.v117-card-details').first().isVisible(),true);
        assert.ok(await host.locator('.v117-card-detail b').first().innerText());
        await host.locator('#v101AgainCheck').click();assert.equal(await host.locator('#v101CheckModal').count(),0);
        assert.equal(await host.locator('#v101ValidatorQ').evaluate(x=>x===document.activeElement),true);
        await host.locator('#v101ValidatorGo').click();await host.locator('#v101CloseCheck').waitFor();await host.locator('#v101CloseCheck').click();
        assert.equal(await host.locator('#v101CheckModal').count(),0);
        if(scenario==='ok'){await page.locator('#exit').click();await host.locator('.login-card').waitFor()}
        report.push({size:`${width}x${height}`,scenario,...data});
      }
    }
    count++;await page.close();
  }
  await context.close();console.log(`PASS ${width}x${height}: ${cases.length} scenarios`);
}
assert.deepEqual(errors,[]);
// Real main login + a real browser service-worker installation, without credentials or backend writes.
activeCase='real-login';
const smoke=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
await smoke.route('https://**/*',r=>r.abort());
const login=await smoke.newPage();login.setDefaultTimeout(15000);
await login.goto('http://127.0.0.1:4179/?app=validador-unidad');
await login.locator('#portal.ready').waitFor();
await login.frameLocator('#portal').locator('.login-card').waitFor();
assert.equal(await login.frameLocator('#portal').locator('#v101CheckModal').count(),0);
await login.evaluate(()=>navigator.serviceWorker.ready);
const cacheUrls=await login.evaluate(async()=>{
  const keys=await caches.keys(),urls=[];
  for(const key of keys)if(key.startsWith('rym-unit-validator-shell-'))urls.push(...(await (await caches.open(key)).keys()).map(r=>new URL(r.url).pathname));
  return urls;
});
assert.ok(cacheUrls.includes('/assets/rym-validator-192.png'));
assert.ok(!cacheUrls.includes('/'));
await login.screenshot({path:path.join(out,'real-main-login-390x844.png')});
await smoke.close();
if(count)fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({count,report,errors},null,2));
console.log('PASS: real main login and browser SW installation (static assets only).');
console.log(`PASS: ${count} cases; original main functions, ${sizes.length} viewports.`);
}finally{await browser.close();server.close()}
