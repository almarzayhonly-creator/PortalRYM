const { chromium } = require('playwright');
(async()=>{
  const url=process.env.QA_URL;
  if(!url) throw new Error('QA_URL missing');
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];
  const consoleLines=[];
  const failed=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>consoleLines.push(`${m.type()}: ${m.text()}`));
  page.on('requestfailed',r=>failed.push({url:r.url(),failure:r.failure()}));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForTimeout(2500);
  const state=await page.evaluate(async()=>{
    const loader=document.querySelector('#rym-v171-loader');
    if(!window.RYM_V171_READY) return {ready:false,loader:loader?{src:loader.src}:null};
    let data;
    try{data=await window.RYM_V171_READY}catch(e){return {ready:false,error:String(e),loader:loader?{src:loader.src}:null}}

    const result={ready:true,data,styles:{},lifecycle:{},bridge:{}};
    const moduleLinks=()=>[...document.querySelectorAll('link[data-rym-module-style]')].map(x=>({href:x.dataset.href||x.getAttribute('href'),domain:x.dataset.rymStyleDomain||'',disabled:x.disabled}));

    await window.RYM_STYLES.activate('panapass');
    result.styles.panapass={current:window.RYM_STYLES.current(),links:moduleLinks()};
    await window.RYM_STYLES.activate('gps');
    result.styles.gps={current:window.RYM_STYLES.current(),links:moduleLinks()};
    window.RYM_STYLES.deactivate('gps');
    result.styles.none={current:window.RYM_STYLES.current(),links:moduleLinks()};

    const calls=[];
    window.RYM_MODULES.register('__qa_a',{open(){calls.push('open-a')},unmount(){calls.push('unmount-a')}});
    window.RYM_MODULES.register('__qa_b',{open(){calls.push('open-b')},unmount(){calls.push('unmount-b')}});
    await window.RYM_MODULES.open('__qa_a');
    await window.RYM_MODULES.open('__qa_b');
    await window.RYM_MODULES.unmount('__qa_b');
    result.lifecycle={calls,current:window.RYM_MODULES.current()};

    if(window.RYM_LEGACY_ROUTES){
      const canonical=window.RYM_LEGACY_ROUTES.get('panapass');
      const bridgeBefore=window.v70OpenPanapass;
      if(typeof canonical==='function'&&typeof bridgeBefore==='function'){
        window.v70OpenPanapass=async function(...args){return bridgeBefore.apply(this,args)};
        window.RYM_LEGACY_ROUTES.install();
        result.bridge={
          available:true,
          canonicalPreserved:window.RYM_LEGACY_ROUTES.get('panapass')===canonical,
          bridged:window.RYM_LEGACY_ROUTES.isBridged('v70OpenPanapass'),
          canonicalIsBridge:!!canonical.__rymV2RouteBridge
        };
      }else result.bridge={available:false,reason:'panapass entrypoints unavailable'};
    }else result.bridge={available:false,reason:'route bridge unavailable'};
    return result;
  });

  console.log(JSON.stringify({state,errors,consoleLines,failed},null,2));
  await browser.close();
  if(!state.ready) process.exit(1);
  const expected=['panapass','revisados','control-auto','gps','usuarios'];
  if(expected.some(x=>!state.data.modules.includes(x))) process.exit(1);
  if(state.data.styles!=='lazy-by-domain') process.exit(1);

  const panLinks=state.styles.panapass.links;
  if(state.styles.panapass.current!=='panapass') process.exit(1);
  if(!panLinks.some(x=>x.href==='/css/panapass.css'&&!x.disabled)) process.exit(1);
  if(!panLinks.some(x=>x.href==='/css/panapass-bajas.css'&&!x.disabled)) process.exit(1);

  const gpsLinks=state.styles.gps.links;
  if(state.styles.gps.current!=='gps') process.exit(1);
  if(!gpsLinks.some(x=>x.href==='/css/gps.css'&&!x.disabled)) process.exit(1);
  if(gpsLinks.some(x=>x.domain==='panapass'&&!x.disabled)) process.exit(1);
  if(state.styles.none.current!=='') process.exit(1);
  if(state.styles.none.links.some(x=>!x.disabled)) process.exit(1);

  const sequence=state.lifecycle.calls.join(',');
  if(sequence!=='open-a,unmount-a,open-b,unmount-b') process.exit(1);
  if(state.lifecycle.current!=='') process.exit(1);
  if(!state.bridge.available||!state.bridge.canonicalPreserved||!state.bridge.bridged||state.bridge.canonicalIsBridge) process.exit(1);
  if(errors.length) process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
