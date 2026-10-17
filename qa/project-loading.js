const fs=require('fs'),assert=require('node:assert/strict');
const {execFileSync}=require('child_process');
const {chromium}=require('playwright');
const baseline=process.argv.find(x=>x.startsWith('--baseline='))?.slice(11);
const disk=(path,old=false)=>old?execFileSync('git',['show',baseline+':'+path],{encoding:'utf8',maxBuffer:5e6}):fs.readFileSync(path,'utf8');
const profile={id:'qa',nombre:'QA',rol:'ADMIN_TOTAL',activo:true};
const rev={ok:true,profile:{...profile,scope_label:'QA',can:{operations:true,monthly:true,history:true,stats:true}},kpis:{activas:1,pendientes:1,cubiertas:0},rows:[{unidad_id:'1',unidad:'QA1',placa:'QA123',galera:'VCARS',mes_num:1,prioridad:'CRITICA',alerts:[],emitido:false}],monthly:[],por_galera:[],incidents:[],incident_types:[],emitidos_hoy:{emitidos:0,rows:[]},logistictodo:{},boletas_lote:{companies:[]}};
async function setup(browser,old=false){
  const page=await browser.newPage();const errors=[],calls=[];let failRev=false,failPan=false,restricted=false;
  page.on('pageerror',e=>errors.push(e.message));
  const worker=await import('data:text/javascript;base64,'+Buffer.from(disk('worker.js')).toString('base64'));
  const response=await worker.default.fetch(new Request('http://rym.test/'),{ASSETS:{fetch:async()=>new Response(disk('index.html',old),{headers:{'content-type':'text/html'}})}});
  const html=await response.text();
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.host==='rym.test'&&url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
    if(url.host==='rym.test'&&url.pathname.startsWith('/modules/'))return route.fulfill({contentType:'text/javascript',body:disk(url.pathname.slice(1),old&&url.pathname.includes('dashboard-payments-enhance'))});
    if(url.hostname.endsWith('supabase.co')){
      const name=url.pathname.split('/').pop();calls.push({name,body:route.request().postData(),at:Date.now()});
      if(name==='revisados-final'){
        await new Promise(r=>setTimeout(r,250));
        return route.fulfill({status:failRev?503:200,contentType:'application/json',body:JSON.stringify(failRev?{ok:false,error:'QA sin conexión'}:restricted?{...rev,profile:{...rev.profile,can:{}}}:rev)});
      }
      if(name==='revisados_emitidos_hoy_v1')await new Promise(r=>setTimeout(r,350));
      const data=name==='revisados-ficha'?{ok:true,unidad:{id:'1',unidad:'QA1',placa:'QA123'},oficial:{},logistica:{},ecarcheck:{},diferencias:[]}:name==='revisados_emitidos_hoy_v1'?{emitidos:1,limite:33,rows:[]}:
        name==='dashboard_resumen'?[{unidades_visibles:1,negativos_hoy:0,recurrentes_mes:0}]:
        name==='panapass_bajas_centro_v7'?{pendientes:[],procesadas:[],alertas:[]}:[];
      return route.fulfill({status:failPan&&name==='dashboard_resumen'?503:200,contentType:'application/json',body:JSON.stringify(data)});
    }
    return route.fulfill({status:200,body:''});
  });
  await page.goto('http://rym.test/',{waitUntil:'load'});
  await page.evaluate(p=>{state.profile=p;state.token='qa';state.sessionVersion=1;state.allModules=['dashboard','portal.revisados','revisados.reporte_diario','negativos_hoy','pagos_hoy','cargar_pagos'];state.modules=[...state.allModules];rymHasModule=()=>true},profile);
  return {page,errors,calls,failRev:v=>failRev=v,failPan:v=>failPan=v,restricted:()=>restricted=true};
}
async function regressionChecks(browser){
  const results=[];
  async function check(name,run){
    const selected=process.argv.find(x=>x.startsWith('--case='))?.slice(7);
    if(selected&&!name.startsWith(selected))return;
    const t=await setup(browser,!!baseline);
    try{await run(t);assert.deepEqual(t.errors,[]);results.push({name,result:'PASS'})}
    catch(e){results.push({name,result:'FAIL',error:e.message});process.exitCode=1}
    finally{await t.page.close()}
  }
  const revReads=t=>t.calls.filter(x=>x.name==='revisados-final').length;
  const mutate=page=>page.evaluate(()=>{const el=document.createElement('span');el.textContent='QA DOM';document.body.appendChild(el)});
  await check('Panapass 650ms: Revisados survives rapid navigation and successive opens',async({page})=>{
    await page.evaluate(()=>{state.profile.rol='PAGADOR'});
    await page.route('**/rest/v1/rpc/dashboard_resumen',async route=>{
      await new Promise(r=>setTimeout(r,650));
      await route.fulfill({contentType:'application/json',body:JSON.stringify([{unidades_visibles:1}])});
    });
    for(let i=0;i<3;i++){
      await page.evaluate(()=>{window.qaPan=window.v70OpenPanapass()});
      await page.waitForTimeout(40);
      await page.evaluate(()=>window.v60OpenRevisados());
      assert.equal(await page.locator('.v66-app').count(),1);
      await page.evaluate(()=>window.qaPan);
      assert.equal(await page.locator('.v66-app').count(),1,'late Panapass replaced Revisados');
    }
    await page.evaluate(()=>{window.qaFirst=window.v70OpenPanapass()});
    await page.waitForTimeout(40);
    await page.evaluate(()=>{window.qaSecond=window.v70OpenPanapass();window.qaLatestView=document.querySelector('#view')});
    await page.evaluate(()=>Promise.all([window.qaFirst,window.qaSecond]));
    assert.equal(await page.evaluate(()=>window.qaLatestView===document.querySelector('#view')&&window.qaLatestView.isConnected),true);
    assert.equal(await page.locator('.shell').count(),1);
  });
  await check('Revisados 503: retain valid data, navigate and recover',async t=>{
    const {page}=t;await page.evaluate(()=>window.v60OpenRevisados());
    await page.locator('[data-v66-tab="operations"]').click();
    t.failRev(true);await page.locator('#v66Refresh').click();await page.waitForSelector('#v66Body .alert');
    await page.locator('[data-v66-tab="dashboard"]').click();
    assert.equal(await page.locator('[data-v66-tab="dashboard"].active').count(),1,'navigation blocked after 503');
    await page.locator('[data-v66-tab="operations"]').click();
    assert.equal(await page.locator('#v66OQ').count(),1);
    assert.match(await page.locator('#v66Body').textContent(),/QA1/);
    t.failRev(false);await page.locator('#v66Retry').click();
    await page.waitForFunction(()=>!document.querySelector('#v66Retry')&&!!document.querySelector('#v66OQ'));
  });
  await check('Revisados initial 503: known permissions, navigation and retry',async t=>{
    const {page}=t;await page.evaluate(can=>{state.profile.can=can},rev.profile.can);
    t.failRev(true);await page.evaluate(()=>window.v60OpenRevisados());
    assert.equal(await page.locator('[data-v66-tab="operations"]').count(),1,'known permitted tab unavailable');
    for(const tab of ['operations','history','dashboard']){
      await page.locator(`[data-v66-tab="${tab}"]`).click();
      assert.equal(await page.locator(`[data-v66-tab="${tab}"].active`).count(),1);
      assert.equal(await page.locator('#v66Retry').count(),1);
    }
    t.failRev(false);await page.locator('#v66Retry').click();await page.waitForFunction(()=>!document.querySelector('#v66Retry'));
    await page.locator('[data-v66-tab="operations"]').click();assert.equal(await page.locator('#v66OQ').count(),1);
  });
  await check('Revisados initial 503: unknown permissions remain restricted',async t=>{
    t.failRev(true);await t.page.evaluate(()=>window.v60OpenRevisados());
    assert.equal(await t.page.locator('[data-v66-tab="operations"],[data-v66-tab="history"]').count(),0);
    await t.page.locator('[data-v66-tab="dashboard"]').click();
    assert.equal(await t.page.locator('[data-v66-tab="dashboard"].active').count(),1);
  });
  await check('Empty rows: cache survives DOM/filter changes; refresh invalidates',async t=>{
    const {page}=t;let reads=0;
    await page.route('**/functions/v1/revisados-final',route=>{reads++;return route.fulfill({contentType:'application/json',body:JSON.stringify({...rev,rows:[]})})});
    await page.evaluate(()=>window.v60OpenRevisados());await page.locator('[data-v66-tab="operations"]').click();
    await page.waitForTimeout(500);assert.equal(reads,1,'empty result queried again on Operations');
    await mutate(page);await page.waitForTimeout(300);assert.equal(reads,1);
    await page.locator('#v66OP').selectOption('CRITICA');await page.waitForTimeout(300);assert.equal(reads,1,'local filter must reuse the loaded dataset');
    await page.locator('#v66Refresh').click();await page.waitForFunction(()=>document.querySelector('#v66Refresh')?.textContent==='Actualizar vista');
    assert.equal(reads,2,'explicit refresh must query');
    await mutate(page);await page.waitForTimeout(300);assert.equal(reads,2);
  });
  await check('Filter read failure: no observer loop, real filter change retries',async t=>{
    const {page}=t;await page.evaluate(()=>window.v60OpenRevisados());await page.locator('[data-v66-tab="operations"]').click();
    await page.waitForFunction(()=>document.querySelector('.v66-filterbar')?.dataset.v166Smart==='1');
    t.failRev(true);
    await page.evaluate(()=>{window.__v106RevisadosCache=null;delete document.querySelector('.v66-filterbar').dataset.v166Smart});
    await mutate(page);await page.waitForTimeout(500);const failedReads=revReads(t);
    assert.equal(await page.locator('.v66-filterbar').getAttribute('data-v166-smart'),'error');
    await mutate(page);await page.waitForTimeout(500);assert.equal(revReads(t),failedReads);
    await page.locator('#v66OP').selectOption('CRITICA');await page.waitForTimeout(500);
    assert.equal(revReads(t),failedReads+1,'filter change must retry a failed read');
    t.failRev(false);await page.locator('#v66OP').selectOption('');
    await page.waitForFunction(()=>document.querySelector('.v66-filterbar')?.dataset.v166Smart==='1');
    assert.equal(revReads(t),failedReads+2);
    await mutate(page);await page.waitForTimeout(300);assert.equal(revReads(t),failedReads+2);
  });
  console.log(JSON.stringify({source:baseline||'working-tree',regressions:results},null,2));
}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    if(process.argv.includes('--regressions')){await regressionChecks(browser);return}
    const metrics=[];
    for(const old of baseline?[true,false]:[false]){
      const t=await setup(browser,old),{page,calls,errors}=t;
      const opening=await page.evaluate(async()=>{const p=window.v60OpenRevisados();const nav=!!document.querySelector('#v66Nav');await p;return {navImmediate:nav}});
      assert.equal(opening.navImmediate,!old);
      assert.equal(calls.filter(x=>x.name==='revisados-final').length,1);
      assert.equal(calls.filter(x=>x.name==='revisados_emitidos_hoy_v1').length,1);
      await page.evaluate(()=>window.v60OpenRevisados());
      assert.equal(calls.filter(x=>x.name==='revisados-final').length,1);
      if(!old){
        // Independent requests must overlap rather than extend the critical path.
        assert.ok(Math.abs(calls.find(x=>x.name==='revisados-final').at-calls.find(x=>x.name==='revisados_emitidos_hoy_v1').at)<150);
        await page.locator('#v66Refresh').click();await page.waitForFunction(()=>document.querySelector('#v66Refresh')?.textContent==='Actualizar vista');
        assert.equal(calls.filter(x=>x.name==='revisados-final').length,2);
        await page.locator('[data-v66-tab="operations"]').click();
        assert.equal(await page.locator('#v66OQ').count(),1);
        await page.locator('#v66Body [data-ficha]').first().click();
        await page.waitForSelector('#v66ModalBody .v66-source');
        assert.equal(calls.filter(x=>x.name==='revisados-ficha').length,1);
        assert.equal(calls.filter(x=>/consulta-admin|ena-consulta/.test(x.name)).length,0);
        await page.locator('#v66ModalClose').click();
        // Opening Operations must reuse the response shared by the project load.
        assert.equal(calls.filter(x=>x.name==='revisados-final').length,2);
        t.failRev(true);await page.locator('#v66Refresh').click();await page.waitForFunction(()=>document.querySelector('#v66Body .alert'));
        assert.match(await page.locator('#v66Body').textContent(),/actualizar/);
        t.failRev(false);await page.locator('#v66Refresh').click();await page.waitForFunction(()=>document.querySelector('#v66Refresh')?.textContent==='Actualizar vista');
        // Discard a result when the user navigates away during the request.
        await page.evaluate(()=>{document.querySelector('#v66Refresh').click();document.querySelector('#v66Back').click()});
        await page.waitForTimeout(500);assert.equal(await page.locator('.v66-app').count(),0);
      }
      calls.length=0;await page.evaluate(()=>window.v70OpenPanapass());
      await page.waitForFunction(()=>document.querySelector('#view .kpis')?.dataset.rymReady==='1');
      const first=calls.filter(x=>['dashboard_resumen','panapass_control_auto_resumen','panapass_bajas_centro_v7','panapass_dashboard_galeras','panapass_dashboard_pagos_7d','panapass_ranking_pagos'].includes(x.name)).length;
      calls.length=0;await page.evaluate(()=>window.v70OpenPanapass());await page.waitForTimeout(200);
      const repeated=calls.filter(x=>x.name==='dashboard_resumen').length;
      metrics.push({version:old?'before':'after',revisadosNavigationImmediate:opening.navImmediate,panapassInitialReads:first,panapassReopenSummaryReads:repeated});
      if(!old){
        assert.equal(first,5);assert.equal(repeated,0);
        // A new login cannot reuse cached data from the same user.
        t.failPan(true);await page.evaluate(()=>{state.sessionVersion++;return window.v70OpenPanapass()});
        await page.waitForSelector('[data-rym-retry]');
        // Other pending reads may reach the mock after the first failure renders.
        const failedCount=calls.filter(x=>x.name==='dashboard_resumen').length;
        await page.waitForTimeout(600);assert.equal(calls.filter(x=>x.name==='dashboard_resumen').length,failedCount);
        t.failPan(false);await page.locator('[data-rym-retry]').click();await page.waitForFunction(()=>document.querySelector('#view .kpis')?.dataset.rymReady==='1');
        await page.evaluate(async()=>{state.active='qa-other-tab';await render();await window.v70OpenPanapass()});
        await page.waitForFunction(()=>document.querySelector('#view .kpis')?.dataset.rymReady==='1');
        assert.ok(calls.filter(x=>x.name==='dashboard_resumen').length>=3);
        const timeout=await page.evaluate(async()=>{let aborted=false;try{await rymProjectRead(signal=>new Promise(()=>signal.addEventListener('abort',()=>aborted=true)),10)}catch(e){return {aborted,error:e.message}}});
        assert.ok(timeout.aborted);assert.match(timeout.error,/actualizar/);
      }
      assert.deepEqual(errors,[]);await page.close();
    }
    const t=await setup(browser);t.restricted();
    await t.page.evaluate(()=>window.v60OpenRevisados());
    assert.equal(await t.page.locator('[data-v66-tab="operations"]').count(),0);
    assert.equal(await t.page.locator('[data-v66-tab="history"]').count(),0);
    assert.deepEqual(t.errors,[]);await t.page.close();
    const home=await setup(browser);
    await home.page.route('**/functions/v1/auth-username',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,access_token:'qa',profile,modules:['dashboard','portal.revisados','portal.panapass']})}));
    await home.page.route('**/functions/v1/portal-home-resumen',async route=>{
      await new Promise(r=>setTimeout(r,700));
      await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'QA resumen no disponible'})});
    });
    await home.page.locator('input[name="usuario"]').fill('qa');
    await home.page.locator('input[name="password"]').fill('qa');
    await home.page.locator('#loginBtn').click();
    await home.page.waitForSelector('#v99Rev');
    await home.page.waitForSelector('#v145LoginTransition',{state:'detached'});
    assert.equal(await home.page.locator('#v99Rev').count(),1);
    assert.equal(await home.page.locator('#v99Pan').count(),1);
    assert.equal(await home.page.locator('#v139HomeTransition,#v145LoginTransition').count(),0);
    await home.page.waitForSelector('#v139RetrySummary');
    assert.deepEqual(home.errors,[]);await home.page.close();
    console.log(JSON.stringify({isolatedRequests:metrics,checks:'navigation, cache scope, refresh, operations, permissions, failure/retry, timeout/abort, console: OK'},null,2));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
