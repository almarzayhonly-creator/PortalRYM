const fs=require('fs');
const assert=require('node:assert/strict');
const {execFileSync}=require('child_process');
const {chromium}=require('playwright');
const current=fs.readFileSync('index.html','utf8');
const baseline=process.argv.find(x=>x.startsWith('--baseline='))?.split('=')[1];
const previous=baseline?execFileSync('git',['show',baseline+':index.html'],{encoding:'utf8',maxBuffer:4e6}):null;
const helper=fs.readFileSync('modules/core/pagos-read.js','utf8');
function flow(html){
  const base=html.slice(html.indexOf('async function pagosTrabajo(v){'),html.indexOf('function pagosTrabajoTable(rows){'));
  const meta=html.slice(html.indexOf('const _v13PagosTrabajo=pagosTrabajo;'),html.indexOf('/* ===== V14 UI'));
  const validation=html.match(/<script id="rym-v74-responsive-pm-behavior">([\s\S]*?)<\/script>/)[1];
  return base+'\n'+meta+';\n'+validation;
}
async function screen(browser,html){
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<div id="view"></div>');
  await page.addScriptTag({content:helper});
  await page.addScriptTag({content:`
    const esc=v=>String(v??'').replace(/</g,'&lt;');const money=v=>Number(v||0).toFixed(2);const norm=v=>String(v||'').toUpperCase();
    const calls=[];let fail=false;
    const delays={panapass_unidades_detalle:80,panapass_v10_pagos_hoy:100,panapass_pm_validacion_estado:60,panapass_pm_validacion_detalle:70};
    async function rpc(name,body={},signal){calls.push({name,body});await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,delays[name]||1);signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(Error('Aborted'))},{once:true})});if(fail&&name==='panapass_v10_pagos_hoy')throw Error('Error de lectura');if(name==='panapass_v10_validar_pagos_hoy')return [{ok:true,registros:0,total_a_pagar:0}];if(name==='panapass_v10_archivar_pagos_hoy')return [{mensaje:'Archivado',registros:0}];return []}
    async function req(path,opt){return {data:await rpc(path.split('/').pop(),JSON.parse(opt.body),opt.signal)}}
    function pagosTrabajoTable(){return '<div class="empty">Hoja vacía</div>'}
    window.confirm=()=>true;
  `});
  await page.addScriptTag({content:flow(html)});
  return {page,errors};
}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const metrics=[];
    for(const [label,html] of [...(previous?[['before',previous]]:[]),['after',current]]){
      const {page,errors}=await screen(browser,html);
      const result=await page.evaluate(async()=>{
        const view=document.querySelector('#view'),start=performance.now();let layout=null,ready=null;
        const obs=new MutationObserver(()=>{if(layout===null&&view.querySelector('#pmOut'))layout=performance.now()-start;if(ready===null&&view.querySelector('#pmOut .empty'))ready=performance.now()-start});obs.observe(view,{subtree:true,childList:true});
        await pagosTrabajo(view);obs.disconnect();
        const opened={layout:Math.round(layout),sheetReady:Math.round(ready),complete:Math.round(performance.now()-start),reads:calls.length};
        calls.length=0;const reload=view.querySelector('#pmReload');await Promise.all([reload.onclick(),reload.onclick()]);
        return {...opened,repeatedReloadReads:calls.length};
      });
      metrics.push({label,...result});assert.deepEqual(errors,[]);
      if(label==='after'){
        assert.equal(result.reads,4);assert.equal(result.repeatedReloadReads,1);assert.ok(result.layout<50);
        const actions=await page.evaluate(async()=>{calls.length=0;for(const id of ['pmFromPM','pmValidate','pmArchive','pmReload'])await document.getElementById(id).onclick();return calls.map(x=>x.name)});
        assert.deepEqual(actions,['panapass_pagos_hoy_cargar_desde_pm','panapass_v10_pagos_hoy','panapass_v10_validar_pagos_hoy','panapass_v10_archivar_pagos_hoy','panapass_v10_pagos_hoy','panapass_v10_pagos_hoy']);
        const recovery=await page.evaluate(async()=>{fail=true;await document.getElementById('pmReload').onclick();const error=document.querySelector('#pmOut').textContent;fail=false;await document.getElementById('pmReload').onclick();return {error,recovered:!!document.querySelector('#pmOut .empty')}});
        assert.match(recovery.error,/Error de lectura/);assert.ok(recovery.recovered);
        const timeout=await page.evaluate(async()=>{let aborted=false;const read=rymPagosRead(signal=>new Promise(()=>signal.addEventListener('abort',()=>aborted=true)),20);const same=read(),duplicate=read();const shared=same===duplicate;let message='';try{await same}catch(e){message=e.message}return {shared,aborted,message}});
        assert.ok(timeout.shared&&timeout.aborted);assert.match(timeout.message,/Recargar/);
        // A detached read must not replace a newly opened screen.
        const navigation=await page.evaluate(async()=>{const view=document.querySelector('#view'),p=document.getElementById('pmReload').onclick();view.innerHTML='<p>Otro tab</p>';await p;return view.textContent});
        assert.equal(navigation,'Otro tab');
      }
      await page.close();
    }
    if(previous){assert.ok(metrics[1].sheetReady<metrics[0].sheetReady-40);assert.ok(metrics[1].complete<metrics[0].complete-70)}
    const globalMetrics=[];
    for(const html of [previous,current].filter(Boolean)){
      const page=await browser.newPage();await page.setContent('<div class="shell"><div id="view"></div></div>');
      const source=html.slice(html.indexOf('let opCache=null,opAt=0,opBusy=null;'),html.indexOf('function cleanPanDashboard()'));
      await page.addScriptTag({content:`let reads=0;const V166N=v=>String(v||'').toUpperCase();async function rpc(){reads++;return [{unidad:'U1',estado_operativo:'PARADO'}]}\n`+source});
      globalMetrics.push(await page.evaluate(async()=>{await decoratePanTables();const empty=reads;document.querySelector('#view').innerHTML='<table><tbody><tr><td data-label="Unidad">U1</td></tr></tbody></table>';await decoratePanTables();await decoratePanTables();return {empty,total:reads,label:document.querySelector('.v166-op-context')?.textContent}}));await page.close();
    }
    if(previous)assert.equal(globalMetrics[0].empty,1);
    const globalAfter=globalMetrics.at(-1);assert.equal(globalAfter.empty,0);assert.equal(globalAfter.total,1);assert.equal(globalAfter.label,'Parado');
    // Load the entire document to exercise the real wrapper chain and observers.
    const integrated=await browser.newPage(),integrationErrors=[];
    integrated.on('pageerror',e=>integrationErrors.push(e.message));
    await integrated.route('**/*',route=>{
      const url=route.request().url();
      if(url==='http://rym.test/')return route.fulfill({contentType:'text/html',body:current});
      if(url.includes('/modules/core/pagos-read.js'))return route.fulfill({contentType:'text/javascript',body:helper});
      return route.fulfill({contentType:'application/json',body:'[]'});
    });
    await integrated.goto('http://rym.test/',{waitUntil:'load'});
    await integrated.evaluate(async()=>{
      state.profile={id:'qa',rol:'ADMIN_TOTAL',nombre:'QA'};state.modules=['pagos_hoy','cargar_pagos'];state.active='cargar_pagos';
      rpc=async name=>name==='panapass_unidades_detalle'?[{unidad:'U1',panapass_numero:123,placa:'QA123',empresa:'QA',color:'AZUL'}]:[];
      req=async path=>({data:path.endsWith('/panapass_v10_pagos_hoy')?[{id:1,unidad:'U1',a_pagar:0,con_boleta:0,tipo:'EFECTIVO',empresa:'QA'}]:[]});
      app.innerHTML='<div class="shell"><div id="view"></div></div>';
      await pagosTrabajo(document.querySelector('#view'));
    });
    assert.equal(await integrated.locator('#pmReload').count(),1);
    assert.equal(await integrated.locator('#pmBalanceValidator').count(),1);
    assert.equal(await integrated.locator('#pmEmpresaFiltro').count(),1);
    assert.equal(await integrated.locator('#pmOut [data-save-pay]').count(),1);
    assert.equal(await integrated.locator('#pmOut [data-pay-panapass]').textContent(),'123');
    assert.ok(!(await integrated.locator('#pmOut').textContent()).includes('Leyendo hoja online'));
    await integrated.waitForTimeout(300);
    assert.deepEqual(integrationErrors,[]);
    await integrated.close();
    console.log(JSON.stringify({simulatedLatencyMs:metrics,globalDecorator:globalMetrics,checks:'actions, error recovery, timeout/abort, coalescing, navigation, console: OK'},null,2));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
