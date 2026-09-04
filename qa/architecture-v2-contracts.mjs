import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const fail = msg => { console.error('ARCH_V2_FAIL:', msg); process.exitCode = 1; };
const ok = msg => console.log('ARCH_V2_OK:', msg);

const loader = read('modules/v171-loader.js');
const panapass = read('modules/panapass/index.js');
const ranking = read('modules/panapass/ranking/index.js');
const recurrentes = read('modules/panapass/recurrentes/index.js');
const bajas = read('modules/panapass/bajas/index.js');
const pagos = read('modules/panapass/pagos/index.js');
const negativos = read('modules/panapass/negativos/index.js');
const dashboard = read('modules/panapass/dashboard/index.js');
const negativosDate = read('modules/panapass/negativos/panama-date.js');
const rankingFinalTabs = read('modules/panapass/ranking/final-tabs.js');
const rankingCriteria = read('modules/panapass/ranking/criteria-final.js');
const rankingClickfix = read('modules/panapass/ranking/criteria-clickfix.js');
const gps = read('modules/gps/index.js');
const context = read('modules/core/context.js');
const events = read('modules/core/event-bus.js');
const coreDashboardShim = read('modules/core/dashboard-payments-enhance.js');
const coreNegativosShim = read('modules/core/panapass-negativos-panama-date.js');
const coreFinalTabsShim = read('modules/core/panapass-ranking-recurrentes-final.js');
const coreCriteriaShim = read('modules/core/panapass-ranking-criteria-final.js');
const coreClickfixShim = read('modules/core/panapass-ranking-criteria-clickfix.js');

for (const file of [
  'modules/core/event-bus.js',
  'modules/core/context.js',
  'modules/panapass/pagos/index.js',
  'modules/panapass/negativos/index.js',
  'modules/panapass/negativos/panama-date.js',
  'modules/panapass/dashboard/index.js',
  'modules/panapass/ranking/final-tabs.js',
  'modules/panapass/ranking/criteria-final.js',
  'modules/panapass/ranking/criteria-clickfix.js'
]) {
  if (!loader.includes(file)) fail(`loader no carga ${file}`); else ok(`loader carga ${file}`);
}

if (/v70OpenPanapass/.test(panapass)) fail('boundary Panapass aun llama v70OpenPanapass directamente'); else ok('boundary Panapass no llama legacy directamente');
if (!/RYM_CONTEXT/.test(panapass) || !/context\.api\.panapass/.test(panapass)) fail('Panapass no consume el contrato RYM_CONTEXT'); else ok('Panapass consume RYM_CONTEXT');
if (!/mount/.test(panapass) || !/unmount/.test(panapass)) fail('Panapass no expone mount/unmount'); else ok('Panapass expone mount/unmount');
if (/modules\/gps|RYM_GPS|v113OpenGps/.test(panapass)) fail('Panapass tiene dependencia directa de GPS'); else ok('Panapass no depende directamente de GPS');
if (/modules\/panapass|RYM_PANAPASS|v70OpenPanapass/.test(gps)) fail('GPS tiene dependencia directa de Panapass'); else ok('GPS no depende directamente de Panapass');
if (!/Object\.freeze/.test(context) || !/Object\.freeze/.test(events)) fail('core V2 no congela contratos publicos'); else ok('core V2 expone contratos congelados');
if (!/module:mounted/.test(panapass) || !/module:unmounted/.test(panapass)) fail('Panapass no publica eventos de ciclo de vida'); else ok('Panapass publica eventos de ciclo de vida');

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
if (/modules\/gps|RYM_GPS|v113OpenGps/.test(ranking+recurrentes+bajas+pagos+negativos+dashboard+negativosDate+rankingFinalTabs+rankingCriteria+rankingClickfix)) fail('Submodulos Panapass tienen dependencia directa de GPS'); else ok('Submodulos Panapass no dependen directamente de GPS');

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
  ['ranking-clickfix', coreClickfixShim, '/modules/panapass/ranking/criteria-clickfix.js']
];
for (const [name, code, target] of shimRules) {
  if (!code.includes(target)) fail(`Core shim ${name} no delega a ${target}`); else ok(`Core shim ${name} delega a dominio Panapass`);
  if (/\brpc\s*\(|\bstate\s*\.|function\s+todayPanama|function\s+renderRanking|function\s+finalRecurrentes/.test(code)) fail(`Core shim ${name} contiene logica de negocio Panapass`); else ok(`Core shim ${name} no contiene logica de negocio Panapass`);
  if (code.length > 1000) fail(`Core shim ${name} es demasiado grande (${code.length} bytes)`); else ok(`Core shim ${name} permanece minimo`);
}

if (!rankingFinalTabs.includes('__RYM_PANAPASS_FINAL_TABS_V2__')) fail('Controlador final-tabs canonico incompleto'); else ok('Controlador final-tabs canonico presente');
if (!rankingCriteria.includes('__RYM_RANKING_CRITERIA_FINAL_V3__')) fail('Controlador criteria canonico incompleto'); else ok('Controlador criteria canonico presente');
if (!rankingClickfix.includes('__RYM_RANKING_CRITERIA_CLICKFIX__')) fail('Controlador clickfix canonico incompleto'); else ok('Controlador clickfix canonico presente');

if (process.exitCode) process.exit(process.exitCode);
console.log('ARCH_V2_RESULT: PASS');
