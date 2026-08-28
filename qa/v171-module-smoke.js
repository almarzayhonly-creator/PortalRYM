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
    const scripts=[...document.scripts].map(s=>({id:s.id||'',src:s.src||'',type:s.type||'',defer:s.defer,async:s.async}));
    const perf=performance.getEntriesByType('resource').filter(x=>String(x.name).includes('v171-loader')).map(x=>({name:x.name,initiatorType:x.initiatorType,duration:x.duration}));
    if(!window.RYM_V171_READY) return {ready:false,loader:loader?{src:loader.src,type:loader.type||'',defer:loader.defer,async:loader.async}:null,scripts,perf};
    try{return {ready:true,data:await window.RYM_V171_READY,loader:loader?{src:loader.src}:null,scripts,perf}}
    catch(e){return {ready:false,error:String(e),loader:loader?{src:loader.src}:null,scripts,perf}}
  });
  console.log(JSON.stringify({state,errors,consoleLines,failed},null,2));
  await browser.close();
  if(!state.ready) process.exit(1);
  const expected=['panapass','revisados','control-auto','gps','usuarios'];
  if(expected.some(x=>!state.data.modules.includes(x))) process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
