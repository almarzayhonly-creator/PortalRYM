// Controlled load only: no Supabase credentials or external provider requests.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {InFlight,GpsFeedCoordinator} from './proposals/gps-feed-coordinator.mjs';
const require=createRequire(import.meta.url),root=process.cwd();
const source=fs.readFileSync('qa/validator-tablet-responsive.mjs','utf8');
// Reuse the existing fixtures and actual main functions without importing the test runner.
const factory=vm.createContext({fs,process,activeCase:'ok'});
vm.runInContext(source.slice(source.indexOf('const root='),source.indexOf('const v2Cases='))+
  source.slice(source.indexOf('function fixture(){'),source.indexOf('const worker='))+
  `;render=(id,unit)=>{seed.unidad=unit;seed.placa_unica='PL'+unit;seed.panapass_numero=String(1100000+Number(unit.slice(2)));return fixture()}`,factory);
const clients=new Map(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function register(id,unit){
  const html=factory.render(id,unit),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const context=vm.createContext({window:{},performance,setTimeout});
  vm.runInContext(script.slice(0,script.indexOf('  const E99='))+';payload={rpc,req};',context);
  const transport=`state.profile.id=${JSON.stringify(id)};
    async function loadCall(service,args){const call={...args,start:performance.now()};calls.push(call);try{
      const response=await fetch('/__load/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({service,...args})});
      if(!response.ok)throw Error('LOAD_HTTP_'+response.status);return await response.json()
    }finally{call.end=performance.now()}}
    rpc=(name,args)=>loadCall('rpc',{name,args});req=(url,opt)=>loadCall('req',{url,opt});\n`;
  clients.set(id,{id,unit,html:html.replace('  const E99=',transport+'  const E99='),payload:context.payload});
  return clients.get(id);
}
class Pool{
  constructor(limit=4){this.limit=limit;this.active=0;this.queue=[]}
  async run(task){if(this.active>=this.limit)await new Promise(resolve=>this.queue.push(resolve));else this.active++;
    try{return await task()}finally{const next=this.queue.shift();if(next)next();else this.active--}}
}
const quantile=(values,q)=>{const sorted=[...values].sort((a,b)=>a-b);return Math.round(sorted[Math.max(0,Math.ceil(sorted.length*q)-1)]||0)};
const summary=values=>({count:values.length,p50Ms:quantile(values,.5),p95Ms:quantile(values,.95),maxMs:quantile(values,1)});
let mode,metrics,flights,enaCache,pools,gpsBurst;
function reset(next,count){mode=next;metrics={outbound:{},services:{},errors:0};flights=new InFlight();enaCache=new Map();pools=new Map();
  let arrived=0,release,reject;const ready=new Promise((resolve,fail)=>{release=resolve;reject=fail});
  let timer;gpsBurst=()=>{if(!arrived)timer=setTimeout(()=>reject(Error('Incomplete GPS burst: '+arrived+'/'+count)),15000);if(++arrived===count){clearTimeout(timer);release()}return ready};
}
async function upstream(name,delay){if(!pools.has(name))pools.set(name,new Pool());return pools.get(name).run(async()=>{
  metrics.outbound[name]=(metrics.outbound[name]||0)+1;await sleep(delay);return {sampled:true}
})}
function serviceOf(body){if(body.service==='rpc')return 'Busqueda';const url=body.url||'';
  for(const [part,name] of [['ena-consulta','ENA'],['gps-rym-validator','GPS'],['revisados-final','Revisados'],['revisados-ficha','Ficha'],['revisados_vehiculo_oficial','Oficial'],['ena_cuentas','Cuenta']])if(url.includes(part))return name;
  return 'Otros';
}
async function execute(client,body){
  if(!client)throw Object.assign(Error('Forbidden'),{status:403});
  const service=serviceOf(body),args=body.args||{};
  // Mock scopes apply before a shared upstream read. Never share user authorization/results.
  if(body.service==='rpc'&&args.p_buscar!==client.unit)throw Object.assign(Error('Out of scope'),{status:403});
  const posted=body.opt?.body?JSON.parse(body.opt.body):{};
  if(posted.unidad&&posted.unidad!==client.unit)throw Object.assign(Error('Out of scope'),{status:403});
  if(service==='GPS'){
    // Synchronize this controlled burst so late HTTP arrivals are not mistaken for duplicates.
    // The proposed policy shares only IN-FLIGHT reads; a later burst must fetch fresh feeds.
    await gpsBurst();
    const reads=['GPS-feed','Status-feed'].map(name=>mode==='coalesced'?flights.read(name,()=>upstream(name,120)):upstream(name,120));
    await Promise.all(reads);
  }else if(service==='ENA'){
    // Existing production ENA policy already has a 2-minute cache and account lock.
    const key='ENA:'+client.unit;if(!enaCache.has(key))await flights.read(key,async()=>{await upstream('ENA',150);enaCache.set(key,true)});
  }else await sleep(service==='Revisados'?100:service==='Ficha'?40:10);
  return body.service==='rpc'?client.payload.rpc(body.name,args):client.payload.req(body.url,body.opt);
}
const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('worker.js','utf8')).toString('base64'))).default;
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try{
    const client=clients.get(req.headers['x-load-user']);
    if(req.url==='/__load/api'){
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16384)throw Error('Oversize request')}
      const body=JSON.parse(raw),service=serviceOf(body),start=performance.now();
      try{const result=await execute(client,body);res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(result))}
      finally{(metrics.services[service]??=[]).push(performance.now()-start)}
      return;
    }
    const response=await worker.fetch(new Request('http://127.0.0.1:4187'+req.url),{ASSETS:{fetch:async request=>{
      const u=new URL(request.url);if(u.pathname==='/'&&u.searchParams.has('validator-host'))return new Response(client.html,{headers:{'content-type':'text/html'}});
      const file=path.join(root,u.pathname==='/'?'index.html':u.pathname==='/unit-validator'?'unit-validator.html':u.pathname);
      return new Response(fs.readFileSync(file),{headers:{'content-type':mime[path.extname(file)]||'application/octet-stream'}});
    }}});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){metrics.errors++;res.writeHead(error.status||500,{'content-type':'application/json'});res.end(JSON.stringify({error:error.message}))}
});
await new Promise(resolve=>server.listen(4187,'127.0.0.1',resolve));
const base='http://127.0.0.1:4187',report={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  kind:'controlled simulation; not a production capacity or real provider latency benchmark',parameters:{synchronizedGpsBurst:true,gpsFeedMs:120,statusFeedMs:120,externalPoolPerFeed:4,enaMs:150,revisadosMs:100,fichaMs:40},http:[],browser:[]};
async function api(client,body){const response=await fetch(base+'/__load/api',{method:'POST',headers:{'content-type':'application/json','x-load-user':client.id},body:JSON.stringify(body)});assert.equal(response.status,200);return response.json()}
const reqBody=(url,body={})=>({service:'req',url,opt:{method:'POST',body:JSON.stringify(body)}});
try{
  const secret='controlled-fixture-secret-not-a-real-credential',env={GPS_COORDINATOR_SECRET:secret};let feedCalls=0;
  const coordinator=new GpsFeedCoordinator(null,env,async()=>{feedCalls++;await sleep(20);return new Response('[{"unit":"QA200","raw":"unchanged"}]')});
  const feedRequest=path=>new Request('https://fixture.invalid'+path,{headers:{authorization:'Bearer '+secret}});
  assert.equal((await coordinator.fetch(new Request('https://fixture.invalid/gps'))).status,401);assert.equal(feedCalls,0);
  assert.equal((await coordinator.fetch(feedRequest('/not-allowed'))).status,404);assert.equal(feedCalls,0);
  const burst=await Promise.all(Array.from({length:50},()=>coordinator.fetch(feedRequest('/gps'))));
  assert.equal(feedCalls,1);for(const result of burst)assert.equal(await result.text(),'[{"unit":"QA200","raw":"unchanged"}]');
  await coordinator.fetch(feedRequest('/gps'));assert.equal(feedCalls,2,'Completed reads must not be cached');
  let failedCalls=0;const failing=new GpsFeedCoordinator(null,env,async()=>{failedCalls++;return failedCalls===1?new Response('failed',{status:500}):new Response('[]')});
  assert.equal((await failing.fetch(feedRequest('/status'))).status,502);assert.equal((await failing.fetch(feedRequest('/status'))).status,200);
  const probe=new InFlight();let attempts=0;
  await assert.rejects(probe.read('fail',async()=>{attempts++;throw Error('fixture failure')}));
  assert.equal(await probe.read('fail',async()=>{attempts++;return 'recovered'}),'recovered');assert.equal(attempts,2);
  for(const count of [10,25,50])for(const population of ['same-unit','different-units'])for(const policy of ['baseline','coalesced']){
    reset(policy,count);const cohort=Array.from({length:count},(_,i)=>register(`http-${i}`,population==='same-unit'?'QA200':'QA'+(200+i)));
    const elapsed=[];await Promise.all(cohort.map(async client=>{const start=performance.now();
      const rows=await api(client,{service:'rpc',name:'panapass_control_auto_v2',args:{p_buscar:client.unit,p_limit:8}});assert.equal(rows[0].unidad,client.unit);
      const result=await Promise.all([
        api(client,reqBody('/functions/v1/ena-consulta-saldo')),
        api(client,reqBody('/functions/v1/gps-rym-validator',{unidad:client.unit})),
        api(client,reqBody('/functions/v1/revisados-final')),
        api(client,reqBody('/functions/v1/revisados-ficha',{unidad:client.unit})),
        api(client,reqBody('/rest/v1/revisados_vehiculo_oficial')),
        api(client,reqBody('/rest/v1/ena_cuentas'))]);
      assert.equal(result[1].data.rows[0].unidad,client.unit);elapsed.push(performance.now()-start);
    }));
    assert.equal(metrics.errors,0);assert.equal(metrics.outbound['GPS-feed'],policy==='baseline'?count:1);
    assert.equal(metrics.outbound['Status-feed'],policy==='baseline'?count:1);assert.equal(metrics.outbound.ENA,population==='same-unit'?1:count);
    const outbound={...metrics.outbound};const denied=await fetch(base+'/__load/api',{method:'POST',headers:{'content-type':'application/json','x-load-user':cohort[0].id},body:JSON.stringify(reqBody('/functions/v1/gps-rym-validator',{unidad:'OUT-OF-SCOPE'}))});
    assert.equal(denied.status,403);assert.deepEqual(metrics.outbound,outbound,'Denied request reached shared sources');
    const row={users:count,population,policy,total:summary(elapsed),outbound,services:Object.fromEntries(Object.entries(metrics.services).map(([name,times])=>[name,summary(times)])),expectedDenied:1};report.http.push(row);
    console.log(`PASS ${policy} ${count} ${population}: p95=${row.total.p95Ms}ms; GPS upstream=${outbound['GPS-feed']+outbound['Status-feed']}; ENA=${outbound.ENA}`);
  }
  if(!process.argv.includes('--http-only')){
    const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/almar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
    const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
    try{for(const policy of ['baseline','coalesced']){
      reset(policy,10);const contexts=[],errors=[],elapsed=[];
      await Promise.all(Array.from({length:10},async(_,i)=>{
        const client=register('browser-'+i,'QA'+(300+i));const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',extraHTTPHeaders:{'x-load-user':client.id}});contexts.push(context);
        await context.route('https://**/*',route=>route.abort());const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
        await page.goto(base+'/?app=validador-unidad');await page.locator('#portal.ready').waitFor();const host=page.frameLocator('#portal');
        const start=performance.now();await host.locator('#v101ValidatorQ').fill(client.unit);await host.locator('#v101ValidatorQ').press('Enter');
        await host.locator('#v101CheckModal[data-uva-enriched]').waitFor();await host.locator('#v117GpsCard:not(.pending)').waitFor();await host.locator('#v117PanCard:not(.pending)').waitFor();
        assert.equal(await host.locator('.uva-unit-preview-main strong').innerText(),client.unit);assert.equal(await host.locator('.uva-gps-pill').count(),2);
        assert.equal(await host.locator('#v117PanCard .v117-card-value').innerText(),'B/. 0.25');
        const calls=await host.locator('#v101CheckModal').evaluate(()=>QA.calls);
        for(const part of ['ena-consulta','gps-rym-validator','revisados-final','revisados-ficha','revisados_vehiculo_oficial','ena_cuentas'])assert.equal(calls.filter(call=>call.url?.includes(part)).length,1,part+' duplicate');
        assert.equal(calls.filter(call=>call.name==='panapass_control_auto_v2').length,1,'Master lookup duplicate');elapsed.push(performance.now()-start);
      }));
      assert.deepEqual(errors,[]);assert.equal(metrics.errors,0);for(const context of contexts)await context.close();
      report.browser.push({users:10,policy,total:summary(elapsed),outbound:metrics.outbound});console.log(`PASS browser: 10 isolated sessions ${policy}; no duplicates, cross-unit leakage or page errors`);
    }}finally{await browser.close()}
  }
  fs.mkdirSync('.sandbox/validator-load',{recursive:true});fs.writeFileSync('.sandbox/validator-load/results.json',JSON.stringify(report,null,2));
  console.log('PASS: 340 controlled HTTP validations, denied scopes and failed-flight recovery; no production load.');
}finally{await new Promise(resolve=>server.close(resolve))}
