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
const gps = read('modules/gps/index.js');
const context = read('modules/core/context.js');
const events = read('modules/core/event-bus.js');

for (const file of ['modules/core/event-bus.js','modules/core/context.js']) {
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
  ['Bajas', bajas, /context\.api\.panapass\.bajas/]
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
if (/modules\/gps|RYM_GPS|v113OpenGps/.test(ranking+recurrentes+bajas)) fail('Submodulos Panapass tienen dependencia directa de GPS'); else ok('Submodulos Panapass no dependen directamente de GPS');

for (const apiName of ['ranking','recurrentes','bajas']) {
  if (!new RegExp(`${apiName}:`).test(context)) fail(`Context no expone panapass.${apiName}`); else ok(`Context expone panapass.${apiName}`);
}
if (!/maxPago/.test(context)) fail('Context no encapsula session.meta.maxPago'); else ok('Context encapsula session.meta.maxPago');

if (process.exitCode) process.exit(process.exitCode);
console.log('ARCH_V2_RESULT: PASS');
