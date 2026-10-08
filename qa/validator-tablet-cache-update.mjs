import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'C:/Users/almar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const worker=(await import('../worker.js')).default;
const version=fs.readFileSync('unit-validator.html','utf8').match(/validator-tablet-app\.css\?v=(\d+)/)[1];
const build='unit-validator-shell-v'+version,cacheName='rym-unit-validator-shell-v'+version;
const old=file=>execFileSync('git',['show','de63de94c83a87cd182e4ea1a58ef4d866d9e158:'+file],{encoding:'utf8',maxBuffer:5e6});
let upgraded=false;
const mime=file=>file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'application/json';
const server=http.createServer(async(req,res)=>{
  try{
    if(req.url.includes('-sw.js'))console.log('SW request',upgraded?'new':'old');
    if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return}
    const response=await worker.fetch(new Request('http://127.0.0.1:4181'+req.url),{ASSETS:{fetch:async request=>{
      const url=new URL(request.url);
      if(url.pathname==='/')return new Response('<!doctype html><div class="login-card">Login</div><script>window.RYM_UNIT_VALIDATOR={session:()=>({authenticated:false}),logout:()=>{}};parent.postMessage({type:"rym-validator-state"},location.origin)</script>',{headers:{'content-type':'text/html'}});
      const file=['/unit-validator','/unit-validator.html'].includes(url.pathname)?'unit-validator.html':url.pathname.slice(1);
      const previous=!upgraded&&['unit-validator.html','validator-tablet-sw.js','modules/core/unit-validator-shell.js'].includes(file);
      return new Response(previous?old(file):fs.readFileSync(file),{headers:{'content-type':mime(file)}});
    }}});
    const headers=new Headers(response.headers);if(!upgraded&&headers.has('x-portal-build'))headers.set('x-portal-build','unit-validator-shell-v17');
    res.writeHead(response.status,Object.fromEntries(headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){console.error('Fixture request failed',req.url,String(error));res.writeHead(500);res.end(String(error));}
});
await new Promise(resolve=>server.listen(4181,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  page.on('pageerror',error=>console.error('Browser',String(error)));
  page.on('console',message=>{if(message.type()==='error')console.error('Console',message.text())});
  await page.goto('http://127.0.0.1:4181/?app=validador-unidad',{waitUntil:'domcontentloaded'});
  console.log('Old PWA loaded');
  await page.evaluate(async()=>{await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Old PWA SW did not activate')),15000))]);localStorage.setItem('validator-session-test','keep');sessionStorage.setItem('validator-tab-test','keep')});
  assert.ok((await page.evaluate(()=>caches.keys())).includes('rym-unit-validator-shell-v17'));
  console.log('Old cache active');
  const portal=await context.newPage();let portalNavigations=0;
  portal.on('framenavigated',frame=>{if(frame===portal.mainFrame())portalNavigations++});
  await portal.goto('http://127.0.0.1:4181/',{waitUntil:'domcontentloaded'});
  upgraded=true;
  await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();void registration.update()});
  await page.waitForFunction(expected=>document.querySelector('meta[name="rym-validator-build"]')?.content===expected,build,{timeout:30000});
  await page.waitForFunction(async expected=>{const keys=await caches.keys();return keys.includes(expected)&&!keys.includes('rym-unit-validator-shell-v17')},cacheName);
  assert.equal(await page.evaluate(()=>localStorage.getItem('validator-session-test')),'keep');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('validator-tab-test')),'keep');
  assert.ok((await page.locator('script[src*="unit-validator-shell"]').getAttribute('src')).endsWith('?v='+version));
  const cache=await page.evaluate(async expected=>{const c=await caches.open(expected);return (await c.keys()).map(r=>r.url)},cacheName);
  assert.ok(cache.every(url=>!url.includes('validator-host')&&!url.includes('auth')&&!url.includes('functions')));
  const refreshed=await page.evaluate(async()=>{const r=await fetch('/?app=validador-unidad',{cache:'no-store'});return {status:r.status,build:r.headers.get('x-portal-build')}});
  assert.deepEqual(refreshed,{status:200,build});assert.equal(portalNavigations,1,'General Portal window reloaded by dedicated SW upgrade');
  console.log(`PASS: installed v17 PWA upgrades automatically to v${version}; old static cache removed, local/session storage preserved, current shell resources loaded; general Portal window unaffected.`);
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
