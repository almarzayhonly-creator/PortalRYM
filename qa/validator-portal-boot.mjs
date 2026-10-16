import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'C:/Users/almar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('worker.js','utf8')).toString('base64'))).default;
const server=http.createServer(async(req,res)=>{try{
 const r=await worker.fetch(new Request('http://127.0.0.1:4197'+req.url),{ASSETS:{fetch:async request=>{
  const u=new URL(request.url),f=u.pathname==='/'?'index.html':u.pathname.slice(1);
  const content=fs.readFileSync(f);
  return new Response(content,{headers:{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.css')?'text/css':'text/javascript'}});
 }}});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));
}catch(e){res.writeHead(500);res.end(String(e))}});
await new Promise(r=>server.listen(4197,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{for(const role of ['SUPERVISORA','ADMIN_TOTAL']){
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}}),page=await context.newPage(),calls=[],errors=[];
 const profile={id:'fixture-user',nombre:'Fixture',rol:role,activo:true},modules=['dashboard','control_auto.validador_unidad_app'];
 const unit={unidad:'P714',placa_unica:'QA714',estatus:'ACTIVO',panapass_numero:'1129235',empresa_duena:'QA',nro_poliza:'04-55-1458575-3'};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',async route=>{
  const u=new URL(route.request().url());if(u.hostname!=='avczyvcpmicpuhdkmxzx.supabase.co')return route.abort();calls.push(u.pathname);
  const gps={installed:true,ok:true,last:'2026-10-16T18:00:00Z'};
  const data=u.pathname.endsWith('auth-username')?{ok:true,access_token:'fixture-only',profile,modules}:
   u.pathname.endsWith('portal-home-resumen')?{ok:true,profile,modules,alerts:[]}:
   u.pathname.endsWith('portal-session-modules')?{ok:true,profile,modules}:
   u.pathname.includes('/rpc/')?[unit]:
   u.pathname.endsWith('revisados-validator')?{ok:true,rows:[{unidad:'P714',estado:'VIGENTE',emitido:true,status2:'ACTIVO'}]}:
   u.pathname.endsWith('gps-rym-validator')?{ok:true,rows:[{unidad:'P714',nivel:'OK',gps1:gps,gps2:gps}]}:
   u.pathname.endsWith('ena-consulta-saldo')?{ok:true,results:[{result:'OK',summary:{saldo_texto:'.25'}}]}:
   u.pathname.endsWith('revisados-ficha')?{ok:true,unidad:unit,oficial:null}:u.pathname.includes('/rest/v1/')?[]:{ok:true};
  return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:4197/');await page.locator('[name=usuario]').fill('fixture');await page.locator('[name=password]').fill('fixture');await page.locator('#loginBtn').click();
 await page.locator('#v101ValidatorQ').waitFor();await page.waitForTimeout(500);
 await page.locator('#v101ValidatorQ').fill('P714');await page.locator('#v101ValidatorQ').press('Enter');
 await page.locator('#v101CheckModal[data-uva-enriched]').waitFor();await page.locator('#v117GpsCard:not(.pending)').waitFor();
 assert.equal(await page.locator('.v117-status-card').count(),4);await page.locator('#v117CtlCard header').click();assert.match(await page.locator('#v117CtlCard').innerText(),/04-55-1458575-3/);
 assert.equal(calls.filter(p=>p.endsWith('gps-rym-validator')).length,1);assert.equal(calls.filter(p=>p.endsWith('revisados-ficha')).length,1);assert.equal(calls.filter(p=>p.endsWith('revisados-validator')).length,1);
 assert.deepEqual(errors,[]);await page.locator('#v101CloseCheck').click();assert.equal(await page.locator('.v101-side').isVisible(),true);assert.equal(await page.locator('.v101-content').isVisible(),true);
 console.log('PASS actual integrated Portal login, original session, four cards and return home: '+role);await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r))}
