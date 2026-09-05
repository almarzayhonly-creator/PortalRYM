import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fail=m=>{console.error('PANAPASS_DASH_V2_FAIL:',m);process.exitCode=1};
const ok=m=>console.log('PANAPASS_DASH_V2_OK:',m);

const js=[
  'modules/panapass/dashboard-v2/role-policy.js',
  'modules/panapass/dashboard-v2/data.js',
  'modules/panapass/dashboard-v2/view-model.js',
  'modules/panapass/dashboard-v2/components/common.js',
  'modules/panapass/dashboard-v2/views/admin-total.js',
  'modules/panapass/dashboard-v2/views/galera.js',
  'modules/panapass/dashboard-v2/views/supervisora.js',
  'modules/panapass/dashboard-v2/index.js'
];
const css=[
  'css/panapass/dashboard-v2/base.css',
  'css/panapass/dashboard-v2/panels.css',
  'css/panapass/dashboard-v2/galeras-ranking.css',
  'css/panapass/dashboard-v2/role-views.css',
  'css/panapass/dashboard-v2/responsive.css'
];
for(const f of [...js,...css,'docs/PANAPASS_DASHBOARD_V2_SPEC.md','docs/PANAPASS_DASHBOARD_V2_BACKEND_GAPS.md','docs/codex/PANAPASS_DASHBOARD_V2_HANDOFF.md']){
  if(!fs.existsSync(path.join(root,f)))fail('falta '+f);else ok('existe '+f);
}

const code=js.map(read).join('\n');
for(const [label,re] of [['window.state',/\bw\.state\b|\bwindow\.state\b/],['rpc directo',/\brpc\s*\(/],['GPS',/v113OpenGps|RYM_GPS|modules\/gps/],['Revisados',/modules\/revisados/],['Control Auto',/modules\/control-auto/],['Usuarios',/modules\/usuarios/]]){
  if(re.test(code))fail('dependencia prohibida: '+label);else ok('sin '+label);
}

const policy=read(js[0]);
for(const role of ['ADMIN_TOTAL','ADMIN','GERENTE_GALERA','SUPERVISORA']){
  if(!policy.includes(role))fail('role-policy no contiene '+role);else ok('role-policy contiene '+role);
}
for(const phrase of ["scope:'company'","scope:'galera'","scope:'personal'","companyComparison:'aggregate-only'","canOpenOtherSupervisorUnits:false"]){
  if(!policy.includes(phrase))fail('falta politica '+phrase);else ok('politica presente '+phrase);
}

const index=read('modules/panapass/dashboard-v2/index.js');
if(!/RYM_PANAPASS_DASHBOARD_V2_ENABLED===true/.test(index))fail('V2 no tiene flag explicito');else ok('V2 requiere flag explicito');
if(/phase4GaleraKpis|experience-v2|ops-v3/.test(index))fail('orquestador V2 depende del DOM/capas legacy');else ok('orquestador V2 no depende de capas legacy');

const views=read(js[4])+read(js[5])+read(js[6]);
for(const marker of ['Rendimiento destacado de hoy','Comparativo con la empresa','Mi ranking en la galera','Posicion global']){
  if(!views.includes(marker))fail('vista no declara '+marker);else ok('vista declara '+marker);
}

for(const f of css){
  const c=read(f),selectors=c.split(/\n/).filter(x=>x.trim()&&!x.trim().startsWith('/*')&&!x.trim().startsWith('@media'));
  if(!c.includes('.rym-pd2'))fail('CSS sin scope .rym-pd2: '+f);else ok('CSS scoped '+f);
  if(/data-rym-module=["'](?:gps|revisados|control-auto|usuarios)/i.test(c))fail('CSS cruza dominio: '+f);
  if(!selectors.length)fail('CSS vacio: '+f);
}

const loader=read('modules/v171-loader.js');
const styleManager=read('modules/core/style-manager.js');
const boundary=read('modules/panapass/index.js');
if(!loader.includes('panapassDashboardV2'))fail('loader no expone query flag de preview');else ok('loader expone query flag de preview');
for(const f of js){if(!loader.includes('/'+f))fail('loader no registra '+f);else ok('loader registra '+f)}
for(const f of css){if(!styleManager.includes('/'+f))fail('style-manager no registra '+f);else ok('style-manager registra '+f)}
if(!loader.includes('legacyDashboard')||!loader.includes('dashboardV2'))fail('loader no separa dashboard legacy y V2');else ok('loader separa legacy/V2');
if(!boundary.includes('RYM_PANAPASS_DASHBOARD_V2.mount')&&!boundary.includes('dashboard.mount'))fail('boundary Panapass no monta V2');else ok('boundary Panapass monta V2');
if(!boundary.includes("includeCompanyCompare:role==='ADMIN'||role==='GERENTE_GALERA'"))fail('boundary no limita comparativo agregado a Admin/Gerente');else ok('comparativo agregado se solicita solo para Admin/Gerente');

if(process.exitCode)process.exit(process.exitCode);
console.log('PANAPASS_DASH_V2_RESULT: PASS');
