import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'C:/Users/almar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const harness=fs.readFileSync('qa/validator-tablet-responsive.mjs','utf8');
const makeFixture=policy=>new Function('fs','path','process',harness.slice(harness.indexOf('const root='),harness.indexOf('const worker=')).replace("unidad:'QA200'","unidad:'P714',nro_poliza:"+JSON.stringify(policy))+ ';return fixture();')(fs,path,process);
const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('worker.js','utf8')).toString('base64'))).default;
let policy='04-55-1458575-3';
const server=http.createServer(async(req,res)=>{
  try{
    const response=await worker.fetch(new Request('http://127.0.0.1:4195'+req.url),{ASSETS:{fetch:async request=>{
      const u=new URL(request.url);
      if(u.pathname==='/')return new Response(u.searchParams.has('validator-host')?makeFixture(policy).replace('class="v99-home"',''):makeFixture(policy),{headers:{'content-type':'text/html; charset=utf-8'}});
      const file=u.pathname.slice(1),type=file.endsWith('.css')?'text/css':'text/javascript';
      return new Response(fs.readFileSync(file),{headers:{'content-type':type}});
    }}});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(e){res.writeHead(500);res.end(String(e))}
});
await new Promise(resolve=>server.listen(4195,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report=[];
try{
  for(const width of [390,768,1440])for(const value of ['04-55-1458575-3',null]){
    policy=value;const results=[];
    for(const dedicated of [true,false]){
      const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.clock.setFixedTime(new Date('2026-10-16T18:00:00Z'));
      await page.route('**/modules/core/{dashboard-payments-enhance,panapass-ranking-criteria-final,panapass-negativos-ultima-consulta,unit-validator-launcher}.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
      await page.setContent(makeFixture(policy).replace(/<script>[\s\S]*?<\/script>/g,''));
      const neighbors=await page.evaluate(()=>['.v101-side','.v99-grid'].map(q=>getComputedStyle(document.querySelector(q)).display));
      await page.goto('http://127.0.0.1:4195/'+(dedicated?'?validator-host=1':''));
      const searchStyles=await page.locator('.v101-validator').evaluate(root=>[root,...root.querySelectorAll('*')].map(el=>{const s=getComputedStyle(el);return [el.tagName,el.className,s.display,s.color,s.backgroundColor,s.fontFamily,s.fontSize,s.fontWeight,s.borderRadius]}));
      await page.locator('#v101ValidatorQ').fill('P714');await page.locator('#v101ValidatorQ').press('Enter');
      await page.locator('#v101CheckModal[data-uva-enriched]').waitFor();
      await page.locator('#v117GpsCard:not(.pending)').waitFor();
      await page.locator('#v117PanCard:not(.pending)').waitFor();
      assert.equal(await page.locator('.v117-status-card').count(),4);
      const control=page.locator('#v117CtlCard');await control.locator('header').click();
      assert.match(await control.innerText(),new RegExp(value||'Sin póliza registrada'));
      assert.match(await control.innerText(),/PÓLIZA NETSUITE/i);
      assert.equal(await page.locator('#v101CheckModal').evaluate(x=>x.scrollWidth>innerWidth),false);
      await page.waitForFunction(()=>[...document.querySelectorAll('.v117-status-card')].every(c=>c.getAttribute('aria-expanded')===String(c.querySelector(':scope > details').open)));
      const result=await page.locator('#v101CheckModal').evaluate(modal=>({
        html:modal.innerHTML,
        styles:[...modal.querySelectorAll('*')].map(el=>{const s=getComputedStyle(el);return [el.tagName,el.className,s.display,s.color,s.backgroundColor,s.fontFamily,s.fontSize,s.fontWeight,s.gridTemplateColumns,s.borderRadius]}),
        calls:QA.calls.filter(x=>x.name||/gps-rym-validator|ena-consulta-saldo|revisados-ficha|revisados-validator/.test(x.url)).map(x=>x.name?{name:x.name,args:x.args}:{url:x.url}).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
      }));
      result.searchStyles=searchStyles;
      assert.equal(result.calls.filter(x=>x.name==='panapass_control_auto_v3'&&x.args.p_limit===10).length,1);
      if(!dedicated)assert.deepEqual(await page.evaluate(()=>['.v101-side','.v99-grid'].map(q=>getComputedStyle(document.querySelector(q)).display)),neighbors,'Portal neighbors changed');
      assert.deepEqual(errors,[]);
      await page.screenshot({path:'.sandbox/validator-qa/parity-'+width+'-'+dedicated+'-'+!!value+'.png',fullPage:true});
      await control.focus();await control.press('Space');assert.equal(await control.locator(':scope > details').evaluate(x=>x.open),false);
      await control.press('Enter');assert.equal(await control.locator(':scope > details').evaluate(x=>x.open),true);
      results.push(result);await context.close();
    }
    fs.writeFileSync('.sandbox/validator-qa/parity-debug.json',JSON.stringify(results));
    for(const key of ['html','styles','calls','searchStyles']){
      const a=JSON.stringify(results[0][key]),b=JSON.stringify(results[1][key]);
      if(a!==b){let i=0;while(a[i]===b[i])i++;throw Error(key+' differs at '+i+' dedicated='+a.slice(Math.max(0,i-80),i+160)+' integrated='+b.slice(Math.max(0,i-80),i+160))}
    }
    report.push({width,policy:value||'missing',parity:true});console.log('PASS parity '+width+' policy='+!!value);
  }
  fs.writeFileSync('.sandbox/validator-qa/parity.json',JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
