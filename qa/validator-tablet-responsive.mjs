import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/almar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),source=fs.readFileSync('index.html','utf8');
const originalStyles=[...source.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map(m=>m[0]).join('\n');
const core=source.match(/<script id="rym-v99-centro-control-js">([\s\S]*?)<\/script>/)[1];
const validator=core.slice(core.indexOf('  const E99='),core.indexOf('  function card99('));
const consistency=source.match(/<script id="rym-v125-consistency-js">([\s\S]*?)<\/script>/)[1];
const clean=consistency.slice(consistency.indexOf('  function cleanQuickQuery(){'),consistency.indexOf('  function improveControlSupervisorMobile('));
// Execute main's actual validator functions, with deterministic responses only in this test server.
const seed={unidad:'QA200',placa_unica:'QA14826',placa_comercial:'QA-CUPO',estatus:'ACTIVO',panapass_numero:'1129235',panapass_display:'1129235 · QA',ena_saldo:.25,empresa_duena:'EMPRESA QA',empresa_operadora:'OPERADORA QA',supervisora:'SUPERVISORA QA',galera:'GALERA QA',mes_revisado:'OCTUBRE',color:'Titan Grey',marca:'Hyundai',modelo:'QA-MODELO',anio:2020,chasis:'QA-CHASIS',motor:'QA-MOTOR',transmision:'MANUAL',estatus_netsuite:'QA-NETSUITE',tag:'TAG-1',tags_ena:'TAG-1, TAG-2',cantidad_tags:2,tags_detalle:[{tag:'TAG-2',estado:'ACTIVO',estado_financiero:'AL DIA',tipo_tag:'QA-TIPO-TAG',matricula:'QA14826',tipo_vehiculo:'AUTO',corregimiento:'QA',consultado_at:'2026-10-07T12:00:00Z'}]};
const official={placa:'QA14826',actualizado_at:'2026-10-07T12:00:00Z',ultima_respuesta:{detalleRespuesta:'QA GUARDADO',nroPlaca:'QA14826',cupo:'QA-OFICIAL',nombrePropietario:'PROPIETARIO QA',nroDocumentoPropietario:'DOC-QA',nroVin:'QA-VIN-LARGO-'+ '0123456789'.repeat(24),nroChasis:'OFICIAL-CHASIS',nroMotor:'OFICIAL-MOTOR',marcavehiculo:'MARCA OFICIAL QA',modeloVehiculo:'MODELO OFICIAL QA',anioVehiculo:2021,colorVehiculo:'COLOR QA',tipoVehiculo:'TIPO QA',tipoPlaca:'PLACA QA',tipoUso:'USO QA',estadoVehiculo:'ESTADO QA',tipoTransmision:'AUTOMATICA',tipoCombustible:'GASOLINA',cilindradaVehiculo:1500,nroCilindros:4,capacidadVehiculo:5,tipoCapacidad:'PERSONAS',nroPuertas:4,traccionMotor:'DELANTERA',tieneAireAcondicionado:false,hipoteca:false,tipoPertenencia:'PROPIA',aseguradora:'ASEGURADORA QA',poliza:'QA<123>',restriccionVehiculos:'RESTRICCION QA',fechaRevisado:'2026-10-01',mesRevisado:'OCTUBRE',idRevisados:123,ultTallerRevisado:'TALLER QA',observaciones:'OBSERVACION QA'}};
const cases=process.argv.includes('--progressive-only')?['progressive']:process.argv.includes('--latency-only')?['fast-enter','parallel','master-fallback']:['rev-expired','gps-critical','gps-unknown','gps2-only','identity-match','official-missing','operativo','supervisora','ok','progressive','fast-enter','parallel','master-fallback','pan-negative','no-pan','rev-pending','rev-blocked','gps-alert','no-gps','stopped','custody','bodywork','closed','ena-error','not-found','no-permission'];
const sizes=[[360,800],[390,844],[412,915],[768,1024],[800,1280],[1024,768],[1280,800],[1440,900]];
let activeCase='ok';
function fixture(){
  return `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">${originalStyles}</head><body class="v99-home"><div id="app"><div class="v101-shell"><aside class="v101-side">Forbidden sidebar</aside><main class="v101-main"><header class="v101-top">Forbidden portal</header><div class="v101-content"><section class="v101-validator"><div class="v101-validator-head"><h3>Validador rápido de unidad</h3><p>Original helper</p></div><div class="v101-validator-tools"><div class="v101-validator-box"><input id="v101ValidatorQ" class="v101-validator-input"><div id="v101ValidatorList" class="v101-validator-list" style="display:none"></div></div><button id="v101ValidatorGo" class="v101-validator-go">Validar</button></div></section><section class="v99-grid">Forbidden dashboard</section></div></main></div></div><script>
  const testCase=${JSON.stringify(activeCase)},testSeed=${JSON.stringify(seed)},testOfficial=${JSON.stringify(official)},calls=[];
  const state={profile:{nombre:'Usuario QA',rol:testCase==='operativo'?'OPERATIVO':testCase==='supervisora'?'SUPERVISORA':'ADMIN_TOTAL'},allModules:testCase==='no-permission'?[]:['control_auto.validador_unidad_app']};
  window.rymHasModule=code=>state.allModules.includes(code);
  function clearSession(){state.profile=null;state.allModules=[]}
  function loginView(){document.body.className='';document.getElementById('app').innerHTML='<div class="login-card">Inicia sesión</div>'}
  window.v36PortalHome=async()=>{};
  function gpsDate116(v){return String(v)}
  async function rpc(name,args){calls.push({name,args});if(testCase==='fast-enter'||testCase==='parallel')await new Promise(resolve=>setTimeout(resolve,testCase==='fast-enter'?350:100));if(testCase==='not-found'||(testCase==='master-fallback'&&name==='panapass_control_auto_v2'&&args.p_limit===8))return [];const s={...testSeed};if(testCase==='progressive')s.mes_revisado='ENERO';if(testCase==='rev-expired')s.mes_revisado='MARZO';if(testCase==='identity-match')s.chasis=' QA-CHASIS '; if(testCase==='pan-negative')s.ena_saldo=-2;if(testCase==='no-pan')s.panapass_numero='';if(testCase==='stopped'){s.estatus='PARADO';s.status2='TALLER'}if(testCase==='closed')s.estatus='CERRADA';return [s]}
  async function req(url,opt){const call={url,opt,start:performance.now()};calls.push(call);try{
  if(testCase==='parallel')await new Promise(resolve=>setTimeout(resolve,120));if(testCase==='progressive')await new Promise(resolve=>setTimeout(resolve,url.includes('gps-rym-validator')?650:url.includes('ena-consulta')?450:50));
  if(url.includes('portal-session-modules'))return {data:{ok:true,modules:state.allModules}};
  if(url.includes('revisados-ficha'))return {data:{ok:true,unidad:testSeed,oficial:testCase==='official-missing'?null:{placa:testSeed.placa_unica},operacion:testCase==='rev-expired'?{estado_revisado:'VENCIDO',fecha_ultimo_revisado:'2025-03-07'}:null,logistica:{status2:testCase==='stopped'?'TALLER':testCase==='custody'?'CUSTODIA':testCase==='bodywork'?'CHAPISTERÍA':'ACTIVO'}}};
  if(url.includes('/rest/v1/ena_cuentas'))return {data:[{panapass_display:'1129235 · QA',estado_acceso:'OK',tipo_credencial:'QA-CREDENCIAL',ena_empresa:'ENA EMPRESA QA',ena_ruc:'RUC-QA',ena_email:'qa@example.test',ultimo_login_ok:'2026-10-07T12:00:00Z',ultima_consulta:'2026-10-07T12:00:00Z',updated_at:'2026-10-07T12:00:00Z'}]};if(url.includes('/rest/v1/revisados_vehiculo_oficial'))return {data:testCase==='official-missing'?[]:[testCase==='identity-match'?{...testOfficial,ultima_respuesta:{...testOfficial.ultima_respuesta,nroChasis:'qa chasis'}}:testOfficial]};if(url.includes('revisados-final'))return {data:{ok:true,rows:[{unidad:testSeed.unidad,estado:['rev-pending','rev-expired'].includes(testCase)?'PENDIENTE':'VIGENTE',meses_atraso:testCase==='rev-expired'?7:0,emitido:!['rev-pending','rev-expired'].includes(testCase),bloqueado:testCase==='rev-blocked',status2:testCase==='stopped'?'TALLER':testCase==='custody'?'CUSTODIA':testCase==='bodywork'?'CHAPISTERÍA':'ACTIVO',mes_revisado:'OCTUBRE',ultimo_revisado:'2026-10-01',fotos_disponibles:true,cantidad_fotos:2}]}};if(url.includes('ena-consulta')){if(testCase==='ena-error')throw Error('Sin respuesta ENA');return {data:{ok:true,results:[{result:'OK',summary:{saldo_texto:testCase==='pan-negative'?'-2.00':'0.25'}}]}}}if(url.includes('gps-rym-validator')&&testCase==='gps-unknown')return {data:{ok:true,rows:[]}};if(url.includes('gps-rym-validator'))return {data:{ok:true,rows:[{unidad:testSeed.unidad,historico:testCase==='closed',nivel:testCase==='gps-critical'?'CRITICO':['gps-alert','gps2-only'].includes(testCase)?'ALERTA':'OK',estado_operativo:'ACTIVO',razon:'DIAGNOSTICO QA',gps1:{installed:!['no-gps','gps2-only'].includes(testCase),ok:testCase!=='gps-critical',last:'2026-10-07',proveedor:'PROVEEDOR QA',imei:'IMEI QA',metadata:{satellites:8}},gps2:{installed:true,ok:!['gps-alert','gps-critical'].includes(testCase),last:'2026-10-07'},estado_operativo:'ACTIVO',razon:'Diagnóstico QA'}]}};throw Error('Unexpected request '+url)}finally{call.end=performance.now()}}
  ${validator}
  const E=E99,N=N99;
  ${clean}
  const cleanup=new MutationObserver(()=>{cleanup.disconnect();cleanQuickQuery();cleanup.observe(document.body,{childList:true,subtree:true})});
  cleanup.observe(document.body,{childList:true,subtree:true});
  bindValidator99();
  window.QA={calls,state,open:openValidator99};
  if(testCase==='progressive'){
    const stormObserver=new MutationObserver(()=>{
      const modal=document.querySelector('#v101CheckModal'),grid=modal?.querySelector('.v117-quick-grid');
      if(!grid||QA.storm)return;
      const originals=['v117RevCard','v117CtlCard'].map(id=>document.getElementById(id).cloneNode(true));
      const noise=document.createElement('span');noise.hidden=true;modal.appendChild(noise);
      QA.storm={started:performance.now(),active:true,ticks:0};
      const timer=setInterval(()=>{
        QA.storm.ticks++;noise.textContent=String(QA.storm.ticks);
        if(QA.storm.ticks%4===0)originals.forEach(card=>document.getElementById(card.id)?.replaceWith(card.cloneNode(true)));
        if(performance.now()-QA.storm.started>=1600){clearInterval(timer);QA.storm.active=false;QA.storm.duration=performance.now()-QA.storm.started}
      },30);
    });
    stormObserver.observe(document.body,{childList:true,subtree:true});
  }
  </script></body></html>`;
}
const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('worker.js','utf8')).toString('base64'))).default;
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
  try{
    const response=await worker.fetch(new Request('http://127.0.0.1:4179'+req.url),{ASSETS:{fetch:async request=>{
      const u=new URL(request.url);if(u.pathname==='/'&&u.searchParams.has('validator-host')&&activeCase!=='real-login')return new Response(fixture(),{headers:{'content-type':'text/html'}});
      const file=path.join(root,u.pathname==='/'?'index.html':u.pathname==='/unit-validator'?'unit-validator.html':u.pathname);
      return new Response(fs.readFileSync(file),{headers:{'content-type':mime[path.extname(file)]||'application/octet-stream'}});
    }}});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(e){res.writeHead(500);res.end(String(e))}
});
await new Promise(r=>server.listen(4179,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const out=path.join(root,'.sandbox/validator-qa');fs.mkdirSync(out,{recursive:true});
let count=0;const report=[],errors=[];
try{
for(const [width,height] of process.argv.includes('--smoke')?[]:sizes){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
  await context.route('https://drive.google.com/**',r=>r.abort());
  for(const scenario of cases){
    activeCase=scenario;
    const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4179/?app=validador-unidad');
    const host=page.frameLocator('#portal');await page.locator('#portal.ready').waitFor();
    if(scenario==='no-permission'){
      await host.locator('.uva-denied').waitFor();assert.equal(await host.locator('#v101ValidatorQ').count(),0);
      assert.equal(await host.locator('#v101CheckModal').count(),0);
      await page.screenshot({path:path.join(out,`${width}x${height}-${scenario}.png`)});
      await page.locator('#exit').click();await host.locator('.login-card').waitFor();
    }else{
      assert.equal(await host.locator('.v101-side').isVisible(),false);
      assert.equal(await host.locator('.v99-grid').isVisible(),false);
      if(width<=650){
        const button=await host.locator('#v101ValidatorGo').boundingBox(),input=await host.locator('#v101ValidatorQ').boundingBox();
        assert.equal(Math.round(button.width),Math.round(input.width),'Mobile Validate must fill the input width');
        assert.ok(button.height>=48);
        assert.equal(await host.locator('#v101ValidatorGo').evaluate(x=>getComputedStyle(x,':after').content),'none');
      }
      await host.locator('#v101ValidatorQ').fill(scenario==='not-found'?'ZZZZ':'QA200');
      if(scenario==='not-found'){
        await host.locator('#v101ValidatorGo').click();await host.locator('.v101-check-empty').waitFor();
        assert.match(await host.locator('#v101ValidatorList').innerText(),/Sin coincidencias/);
        await page.screenshot({path:path.join(out,`${width}x${height}-${scenario}.png`)});
      }else{
        if(scenario==='fast-enter')await host.locator('#v101ValidatorQ').press('Enter');
        else if(count%3===0){await host.locator('[data-v101pick]').waitFor();await host.locator('[data-v101pick]').click()}
        else if(count%3===1)await host.locator('#v101ValidatorQ').press('Enter');
        else await host.locator('#v101ValidatorGo').click();
        if(scenario==='progressive'){
          await host.locator('#v101CheckModal').evaluate(modal=>new Promise((resolve,reject)=>{
            const start=performance.now(),timer=setInterval(()=>{
              if(modal.dataset.uvaEnriched&&QA.storm?.active){QA.storm.enrichedAt=performance.now()-QA.storm.started;clearInterval(timer);resolve()}
              else if(performance.now()-start>1000){clearInterval(timer);reject(Error('Enrichment starved during progressive main mutations'))}
            },10);
          }));
          assert.equal(await host.locator('.uva-gps-pill').count(),2);
          await host.locator('#v101CheckModal').evaluate(()=>new Promise(resolve=>{
            const timer=setInterval(()=>{if(!QA.storm.active){clearInterval(timer);resolve()}},20);
          }));
          const storm=await host.locator('#v101CheckModal').evaluate(()=>QA.storm);
          assert.ok(storm.duration>=1000&&storm.ticks>=30,'Progressive fixture must stay active for at least a second');
          const feedback=await host.locator('#v101CheckModal').evaluate(modal=>new Promise(resolve=>{
            let count=0;const observer=new MutationObserver(records=>count+=records.length);
            observer.observe(modal,{childList:true,subtree:true});
            setTimeout(()=>{observer.disconnect();resolve(count)},250);
          }));
          assert.equal(feedback,0,'Adapter must settle after main finishes');
        }
        await host.locator('#v117Overall:not(.pending)').waitFor({state:'attached'});
        await host.locator('#v117GpsCard:not(.pending)').waitFor();
        await host.locator('#v117PanCard:not(.pending)').waitFor();
        await host.locator('#v101CheckModal[data-uva-enriched]').waitFor();
        assert.equal(await host.locator('.uva-unit-preview').count(),1);
        assert.equal(await host.locator('.v117-check-head').isVisible(),false);
        assert.equal(await host.locator('.v117-identity-line').isVisible(),false);
        assert.ok(!(await host.locator('.uva-unit-preview').innerText()).includes('ESTADO POR VALIDAR'));
        const operational=scenario==='closed'?'CERRADA':scenario==='stopped'?'PARADA · TALLER':scenario==='custody'?'PARADA · CUSTODIA':scenario==='bodywork'?'PARADA · CHAPISTERÍA':'ACTIVA';
        assert.equal(await host.locator('.uva-unit-state').innerText(),operational);
        assert.equal(await host.locator('#v117CtlCard .v117-card-value').innerText(),operational);
        assert.equal(await host.locator('.v117-status-card').count(),4);
        assert.equal(await host.locator('#v101OpenModule').isVisible(),false);
        for(const card of ['v117PanCard','v117RevCard','v117GpsCard','v117CtlCard']){
          assert.equal(await host.locator('#'+card+' header strong').isVisible(),false,'Original main summary still visible');
          assert.equal(await host.locator('#'+card+' .uva-detail-body').isVisible(),false,'Closed card exposes old rows');
          assert.equal(await host.locator('#'+card+' .v117-card-sub').count(),0);
        }
        assert.equal(await host.locator('#v101CheckModal').evaluate(modal=>
          [...modal.querySelectorAll('.v117-status-card header')].every(header=>{
            const flag=header.querySelector('.uva-verified-flag');if(!flag)return true;
            const range=document.createRange();range.selectNodeContents(header.querySelector('small'));
            return range.getBoundingClientRect().right<=flag.getBoundingClientRect().left;
          })),true,`${width} ${scenario}: title overlaps indicator`);
        const data=await host.locator('#v101CheckModal').evaluate(modal=>{
          const rect=modal.getBoundingClientRect(),again=modal.querySelector('#v101AgainCheck').getBoundingClientRect();
          const grid=modal.querySelector('.v117-quick-grid');
          const card=modal.querySelector('.v117-check-card');
          return {storm:window.QA.storm||null,overflow:document.documentElement.scrollWidth>innerWidth,modalWidth:rect.width,viewWidth:innerWidth,againVisible:again.bottom<=innerHeight&&again.top>=0,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,scroll:card.scrollHeight>innerHeight,status:modal.querySelector('#v117Overall').textContent,
            fonts:[...modal.querySelectorAll('header small,.v117-card-value,.uva-unit-preview-chips small,.uva-unit-preview-chips b,.uva-unit-state,.uva-priority-note')].filter(x=>x.getClientRects().length).map(x=>parseFloat(getComputedStyle(x).fontSize))};
        });
        assert.equal(data.overflow,false,`${width} ${scenario}: overflow`);assert.equal(data.againVisible,true);assert.equal(data.modalWidth,data.viewWidth);
        assert.ok(Math.min(...data.fonts)>=11,JSON.stringify(data.fonts));assert.equal(data.columns,width<=650?1:width<1000?2:4);
        // The historical closed-unit notice and expanded secondary data may require scrolling.
        await page.screenshot({path:path.join(out,`${width}x${height}-${scenario}.png`)});
        if(scenario!=='closed')assert.equal(data.scroll,false,`${width} ${scenario}: unnecessary scroll`);
        const expect=['ok','progressive','fast-enter','parallel','master-fallback','rev-blocked','identity-match','official-missing','operativo','supervisora','no-gps','gps2-only'].includes(scenario)?'ACTIVA · TODO OK':scenario==='closed'?'CERRADA · HISTORICO':scenario==='stopped'?'PARADA · TALLER':scenario==='custody'?'PARADA · CUSTODIA':scenario==='bodywork'?'PARADA · CHAPISTERÍA':['gps-alert','ena-error'].includes(scenario)?'ACTIVA · REVISAR':'ACTIVA · ALERTA';
        assert.equal(data.status,expect,scenario);
        if(!await host.locator('.uva-details').first().evaluate(x=>x.open))await host.locator('.uva-details').first().locator('summary').click();
        assert.equal(await host.locator('.v117-card-details').first().isVisible(),true);
        assert.ok(await host.locator('.v117-card-detail b').first().innerText());
        const panBody=await host.locator('#v117PanCard .uva-detail-body').innerText();
        assert.match(panBody,/Panapass display/i);assert.match(panBody,/TAG-2/);
        assert.match(panBody,/QA-TIPO-TAG/);
        if(scenario!=='no-pan')assert.match(panBody,/ENA EMPRESA QA/);
        if(scenario==='no-pan')assert.match(panBody,/Sin consulta registrada/i);
        if(scenario==='progressive'){
          assert.equal(await host.locator('#v117PanCard .v117-card-value').innerText(),'B/. 0.25');
          await page.screenshot({path:path.join(out,`${width}x${height}-progressive-pan-detail.png`)});
          await host.locator('#v117PanCard summary').click();
          for(const id of ['v117RevCard','v117GpsCard']){
            const card=host.locator('#'+id);
            await card.locator('summary').click();
            assert.equal(await card.locator('.uva-detail-body').isVisible(),true);
            await page.screenshot({path:path.join(out,`${width}x${height}-progressive-${id}-detail.png`)});
            await card.locator('summary').click();
          }
        }
        assert.equal(await host.locator('#v117RevCard .v117-card-value').innerText(),scenario==='rev-expired'?'VENCIDO · MARZO':scenario==='rev-pending'?'PENDIENTE · OCTUBRE':'VIGENTE');
        const revBody=await host.locator('#v117RevCard .uva-detail-body').textContent();
        if(scenario==='official-missing')assert.doesNotMatch(revBody,/Rev ID/i);else assert.match(revBody,/Rev ID/i);
        assert.match(revBody,/Emitido/i);assert.match(revBody,/Bloqueado/i);
        assert.equal(await host.locator('#v117RevCard img').count(),0);
        const gps=host.locator('#v117GpsCard');
        assert.equal(await gps.locator('.uva-gps-pill').count(),2);
        assert.equal(await gps.locator('.uva-gps-pill').first().getAttribute('class'), 'uva-gps-pill '+(['no-gps','gps2-only','gps-unknown'].includes(scenario)?'off':scenario==='gps-critical'?'bad':'ok'));
        assert.equal(await gps.locator('.uva-gps-pill').last().getAttribute('class'),'uva-gps-pill '+(scenario==='gps-unknown'?'off':['gps-alert','gps-critical'].includes(scenario)?'bad':'ok'));
        if(scenario==='gps-unknown')assert.match(await gps.locator('.uva-detail-body').textContent(),/Sin respuesta GPS disponible/);else assert.match(await gps.locator('.uva-detail-body').textContent(),/PROVEEDOR QA/);
        if(scenario!=='gps-unknown')assert.match(await gps.locator('.uva-detail-body').textContent(),/IMEI QA/);
        const gpsLabel=scenario==='gps-unknown'||scenario==='closed'?'SIN INFORMACIÓN':scenario==='gps-critical'?'CRÍTICO':scenario==='gps-alert'?'ALERTA':'NORMAL';
        assert.equal(await gps.locator('.uva-gps-level').innerText(),gpsLabel);assert.equal(await gps.locator('.uva-gps-level').isVisible(),true);
        assert.equal(await gps.locator('.uva-gps-pill small').count(),2);
        if(scenario==='ok'){
          await page.emulateMedia({reducedMotion:'reduce'});
          assert.equal(await gps.locator('.uva-gps-pill i').first().evaluate(x=>getComputedStyle(x).animationName),'none');
          await page.emulateMedia({reducedMotion:'no-preference'});
        }
        const control=host.locator('#v117CtlCard');
        await control.click();assert.equal(await control.locator('details').evaluate(x=>x.open),true);
        const body=await control.locator('.uva-detail-body').innerText();
        for(const label of (scenario==='official-missing'?['CONTROL DE AUTO · RYM','FICHA OFICIAL · ECARCHECK','Chasis','Motor','VIN']:['CONTROL DE AUTO · RYM','FICHA OFICIAL · ECARCHECK','Documento propietario','VIN','Transmisión','Combustible','Cilindrada','Cilindros','Capacidad','Puertas','Tracción','Aire acondicionado','Hipoteca','Pertenencia','Aseguradora','Póliza','Restricción vehicular','Rev ID','Último taller','Observaciones']))assert.ok(body.toUpperCase().includes(label.toUpperCase()),label+' missing');
        if(scenario==='official-missing'){assert.equal(await control.locator('.uva-identity-check.diff').count(),0);assert.equal(await control.locator('.uva-identity-check.missing').count(),8)}else{assert.match(body,/MARCA OFICIAL QA/);assert.match(body,/ASEGURADORA QA/);assert.match(body,/QA<123>/);assert.match(body,/false/)}
        const chassis=control.locator('.uva-identity-check').filter({hasText:/^Chasis/});
        if(scenario==='identity-match')assert.match(await chassis.getAttribute('class'),/match/);else if(scenario!=='official-missing')assert.match(await chassis.getAttribute('class'),/diff/);
        const vin=control.locator('.uva-identity-check').filter({hasText:/^VIN/});assert.match(await vin.getAttribute('class'),/missing/);
        if(scenario!=='official-missing')assert.ok((await vin.innerText()).length>200);
        assert.match(body,/Comparación de identidad RYM \/ eCarCheck/i);
        if(scenario==='official-missing')assert.match(body,/SIN DATOS PARA COMPARAR/);else assert.match(body,/NO COINCIDE/);
        if(scenario==='gps-alert')assert.match(await gps.locator('.uva-priority-note').textContent(),/ALERTA/);
        if(scenario==='progressive')await page.screenshot({path:path.join(out,`${width}x${height}-progressive-control-detail.png`)});
        assert.equal(await control.locator('img').count(),0);
        assert.equal(await host.locator('#v101CheckModal').evaluate(x=>x.scrollWidth>innerWidth),false);
        await control.click();assert.equal(await control.locator('details').evaluate(x=>x.open),false);
        await control.focus();await control.press('Enter');assert.equal(await control.locator('details').evaluate(x=>x.open),true);
        await control.press('Space');assert.equal(await control.locator('details').evaluate(x=>x.open),false);
        const sourceCalls=await host.locator('#v101CheckModal').evaluate(()=>QA.calls);
        assert.equal(sourceCalls.filter(x=>x.name==='panapass_control_auto_v2'&&x.args.p_limit===8).length,1,scenario+' Enter/autocomplete repeated the same master lookup '+JSON.stringify(sourceCalls.filter(x=>x.name)));
        if(scenario==='parallel'){
          const reads=sourceCalls.filter(x=>x.url?.includes('revisados-ficha')||x.url?.includes('/rest/v1/ena_cuentas')||x.url?.includes('/rest/v1/revisados_vehiculo_oficial'));
          assert.equal(reads.length,3);
          assert.ok(Math.max(...reads.map(x=>x.start))<Math.min(...reads.map(x=>x.end)),'Supplemental reads must overlap');
          data.supplementalMs=Math.max(...reads.map(x=>x.end))-Math.min(...reads.map(x=>x.start));
        }
        assert.equal(sourceCalls.filter(x=>x.name==='panapass_control_auto_v2'&&x.args.p_limit===10).length,scenario==='master-fallback'?1:0);
        assert.equal(sourceCalls.filter(x=>x.url?.includes('/rest/v1/revisados_vehiculo_oficial')).length,1);
        assert.equal(sourceCalls.filter(x=>x.url?.includes('revisados-ficha')).length,1);
        assert.equal(sourceCalls.filter(x=>x.url?.includes('/rest/v1/ena_cuentas')).length,scenario==='no-pan'?0:1);
        assert.equal(sourceCalls.filter(x=>x.url?.includes('gps-rym-validator')).length,1);
        assert.equal(sourceCalls.filter(x=>x.url?.includes('ena-consulta-saldo')).length,scenario==='no-pan'?0:1);
        await host.locator('#v101AgainCheck').click();assert.equal(await host.locator('#v101CheckModal').count(),0);
        assert.equal(await host.locator('#v101ValidatorQ').evaluate(x=>x===document.activeElement),true);
        await host.locator('#v101ValidatorGo').click();await host.locator('#v101CloseCheck').waitFor();
        if(scenario==='fast-enter'){
          await host.locator('#v101CheckModal[data-uva-enriched]').waitFor();
          const again=await host.locator('#v101CheckModal').evaluate(()=>QA.calls);
          assert.equal(again.filter(x=>x.name==='panapass_control_auto_v2'&&x.args.p_limit===10).length,1,'A new validation must refresh consumed master data');
        }
        await host.locator('#v101CloseCheck').click();
        assert.equal(await host.locator('#v101CheckModal').count(),0);
        if(scenario==='ok'){await page.locator('#exit').click();await host.locator('.login-card').waitFor()}
        report.push({size:`${width}x${height}`,scenario,...data});
      }
    }
    count++;await page.close();
  }
  await context.close();console.log(`PASS ${width}x${height}: ${cases.length} scenarios`);
}
assert.deepEqual(errors,[]);
// Real main login + a real browser service-worker installation, without credentials or backend writes.
activeCase='real-login';
const smoke=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
await smoke.route('https://**/*',r=>r.abort());
const login=await smoke.newPage();login.setDefaultTimeout(15000);
await login.goto('http://127.0.0.1:4179/?app=validador-unidad');
await login.locator('#portal.ready').waitFor();
await login.frameLocator('#portal').locator('.login-card').waitFor();
assert.equal(await login.frameLocator('#portal').locator('#v101CheckModal').count(),0);
await login.evaluate(()=>navigator.serviceWorker.ready);
const cacheUrls=await login.evaluate(async()=>{
  const keys=await caches.keys(),urls=[];
  for(const key of keys)if(key.startsWith('rym-unit-validator-shell-'))urls.push(...(await (await caches.open(key)).keys()).map(r=>new URL(r.url).pathname));
  return urls;
});
assert.ok(cacheUrls.includes('/assets/rym-validator-192.png'));
assert.ok(!cacheUrls.includes('/'));
await login.screenshot({path:path.join(out,'real-main-login-390x844.png')});
await smoke.close();
if(count)fs.writeFileSync(path.join(out,process.argv.includes('--progressive-only')?'progressive-results.json':process.argv.includes('--latency-only')?'latency-results.json':'results.json'),JSON.stringify({count,report,errors},null,2));
console.log('PASS: real main login and browser SW installation (static assets only).');
console.log(`PASS: ${count} cases; original main functions, ${sizes.length} viewports.`);
}finally{await browser.close();server.close()}
