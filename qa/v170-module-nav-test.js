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
const OPEN_FN={Panapass:'v70OpenPanapass',Revisados:'v60OpenRevisados',GPS:'v113OpenGps',Usuarios:'v70OpenUsers','Control de Auto':'v70OpenControl'};
async function login(page){
 await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000}); await page.waitForTimeout(700);
 let p=await visible(page.locator('input[type="password"]'));
 if(p){
  let u=null; for(const s of ['input[type="email"]','input[placeholder*="usuario" i]','input[placeholder*="correo" i]','input[type="text"]']){u=await visible(page.locator(s));if(u)break}
  if(!u)throw new Error('No user field'); await u.fill(EMAIL); await p.fill(PASSWORD);
  let b=await visible(page.getByRole('button',{name:/iniciar sesión|iniciar sesion|ingresar|entrar|login/i})); if(b)await b.click(); else await p.press('Enter');
 }
 await page.waitForFunction(()=>{
  return typeof window.v70OpenPanapass==='function'&&typeof window.v60OpenRevisados==='function'&&typeof window.v70OpenControl==='function'&&typeof window.v113OpenGps==='function'&&typeof window.v70OpenUsers==='function';
 },null,{timeout:45000});
 await page.waitForFunction(()=>!/Ingresando\.\.\.|Cargando Portal RYM|Preparando tu Centro de Control/i.test(document.body.innerText||''),null,{timeout:45000}).catch(()=>{});
 await page.waitForTimeout(900);
}
function dataReady(module,text){
 if(module==='Panapass') return !/Cargando\.\.\.|Cargando datos|Preparando/i.test(text) && /(Saldo|Negativos|Pagos|Unidades|Balance|Panapass)/i.test(text);
 if(module==='Revisados') return !/Cargando Revisados|Cargando\.\.\./i.test(text) && /(UNIDADES EN TU ALCANCE|AL DÍA|PENDIENTES AHORA|Revisados RYM)/i.test(text);
 if(module==='Control de Auto') return !/Cargando\.\.\.|Cargando Control/i.test(text) && /(ACTIVAS|ABONO ADICIONAL|PARADAS|Control de Auto)/i.test(text);
 if(module==='GPS') return !/Consultando GPS en vivo|Conectando GPS|Cargando GPS/i.test(text) && /(CRÍTIC|ALERTAS|OK|PENDIENTES|unidades)/i.test(text);
 if(module==='Usuarios') return !/Cargando/i.test(text) && /(Usuarios|SUPERVISORA|ADMIN_TOTAL|GERENTE|Última sesión|Ultima sesion)/i.test(text);
 return true;
}
async function waitModule(page,module){
 const started=Date.now(); let text=''; let ready=false;
 for(let i=0;i<90;i++){
  await page.waitForTimeout(500); text=await page.locator('body').innerText().catch(()=> '');
  if(dataReady(module,text)){ready=true;break;}
 }
 return {ready,ms:Date.now()-started,text:text.slice(0,1800)};
}
async function openModule(page,module){
 const fn=OPEN_FN[module];
 const available=await page.evaluate(name=>typeof window[name]==='function',fn).catch(()=>false);
 if(!available)return null;
 await page.evaluate(name=>window[name](),fn);
 return fn;
}
async function testOne(browser,mode,viewport,module){
 const ctx=await browser.newContext({viewport}); const page=await ctx.newPage();
 const consoleErrors=[]; const failed=[];
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,300))});
 page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText||''}));
 try{
  await login(page);
  const portalBodyClass=await page.evaluate(()=>document.body.className);
  const t0=Date.now(); const accessMethod=await openModule(page,module);
  if(!accessMethod){report.push({mode,module,error:'canonical open function unavailable',portalBodyClass});return;}
  const state=await waitModule(page,module); const totalMs=Date.now()-t0;
  const d=await page.evaluate(()=>({href:location.href,title:document.title,bodyClass:document.body.className,headings:[...document.querySelectorAll('h1,h2,h3')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height}).slice(0,15).map(e=>e.innerText.trim()),css:!!document.querySelector('#rym-v170-visual-polish'),scrollWidth:document.documentElement.scrollWidth,innerWidth}));
  const f=`${mode}-${module.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`; await page.screenshot({path:path.join(out,f),fullPage:true});
  const row={mode,module,accessMethod,ready:state.ready,dataReadyMs:totalMs,portalBodyClass,visibleText:state.text,consoleErrors,failedRequests:failed,...d,screenshot:f}; report.push(row); console.log('MODULE_QA '+JSON.stringify(row));
 }catch(e){report.push({mode,module,error:String(e.stack||e)});console.log('MODULE_ERROR '+JSON.stringify(report[report.length-1]));}
 finally{await ctx.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const modules=['Panapass','Revisados','GPS','Usuarios','Control de Auto'];
 try{
  for(const m of modules) await testOne(browser,'desktop',{width:1440,height:1000},m);
  for(const m of modules) await testOne(browser,'mobile',{width:390,height:844},m);
 }finally{await browser.close();}
 fs.writeFileSync(path.join(out,'module-report.json'),JSON.stringify(report,null,2));
 console.log('MODULE_RESULT '+JSON.stringify(report.map(x=>({mode:x.mode,module:x.module,accessMethod:x.accessMethod,ready:x.ready,dataReadyMs:x.dataReadyMs,portalBodyClass:x.portalBodyClass,bodyClass:x.bodyClass,error:x.error}))));
 if(report.some(x=>x.error||x.ready===false))process.exitCode=1;
})();
