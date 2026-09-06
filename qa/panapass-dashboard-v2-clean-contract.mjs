import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fail=m=>{console.error('PANAPASS_CLEAN_FAIL:',m);process.exitCode=1},ok=m=>console.log('PANAPASS_CLEAN_OK:',m);
const js=['runtime.js','role-policy.js','data.js','view-model.js','components.js','views/admin-total.js','views/galera.js','views/supervisora.js','index.js'].map(x=>'modules/panapass/dashboard-clean/'+x);
const css=['base.css','components.css','views.css','responsive.css'].map(x=>'css/panapass/dashboard-clean/'+x);
for(const f of ['modules/panapass/dashboard-clean/loader.js',...js,...css]){if(!fs.existsSync(path.join(root,f)))fail('falta '+f);else ok('existe '+f)}
const app=js.map(read).join('\n');
for(const term of ['experience-v2','ops-v3','proposal2','date-window-v4','no-panapass-alert-fix','dashboard-payments-enhance']){if(app.includes(term))fail('dependencia legacy prohibida '+term);else ok('sin '+term)}
if(/MutationObserver|innerText\s*\.|querySelectorAll\([^)]*card/i.test(app))fail('se detecto transformacion/scraping DOM');else ok('sin transformaciones DOM legacy');
const forbidden=js.filter(f=>!f.endsWith('runtime.js')).map(read).join('\n');
if(/\bwindow\.state\b|\bw\.state\b|\bwindow\.rpc\b|\bw\.rpc\b/.test(forbidden))fail('globals legacy fuera del runtime adapter');else ok('globals legacy confinados al adapter');
const policy=read('modules/panapass/dashboard-clean/role-policy.js');for(const role of ['ADMIN_TOTAL','ADMIN','GERENTE_GALERA','SUPERVISORA']){if(!policy.includes(role))fail('falta rol '+role);else ok('rol '+role)}
for(const f of css){const c=read(f);if(!c.includes('.rym-pdc'))fail('CSS sin scope .rym-pdc: '+f);else ok('CSS scoped '+f)}
const runtime=read('modules/panapass/dashboard-clean/runtime.js');
if(!runtime.includes('installDashboardOwner')||!runtime.includes('__rymPanapassCleanOwner'))fail('runtime no instala ownership exclusivo del dashboard');else ok('ownership exclusivo presente');
if(!runtime.includes('w.dashboard=cleanDashboard')||!runtime.includes('legacyDashboard'))fail('ownership no sustituye el handler dashboard');else ok('handler dashboard sustituido directamente');
if(runtime.includes('w.render=gatedRender'))fail('ownership vuelve a parchear render global');else ok('render global no se intercepta');
if(!runtime.includes("String(s.active||'')==='dashboard'"))fail('handler no limita ownership a dashboard');else ok('ownership limitado a dashboard');
const index=read('modules/panapass/dashboard-clean/index.js');if(index.includes('v70OpenPanapass'))fail('renderer clean llama entrypoint legacy');else ok('renderer independiente del dashboard legacy');
if(!index.includes('installOwnership')||!index.includes('mountIfCurrent'))fail('renderer no arma ownership clean');else ok('renderer arma ownership clean');
const loader=read('modules/panapass/dashboard-clean/loader.js');if(!loader.includes('panapassClean'))fail('loader no tiene flag clean');else ok('preview flag presente');
if(!loader.includes('installOwnership'))fail('loader no instala ownership antes de uso');else ok('loader instala ownership');
if(process.exitCode)process.exit(process.exitCode);console.log('PANAPASS_CLEAN_RESULT: PASS');
