const { chromium } = require('playwright');

(async()=>{
  const url=process.env.QA_URL;
  if(!url) throw new Error('QA_URL missing');
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(url,{waitUntil:'networkidle',timeout:60000});
  await page.waitForSelector('#app',{timeout:20000});
  await page.waitForFunction(()=>window.RYM_V172_CLEAN_READY||document.querySelector('#f'),null,{timeout:20000});
  const state=await page.evaluate(async()=>{
    let ready=null;try{ready=await window.RYM_V172_CLEAN_READY}catch(e){ready={error:String(e)}}
    return {
      title:document.title,
      hasLogin:!!document.querySelector('#f'),
      hasSession:!!window.RYM_SESSION,
      hasRouter:!!window.RYM_ROUTER,
      hasControlRouter:!!window.RYM_CONTROL_ROUTER,
      hasControlApp:!!window.RYM_CONTROL_APP,
      modules:window.RYM_MODULES?.list?.()||[],
      ready
    };
  });
  if(state.title!=='Portal RYM') throw new Error('Unexpected title: '+state.title);
  if(!state.hasLogin) throw new Error('Login form not visible on clean browser');
  if(!state.hasSession||!state.hasRouter||!state.hasControlRouter||!state.hasControlApp) throw new Error('Core/module runtime missing: '+JSON.stringify(state));
  const expected=['panapass','revisados','control-auto','gps','usuarios'];
  for(const name of expected) if(!state.modules.includes(name)) throw new Error('Missing module '+name);
  const fatal=errors.filter(x=>!/favicon|ResizeObserver/i.test(x));
  if(fatal.length) throw new Error('Browser errors: '+fatal.join(' | '));
  console.log(JSON.stringify(state,null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
