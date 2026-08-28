const { chromium } = require('playwright');
const fs=require('fs');const path=require('path');
const URL=process.env.QA_URL, EMAIL=process.env.QA_EMAIL, PASSWORD=process.env.QA_PASSWORD;
if(!URL||!EMAIL||!PASSWORD) throw new Error('QA env missing');
const out=path.join(process.cwd(),'qa-targeted-results');fs.mkdirSync(out,{recursive:true});
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
async function visible(loc){for(let i=0;i<await loc.count();i++)if(await loc.nth(i).isVisible().catch(()=>false))return loc.nth(i);return null}
async function login(page){
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForTimeout(700);
  const p=await visible(page.locator('input[type=password]'));
  if(p){const u=await visible(page.locator('input[type=email],input[placeholder*="usuario" i],input[placeholder*="correo" i],input[type=text]'));if(!u)throw new Error('Login user field not found');await u.fill(EMAIL);await p.fill(PASSWORD);const b=await visible(page.getByRole('button',{name:/iniciar sesion|iniciar sesión|ingresar|entrar/i}));if(b)await b.click();else await p.press('Enter');}
  await page.waitForFunction(()=>{const pw=[...document.querySelectorAll('input[type=password]')].some(e=>{const r=e.getBoundingClientRect();return r.width&&r.height});const txt=(document.body.innerText||'').toUpperCase();return !pw&&typeof window.v70OpenControl==='function'&&(/CONTROL DE AUTO|PANAPASS|REVISADOS|PORTAL RYM/.test(txt));},null,{timeout:60000});await page.waitForTimeout(1500);
}
async function snap(page){return page.evaluate(()=>{const vis=e=>{const r=e.getBoundingClientRect();return r.width&&r.height};const nav=[...document.querySelectorAll('button,a,[role=tab],[role=button]')].filter(vis).map(e=>({text:(e.innerText||e.textContent||'').trim().replace(/\s+/g,' '),cls:String(e.className||''),id:e.id||'',aria:e.getAttribute('aria-selected')||''})).filter(x=>x.text).slice(0,100);return {bodyClass:document.body.className,headings:[...document.querySelectorAll('h1,h2,h3')].filter(vis).map(e=>(e.innerText||'').trim()).slice(0,20),active:nav.filter(x=>/\bactive\b/.test(x.cls)||x.aria==='true').slice(0,20),text:(document.body.innerText||'').replace(/\s+/g,' ').slice(0,8000),guard:!!document.querySelector('#v170ControlRouteGuard'),sw:document.documentElement.scrollWidth,iw:innerWidth};})}
async function clickTab(page,label){const target=norm(label);return page.evaluate(target=>{const n=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();const vis=e=>{const r=e.getBoundingClientRect();return r.width&&r.height};const els=[...document.querySelectorAll('button,a,[role=tab],[role=button]')].filter(vis);let el=els.find(e=>n(e.innerText||e.textContent)===target);if(!el)el=els.find(e=>n(e.innerText||e.textContent).startsWith(target));if(!el)return null;const m={text:(el.innerText||el.textContent||'').trim().replace(/\s+/g,' '),cls:String(el.className||''),id:el.id||''};el.click();return m},target)}
const READY={
  'Unidades':t=>t.includes('TRASPASO MANUAL')&&t.includes('UNIDADES ACTIVAS'),
  'Cupos ATTT':t=>t.includes('ECARCHECK / ATTT ES LA INFORMACION OFICIAL'),
  'Auditoría':t=>t.includes('CUPOS OFICIALES DETECTADOS EN ECARCHECK')||t.includes('TRASPASOS DETECTADOS POR TITULAR / CUPO')||t.includes('CUPOS QUE NO COINCIDEN'),
  'Validador eCarCheck':t=>t.includes('VALIDACION MANUAL POR GALERA'),
  'Dashboard':t=>t.includes('MAESTRA OPERATIVA DE FLOTA')&&t.includes('CONTROL DE AUTO')
};
async function waitReady(page,label,timeout=20000){const start=Date.now();while(Date.now()-start<timeout){const s=await snap(page);const t=norm(s.text);if(READY[label](t)&&!s.guard)return {ms:Date.now()-start,state:s};await page.waitForTimeout(100);}const s=await snap(page);throw new Error(`VIEW_NOT_READY ${label} after ${Date.now()-start}ms :: ${s.headings.join(' | ')} :: ${s.text.slice(0,1200)}`)}
(async()=>{const browser=await chromium.launch({headless:true});const results=[];let failedOverall=false;
for(const setup of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){const ctx=await browser.newContext({viewport:setup[1]});const page=await ctx.newPage();const errs=[],pageerrs=[],failed=[];page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});page.on('pageerror',e=>pageerrs.push(String(e)));page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText||''}));try{
  await login(page);await page.evaluate(()=>window.v70OpenControl());await page.waitForFunction(()=>document.body.classList.contains('v70-control'),null,{timeout:30000});await waitReady(page,'Dashboard',20000);
  const routeResults=[];
  for(const label of ['Unidades','Cupos ATTT','Auditoría','Validador eCarCheck','Dashboard']){const clicked=await clickTab(page,label);if(!clicked)throw new Error('TAB_NOT_FOUND '+label);const ready=await waitReady(page,label,25000);routeResults.push({label,clicked,readyMs:ready.ms,state:{head:ready.state.headings.slice(0,8),active:ready.state.active.map(x=>x.text).slice(0,8),guard:ready.state.guard,text:ready.state.text.slice(0,1400)}});await page.screenshot({path:path.join(out,`${setup[0]}-settled-${norm(label).replace(/[^A-Z0-9]+/g,'-').toLowerCase()}.png`),fullPage:true});}
  await page.evaluate(()=>window.v70OpenControl());await waitReady(page,'Dashboard',20000);
  const rapidLabels=['Unidades','Cupos ATTT','Auditoría','Validador eCarCheck','Dashboard','Unidades','Auditoría','Dashboard'];
  for(const label of rapidLabels){const clicked=await clickTab(page,label);if(!clicked)throw new Error('RAPID_TAB_NOT_FOUND '+label);await page.waitForTimeout(300)}
  const rapidReady=await waitReady(page,'Dashboard',30000);await page.waitForTimeout(500);const final=await snap(page);
  if(final.guard)throw new Error('ROUTE_GUARD_STUCK');if(!final.bodyClass.includes('v70-control'))throw new Error('LEFT_CONTROL_MODULE '+final.bodyClass);
  if(errs.some(x=>/V170 Control router|view did not settle/i.test(x)))throw new Error('ROUTER_ERROR '+errs.join(' || '));
  if(pageerrs.length)throw new Error('PAGE_ERRORS '+pageerrs.join(' || '));
  if(failed.length)throw new Error('REQUEST_FAILURES '+JSON.stringify(failed.slice(0,5)));
  const r={mode:setup[0],routeResults,rapidReadyMs:rapidReady.ms,final:{head:final.headings.slice(0,8),active:final.active.map(x=>x.text).slice(0,8),guard:final.guard,text:final.text.slice(0,1400)},errs,pageerrs,failed};results.push(r);console.log('CONTROL_STRICT '+JSON.stringify(r));
}catch(e){failedOverall=true;const fatal={mode:setup[0],fatal:String(e.stack||e),state:await snap(page).catch(()=>null),errs,pageerrs,failed};results.push(fatal);console.error('CONTROL_STRICT_FATAL '+JSON.stringify(fatal));}await ctx.close();}
await browser.close();fs.writeFileSync(path.join(out,'control-strict-report.json'),JSON.stringify(results,null,2));if(failedOverall)process.exit(1);})();
