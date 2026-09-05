import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const fail = msg => { console.error('ARCH_V2_FAIL:', msg); process.exitCode = 1; };
const ok = msg => console.log('ARCH_V2_OK:', msg);

const loader = read('modules/v171-loader.js');
const registry = read('modules/core/module-registry.js');
const styleManager = read('modules/core/style-manager.js');
const panapass = read('modules/panapass/index.js');
const ranking = read('modules/panapass/ranking/index.js');
const recurrentes = read('modules/panapass/recurrentes/index.js');
const bajas = read('modules/panapass/bajas/index.js');
const pagos = read('modules/panapass/pagos/index.js');
const negativos = read('modules/panapass/negativos/index.js');
const dashboard = read('modules/panapass/dashboard/index.js');
const dashboardV7Css = read('css/panapass-dashboard-v7.css');
const negativosDate = read('modules/panapass/negativos/panama-date.js');
const rankingFinalTabs = read('modules/panapass/ranking/final-tabs.js');
const rankingCriteria = read('modules/panapass/ranking/criteria-final.js');
const rankingClickfix = read('modules/panapass/ranking/criteria-clickfix.js');
const rankingOwnerLock = read('modules/panapass/ranking/owner-lock.js');
const gps = read('modules/gps/index.js');
const revisados = read('modules/revisados/index.js');
const controlAuto = read('modules/control-auto/index.js');
const usuarios = read('modules/usuarios/index.js');
const context = read('modules/core/context.js');
const events = read('modules/core/event-bus.js');
const coreDashboardShim = read('modules/core/dashboard-payments-enhance.js');
const coreNegativosShim = read('modules/core/panapass-negativos-panama-date.js');
const coreFinalTabsShim = read('modules/core/panapass-ranking-recurrentes-final.js');
const coreCriteriaShim = read('modules/core/panapass-ranking-criteria-final.js');
const coreClickfixShim = read('modules/core/panapass-ranking-criteria-clickfix.js');
const coreOwnerLockShim = read('modules/core/panapass-ranking-owner-lock.js');

for (const file of [
  'modules/core/module-registry.js',
  'modules/core/style-manager.js',
  'modules/core/event-bus.js',
  'modules/core/context.js',
  'modules/panapass/pagos/index.js',
  'modules/panapass/negativos/index.js',
  'modules/panapass/negativos/panama-date.js',
  'modules/panapass/dashboard/index.js',
  'modules/panapass/ranking/final-tabs.js',
  'modules/panapass/ranking/criteria-final.js',
  'modules/panapass/ranking/criteria-clickfix.js',
  'modules/panapass/ranking/owner-lock.js'
]) {
  if (!loader.includes(file)) fail(`loader no carga ${file}`); else ok(`loader carga ${file}`);
}

if (!/const css=\['\/css\/core\.css'\]/.test(loader)) fail('Loader todavia precarga CSS de dominio'); else ok('Loader solo precarga core.css');
for (const css of ['/css/panapass.css','/css/panapass-bajas.css','/css/revisados.css','/css/control-auto.css','/css/gps.css','/css/usuarios.css']) {
  if (loader.includes(`'${css}'`) && !styleManager.includes(css)) fail(`Loader contiene CSS de dominio fuera del style manager: ${css}`);
}
if (!/RYM_STYLES/.test(loader)) fail('Loader no exige style manager'); else ok('Loader exige style manager');

for (const [domain, css] of [
  ['panapass','/css/panapass.css'],['panapass','/css/panapass-dashboard-v7.css'],['panapass','/css/panapass-bajas.css'],['gps','/css/gps.css'],['revisados','/css/revisados.css'],['control-auto','/css/control-auto.css'],['usuarios','/css/usuarios.css']
]) {
  if (!styleManager.includes(css)) fail(`Style manager no registra ${css}`); else ok(`Style manager registra ${domain}: ${css}`);
}
const dashboardV2Pos=styleManager.indexOf('/css/panapass-dashboard-v2.css');
const dashboardV7Pos=styleManager.indexOf('/css/panapass-dashboard-v7.css');
if (dashboardV2Pos<0 || dashboardV7Pos<0 || dashboardV7Pos<dashboardV2Pos) fail('Dashboard V7 no se carga despues del renderer visual V2'); else ok('Dashboard V7 se carga como capa final despues de V2');
if (!/disableOthers/.test(styleManager) || !/link\.disabled/.test(styleManager)) fail('Style manager no desactiva CSS de dominios inactivos'); else ok('Style manager desactiva CSS de dominios inactivos');
if (!/panapass-ranking/.test(styleManager) || !/panapass-recurrentes/.test(styleManager)) fail('Style manager no mapea submodulos Panapass'); else ok('Submodulos Panapass comparten dominio CSS');

if (!/await unmount\(active\)/.test(registry)) fail('Registry no desmonta modulo anterior'); else ok('Registry desmonta modulo anterior');
if (!/RYM_STYLES.*activate/.test(registry)) fail('Registry no activa estilos por modulo'); else ok('Registry activa estilos por modulo');
if (!/RYM_STYLES.*deactivate/.test(registry)) fail('Registry no desactiva estilos al desmontar'); else ok('Registry desactiva estilos al desmontar');
if (!/current/.test(registry)) fail('Registry no expone modulo activo'); else ok('Registry expone modulo activo');

if (/v70OpenPanapass/.test(panapass)) fail('boundary Panapass aun llama v70OpenPanapass directamente'); else ok('boundary Panapass no llama legacy directamente');
if (!/RYM_CONTEXT/.test(panapass) || !/context\.api\.panapass/.test(panapass)) fail('Panapass no consume el contrato RYM_CONTEXT'); else ok('Panapass consume RYM_CONTEXT');
if (!/mount/.test(panapass) || !/unmount/.test(panapass)) fail('Panapass no expone mount/unmount'); else ok('Panapass expone mount/unmount');
if (/modules\/gps|RYM_GPS|v113OpenGps/.test(panapass)) fail('Panapass tiene dependencia directa de GPS'); else ok('Panapass no depende directamente de GPS');
if (/modules\/panapass|RYM_PANAPASS|v70OpenPanapass/.test(gps)) fail('GPS tiene dependencia directa de Panapass'); else ok('GPS no depende directamente de Panapass');
if (!/Object\.freeze/.test(context) || !/Object\.freeze/.test(events)) fail('core V2 no congela contratos publicos'); else ok('core V2 expone contratos congelados');
if (!/module:mounted/.test(panapass) || !/module:unmounted/.test(panapass)) fail('Panapass no publica eventos de ciclo de vida'); else ok('Panapass publica eventos de ciclo de vida');

for (const [name, code, dataset] of [
  ['GPS',gps,'gps'],['Revisados',revisados,'revisados'],['Control Auto',controlAuto,'control-auto'],['Usuarios',usuarios,'usuarios']
]) {
  if (!/unmount/.test(code)) fail(`${name} no implementa unmount`); else ok(`${name} implementa unmount`);
  const cleanup = new RegExp(`dataset\\.rymModule===['\"]${dataset.replace('-','\\-')}['\"]`);
  if (!cleanup.test(code)) fail(`${name} no limpia body[data-rym-module]`); else ok(`${name} limpia body[data-rym-module]`);
}

const modules = [
  ['Ranking', ranking, /context\.api\.panapass\.ranking|context\?\.api\?\.panapass\?\.openSupervisoraProfile/],
  ['Recurrentes', recurrentes, /context\.api\.panapass\.recurrentes/],
  ['Bajas', bajas, /context\.api\.panapass\.bajas/],
  ['Pagos', pagos, /context\.api\.panapass\.pagos7d/],
  ['Negativos', negativos, /context\.api\.panapass\.negativosActual/]
];
const forbiddenGlobals = [
  ['window.state', /\bw\.state\b|\bwindow\.state\b/],
  ['window.rpc', /\bw\.rpc\b|\bwindow\.rpc\b/]
];
for (const [name, code, expectedApi] of modules) {
  for (const [label, re] of forbiddenGlobals) {
    if (re.test(code)) fail(`${name} Panapass depende de ${label}`); else ok(`${name} Panapass no depende de ${label}`);
  }
  if (!/RYM_CONTEXT|contextFrom|requireContext/.test(code)) fail(`${name} Panapass no consume contexto V2`); else ok(`${name} Panapass consume contexto V2`);
  if (!expectedApi.test(code)) fail(`${name} Panapass no consume su API de dominio`); else ok(`${name} Panapass consume su API de dominio`);
}

if (/\bw\.openSupervisoraProfile\b|typeof\s+openSupervisoraProfile/.test(ranking)) fail('Ranking Panapass depende de openSupervisoraProfile global'); else ok('Ranking Panapass no depende de openSupervisoraProfile global');
if (/modules\/gps|RYM_GPS|v113OpenGps/.test(ranking+recurrentes+bajas+pagos+negativos+dashboard+negativosDate+rankingFinalTabs+rankingCriteria+rankingClickfix+rankingOwnerLock)) fail('Submodulos Panapass tienen dependencia directa de GPS'); else ok('Submodulos Panapass no dependen directamente de GPS');

for (const apiName of ['ranking','recurrentes','bajas','pagos7d','negativosActual']) {
  if (!new RegExp(`${apiName}:`).test(context)) fail(`Context no expone panapass.${apiName}`); else ok(`Context expone panapass.${apiName}`);
}
if (!/maxPago/.test(context)) fail('Context no encapsula session.meta.maxPago'); else ok('Context encapsula session.meta.maxPago');
if (!/router/.test(context) || !/openRoute/.test(context)) fail('Context no encapsula navegacion legacy'); else ok('Context encapsula navegacion legacy');

if (!/RYM_CONTEXT/.test(dashboard)) fail('Dashboard Panapass no consume RYM_CONTEXT'); else ok('Dashboard Panapass consume RYM_CONTEXT');
if (/\brpc\s*\(/.test(dashboard)) fail('Dashboard Panapass llama rpc directamente'); else ok('Dashboard Panapass no llama rpc directamente');
if (/\bw\.state\b|\bwindow\.state\b/.test(dashboard)) fail('Dashboard Panapass depende de window.state'); else ok('Dashboard Panapass no depende de window.state');

const shimRules = [
  ['dashboard', coreDashboardShim, '/modules/panapass/dashboard/index.js'],
  ['negativos-date', coreNegativosShim, '/modules/panapass/negativos/panama-date.js'],
  ['ranking-final-tabs', coreFinalTabsShim, '/modules/panapass/ranking/final-tabs.js'],
  ['ranking-criteria', coreCriteriaShim, '/modules/panapass/ranking/criteria-final.js'],
  ['ranking-clickfix', coreClickfixShim, '/modules/panapass/ranking/criteria-clickfix.js'],
  ['ranking-owner-lock', coreOwnerLockShim, '/modules/panapass/ranking/owner-lock.js']
];
for (const [name, code, target] of shimRules) {
  if (!code.includes(target)) fail(`Core shim ${name} no delega a ${target}`); else ok(`Core shim ${name} delega a dominio Panapass`);
  if (/\brpc\s*\(|\bstate\s*\.|function\s+todayPanama|function\s+renderRanking|function\s+finalRecurrentes|function\s+enforce/.test(code)) fail(`Core shim ${name} contiene logica de negocio Panapass`); else ok(`Core shim ${name} no contiene logica de negocio Panapass`);
  if (code.length > 1000) fail(`Core shim ${name} es demasiado grande (${code.length} bytes)`); else ok(`Core shim ${name} permanece minimo`);
}

if (!rankingFinalTabs.includes('__RYM_PANAPASS_FINAL_TABS_V2__')) fail('Controlador final-tabs canonico incompleto'); else ok('Controlador final-tabs canonico presente');
if (!rankingCriteria.includes('__RYM_RANKING_CRITERIA_FINAL_V3__')) fail('Controlador criteria canonico incompleto'); else ok('Controlador criteria canonico presente');
if (!rankingClickfix.includes('__RYM_RANKING_CRITERIA_CLICKFIX__')) fail('Controlador clickfix canonico incompleto'); else ok('Controlador clickfix canonico presente');
if (!rankingOwnerLock.includes('__RYM_RANKING_OWNER_LOCK__')) fail('Controlador owner-lock canonico incompleto'); else ok('Controlador owner-lock canonico presente');

const cssDomains = [
  ['panapass', 'css/panapass.css', ['gps','revisados','control-auto','usuarios']],
  ['gps', 'css/gps.css', ['panapass','revisados','control-auto','usuarios']],
  ['revisados', 'css/revisados.css', ['panapass','gps','control-auto','usuarios']],
  ['control-auto', 'css/control-auto.css', ['panapass','gps','revisados','usuarios']],
  ['usuarios', 'css/usuarios.css', ['panapass','gps','revisados','control-auto']]
];
for (const [domain, file, foreign] of cssDomains) {
  const code = read(file);
  if (!code.trim()) fail(`CSS ${domain} esta vacio`); else ok(`CSS ${domain} existe separado`);
  for (const other of foreign) {
    const bodyRef = new RegExp(`data-rym-module=["']${other}["']`, 'i');
    const classRef = new RegExp(`\\.rym-${other.replace(/-/g,'\\-')}\\b`, 'i');
    if (bodyRef.test(code) || classRef.test(code)) fail(`CSS ${domain} contiene selector del dominio ${other}`);
  }
  ok(`CSS ${domain} no apunta a dominios hermanos`);
}
const panapassCss = read('css/panapass.css');
const gpsCss = read('css/gps.css');
if (!/data-rym-module=["']panapass["']|\.v171-rank|\.v171-rec/.test(panapassCss)) fail('CSS Panapass no tiene scope/prefijo reconocible'); else ok('CSS Panapass usa scope o prefijos propios');
if (!/data-rym-module=["']gps["']/.test(gpsCss)) fail('CSS GPS no esta scoped al modulo GPS'); else ok('CSS GPS esta scoped al modulo GPS');

if (!dashboardV7Css.trim()) fail('CSS dashboard V7 esta vacio'); else ok('CSS dashboard V7 existe');
if (!/body\[data-rym-module=["']panapass["']\]/.test(dashboardV7Css) || !/\.rym-d2\b/.test(dashboardV7Css)) fail('Dashboard V7 no esta scoped al Panapass nativo'); else ok('Dashboard V7 esta scoped al Panapass nativo');
for (const other of ['gps','revisados','control-auto','usuarios']) {
  const bodyRef = new RegExp(`data-rym-module=["']${other}["']`, 'i');
  const classRef = new RegExp(`\\.rym-${other.replace(/-/g,'\\-')}\\b`, 'i');
  if (bodyRef.test(dashboardV7Css) || classRef.test(dashboardV7Css)) fail(`Dashboard V7 invade el dominio ${other}`);
}
if (/rym-p2|rym-p3|phase4|proposal2|proposal-?2/i.test(dashboardV7Css)) fail('Dashboard V7 reintroduce selectores legacy de Proposal 2'); else ok('Dashboard V7 no reintroduce selectores legacy');

if (process.exitCode) process.exit(process.exitCode);
console.log('ARCH_V2_RESULT: PASS');
