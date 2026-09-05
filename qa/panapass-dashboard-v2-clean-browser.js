const {chromium}=require('playwright');
(async()=>{
  const url=process.env.QA_URL,user=process.env.AUDIT_USERNAME,password=process.env.AUDIT_PASSWORD;
  if(!url||!user||!password)throw new Error('QA_URL/AUDIT credentials missing');
  const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1600,height:1000}});const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url+'/?panapassClean=1&clean_smoke='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
  const u=page.locator('input[name="usuario"]'),p=page.locator('input[name="password"]');await u.waitFor({state:'visible',timeout:20000});await u.fill(user);await p.fill(password);
  const auth=page.waitForResponse(r=>r.url().includes('/functions/v1/auth-username'),{timeout:30000});await page.locator('button[type="submit"],#loginBtn').first().click();const resp=await auth;if(resp.status()!==200)throw new Error('login '+resp.status());
  await page.locator('.rym-pdc').waitFor({state:'visible',timeout:35000});
  const audit=await page.evaluate(()=>({enabled:window.RYM_PANAPASS_CLEAN_ENABLED===true,ready:!!window.RYM_PANAPASS_DASHBOARD_CLEAN,role:document.querySelector('.rym-pdc')?.dataset.pdcRole||'',owner:document.querySelector('#view')?.dataset.rymPanapassClean||'',text:(document.querySelector('.rym-pdc')?.innerText||'').replace(/\s+/g,' ').slice(0,700)}));
  if(!audit.enabled||!audit.ready||audit.owner!=='1'||!/Dashboard Panapass|Dashboard de galera|Mi Dashboard Panapass/i.test(audit.text))throw new Error('clean dashboard not mounted '+JSON.stringify(audit));
  if(errors.length)throw new Error('page errors '+errors.join(' | '));
  await page.screenshot({path:'audit/panapass-dashboard-v2-clean.png',fullPage:true});console.log('PANAPASS_CLEAN_BROWSER_PASS '+JSON.stringify(audit));await browser.close();
})().catch(e=>{console.error('PANAPASS_CLEAN_BROWSER_FAIL',e);process.exit(1)});
