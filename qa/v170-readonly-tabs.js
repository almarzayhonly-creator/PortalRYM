const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.QA_URL;
const EMAIL = process.env.QA_EMAIL;
const PASSWORD = process.env.QA_PASSWORD;
if (!URL || !EMAIL || !PASSWORD) throw new Error('QA_URL/QA_EMAIL/QA_PASSWORD required');

const out = path.join(process.cwd(), 'qa-tabs-results');
fs.mkdirSync(out, { recursive: true });
const report = { url: URL, startedAt: new Date().toISOString(), screens: [], errors: [] };

const modules = {
  Panapass: {
    open: 'v70OpenPanapass',
    bodyClass: 'v117-panapass',
    tabs: ['Dashboard','Negativos Hoy','Ranking','Pagos Hoy','Cargar Pagos','Historial / Pendiente a Cobra','Recurrentes','Operacion AM / PM','Reportes','Recorrido','Bajas Panapass']
  },
  Revisados: {
    open: 'v60OpenRevisados',
    bodyClass: 'v66-revisados',
    tabs: ['Dashboard','Operaciones','Avance mensual','Reporte diario','Historial','Estadisticas','Boletas','Cupos']
  },
  GPS: {
    open: 'v113OpenGps',
    bodyClass: 'v157-gps',
    tabs: ['Dashboard','Flota GPS','Ranking','Auditoria','Ejecutivo']
  },
  Usuarios: {
    open: 'v70OpenUsers',
    bodyClass: 'v70-admin',
    tabs: ['Usuarios','Actividad']
  },
  'Control de Auto': {
    open: 'v70OpenControl',
    bodyClass: 'v70-control',
    tabs: ['Dashboard','Unidades','Cupos ATTT','Auditoria','Validador eCarCheck']
  }
};

const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
const safe = s => norm(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

async function firstVisible(loc) {
  for (let i=0;i<await loc.count();i++) if (await loc.nth(i).isVisible().catch(()=>false)) return loc.nth(i);
  return null;
}

async function login(page) {
  await page.goto(URL, { waitUntil:'domcontentloaded', timeout:60000 });
  await page.waitForTimeout(500);
  const pass = await firstVisible(page.locator('input[type="password"]'));
  if (pass) {
    let user = null;
    for (const sel of ['input[type="email"]','input[placeholder*="usuario" i]','input[placeholder*="correo" i]','input[type="text"]']) {
      user = await firstVisible(page.locator(sel)); if (user) break;
    }
    if (!user) throw new Error('No login user field');
    await user.fill(EMAIL); await pass.fill(PASSWORD);
    const b = await firstVisible(page.getByRole('button',{name:/iniciar sesion|iniciar sesión|ingresar|entrar|login/i}));
    if (b) await b.click(); else await pass.press('Enter');
  }
  await page.waitForFunction(() => document.body.classList.contains('v99-home'), null, { timeout:45000 });
  await page.waitForFunction(() => {
    const t = document.body.innerText || '';
    return /Panapass/i.test(t) && /Revisados/i.test(t) && /Control de Auto/i.test(t) && !/Ingresando\.\.\./i.test(t);
  }, null, { timeout:45000 }).catch(()=>{});
}

async function openModule(page, cfg) {
  const ok = await page.evaluate((name) => {
    const fn = window[name];
    if (typeof fn !== 'function') return false;
    fn(); return true;
  }, cfg.open);
  if (!ok) throw new Error(`Canonical opener missing: ${cfg.open}`);
  await page.waitForFunction(c => document.body.classList.contains(c), cfg.bodyClass, { timeout:20000 });
  await waitStable(page, 20000);
}

async function clickTabByText(page, label) {
  const target = norm(label);
  const result = await page.evaluate(({target}) => {
    const normHere = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
    const candidates = [...document.querySelectorAll('button,a,[role="tab"],[role="button"]')];
    const exact = candidates.find(el => normHere(el.innerText || el.textContent) === target);
    if (!exact) return { ok:false, available:candidates.map(el=>normHere(el.innerText||el.textContent)).filter(Boolean).slice(0,100) };
    exact.click();
    return { ok:true, tag:exact.tagName, cls:String(exact.className||''), text:(exact.innerText||exact.textContent||'').trim() };
  }, {target});
  return result;
}

async function waitStable(page, maxMs=12000) {
  const start = Date.now(); let last = '';
  while (Date.now()-start < maxMs) {
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => {
      const visible = el => { const r=el.getBoundingClientRect(); const s=getComputedStyle(el); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'; };
      const all=[...document.querySelectorAll('body *')].filter(visible).map(el=>(el.innerText||'').trim()).filter(Boolean);
      const loading=all.filter(t=>/^(Cargando|Consultando|Preparando|Actualizando)(\b|\.\.\.)/i.test(t)).slice(0,20);
      return {loading, text:(document.body.innerText||'').slice(0,5000)};
    });
    last = state.text;
    if (!state.loading.length) return { stable:true, ms:Date.now()-start, loading:[] };
  }
  const loading = await page.evaluate(() => [...document.querySelectorAll('body *')].map(el=>(el.innerText||'').trim()).filter(t=>/^(Cargando|Consultando|Preparando|Actualizando)(\b|\.\.\.)/i.test(t)).slice(0,20));
  return { stable:false, ms:Date.now()-start, loading, last:last.slice(0,1200) };
}

async function inspect(page) {
  const m = await page.evaluate(() => {
    const visible = el => { const r=el.getBoundingClientRect(); const s=getComputedStyle(el); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'; };
    const headings=[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>(e.innerText||'').trim()).filter(Boolean).slice(0,20);
    const active=[...document.querySelectorAll('.active,[aria-selected="true"]')].filter(visible).map(e=>(e.innerText||'').trim().replace(/\s+/g,' ')).filter(Boolean).slice(0,15);
    const tables=[...document.querySelectorAll('table')].filter(visible).map(t=>({rows:t.querySelectorAll('tbody tr').length,cols:t.querySelectorAll('thead th').length}));
    const blank=[];
    for(const el of [...document.querySelectorAll('main section,main .card,.main section,.v66-main section,.v66-card,.v157-card,.ca6-card')]){
      if(!visible(el)) continue;
      const r=el.getBoundingClientRect(), txt=(el.innerText||'').trim();
      if(r.height>250 && txt.length<20) blank.push({tag:el.tagName,cls:String(el.className||'').slice(0,100),height:Math.round(r.height),text:txt.slice(0,50)});
    }
    return {
      bodyClass:document.body.className,
      headings,active,tables,blank,
      innerWidth,scrollWidth:document.documentElement.scrollWidth,
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+4,
      text:(document.body.innerText||'').slice(0,9000)
    };
  });
  try {
    const axe=await new AxeBuilder({page}).withRules(['color-contrast']).analyze();
    m.contrast=(axe.violations||[]).reduce((n,v)=>n+v.nodes.length,0);
    m.contrastExamples=(axe.violations||[]).flatMap(v=>v.nodes.slice(0,4).map(n=>({target:n.target,html:n.html.slice(0,160),summary:n.failureSummary}))).slice(0,12);
  } catch(e) { m.contrastError=String(e.message||e); }
  return m;
}

async function testTab(browser, mode, viewport, moduleName, cfg, tab) {
  const ctx=await browser.newContext({viewport});
  const page=await ctx.newPage();
  const errors=[],failed=[];
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,400));});
  page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText||''}));
  const row={mode,module:moduleName,tab};
  try {
    await login(page);
    await openModule(page,cfg);
    const clicked=await clickTabByText(page,tab);
    row.clicked=clicked;
    if(!clicked.ok) throw new Error(`Tab not found: ${tab}`);
    const stable=await waitStable(page,15000);
    row.stable=stable;
    row.metrics=await inspect(page);
    row.consoleErrors=errors; row.failedRequests=failed;
    const f=`${mode}-${safe(moduleName)}-${safe(tab)}.jpg`;
    await page.screenshot({path:path.join(out,f),fullPage:true,type:'jpeg',quality:72});
    row.screenshot=f;
    console.log('TAB_QA '+JSON.stringify({mode,module:moduleName,tab,stable:stable.stable,waitMs:stable.ms,overflow:row.metrics.horizontalOverflow,contrast:row.metrics.contrast,headings:row.metrics.headings.slice(0,6),active:row.metrics.active.slice(0,5),tables:row.metrics.tables,blank:row.metrics.blank,consoleErrors:errors.length,failed:failed.length}));
  } catch(e) {
    row.error=String(e.stack||e);
    report.errors.push({mode,module:moduleName,tab,error:row.error.slice(0,1000)});
    console.log('TAB_ERROR '+JSON.stringify({mode,module:moduleName,tab,error:row.error.slice(0,500)}));
  }
  report.screens.push(row);
  await ctx.close();
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    for(const [moduleName,cfg] of Object.entries(modules)) {
      for(const tab of cfg.tabs) await testTab(browser,'desktop',{width:1440,height:1000},moduleName,cfg,tab);
    }
    for(const [moduleName,cfg] of Object.entries(modules)) {
      for(const tab of cfg.tabs) await testTab(browser,'mobile',{width:390,height:844},moduleName,cfg,tab);
    }
  } finally { await browser.close(); }
  report.finishedAt=new Date().toISOString();
  report.summary={
    tested:report.screens.length,
    errors:report.errors.length,
    unstable:report.screens.filter(x=>x.stable&&x.stable.stable===false).map(x=>`${x.mode}:${x.module}:${x.tab}`),
    overflow:report.screens.filter(x=>x.metrics?.horizontalOverflow).map(x=>`${x.mode}:${x.module}:${x.tab}`),
    consoleErrors:report.screens.reduce((n,x)=>n+(x.consoleErrors?.length||0),0),
    failedRequests:report.screens.reduce((n,x)=>n+(x.failedRequests?.length||0),0),
    contrast:report.screens.reduce((n,x)=>n+(x.metrics?.contrast||0),0),
    blank:report.screens.flatMap(x=>(x.metrics?.blank||[]).map(b=>({screen:`${x.mode}:${x.module}:${x.tab}`,...b})))
  };
  fs.writeFileSync(path.join(out,'tabs-report.json'),JSON.stringify(report,null,2));
  console.log('TAB_RESULT '+JSON.stringify(report.summary));
  if(report.errors.length) process.exitCode=1;
})();
