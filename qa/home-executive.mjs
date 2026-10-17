// Real portal + existing Worker; all remote data is isolated in QA fixtures.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'C:/Users/almar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=process.env.QA_ARTIFACT_DIR||path.join(os.tmpdir(),'rym-home-executive');
fs.mkdirSync(output,{recursive:true});
const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('worker.js','utf8')).toString('base64'))).default;
const server=http.createServer(async(req,res)=>{try{
  const response=await worker.fetch(new Request('http://127.0.0.1:4198'+req.url),{ASSETS:{fetch:async request=>{
    const u=new URL(request.url),file=u.pathname==='/'?'index.html':u.pathname.slice(1);
    const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.woff2')?'font/woff2':file.endsWith('.png')?'image/png':'text/javascript';
    return new Response(fs.readFileSync(file),{headers:{'content-type':type}});
  }}});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch(e){res.writeHead(500);res.end(String(e))}});
await new Promise(resolve=>server.listen(4198,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report=[];
async function run(role,width,height,baseline=false){
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width,height}}),page=await context.newPage();
  const calls=[],errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url())});
  const profile={id:'fixture-user',nombre:'Usuario QA',rol:role,activo:true};
  const modules=role==='OPERATIVO'?['dashboard']:['dashboard','portal.panapass','portal.revisados','portal.control_auto','control_auto.unidades','portal.gps','gps.dashboard','control_auto.validador_unidad_app'];
  const unit={unidad:'P714',placa_unica:'QA714',estatus:'ACTIVO',panapass_numero:'1129235',empresa_duena:'Empresa QA',nro_poliza:'04-55-1458575-3'};
  const summary={ok:true,profile,modules,generated_at:'2026-10-17T13:00:00Z',panapass:{negativos_hoy:126,pagos_hoy:16,monto_mes:611.01,bajas:{pendientes:13,procesadas:20,devoluciones:0}},revisados:{pendientes:268,criticos:4,emitidos_hoy:6,limite_hoy:33},control:{activas:1777,otros:381,cerradas:12},alerts:[{level:'bad',title:'13 activas sin Panapass asignado',text:'Datos de prueba; sin acceso a producción.'},{level:'warning',title:'20 bajas procesadas por ENA',text:'Seguimiento de conciliación externa.'},{level:'bad',title:'4 revisados críticos',text:'Pendientes dentro del alcance del perfil.'}]};
  await page.route('https://**/*',async route=>{
    const request=route.request(),u=new URL(request.url());
    if(u.hostname==='drive.google.com')return route.fulfill({contentType:'image/png',body:fs.readFileSync('assets/rym-logo.png')});
    assert.equal(u.hostname,'avczyvcpmicpuhdkmxzx.supabase.co','Unexpected remote request');
    calls.push({path:u.pathname,body:request.postData()});
    const gps={installed:true,ok:true,last:'2026-10-17T13:00:00Z'};
    const data=u.pathname.endsWith('auth-username')?{ok:true,access_token:'fixture-only',profile,modules}:
      u.pathname.endsWith('portal-home-resumen')?summary:
      u.pathname.endsWith('portal-session-modules')?{ok:true,profile,modules}:
      u.pathname.includes('/rpc/')?[unit]:
      u.pathname.endsWith('revisados-validator')?{ok:true,rows:[{unidad:'P714',estado:'VIGENTE',emitido:true,status2:'ACTIVO'}]}:
      u.pathname.endsWith('gps-rym-validator')?{ok:true,rows:[{unidad:'P714',nivel:'OK',gps1:gps,gps2:gps}]}:
      u.pathname.endsWith('ena-consulta-saldo')?{ok:true,results:[{result:'OK',summary:{saldo_texto:'.25'}}]}:
      u.pathname.endsWith('revisados-ficha')?{ok:true,unidad:unit,oficial:null}:
      u.pathname.endsWith('gps-rym-admin')?{ok:true,rows:[],kpis:{criticos:101,alertas:127,sin_gps:24}}:
      u.pathname.endsWith('control-auto-resumen-supervisoras')?{ok:true,totals:{activas:1777,paradas:381,abono_adicional:42},rows:[]}:
      u.pathname.endsWith('revisados-final')?{ok:true,rows:[],resumen:{},galeras:[]}:
      u.pathname.includes('/rest/v1/')?[]:{ok:true,rows:[]};
    return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  if(baseline)await page.route('**/css/portal-executive.css*',r=>r.fulfill({contentType:'text/css',body:''}));
  await page.goto('http://127.0.0.1:4198/');
  const loginStyle=await page.locator('.login-card').evaluate(e=>{const s=getComputedStyle(e);return [s.fontFamily,s.padding,s.backgroundColor,s.borderRadius]});
  await page.locator('[name=usuario]').fill('fixture');await page.locator('[name=password]').fill('fixture');await page.locator('#loginBtn').click();
  await page.locator('#v101ValidatorQ').waitFor();await page.waitForTimeout(1000);await page.evaluate(()=>document.fonts.ready);
  const access=await page.locator('.v99-module>button,.v101-nav button,#v115MobileNav button').evaluateAll(els=>els.map(e=>[e.id,e.dataset.a||'',e.disabled]));
  assert.equal(await page.locator('.v101-side').isVisible(),width>1000);
  assert.ok(await page.locator('.v99-module.pan').count());
  if(!baseline){
    assert.match(await page.locator('.v101-content').evaluate(e=>getComputedStyle(e).fontFamily),/^"RYM Executive Inter"/);
    assert.equal(await page.evaluate(()=>document.fonts.check('400 14px "RYM Executive Inter"')&&document.fonts.check('700 20px "RYM Executive Inter"')),true);
    assert.equal(await page.locator('.v99-module.pan').evaluate(e=>getComputedStyle(e).borderRadius),'12px');
    assert.ok((await page.locator('#v101ValidatorGo').boundingBox()).width>=140,'Validator button squeezed');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Home overflows '+width);
    const clipped=await page.locator('.v99-module h4,.v99-mini b,.v101-greeting h2,.v99-alert b').evaluateAll(els=>els.filter(e=>e.getClientRects().length&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent));
    assert.deepEqual(clipped,[],'Clipped home labels');
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
  await page.locator('#v101CloseCheck').click();assert.equal(await page.locator('#v101CheckModal').count(),0);
  await page.locator('#v101ValidatorGo').click();await page.locator('#v101CheckModal[data-uva-enriched]').waitFor();
  await page.locator('#v101AgainCheck').click();assert.equal(await page.locator('#v101CheckModal').count(),0);
  assert.equal(await page.locator('#v101ValidatorQ').isVisible(),true);
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
  for(const role of ['ADMIN_TOTAL','SUPERVISORA']){
    const before=await run(role,1440,900,true),after=await run(role,1440,900);
    for(const key of ['access','values','validatorCalls','loginStyle','navigation'])assert.deepEqual(after[key],before[key],key+' changed');
  }
  for(const [width,height] of [[360,800],[390,844],[768,1024],[1024,768],[1280,800],[1920,1080]])await run('ADMIN_TOTAL',width,height);
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS baseline parity: login presentation, role-based controls, result values and Validator request bodies. Artifacts: '+output);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
