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
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
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
        const failedCount=calls.length;await page.waitForTimeout(600);assert.equal(calls.length,failedCount);
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
    console.log(JSON.stringify({isolatedRequests:metrics,checks:'navigation, cache scope, refresh, operations, permissions, failure/retry, timeout/abort, console: OK'},null,2));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
