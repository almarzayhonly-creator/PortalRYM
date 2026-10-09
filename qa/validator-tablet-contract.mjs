import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const shell=fs.readFileSync('unit-validator.html','utf8');
const buildMatch=shell.match(/validator-tablet-app\.css\?v=(\d+)/);
assert.ok(buildMatch,'Unit validator build version missing from shell');
const BUILD=buildMatch[1];
const changed=execFileSync('git',['diff','--name-only','HEAD^','--','unit-validator.html','worker.js','validator-tablet-sw.js','modules/core/unit-validator-shell.js','modules/control-auto/validator-tablet-app.js','modules/control-auto/validator-presentation.js','modules/control-auto/validator-details.js','css/validator-tablet-app.css'],{encoding:'utf8'});
if(changed.trim()){
  const previous=execFileSync('git',['show','HEAD^:unit-validator.html'],{encoding:'utf8'}).match(/validator-tablet-app\.css\?v=(\d+)/)[1];
  assert.ok(Number(BUILD)>Number(previous),'Presentation changes require a new build; never reuse cached version URLs');
}
const main=execFileSync('git',['show','origin/main:index.html'],{encoding:'utf8',maxBuffer:5e6});
assert.ok(fs.readFileSync('index.html','utf8').replaceAll('\r\n','\n')===main.replaceAll('\r\n','\n'),'Main source changed (excluding checkout line endings)');
const workerSource=fs.readFileSync('worker.js','utf8');
const swSource=fs.readFileSync('validator-tablet-sw.js','utf8');
assert.ok(shell.includes('/modules/core/unit-validator-shell.js?v='+BUILD),'Shell JS build mismatch');
assert.ok(workerSource.includes('/modules/control-auto/validator-tablet-app.js?v='+BUILD),'Worker app JS build mismatch');
assert.ok(workerSource.includes('/css/validator-tablet-app.css?v='+BUILD),'Worker CSS build mismatch');
assert.ok(workerSource.includes('unit-validator-shell-v'+BUILD),'Worker build header mismatch');
assert.ok(swSource.includes("rym-unit-validator-shell-v"+BUILD),'Service worker cache build mismatch');
assert.ok(swSource.includes('/css/validator-tablet-app.css?v='+BUILD),'Service worker CSS build mismatch');
assert.ok(swSource.includes('/modules/control-auto/validator-tablet-app.js?v='+BUILD),'Service worker app JS build mismatch');
assert.ok(swSource.includes('/modules/core/unit-validator-shell.js?v='+BUILD),'Service worker shell JS build mismatch');
assert.ok(shell.includes('unit-validator-shell-v'+BUILD),'Visible shell build metadata mismatch');
assert.ok(workerSource.includes('/modules/control-auto/validator-presentation.js?v='+BUILD),'Presentation module build mismatch');
assert.ok(swSource.includes('/modules/control-auto/validator-presentation.js?v='+BUILD),'Presentation cache build mismatch');
assert.ok(workerSource.includes('/modules/control-auto/validator-details.js?v='+BUILD),'Detail renderer build mismatch');
assert.ok(swSource.includes('/modules/control-auto/validator-details.js?v='+BUILD),'Detail renderer cache build mismatch');
const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8').replace(/^\s*\/\/.*$/gm,''));
for(const route of ['/unit-validator','/unit-validator.html','/validator-tablet-sw.js','/modules/core/unit-validator-shell.js','/modules/control-auto/validator-presentation.js','/modules/control-auto/validator-details.js','/modules/control-auto/validator-tablet-app.js','/css/validator-tablet-app.css'])assert.ok(config.assets.run_worker_first.includes(route),route+' bypasses Worker cache/build headers');
const manifest=JSON.parse(fs.readFileSync('validator-tablet.webmanifest','utf8'));
assert.equal(manifest.name,'Validador RYM');assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/?app=validador-unidad');
for(const icon of manifest.icons){const png=fs.readFileSync('.'+icon.src);assert.equal(png.subarray(1,4).toString(),'PNG');const size=Number(icon.sizes.split('x')[0]);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size)}
const handlers={},cached=[],fetches=[];
const context={self:{location:{origin:'https://preview.test'},addEventListener:(name,cb)=>handlers[name]=cb,skipWaiting:async()=>{},clients:{claim:async()=>{}}},URL,
 Request:class{constructor(url,options){this.url=url;this.cache=options.cache}},
 caches:{open:async()=>({addAll:async urls=>{assert.ok(urls.every(r=>r.cache==='reload'));cached.push(...urls.map(r=>r.url))},put:async request=>cached.push(request.url)}),keys:async()=>[],match:async()=>null},
 fetch:async request=>{fetches.push(request.url);return {ok:true,clone:()=>({})}}};
vm.runInNewContext(fs.readFileSync('validator-tablet-sw.js','utf8'),context);
let pending;handlers.install({waitUntil:p=>pending=p});await pending;
const originalOpen=context.caches.open;
context.caches.open=async()=>({addAll:async()=>{throw Error('Network unavailable')}});
handlers.install({waitUntil:p=>pending=p});await assert.rejects(pending,/Network unavailable/,'Incomplete precache must not activate a new SW');
context.caches.open=originalOpen;
const deleted=[],navigated=[];
context.caches.keys=async()=>['rym-unit-validator-shell-v17','unrelated-session-cache'];
context.caches.delete=async key=>deleted.push(key);
context.self.clients.matchAll=async()=>[
  {url:'https://preview.test/?app=validador-unidad',navigate:url=>{navigated.push(url);return new Promise(()=>{})}},
  {url:'https://preview.test/?validator-host=1',navigate:()=>assert.fail('Host frame must not navigate')},
  {url:'https://preview.test/',navigate:()=>assert.fail('Main portal must not navigate')}
];
handlers.activate({waitUntil:p=>pending=p});
await Promise.race([pending,new Promise((_,reject)=>setTimeout(()=>reject(Error('SW activation deadlocked on navigation')),200))]);
assert.deepEqual(deleted,['rym-unit-validator-shell-v17']);assert.deepEqual(navigated,['https://preview.test/?app=validador-unidad']);
assert.ok(cached.every(url=>!url.includes('validator-host')&&!url.includes('auth')&&!url.includes('functions')));
for(const url of ['/?app=validador-unidad','/?validator-host=1','/auth/v1/token','/functions/v1/ena-consulta-saldo','/functions/v1/gps-rym-validator','/functions/v1/revisados-final','/rest/v1/rpc/panapass_control_auto_v2','/rest/v1/ena_cuentas','/rest/v1/revisados_vehiculo_oficial']){
  const before=cached.length;pending=null;handlers.fetch({request:{url:'https://preview.test'+url,method:'GET'},respondWith:p=>pending=p});await pending;assert.equal(cached.length,before,url+' cached operational data');
}
let responded=false;handlers.fetch({request:{url:'https://preview.test/auth/v1/token',method:'POST'},respondWith:()=>responded=true});assert.equal(responded,false);
handlers.fetch({request:{url:'https://supabase.test/rest/v1/units',method:'GET'},respondWith:()=>responded=true});assert.equal(responded,false);
handlers.fetch({request:{url:'https://preview.test/css/validator-tablet-app.css?v='+BUILD,method:'GET'},respondWith:p=>pending=p});await pending;assert.ok(cached.includes('https://preview.test/css/validator-tablet-app.css?v='+BUILD));
const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('worker.js','utf8')).toString('base64'))).default;
const assets={fetch:async()=>new Response(main,{headers:{'content-type':'text/html'}})};
const portal=await worker.fetch(new Request('https://preview.test/'),{ASSETS:assets});const portalHtml=await portal.text();
assert.ok(!portalHtml.includes('<html class="rym-unit-validator-app"'));
const host=await worker.fetch(new Request('https://preview.test/?validator-host=1'),{ASSETS:assets});const hostHtml=await host.text();assert.ok(hostHtml.includes('<html class="rym-unit-validator-app"'));
assert.ok(hostHtml.includes('/modules/control-auto/validator-tablet-app.js?v='+BUILD));
const count=(hay,needle)=>hay.split(needle).length-1;
assert.equal(count(hostHtml,'validator-tablet-app.js?v='+BUILD),1,'adapter injected more than once');
assert.equal(count(hostHtml,'validator-tablet-app.css?v='+BUILD),1,'validator CSS injected more than once');
assert.ok(hostHtml.includes("const tone=level==='CRITICO'?'bad'"),'Host summary must use official evaluated GPS level');
const staticAssets={fetch:async request=>{
  const pathname=new URL(request.url).pathname;
  const file=pathname==='/unit-validator'?'unit-validator.html':pathname.slice(1);
  return new Response(fs.readFileSync(file),{headers:{'content-type':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript'}});
}};
for(const route of ['/?app=validador-unidad','/unit-validator','/unit-validator.html','/validator-tablet-sw.js','/modules/control-auto/validator-tablet-app.js?v='+BUILD]){
  const response=await worker.fetch(new Request('https://preview.test'+route),{ASSETS:staticAssets});
  assert.equal(response.status,200);assert.equal(response.headers.get('x-portal-build'),'unit-validator-shell-v'+BUILD);assert.match(response.headers.get('cache-control'),/no-store/);
}
const loader=fs.readFileSync('modules/v171-loader.js','utf8');
assert.ok(!loader.includes('validator-tablet-app.js'),'global loader must not load dedicated adapter');
assert.ok(!loader.includes('validator-tablet-app.css'),'global loader must not load dedicated CSS');
const launcher=fs.readFileSync('modules/core/unit-validator-launcher.js','utf8');assert.ok(launcher.includes("w.rymHasModule(PERM)"));
console.log('PASS: main parity, worker route isolation, local PWA icons, manifest, static-only SW caching, launcher permission.');
