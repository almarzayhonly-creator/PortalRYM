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
 await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000}); await page.waitForTimeout(800);
 let p=await visible(page.locator('input[type="password"]'));
 if(p){
  let u=null; for(const s of ['input[type="email"]','input[placeholder*="usuario" i]','input[placeholder*="correo" i]','input[type="text"]']){u=await visible(page.locator(s));if(u)break}
  if(!u)throw new Error('No user field'); await u.fill(EMAIL); await p.fill(PASSWORD);
  let b=await visible(page.getByRole('button',{name:/iniciar sesión|iniciar sesion|ingresar|entrar|login/i})); if(b)await b.click(); else await p.press('Enter');
 }
 await page.waitForFunction(()=>/Panapass/i.test(document.body.innerText)&&/Revisados/i.test(document.body.innerText)&&/Control de Auto/i.test(document.body.innerText),null,{timeout:40000});
 await page.waitForTimeout(1200);
}
async function snap(page,mode,module){
 const d=await page.evaluate(()=>({href:location.href,title:document.title,bodyClass:document.body.className,headings:[...document.querySelectorAll('h1,h2,h3')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height}).slice(0,12).map(e=>e.innerText.trim()),css:!!document.querySelector('#rym-v170-visual-polish'),scrollWidth:document.documentElement.scrollWidth,innerWidth}));
 const f=`${mode}-${module.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`; await page.screenshot({path:path.join(out,f),fullPage:true});
 report.push({mode,module,...d,screenshot:f}); console.log('MODULE_QA '+JSON.stringify(report[report.length-1]));
}
async function access(page,mode,module,rx){
 await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>/Panapass/i.test(document.body.innerText)&&/Revisados/i.test(document.body.innerText),null,{timeout:30000});
 await page.waitForTimeout(700);
 const b=await visible(page.getByRole('button',{name:rx}));
 if(!b){report.push({mode,module,error:'access button not found'});console.log(`MODULE_MISSING ${mode} ${module}`);return}
 await b.click(); await page.waitForTimeout(1800); await snap(page,mode,module);
}
async function run(browser,mode,viewport){
 const ctx=await browser.newContext({viewport}); const page=await ctx.newPage(); await login(page);
 await access(page,mode,'Panapass',/abrir panapass/i);
 await access(page,mode,'Revisados',/gestionar revisados/i);
 await access(page,mode,'Control de Auto',/ver flota/i);
 await access(page,mode,'GPS',/atender .*prioridades/i);
 await ctx.close();
}
(async()=>{const browser=await chromium.launch({headless:true});try{await run(browser,'desktop',{width:1440,height:1000});await run(browser,'mobile',{width:390,height:844});}finally{await browser.close()}fs.writeFileSync(path.join(out,'module-report.json'),JSON.stringify(report,null,2));console.log('MODULE_RESULT '+JSON.stringify(report));})().catch(e=>{console.error(e.stack||e);process.exit(1)});
