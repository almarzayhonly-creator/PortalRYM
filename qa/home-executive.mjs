// Real portal + existing Worker; all remote data is isolated in QA fixtures.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'C:/Users/almar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const interactivePreview=process.argv.includes('--vue-next-preview');
const reusePreviewServer=process.argv.includes('--reuse-preview-server');
const output=process.env.QA_ARTIFACT_DIR||path.join(os.tmpdir(),'rym-home-executive');
fs.mkdirSync(output,{recursive:true});
const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('worker.js','utf8')).toString('base64'))).default;
const server=http.createServer(async(req,res)=>{try{
  const response=await worker.fetch(new Request('http://127.0.0.1:4198'+req.url),{ASSETS:{fetch:async request=>{
    const u=new URL(request.url),file=u.pathname==='/'?'index.html':u.pathname.slice(1);
    const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.woff2')?'font/woff2':file.endsWith('.png')?'image/png':'text/javascript';
    let body=fs.readFileSync(file);
    if(interactivePreview&&file==='index.html'){
      const html=body.toString('utf8'),keyPattern=/(const KEY\s*=\s*)['"][^'"]+['"]/;
      if(!keyPattern.test(html))throw Error('Preview could not mask the existing public API key');
      body=Buffer.from(html.replace(keyPattern,"$1'fixture-preview-key'"));
    }
    return new Response(body,{headers:{'content-type':type}});
  }}});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch(e){res.writeHead(500);res.end(String(e))}});
if(!reusePreviewServer)await new Promise(resolve=>server.listen(4198,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:!interactivePreview,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report=[];
async function run(role,width,height,baseline=false,options={}){
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width,height}}),page=await context.newPage();
  const calls=[],errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url())});
  const profile={id:'fixture-user',nombre:'Usuario QA',rol:role,activo:true};
  const modules=role==='OPERATIVO'?['dashboard']:['dashboard','portal.panapass','portal.revisados','portal.control_auto','control_auto.unidades','portal.gps','gps.dashboard','control_auto.validador_unidad_app',...(role==='ADMIN_TOTAL'?['admin.usuarios']:[])];
  const unit={unidad:'P714',placa_unica:'QA714',placa_comercial:'QA-714',estatus:'ACTIVO',status2:'ACTIVO',panapass_numero:'1129235',empresa_duena:'Empresa QA',empresa_operadora:'Operadora QA',supervisora:'Supervisora QA',supervisora_id:'fixture-supervisora',galera:'VCARS',nro_poliza:'04-55-1458575-3',color:'Azul',marca:'QA',modelo:'Demo',mes_revisado:'OCTUBRE 2026',ena_saldo:0.25,credencial_disponible:false};
  const fixtureDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const revisado={unidad:unit.unidad,placa:unit.placa_unica,estado:'VIGENTE',emitido:true,status2:'ACTIVO',fecha:fixtureDate,ultimo_revisado:fixtureDate,mes_revisado:unit.mes_revisado,fotos_disponibles:true,cantidad_fotos:4};
  const fixtureGalleries=['VCARS','VCOMP','VIPCO','VINDU'].map(galera=>({galera,unidades:galera==='VCARS'?1:0,negativos:galera==='VCARS'?1:0,unidades_pagadas:galera==='VCARS'?1:0,saldo_negativo:galera==='VCARS'?-2.5:0,monto_pagado:galera==='VCARS'?2.5:0}));
  const fixturePayments=[{fecha:fixtureDate,unidad:unit.unidad,galera:unit.galera,a_pagar:2.5,sin_galera:false}];
  const rpcFixtures={dashboard_resumen:[{unidades_visibles:1,negativos_hoy:1,recurrentes_mes:2}],panapass_control_auto_resumen:[{activas:1,otros:0,cerradas:0,canibalizadas:0}],panapass_bajas_centro_v7:{alertas:[],pendientes:[],procesadas:[{unidad:'P700-QA',estado:'PROCESADA'}]},panapass_dashboard_galeras:fixtureGalleries,panapass_dashboard_pagos_7d:fixturePayments,panapass_ranking_pagos:[{supervisora_id:'fixture-supervisora',supervisora_nombre:'Supervisora QA',galera:'VCARS',posicion_galera:1,total_galera:1,unidades_pagadas:1,monto_pagado:2.5}]};
  const emptyRpcFixtures={dashboard_resumen:[{unidades_visibles:0,negativos_hoy:0,recurrentes_mes:0}],panapass_control_auto_resumen:[{activas:0,otros:0,cerradas:0,canibalizadas:0}],panapass_bajas_centro_v7:{alertas:[],pendientes:[],procesadas:[]},panapass_dashboard_galeras:[],panapass_dashboard_pagos_7d:[],panapass_ranking_pagos:[]};
  const summary={ok:true,profile,modules,generated_at:'2026-10-17T13:00:00Z',panapass:{negativos_hoy:126,pagos_hoy:16,monto_mes:611.01,bajas:{pendientes:13,procesadas:20,devoluciones:0}},revisados:{pendientes:268,criticos:4,emitidos_hoy:6,limite_hoy:33},control:{activas:1777,otros:381,cerradas:12},alerts:[{level:'bad',title:'13 activas sin Panapass asignado',text:'Datos de prueba; sin acceso a producción.'},{level:'warning',title:'20 bajas procesadas por ENA',text:'Seguimiento de conciliación externa.'},{level:'bad',title:'4 revisados críticos',text:'Pendientes dentro del alcance del perfil.'}]};
  let portalHomeCalls=0,portalHomeDelay=0,controlFailed=false,gpsFailed=false,panapassFailed=false;
  if(role==='OPERATIVO'){summary.panapass=null;summary.revisados=null;summary.control=null;summary.alerts=[]}
  if(options.mode==='empty'){summary.panapass={negativos_hoy:0,pagos_hoy:0,monto_mes:0,bajas:{pendientes:0,alertas:0,procesadas:0,devoluciones:0}};summary.revisados={pendientes:0,criticos:0,emitidos_hoy:0,limite_hoy:33};summary.control={activas:0,otros:0,cerradas:0};summary.alerts=[]}
  await page.route('**/*',async route=>{
    const request=route.request(),u=new URL(request.url());
    if(u.hostname==='127.0.0.1'&&u.port==='4198')return route.continue();
    if(u.hostname==='drive.google.com')return route.fulfill({contentType:'image/png',body:fs.readFileSync('assets/rym-logo.png')});
    if(u.hostname!=='avczyvcpmicpuhdkmxzx.supabase.co'){
      if(interactivePreview)return route.fulfill({status:403,contentType:'text/plain',body:'Blocked by local Vue Next fixture preview'});
      assert.equal(u.hostname,'avczyvcpmicpuhdkmxzx.supabase.co','Unexpected remote request');
    }
    calls.push({path:u.pathname,body:request.postData()});
    const gps={installed:true,ok:true,last:'2026-10-17T13:00:00Z'};
    const requestBody=(()=>{try{return JSON.parse(request.postData()||'{}')}catch{return {}}})();
    const rpcName=u.pathname.match(/\/rest\/v1\/rpc\/([^/]+)/)?.[1];
    const searchTerm=String(requestBody.p_buscar||'').trim().toUpperCase();
    const knownUnit=['P714','QA714','QA-714','1129235','EMPRESA QA'].some(term=>searchTerm.includes(term));
    const data=u.pathname.endsWith('auth-username')?{ok:true,access_token:'fixture-only',profile,modules}:
      u.pathname.endsWith('portal-home-resumen')?summary:
      u.pathname.endsWith('portal-session-modules')?{ok:true,profile,modules}:
      (rpcName==='panapass_control_auto_v3'||rpcName==='panapass_unidades_detalle')?(knownUnit?[unit]:[]):
      (rpcName&&Object.hasOwn(rpcFixtures,rpcName))?(options.mode==='panapass-empty'?emptyRpcFixtures[rpcName]:rpcFixtures[rpcName]):
      u.pathname.endsWith('revisados-validator')?{ok:true,rows:[revisado]}:
      u.pathname.endsWith('gps-rym-validator')?{ok:true,rows:[{unidad:'P714',nivel:'OK',gps1:gps,gps2:gps}]}:
      u.pathname.endsWith('ena-consulta-saldo')?{ok:true,results:[{result:'OK',summary:{saldo_texto:'.25'}}]}:
      u.pathname.endsWith('revisados-ficha')?{ok:true,unidad:unit,oficial:revisado}:
      u.pathname.endsWith('gps-rym-admin')?{ok:true,rows:[...Array.from({length:101},()=>({estado_operativo:'ACTIVO',instalados:0,reportando:0})),...Array.from({length:127},()=>({estado_operativo:'ACTIVO',instalados:2,reportando:1}))],kpis:{criticos:101,alertas:127,sin_gps:24}}:
      u.pathname.endsWith('control-auto-resumen-supervisoras')?{ok:true,totals:{activas:1777,paradas:381,abono_adicional:42},rows:[]}:
      u.pathname.endsWith('revisados-final')?{ok:true,rows:[revisado],resumen:{activas:1,cubiertas:1,pendientes:0},galeras:[{galera:'VCARS',activas:1,cubiertas:1,pendientes:0}]}:
      u.pathname.includes('/rest/v1/')?[]:{ok:true,rows:[]};
    if(u.pathname.endsWith('portal-home-resumen')){
      if(options.pilot)portalHomeCalls++;
      if(options.mode==='slow'){const started=Date.now();await new Promise(resolve=>setTimeout(resolve,650));portalHomeDelay=Date.now()-started}
      if(options.pilot&&options.mode==='503-recovery'&&portalHomeCalls===1)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'QA temporal 503'})});
    }
    if(options.mode==='panapass-slow'&&u.pathname.includes('/rest/v1/rpc/'))await new Promise(resolve=>setTimeout(resolve,650));
    if(options.mode==='panapass-503'&&u.pathname.endsWith('/rest/v1/rpc/dashboard_resumen')&&!panapassFailed){panapassFailed=true;return route.fulfill({status:503,contentType:'application/json',body:'{"message":"QA Panapass temporal 503"}'})}
    if(options.mode==='indicator-503'&&u.pathname.endsWith('control-auto-resumen-supervisoras')&&!controlFailed){controlFailed=true;return route.fulfill({status:503,contentType:'application/json',body:'{"message":"QA Control 503"}'})}
    if(options.mode==='indicator-503'&&u.pathname.endsWith('gps-rym-admin')&&!gpsFailed){gpsFailed=true;return route.fulfill({status:503,contentType:'application/json',body:'{"message":"QA GPS 503"}'})}
    return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  if(baseline)await page.route('**/css/portal-executive.css*',r=>r.fulfill({contentType:'text/css',body:''}));
  const startedAt=Date.now();
  await page.goto('http://127.0.0.1:4198/'+(options.pilot?'?vueNext=1':''));
  const loginStyle=await page.locator('.login-card').evaluate(e=>{const s=getComputedStyle(e);return [s.fontFamily,s.padding,s.backgroundColor,s.borderRadius]});
  await page.locator('[name=usuario]').fill('fixture');await page.locator('[name=password]').fill('fixture');await page.locator('#loginBtn').click();
  if(options.probe){
    await page.locator(options.pilot?'[data-testid=vue-next-home]':'#v101ValidatorQ').waitFor();
    if(options.pilot)await page.waitForFunction(()=>document.querySelectorAll('.ryn-kpi strong').length>0);
    else await page.waitForFunction(()=>[...document.querySelectorAll('.v99-kpi strong')].some(el=>el.textContent.trim()!=='—'));
    if(options.pilot){await page.waitForTimeout(300);const indicatorState=await page.locator('[data-indicator]').evaluateAll(els=>els.map(e=>[e.dataset.indicator,e.dataset.state]));assert.ok(indicatorState.every(([,s])=>s==='ready'||s==='error'),`Vue indicators did not settle: ${JSON.stringify({indicatorState,calls:calls.map(x=>x.path),bridge:await page.evaluate(()=>({active:window.__RYM_VUE_NEXT_HOME?.isActive?.(),control:window.__RYM_VUE_NEXT_HOME?.hasControl?.(),main:Object.keys(window.__RYM_VUE_NEXT_HOME_MAIN||{})})),errors})}`)}
    else await page.waitForTimeout(300);
    const values=await page.locator(options.pilot?'.ryn-kpi strong':'.v99-kpi strong').allTextContents();
    const indicatorReads=calls.filter(x=>x.path.endsWith('control-auto-resumen-supervisoras')||x.path.endsWith('gps-rym-admin')).map(x=>x.path.split('/').at(-1));
    const gpsSelector=options.pilot?'.ryn-gps-kpis .ryn-secondary-grid>div':'.v99-module.gps .v99-mini';
    const gpsIndicators=await page.locator(gpsSelector).evaluateAll(els=>els.map(e=>[e.querySelector('span')?.textContent?.trim(),e.querySelector('b')?.textContent?.trim()]));
    const result={values,role,summaryReads:calls.filter(x=>x.path.endsWith('portal-home-resumen')).length,indicatorReads,gpsIndicators,readyMs:Date.now()-startedAt};
    const nav=await page.locator(options.pilot?'.ryn-sidebar nav button':'.v101-nav button').allTextContents();
    result.nav=nav;
    if(options.pilot&&role==='ADMIN_TOTAL')assert.ok(nav.includes('Usuarios'),'ADMIN_TOTAL lost Usuarios access');
    if(options.pilot&&role==='SUPERVISORA')assert.ok(!nav.includes('Usuarios'),'SUPERVISORA gained Usuarios access');
    await context.close();return result;
  }
  if(options.pilot){
    await page.waitForTimeout(1000);
    await page.locator('[data-testid=vue-next-home]').waitFor();
    if(options.preview){
      await page.evaluate(()=>{if(document.getElementById('rym-vue-next-preview-badge'))return;const badge=document.createElement('div');badge.id='rym-vue-next-preview-badge';badge.textContent='VUE NEXT · SANDBOX · FIXTURES';badge.setAttribute('style','position:fixed;top:10px;right:10px;z-index:2147483647;padding:8px 12px;border-radius:999px;background:#102b55;color:#fff;font:700 11px/1.2 system-ui,sans-serif;letter-spacing:.06em;box-shadow:0 4px 16px #102b5540');document.body.append(badge)});
      assert.equal(await page.locator('#rym-vue-next-preview-badge').innerText(),'VUE NEXT · SANDBOX · FIXTURES');
    }
    if(options.mode==='slow')assert.ok(portalHomeDelay>=600,'Slow fixture was not applied');
    if(options.mode!=='503-recovery')await page.locator('.ryn-welcome').waitFor();
    const values=await page.locator('.ryn-kpi strong').allTextContents();
    if(options.mode==='slow'&&options.mainValues)assert.deepEqual(values,options.mainValues,'Pilot KPIs differ from MAIN');
    if(options.mode==='validator'){
      await page.locator('#v101ValidatorQ').fill('P714');await page.locator('.v101-validator-item').first().waitFor({state:'visible'});assert.match(await page.locator('.v101-validator-item').first().innerText(),/P714.*QA714.*1129235/s,'Fixture search result lacks unit identifiers');await page.locator('.v101-validator-item').first().click();
      await page.locator('#v101CheckModal[data-uva-enriched]').waitFor();
      assert.equal(await page.locator('.v117-status-card').count(),4,'MAIN validator checklist differs in Vue pilot');
      await page.locator('#v117CtlCard header').click();
      assert.match(await page.locator('#v117CtlCard').innerText(),/04-55-1458575-3/,'Validator lost canonical Control data');
      assert.equal(calls.some(x=>/panapass-bajas-email|revisados-(?:emitir|emision)|pagos-registrar|archivar/i.test(x.path)),false,'Validator invoked an operational write endpoint');
      await page.locator('#v101CloseCheck').click();
      assert.ok(await page.locator('#v101ValidatorQ').boundingBox(),'Validator search was not restored');
    }
    if(options.mode==='indicator-503'){
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-indicator]')].length===2&&[...document.querySelectorAll('[data-indicator]')].every(e=>e.dataset.state==='error'));
      assert.equal(await page.locator('.ryn-kpi strong').count()>0,true,'Indicator failures hid valid dashboard KPIs');
      await page.locator('.ryn-secondary-kpis button').click();
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-indicator]')].every(e=>e.dataset.state==='ready'));
      assert.deepEqual(['control-auto-resumen-supervisoras','gps-rym-admin'].map(endpoint=>calls.filter(x=>x.path.endsWith(endpoint)).length),[2,2],'Indicator retry did not recover after HTTP 503');
    }
    if(options.mode==='empty'){
      assert.equal(await page.locator('.ryn-kpi strong').first().innerText(),'0');
      assert.equal(await page.getByRole('alert').count(),0);
      await page.evaluate(()=>{const node=document.createElement('i');node.textContent='QA DOM mutation';document.querySelector('#app').append(node)});
      await page.waitForTimeout(250);assert.equal(portalHomeCalls,1,'DOM mutation repeated the home query');
    }
    if(options.mode==='503-recovery'){
      await page.getByRole('alert').waitFor();assert.equal(portalHomeCalls,1);
      await page.getByRole('button',{name:'Reintentar'}).click();await page.waitForTimeout(1000);
      if(await page.locator('.ryn-welcome').count()===0)console.log('Retry diagnostic',JSON.stringify({portalHomeCalls,errors,body:(await page.locator('#app').innerText()).slice(0,300)}));
      await page.locator('.ryn-welcome').waitFor({timeout:5000});
      assert.equal(portalHomeCalls,2,'Retry after 503 did not issue exactly one new request');
    }
    if(options.mode==='navigation'){
      await page.locator('.ryn-module.panapass .ryn-open').click();
      await page.waitForFunction(()=>!document.querySelector('[data-testid=vue-next-home]')&&document.querySelector('#view'),null,{timeout:2500});
      await page.evaluate(()=>window.v36PortalHome());await page.locator('[data-testid=vue-next-home]').waitFor();
      await page.locator('.ryn-module.revisados .ryn-open').click();
      await page.waitForFunction(()=>!document.querySelector('[data-testid=vue-next-home]')&&(document.querySelector('#view')||document.body.classList.contains('v66-revisados')),null,{timeout:2500});
      await page.evaluate(()=>window.v36PortalHome());await page.locator('[data-testid=vue-next-home]').waitFor();
      assert.equal(portalHomeCalls,1,'Fast module return unexpectedly repeated the deduplicated home read');
      assert.equal(calls.some(x=>/panapass-bajas-email|revisados-(?:emitir|emision)|pagos-registrar|archivar/i.test(x.path)),false,'Navigation invoked an operational write endpoint');
    }
    if(['module-flows','panapass-slow','panapass-empty','panapass-503'].includes(options.mode)){
      if(role==='OPERATIVO'){
        assert.equal(await page.locator('.ryn-module.panapass').count(),0,'Restricted role can open Panapass');
        assert.equal(await page.locator('.ryn-validator').count(),0,'Restricted role can access the quick unit validator');
      }else{
      await page.locator('.ryn-module.panapass .ryn-open').click();
      await page.waitForFunction(()=>!document.querySelector('[data-testid=vue-next-home]')&&document.querySelector('#view'));
      if(options.mode==='panapass-slow')await page.locator('#view .rym-skel').first().waitFor({state:'visible'});
      if(options.mode==='panapass-503'){
        await page.locator('#view [data-rym-retry]').waitFor();
        await page.locator('#view [data-rym-retry]').click();
      }
      await page.waitForFunction(()=>document.querySelector('#view .rym-admin-kpi strong')?.textContent.trim()==='1'||document.querySelector('#view [data-rym-ready="1"] .rym-admin-kpi strong')?.textContent.trim()==='0',{timeout:7000}).catch(()=>{});
      await page.locator('#view .rym-admin-kpi strong').first().waitFor();
      const panapass=await page.locator('#view').innerText(),kpis=await page.locator('#view .rym-admin-kpi strong').allTextContents();
      assert.equal(await page.locator('#view .rym-skel').count(),0,'Panapass is still showing loading skeletons');
      if(options.mode==='panapass-empty'){
        assert.ok(kpis.length>=6&&kpis.every(value=>value.trim()==='0'),'Valid empty Panapass response did not render zero values');
        assert.equal(await page.locator('#view [data-rym-retry]').count(),0,'Valid empty response was rendered as an error');
      }else{
        assert.match(panapass,/Unidades activas[\s\S]*?1[\s\S]*?Negativos hoy[\s\S]*?1/i,'Panapass fixture KPIs were not rendered');
        assert.match(panapass,/VCARS[\s\S]*?B\/\. 2\.50/,'Panapass fixture gallery/payment details missing');
      }
      if(options.mode==='panapass-slow')assert.ok(calls.filter(x=>x.path.includes('/rest/v1/rpc/')).length>=5,'Slow Panapass fixture did not load all dashboard sources');
      if(options.mode==='panapass-503')assert.equal(calls.filter(x=>x.path.endsWith('/rpc/dashboard_resumen')).length,2,'Panapass did not recover after a transient 503');
      if(options.mode==='module-flows'){
        await page.evaluate(()=>window.v36PortalHome());await page.locator('[data-testid=vue-next-home]').waitFor();
        await page.locator('.ryn-module.revisados .ryn-open').click();
        await page.waitForFunction(()=>document.body.classList.contains('v66-revisados'));
        await page.evaluate(()=>window.v36PortalHome());await page.locator('[data-testid=vue-next-home]').waitFor();
        await page.locator('.ryn-module.panapass .ryn-open').click();await page.locator('#view .rym-admin-kpi strong').first().waitFor();
        assert.match(await page.locator('#view').innerText(),/VCARS/,'Fast module switching lost the Panapass view');
      }
      if(options.mode==='module-flows'||options.mode==='panapass-slow'||options.mode==='panapass-empty'||options.mode==='panapass-503')await page.evaluate(()=>window.v36PortalHome()).catch(()=>{});
      if(options.mode==='module-flows'){
      await page.evaluate(()=>window.v36PortalHome());await page.locator('[data-testid=vue-next-home]').waitFor();
      const q=page.locator('#v101ValidatorQ');await q.fill('P714');await page.locator('.v101-validator-item').first().waitFor({state:'visible'});
      assert.match(await page.locator('.v101-validator-item').first().innerText(),/P714.*QA714.*1129235/s,'Validator fixture returned no matching unit');
      await page.locator('.v101-validator-item').first().click();await page.locator('#v101CheckModal[data-uva-enriched]').waitFor();await page.waitForFunction(()=>document.querySelector('#v117PanCard')?.innerText.includes('0.25')&&document.querySelector('#v117RevCard')?.innerText.includes('VIGENTE'));
      const ficha=await page.locator('#v101CheckModal').innerText();
      for(const term of ['P714','Empresa QA','0.25','VIGENTE','NORMAL','CONTROL DE AUTO','ACTIVA'])assert.ok(ficha.includes(term),`Validator ficha missing fixture field: ${term}`);
      await page.locator('#v117CtlCard header').click();assert.match(await page.locator('#v117CtlCard').innerText(),/04-55-1458575-3/,'Control detail missing fixture policy');
      await q.fill('NO-FIXTURE-000');await page.waitForTimeout(350);assert.match(await page.locator('#v101ValidatorList').innerText(),/Sin coincidencias/,'Unknown unit unexpectedly matched a fixture');
      assert.equal(await page.locator('#v101CheckModal').count(),1,'Searching in ficha unexpectedly closed the selected unit');
      await page.locator('#v101CloseCheck').click();assert.equal(await page.locator('#v101CheckModal').count(),0);
      assert.equal(calls.some(x=>/panapass-bajas-email|revisados-(?:emitir|emision)|pagos-registrar|archivar/i.test(x.path)),false,'Fixture preview invoked an operational write endpoint');
      console.log('PASS Panapass fixture content and Validator select/ficha/no-match flows');
      }
      }
    }
    if(role==='OPERATIVO'){
      assert.equal(await page.locator('.ryn-sidebar nav button').allTextContents().then(x=>x.join('|')),'Inicio');
      assert.equal(await page.locator('.ryn-module').count(),0);
    }
    if(role==='SUPERVISORA')assert.equal((await page.locator('.ryn-sidebar nav button').allTextContents()).filter(x=>x==='Usuarios').length,0);
    if(role==='ADMIN_TOTAL')assert.equal((await page.locator('.ryn-sidebar nav button').allTextContents()).filter(x=>x==='Usuarios').length,1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Vue home overflows viewport');
    const expectedErrors=options.mode==='503-recovery'||options.mode==='panapass-503'?1:options.mode==='indicator-503'?2:0;
    assert.equal(failed.filter(x=>x.startsWith('503 ')).length,expectedErrors);
    assert.deepEqual(errors.filter(x=>!(['503-recovery','indicator-503','panapass-503'].includes(options.mode)&&x.includes('503 (Service Unavailable)'))),[],'Unexpected JavaScript/console error');
    await page.screenshot({path:path.join(output,`vue-next-${role}-${width}-${options.mode||'normal'}.png`),fullPage:true});
    if(options.preview){
      console.log('Preview open: http://127.0.0.1:4198/?vueNext=1 · remote requests are fixture-served or blocked; no production network access. Press Enter here to close.');
      process.stdin.resume();await new Promise(resolve=>process.stdin.once('data',resolve));
    }
    await context.close();console.log(`PASS Vue pilot ${role} ${width}x${height} ${options.mode||'normal'} · ${portalHomeCalls} home read(s)`);
    return {values,role,portalHomeCalls};
  }
  await page.locator('#v101ValidatorQ').waitFor();await page.waitForTimeout(1000);await page.evaluate(()=>document.fonts.ready);
  const access=await page.locator('.v99-module>button,.v101-nav button,#v115MobileNav button').evaluateAll(els=>els.map(e=>[e.id,e.dataset.a||'',e.disabled]));
  assert.equal(await page.locator('.v101-side').isVisible(),width>1000);
  assert.ok(await page.locator('.v99-module.pan').count());
  if(!baseline){
    assert.match(await page.locator('.v101-content').evaluate(e=>getComputedStyle(e).fontFamily),/^"RYM Executive Inter"/);
    assert.equal(await page.evaluate(()=>document.fonts.check('400 14px "RYM Executive Inter"')&&document.fonts.check('700 20px "RYM Executive Inter"')),true);
    assert.equal(await page.locator('.v99-module.pan').evaluate(e=>getComputedStyle(e).borderRadius),'24px');
    if(width>=1100){
      const rows=await page.locator('.v99-grid>.v99-module').evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().top)));
      assert.equal(new Set(rows).size,1,'Desktop modules must share one row');
      assert.equal(await page.locator('.v99-modicon').first().isVisible(),true,'System icon missing');
    }
    assert.ok((await page.locator('#v101ValidatorGo').boundingBox()).width>=140,'Validator button squeezed');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Home overflows '+width);
    const clipped=await page.locator('.v99-module h4,.v99-mini b,.v101-greeting h2,.v99-alert b').evaluateAll(els=>els.filter(e=>e.getClientRects().length&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent));
    assert.deepEqual(clipped,[],'Clipped home labels');
    assert.deepEqual(await page.locator('.v99-mini b').evaluateAll(els=>els.filter(e=>e.getClientRects().length&&e.scrollHeight>parseFloat(getComputedStyle(e).lineHeight)+2).map(e=>e.textContent)),[],'Metrics split across lines');
    await page.screenshot({path:path.join(output,`home-${role}-${width}.png`),fullPage:true});
  }
  await page.locator('#v101ValidatorQ').fill('P714');await page.locator('#v101ValidatorQ').press('Enter');
  await page.locator('#v101CheckModal[data-uva-enriched]').waitFor();await page.locator('#v117GpsCard:not(.pending)').waitFor();
  const values=await page.locator('.v117-card-value').allTextContents();
  assert.equal(await page.locator('.v117-status-card').count(),4);
  await page.locator('#v117CtlCard header').click();assert.match(await page.locator('#v117CtlCard').innerText(),/04-55-1458575-3/);
  await page.locator('#v117CtlCard header').click();
  if(!baseline){
    const box=await page.locator('.v117-check-card').boundingBox();
    assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,'Modal bounds');
    assert.equal(await page.locator('.v117-check-card').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,'Modal overflow');
    await page.screenshot({path:path.join(output,`validator-${role}-${width}.png`)});
  }
  if(baseline)await page.locator('#v101CloseCheck').evaluate(e=>e.click());else await page.locator('#v101CloseCheck').click();assert.equal(await page.locator('#v101CheckModal').count(),0);
  if(!baseline){
    await page.locator('#v101ValidatorQ').fill('P71');await page.locator('.v101-validator-item').first().waitFor({state:'visible'});await page.locator('.v101-validator-item').first().click();await page.locator('#v101CheckModal[data-uva-enriched]').waitFor();
    assert.equal(await page.locator('#v101CheckModal #v101ValidatorQ').count(),1,'Existing search input was not moved into the modal');assert.equal(await page.locator('#v101CheckModal .v101-modal-results #v101ValidatorList').count(),1,'Existing match list was not moved into the result column');await page.locator('#v101CheckModal #v101ValidatorQ').fill('P714');await page.locator('#v101CheckModal .v101-modal-results .v101-validator-item').first().waitFor({state:'visible'});assert.equal(await page.evaluate(()=>document.activeElement?.id==='v101ValidatorQ'),true,'Search focus was lost when opening the modal');await page.locator('#v101CheckModal .v101-modal-results .v101-validator-item').first().click();await page.locator('#v101CheckModal[data-uva-enriched]').waitFor();
    await page.locator('#v101CloseCheck').click();assert.equal(await page.locator('#v101CheckModal').count(),0);
  }
  await page.locator('#v101ValidatorGo').click();await page.locator('#v101CheckModal[data-uva-enriched]').waitFor();
  if(baseline)await page.locator('#v101AgainCheck').evaluate(e=>e.click());else await page.locator('#v101AgainCheck').click();assert.equal(await page.locator('#v101CheckModal').count(),0);
  const returnedSearch=await page.evaluate(()=>{const e=document.querySelector('#v101ValidatorQ');return e?{parent:e.parentElement?.className,connected:e.isConnected,rect:e.getBoundingClientRect().toJSON(),html:e.parentElement?.outerHTML.slice(0,500)}:null});assert.ok(returnedSearch?.rect.width>0,'Validator search was not restored: '+JSON.stringify(returnedSearch));
  const validatorCalls=calls.filter(x=>/revisados-validator|gps-rym-validator|ena-consulta-saldo|revisados-ficha/.test(x.path));
  const navigation=[];
  if(width===1440){
    for(const [selector,label] of [['#v99Pan','Panapass'],['#v99Rev','Revisados'],['#v99Control','Control de Auto'],['.v99-module.gps>button','GPS']]){
      await page.locator(selector).click();
      await page.waitForFunction(()=>!document.body.classList.contains('v99-home'));
      await page.waitForTimeout(600);
      const state=await page.evaluate(()=>({classes:document.body.className,title:document.querySelector('h1,h2')?.textContent,alerts:[...document.querySelectorAll('.alert')].map(e=>e.textContent)}));
      assert.deepEqual(state.alerts,[],label+' failed to load');
      navigation.push({label,...state});
      // The new stylesheet must not alter the internal modules' computed styles.
      const sample=()=>[...document.querySelectorAll('body,#app,main,aside,h1,h2,button,input')].slice(0,40).map(e=>{const s=getComputedStyle(e);return [s.fontFamily,s.fontSize,s.color,s.backgroundColor,s.display,s.padding,s.borderRadius]});
      const styled=await page.evaluate(sample);
      await page.locator('link[href*="portal-executive.css"]').evaluate(e=>e.disabled=true);
      assert.deepEqual(await page.evaluate(sample),styled,label+' neighboring module changed');
      await page.locator('link[href*="portal-executive.css"]').evaluate(e=>e.disabled=false);
      await page.evaluate(()=>window.v36PortalHome());await page.locator('#v101ValidatorQ').waitFor();await page.waitForTimeout(350);
    }
    await page.locator('#v117TopLogout').click();await page.locator('#loginBtn').waitFor();
    console.log('PASS four module accesses, unchanged internal styles and logout: '+role);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const result={role,width,height,baseline,access,values,validatorCalls,loginStyle,navigation,errors,failed};report.push(result);
  await context.close();console.log(`PASS ${baseline?'baseline':'Executive'} ${role} ${width}x${height}`);return result;
}
try{
  if(process.argv.includes('--vue-next')||process.argv.includes('--vue-next-nav')||process.argv.includes('--vue-next-503')||process.argv.includes('--vue-next-mobile')||process.argv.includes('--vue-next-flows')||process.argv.includes('--vue-next-panapass')||interactivePreview){
    if(interactivePreview)await run('ADMIN_TOTAL',1440,900,false,{pilot:true,preview:true,mode:'slow'});
    if(process.argv.includes('--vue-next')){
      for(const role of ['ADMIN_TOTAL','SUPERVISORA']){
        const main=await run(role,1440,900,true,{probe:true,mode:'slow'});
        const pilot=await run(role,1440,900,false,{pilot:true,probe:true,mode:'slow'});
        assert.deepEqual(pilot.values,main.values,`${role} KPI parity against MAIN`);
        if(role==='ADMIN_TOTAL'){
          assert.deepEqual(pilot.gpsIndicators.slice(0,2),main.gpsIndicators.slice(0,2),`${role} GPS critical/alert parity against MAIN`);
          assert.deepEqual(pilot.gpsIndicators.slice(2),[['Pendientes hoy','228'],['Sin GPS','24']],`${role} GPS pending and no-signal indicators`);
        }
        for(const endpoint of ['control-auto-resumen-supervisoras','gps-rym-admin']){
          const baselineCount=main.indicatorReads.filter(x=>x===endpoint).length,pilotCount=pilot.indicatorReads.filter(x=>x===endpoint).length;
          assert.ok(pilotCount<=baselineCount,`${role} Vue duplicated ${endpoint} relative to MAIN (${pilotCount} vs ${baselineCount})`);
          assert.ok(pilotCount<=1,`${role} Vue repeated ${endpoint} without invalidation`);
        }
        console.log(`PARIDAD ${role}: KPI iguales; resumen MAIN/Vue ${main.summaryReads}/${pilot.summaryReads}; consultas secundarias ${main.indicatorReads.length}/${pilot.indicatorReads.length}; carga ${main.readyMs}/${pilot.readyMs} ms (fixture 650 ms)`);
      }
    }
    if(process.argv.includes('--vue-next')||process.argv.includes('--vue-next-nav'))await run('ADMIN_TOTAL',1440,900,false,{pilot:true,mode:'navigation'});
    if(process.argv.includes('--vue-next-503'))await run('ADMIN_TOTAL',1440,900,false,{pilot:true,mode:'503-recovery'});
    if(process.argv.includes('--vue-next-mobile'))await run('ADMIN_TOTAL',390,844,false,{pilot:true,mode:'slow'});
    if(process.argv.includes('--vue-next-flows')){
      for(const role of ['ADMIN_TOTAL','SUPERVISORA'])await run(role,1440,900,false,{pilot:true,mode:'module-flows'});
      await run('OPERATIVO',390,844,false,{pilot:true,mode:'module-flows'});
    }
    if(process.argv.includes('--vue-next-panapass')){
      await run('ADMIN_TOTAL',1440,900,false,{pilot:true,mode:'panapass-slow'});
      await run('ADMIN_TOTAL',1440,900,false,{pilot:true,mode:'panapass-empty'});
      await run('ADMIN_TOTAL',1440,900,false,{pilot:true,mode:'panapass-503'});
    }
    if(process.argv.includes('--vue-next')){
      await run('ADMIN_TOTAL',1440,900,false,{pilot:true,mode:'validator'});
      await run('SUPERVISORA',1440,900,false,{pilot:true,mode:'validator'});
      await run('ADMIN_TOTAL',1440,900,false,{pilot:true,mode:'empty'});
      await run('ADMIN_TOTAL',1440,900,false,{pilot:true,mode:'indicator-503'});
      await run('ADMIN_TOTAL',1440,900,false,{pilot:true,mode:'503-recovery'});
      await run('OPERATIVO',390,844,false,{pilot:true,mode:'slow'});
      await run('ADMIN_TOTAL',390,844,false,{pilot:true,mode:'slow'});
    }
    console.log('PASS Vue pilot directed scenario.');
  }else{
    for(const role of ['ADMIN_TOTAL','SUPERVISORA']){
      const before=await run(role,1440,900,true),after=await run(role,1440,900);
      for(const key of ['access','values','loginStyle','navigation'])assert.deepEqual(after[key],before[key],key+' changed');
      assert.deepEqual([...new Set(after.validatorCalls.map(x=>JSON.stringify(x)))].sort(),[...new Set(before.validatorCalls.map(x=>JSON.stringify(x)))].sort(),'Validator request endpoint/body changed');
    }
    for(const [width,height] of [[360,800],[390,844],[768,1024],[1024,768],[1136,872],[1280,800],[1304,1000],[1920,1080]])await run('ADMIN_TOTAL',width,height);
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
    console.log('PASS baseline parity: login presentation, role-based controls, result values and Validator request bodies. Artifacts: '+output);
  }
}finally{await browser.close();if(!reusePreviewServer)await new Promise(resolve=>server.close(resolve))}
