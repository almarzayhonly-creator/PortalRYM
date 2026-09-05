const { chromium } = require('playwright');

(async()=>{
  const url=process.env.QA_URL;
  const username=process.env.AUDIT_USERNAME;
  const password=process.env.AUDIT_PASSWORD;
  if(!url) throw new Error('QA_URL missing');
  if(!username||!password) throw new Error('Authenticated audit credentials missing');

  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1600,height:1000}});
  const page=await context.newPage();
  const pageErrors=[];
  const consoleErrors=[];
  const failed=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText||''}));

  await page.goto(url+'/?auth_panapass_smoke='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
  const userInput=page.locator('input[name="usuario"]');
  const passwordInput=page.locator('input[name="password"]');
  await userInput.waitFor({state:'visible',timeout:20000});
  await userInput.fill(username);
  await passwordInput.fill(password);

  const authResponsePromise=page.waitForResponse(r=>r.url().includes('/functions/v1/auth-username'),{timeout:30000});
  await page.locator('button[type="submit"],#loginBtn').first().click();
  const authResponse=await authResponsePromise;
  let authJson={};
  try{authJson=await authResponse.json()}catch{}
  const authSummary={status:authResponse.status(),ok:authJson?.ok===true,error:String(authJson?.error||'')};
  if(authResponse.status()!==200||authJson?.ok!==true){
    throw new Error('Authenticated audit login failed: '+JSON.stringify(authSummary));
  }

  await userInput.waitFor({state:'hidden',timeout:30000});
  await page.waitForTimeout(1800);

  const boot=await page.evaluate(()=>({
    bridge:!!window.RYM_LEGACY_ROUTES,
    registry:!!window.RYM_MODULES,
    styles:!!window.RYM_STYLES,
    panFn:typeof window.v70OpenPanapass,
    panBridged:window.RYM_LEGACY_ROUTES?.isBridged?.('v70OpenPanapass')||false,
    modules:window.RYM_V171_READY?true:false,
    nativeDashboard:window.RYM_PANAPASS_DASHBOARD_V2?.native===true
  }));
  if(!boot.bridge||!boot.registry||!boot.styles||boot.panFn!=='function'||!boot.panBridged||!boot.nativeDashboard){
    throw new Error('V2 runtime/native dashboard not ready after authenticated login: '+JSON.stringify(boot));
  }

  const beforeErrors=pageErrors.length;
  await page.evaluate(async()=>{await window.v70OpenPanapass()});
  await page.waitForFunction(()=>window.RYM_MODULES?.current?.()==='panapass' && document.body.dataset.rymModule==='panapass',null,{timeout:25000});
  await page.locator('#view .rym-d2').waitFor({state:'visible',timeout:25000});
  await page.waitForFunction(()=>document.querySelectorAll('#view .rym-d2-galera').length>0,null,{timeout:25000});
  await page.waitForTimeout(900);

  const pan=await page.evaluate(()=>{
    const links=[...document.querySelectorAll('link[data-rym-module-style]')].map(x=>({href:x.dataset.href||'',domain:x.dataset.rymStyleDomain||'',disabled:x.disabled}));
    const scripts=[...document.scripts].map(x=>x.src||'').filter(Boolean);
    const view=document.querySelector('#view');
    return {
      current:window.RYM_MODULES?.current?.()||'',
      styleDomain:window.RYM_STYLES?.current?.()||'',
      dataset:document.body.dataset.rymModule||'',
      bodyClass:document.body.className,
      native:window.RYM_PANAPASS_DASHBOARD_V2?.native===true,
      nativeRoot:!!view?.querySelector('.rym-d2'),
      galeras:view?.querySelectorAll('.rym-d2-galera').length||0,
      legacyTop:!!view?.querySelector('.rym-admin-kpis,.rym-p2-shell'),
      legacyStyle:!!document.querySelector('#rym-admin-dash-style-v11'),
      sidebarGroups:document.querySelectorAll('.side .rym-d2-nav-group').length,
      rawLoading:/CARGANDO/i.test(view?.innerText||''),
      text:(document.body.innerText||'').replace(/\s+/g,' ').slice(0,1400),
      links,
      scripts
    };
  });
  if(pan.current!=='panapass'||pan.styleDomain!=='panapass'||pan.dataset!=='panapass') throw new Error('Panapass boundary not active: '+JSON.stringify(pan));
  if(!pan.native||!pan.nativeRoot||pan.galeras<1) throw new Error('Native Panapass dashboard did not render: '+JSON.stringify(pan));
  if(pan.legacyTop||pan.legacyStyle) throw new Error('Legacy dashboard layer is still mounted: '+JSON.stringify(pan));
  if(pan.rawLoading) throw new Error('Raw legacy loading content is visible: '+JSON.stringify(pan));
  if(pan.sidebarGroups<1) throw new Error('Native Panapass sidebar grouping did not render: '+JSON.stringify(pan));
  if(!pan.links.some(x=>x.href==='/css/panapass.css'&&!x.disabled)) throw new Error('panapass.css is not active');
  if(!pan.links.some(x=>x.href==='/css/panapass-dashboard-v2.css'&&!x.disabled)) throw new Error('panapass-dashboard-v2.css is not active');
  if(!pan.links.some(x=>x.href==='/css/panapass-bajas.css'&&!x.disabled)) throw new Error('panapass-bajas.css is not active');
  if(pan.links.some(x=>/panapass-proposal2|panapass-ops-v3|panapass-supervisor-v5|panapass-dashboard-v6/.test(x.href)&&!x.disabled)) throw new Error('Deprecated Panapass presentation CSS is active: '+JSON.stringify(pan.links));
  if(pan.scripts.some(x=>/dashboard\/(experience-v2|ops-v3|date-window-v4|supervisor-polish-v5|ui-v6)\.js/.test(x))) throw new Error('Deprecated dashboard transform script is loaded: '+JSON.stringify(pan.scripts));
  if(pageErrors.length>beforeErrors) throw new Error('Page error while opening Panapass: '+pageErrors.slice(beforeErrors).join(' | '));

  await page.screenshot({path:'audit/architecture-v2-panapass-dashboard.png',fullPage:true});

  const bajasResult=await page.evaluate(async()=>{
    const root=document.querySelector('#view');
    if(typeof window.v87BajasPanapass!=='function') return {ok:false,reason:'v87BajasPanapass unavailable'};
    await window.v87BajasPanapass(root);
    return {ok:true};
  });
  if(!bajasResult.ok) throw new Error('Cannot open Bajas Panapass: '+JSON.stringify(bajasResult));
  await page.locator('.v87-bajas-hero').waitFor({state:'visible',timeout:25000});
  await page.waitForTimeout(1200);

  const bajas=await page.evaluate(()=>{
    const hero=document.querySelector('.v87-bajas-hero');
    const cs=hero?getComputedStyle(hero):null;
    return {
      title:(hero?.innerText||'').replace(/\s+/g,' ').slice(0,300),
      backgroundImage:cs?.backgroundImage||'',
      backgroundColor:cs?.backgroundColor||'',
      radius:cs?.borderRadius||'',
      current:window.RYM_MODULES?.current?.()||'',
      dataset:document.body.dataset.rymModule||'',
      styleDomain:window.RYM_STYLES?.current?.()||''
    };
  });
  if(!/BAJAS PANAPASS/i.test(bajas.title)) throw new Error('Bajas screen did not render: '+JSON.stringify(bajas));
  if(bajas.current!=='panapass'||bajas.dataset!=='panapass'||bajas.styleDomain!=='panapass') throw new Error('Panapass boundary lost inside Bajas: '+JSON.stringify(bajas));
  if(!/gradient/i.test(bajas.backgroundImage)) throw new Error('Bajas V2 CSS is not applied: '+JSON.stringify(bajas));

  await page.screenshot({path:'audit/architecture-v2-panapass-bajas.png',fullPage:true});

  console.log('AUTH_PANAPASS_SMOKE_PASS '+JSON.stringify({auth:authSummary,boot,pan:{current:pan.current,styleDomain:pan.styleDomain,dataset:pan.dataset,native:pan.native,galeras:pan.galeras,sidebarGroups:pan.sidebarGroups},bajas,pageErrors,consoleErrors:consoleErrors.slice(-10),failed:failed.slice(-10)}));
  await context.close();
  await browser.close();
})().catch(async e=>{
  console.error('AUTH_PANAPASS_SMOKE_FAIL',e);
  process.exit(1);
});
