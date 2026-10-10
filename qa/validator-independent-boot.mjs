import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/almar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('worker.js','utf8')).toString('base64'))).default;
const server=http.createServer(async(req,res)=>{
  try{
    const response=await worker.fetch(new Request('http://127.0.0.1:4192'+req.url),{ASSETS:{fetch:async request=>{
      const pathname=new URL(request.url).pathname;
      const file=pathname==='/'?'index.html':pathname==='/unit-validator'?'unit-validator.html':pathname.slice(1);
      const type=file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/javascript';
      return new Response(fs.readFileSync(path.resolve(file)),{headers:{'content-type':type}});
    }}});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.writeHead(500);res.end(error.message)}
});
await new Promise(resolve=>server.listen(4192,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  const results=[];
  for(const [name,role,extra,password,denied] of [
    ['Manuel Chavez','OPERATIVO',[],false,false],
    ['Yhonly Almarza','ADMIN_TOTAL',['portal.panapass','portal.revisados','gps.ver','admin.usuarios'],false,false],
    ['Cambio obligatorio','ADMIN_TOTAL',[],true,false],
    ['Sin permiso','OPERATIVO',[],false,true]
  ]){
    const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
    const page=await context.newPage(),calls=[],errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.hostname!=='avczyvcpmicpuhdkmxzx.supabase.co'){await route.abort();return}
      calls.push(url.pathname);
      const profile={id:'fixture-user',nombre:name,rol:role,activo:true,must_change_password:password};
      const unit={unidad:'QA100',placa_unica:'QA-PLATE',estatus:'ACTIVO',panapass_numero:'1129235',empresa_duena:'QA',mes_revisado:'OCTUBRE'};
      const gps={installed:true,ok:true,last:new Date().toISOString()};
      const data=url.pathname.endsWith('auth-username')?{ok:true,access_token:'fixture-access',profile,modules:extra}:
        url.pathname.endsWith('portal-session-modules')?{ok:true,profile,modules:denied?extra:['control_auto.validador_unidad_app',...extra]}:null;
      const result=data|| (url.pathname.includes('/rpc/')?[unit]:
        url.pathname.endsWith('revisados-validator')?{ok:true,rows:[{unidad:'QA100',estado:'VIGENTE',emitido:true,status2:'ACTIVO'}]}:
        url.pathname.endsWith('gps-rym-validator')?{ok:true,rows:[{unidad:'QA100',estado_operativo:'ACTIVO',nivel:'OK',gps1:gps,gps2:gps}]}:
        url.pathname.endsWith('ena-consulta-saldo')?{ok:true,results:[{result:'OK',summary:{saldo_texto:'0.25'}}]}:
        url.pathname.endsWith('revisados-ficha')?{ok:true,unidad:unit,oficial:null}:
        url.pathname.includes('/rest/v1/')?[]:null);
      await route.fulfill({status:result?200:500,contentType:'application/json',body:JSON.stringify(result||{error:'Unexpected request'})});
    });
    await page.goto('http://127.0.0.1:4192/?app=validador-unidad');
    const host=page.frameLocator('#portal');await host.locator('#f').waitFor();
    assert.deepEqual(calls,[],'Guest bootstrap sent API calls');
    await host.locator('[name=usuario]').fill('fixture');await host.locator('[name=password]').fill('fixture-password');
    await host.locator('#loginBtn').click();
    await host.locator(password?'#pc':denied?'.uva-denied':'#v101ValidatorQ').waitFor();
    await page.waitForTimeout(1700);
    assert.deepEqual(calls,['/functions/v1/auth-username','/functions/v1/portal-session-modules'],name+' loaded Portal data');
    assert.deepEqual(errors,[],name+' page errors');
    if(password)assert.equal(await host.locator('#v101ValidatorQ').count(),0,'Mandatory password change bypassed');
    if(!password&&!denied){
      await host.locator('#v101ValidatorQ').fill('QA100');await host.locator('#v101ValidatorQ').press('Enter');
      await host.locator('#v101CheckModal[data-uva-enriched]').waitFor();
      await host.locator('#v117GpsCard:not(.pending)').waitFor();
      assert.equal(await host.locator('.v117-status-card').count(),4);assert.equal(await host.locator('.uva-gps-pill').count(),2);
      assert.equal(calls.filter(url=>url.endsWith('revisados-validator')).length,1);
      assert.ok(!calls.some(url=>/portal-home-resumen|revisados-final|gps-rym-admin/.test(url)));
      assert.deepEqual(errors,[]);
    }
    results.push({profile:name,role,requests:calls,verified:true});await context.close();
  }
  fs.mkdirSync('.sandbox/validator-qa',{recursive:true});
  fs.writeFileSync('.sandbox/validator-qa/independent-boot.json',JSON.stringify({kind:'Actual dedicated host and mocked authentication; no account impersonation',results},null,2));
  console.log('PASS independent validator: basic/full same two auth calls; no home/fleet/module requests; mandatory password and denied access preserved.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
