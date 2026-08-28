const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL = process.env.QA_URL;
const EMAIL = process.env.QA_EMAIL;
const PASSWORD = process.env.QA_PASSWORD;
if (!URL || !EMAIL || !PASSWORD) throw new Error('QA_URL/QA_EMAIL/QA_PASSWORD required');
const out = path.join(process.cwd(),'qa-module-results'); fs.mkdirSync(out,{recursive:true});
const report=[];
async function visible(loc){for(let i=0;i<await loc.count();i++){if(await loc.nth(i).isVisible().catch(()=>false))return loc.nth(i)}return null}
async function login(page){
 await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000}); await page.waitForTimeout(700);
 let p=await visible(page.locator('input[type="password"]'));
 if(p){
  let u=null; for(const s of ['input[type="email"]','input[placeholder*="usuario" i]','input[placeholder*="correo" i]','input[type="text"]']){u=await visible(page.locator(s));if(u)break}
  if(!u)throw new Error('No user field'); await u.fill(EMAIL); await p.fill(PASSWORD);
  let b=await visible(page.getByRole('button',{name:/iniciar sesión|iniciar sesion|ingresar|entrar|login/i})); if(b)await b.click(); else await p.press('Enter');
 }
 await page.waitForFunction(()=>/Panapass/i.test(document.body.innerText)&&/Revisados/i.test(document.body.innerText)&&/Control de Auto/i.test(document.body.innerText),null,{timeout:40000});
 await page.waitForTimeout(700);
}
async function waitModule(page,module){
 const started=Date.now(); let text=''; let ready=false;
 for(let i=0;i<60;i++){
  await page.waitForTimeout(500); text=await page.locator('body').innerText().catch(()=> '');
  const loading=new RegExp(`Cargando\\s+${module.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`,'i').test(text);
  const hasNav=/Volver al Portal|Dashboard|Operaciones|Unidades|Flota|Ranking|Historial/i.test(text);
  if(!loading && hasNav){ready=true;break;}
 }
 return {ready,ms:Date.now()-started,text:text.slice(0,500)};
}
async function testOne(browser,mode,viewport,module,buttonRx){
 const ctx=await browser.newContext({viewport}); const page=await ctx.newPage();
 const consoleErrors=[]; const failed=[];
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,300))});
 page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText||''}));
 try{
  await login(page);
  const b=await visible(page.getByRole('button',{name:buttonRx}));
  if(!b){report.push({mode,module,error:'access button not found'});return;}
  const t0=Date.now(); await b.click(); const state=await waitModule(page,module); const totalMs=Date.now()-t0;
  const d=await page.evaluate(()=>({href:location.href,title:document.title,bodyClass:document.body.className,headings:[...document.querySelectorAll('h1,h2,h3')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height}).slice(0,15).map(e=>e.innerText.trim()),css:!!document.querySelector('#rym-v170-visual-polish'),scrollWidth:document.documentElement.scrollWidth,innerWidth}));
  const f=`${mode}-${module.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`; await page.screenshot({path:path.join(out,f),fullPage:true});
  const row={mode,module,ready:state.ready,loadMs:totalMs,visibleText:state.text,consoleErrors,failedRequests:failed,...d,screenshot:f}; report.push(row); console.log('MODULE_QA '+JSON.stringify(row));
 }catch(e){report.push({mode,module,error:String(e.stack||e)});console.log('MODULE_ERROR '+JSON.stringify(report[report.length-1]));}
 finally{await ctx.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const modules=[['Panapass',/abrir panapass/i],['Revisados',/gestionar revisados/i],['Control de Auto',/ver flota/i],['GPS',/atender .*prioridades/i]];
 try{
  for(const [m,b] of modules) await testOne(browser,'desktop',{width:1440,height:1000},m,b);
  for(const [m,b] of modules) await testOne(browser,'mobile',{width:390,height:844},m,b);
 }finally{await browser.close();}
 fs.writeFileSync(path.join(out,'module-report.json'),JSON.stringify(report,null,2));
 console.log('MODULE_RESULT '+JSON.stringify(report.map(x=>({mode:x.mode,module:x.module,ready:x.ready,loadMs:x.loadMs,bodyClass:x.bodyClass,error:x.error}))));
 if(report.some(x=>x.error))process.exitCode=1;
})();
