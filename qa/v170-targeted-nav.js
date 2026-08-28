const { chromium } = require('playwright');
const fs=require('fs');const path=require('path');
const URL=process.env.QA_URL, EMAIL=process.env.QA_EMAIL, PASSWORD=process.env.QA_PASSWORD;
if(!URL||!EMAIL||!PASSWORD) throw new Error('QA env missing');
const out=path.join(process.cwd(),'qa-targeted-results');fs.mkdirSync(out,{recursive:true});
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
async function visible(loc){for(let i=0;i<await loc.count();i++)if(await loc.nth(i).isVisible().catch(()=>false))return loc.nth(i);return null}
async function login(page){
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(700);
  const p=await visible(page.locator('input[type=password]'));
  if(p){
    const u=await visible(page.locator('input[type=email],input[placeholder*="usuario" i],input[placeholder*="correo" i],input[type=text]'));
    if(!u) throw new Error('Login user field not found');
    await u.fill(EMAIL);await p.fill(PASSWORD);
    const b=await visible(page.getByRole('button',{name:/iniciar sesion|iniciar sesión|ingresar|entrar/i}));
    if(b) await b.click(); else await p.press('Enter');
  }
  await page.waitForFunction(()=>{
    const pw=[...document.querySelectorAll('input[type=password]')].some(e=>{const r=e.getBoundingClientRect();return r.width&&r.height});
    const txt=(document.body.innerText||'').toUpperCase();
    return !pw && typeof window.v70OpenControl==='function' && (/CONTROL DE AUTO|PANAPASS|REVISADOS|PORTAL RYM/.test(txt));
  },null,{timeout:60000});
  await page.waitForTimeout(1500);
}
async function snap(page){return page.evaluate(()=>{const vis=e=>{const r=e.getBoundingClientRect();return r.width&&r.height};const nav=[...document.querySelectorAll('button,a,[role=tab],[role=button]')].filter(vis).map(e=>({text:(e.innerText||e.textContent||'').trim().replace(/\s+/g,' '),cls:String(e.className||''),id:e.id||'',disabled:!!e.disabled,aria:e.getAttribute('aria-selected')||''})).filter(x=>x.text).slice(0,100);return {bodyClass:document.body.className,headings:[...document.querySelectorAll('h1,h2,h3')].filter(vis).map(e=>(e.innerText||'').trim()).slice(0,15),active:nav.filter(x=>/\bactive\b/.test(x.cls)||x.aria==='true').slice(0,20),nav,text:(document.body.innerText||'').replace(/\s+/g,' ').slice(0,5000),scrollY,sw:document.documentElement.scrollWidth,iw:innerWidth};})}
async function clickTab(page,label){const target=norm(label);return page.evaluate(target=>{const n=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();const vis=e=>{const r=e.getBoundingClientRect();return r.width&&r.height};const els=[...document.querySelectorAll('button,a,[role=tab],[role=button]')].filter(vis);let el=els.find(e=>n(e.innerText||e.textContent)===target);if(!el)el=els.find(e=>n(e.innerText||e.textContent).startsWith(target));if(!el)return null;const m={text:(el.innerText||el.textContent||'').trim().replace(/\s+/g,' '),cls:String(el.className||''),id:el.id||'',disabled:!!el.disabled};el.click();return m},target)}
async function sampleAfter(page,delays){const arr=[];let prev=0;for(const ms of delays){await page.waitForTimeout(ms-prev);prev=ms;arr.push({ms,state:await snap(page)});}return arr}
(async()=>{const browser=await chromium.launch({headless:true});const results=[];for(const setup of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){const ctx=await browser.newContext({viewport:setup[1]});const page=await ctx.newPage();const errs=[],pageerrs=[],failed=[];page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});page.on('pageerror',e=>pageerrs.push(String(e)));page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText||''}));try{
 await login(page);
 const portal=await snap(page);console.log('PORTAL_READY '+setup[0]+' '+JSON.stringify({body:portal.bodyClass,head:portal.headings.slice(0,5),text:portal.text.slice(0,700)}));
 await page.evaluate(()=>window.v70OpenControl());
 await page.waitForFunction(()=>document.body.classList.contains('v70-control'),null,{timeout:30000});
 await page.waitForTimeout(4500);
 const funcs=await page.evaluate(()=>Object.keys(window).filter(k=>typeof window[k]==='function'&&/(v70|v75|v94|control|ecar|valid)/i.test(k)).sort());
 const initial=await snap(page);
 const normal=[];for(const label of ['Unidades','Cupos ATTT','Auditoría','Validador eCarCheck','Dashboard','Unidades','Dashboard']){const clicked=await clickTab(page,label);const samples=await sampleAfter(page,[250,1200,3500]);normal.push({label,clicked,samples});await page.screenshot({path:path.join(out,`${setup[0]}-normal-${norm(label).replace(/[^A-Z0-9]+/g,'-').toLowerCase()}-${normal.length}.png`),fullPage:true});}
 await page.evaluate(()=>window.v70OpenControl());await page.waitForTimeout(3500);
 const rapid=[];for(const label of ['Unidades','Cupos ATTT','Auditoría','Validador eCarCheck','Dashboard','Unidades','Auditoría','Dashboard']){const clicked=await clickTab(page,label);rapid.push({label,clicked,immediate:await snap(page)});await page.waitForTimeout(300);}const rapidAfter=await sampleAfter(page,[500,2000,5000,10000]);await page.screenshot({path:path.join(out,`${setup[0]}-rapid-final.png`),fullPage:true});
 const r={mode:setup[0],portal,funcs,initial,normal,rapid,rapidAfter,errs,pageerrs,failed};results.push(r);console.log('CONTROL_SEQ '+JSON.stringify({mode:setup[0],funcs,normal:normal.map(x=>({label:x.label,clicked:x.clicked,states:x.samples.map(s=>({ms:s.ms,body:s.state.bodyClass,head:s.state.headings.slice(0,4),active:s.state.active.map(a=>a.text).slice(0,5),text:s.state.text.slice(0,500)}))})),rapid:rapid.map(x=>({label:x.label,clicked:x.clicked,body:x.immediate.bodyClass,active:x.immediate.active.map(a=>a.text).slice(0,5),head:x.immediate.headings.slice(0,4)})),rapidAfter:rapidAfter.map(s=>({ms:s.ms,body:s.state.bodyClass,head:s.state.headings.slice(0,5),active:s.state.active.map(a=>a.text).slice(0,6),text:s.state.text.slice(0,750)})),errs,pageerrs,failed:failed.slice(0,10)}));
}catch(e){const fatal={mode:setup[0],fatal:String(e.stack||e),state:await snap(page).catch(()=>null),errs,pageerrs,failed};results.push(fatal);console.log('CONTROL_SEQ_FATAL '+setup[0]+' '+JSON.stringify(fatal));}await ctx.close();}await browser.close();fs.writeFileSync(path.join(out,'control-sequence-report.json'),JSON.stringify(results,null,2));})();
