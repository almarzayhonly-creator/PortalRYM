import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const fail = msg => { console.error('ARCH_V2_FAIL:', msg); process.exitCode = 1; };
const ok = msg => console.log('ARCH_V2_OK:', msg);

const loader = read('modules/v171-loader.js');
const panapass = read('modules/panapass/index.js');
const ranking = read('modules/panapass/ranking/index.js');
const gps = read('modules/gps/index.js');
const context = read('modules/core/context.js');
const events = read('modules/core/event-bus.js');

for (const file of ['modules/core/event-bus.js','modules/core/context.js']) {
  if (!loader.includes(file)) fail(`loader no carga ${file}`);
  else ok(`loader carga ${file}`);
}

if (/v70OpenPanapass/.test(panapass)) fail('boundary Panapass aun llama v70OpenPanapass directamente');
else ok('boundary Panapass no llama legacy directamente');

if (!/RYM_CONTEXT/.test(panapass) || !/context\.api\.panapass/.test(panapass)) fail('Panapass no consume el contrato RYM_CONTEXT');
else ok('Panapass consume RYM_CONTEXT');

if (!/mount/.test(panapass) || !/unmount/.test(panapass)) fail('Panapass no expone mount/unmount');
else ok('Panapass expone mount/unmount');

if (/modules\/gps|RYM_GPS|v113OpenGps/.test(panapass)) fail('Panapass tiene dependencia directa de GPS');
else ok('Panapass no depende directamente de GPS');

if (/modules\/panapass|RYM_PANAPASS|v70OpenPanapass/.test(gps)) fail('GPS tiene dependencia directa de Panapass');
else ok('GPS no depende directamente de Panapass');

if (!/Object\.freeze/.test(context) || !/Object\.freeze/.test(events)) fail('core V2 no congela contratos publicos');
else ok('core V2 expone contratos congelados');

if (!/module:mounted/.test(panapass) || !/module:unmounted/.test(panapass)) fail('Panapass no publica eventos de ciclo de vida');
else ok('Panapass publica eventos de ciclo de vida');

const forbiddenRankingGlobals = [
  ['window.state', /\bw\.state\b|\bwindow\.state\b/],
  ['window.rpc', /\bw\.rpc\b|\bwindow\.rpc\b/],
  ['openSupervisoraProfile global', /\bw\.openSupervisoraProfile\b|typeof\s+openSupervisoraProfile/]
];
for (const [label, re] of forbiddenRankingGlobals) {
  if (re.test(ranking)) fail(`Ranking Panapass depende de ${label}`);
  else ok(`Ranking Panapass no depende de ${label}`);
}

if (!/context\.api\.panapass\.ranking/.test(ranking)) fail('Ranking Panapass no consume context.api.panapass.ranking');
else ok('Ranking Panapass consume context.api.panapass.ranking');

if (!/context\?\.api\?\.panapass\?\.openSupervisoraProfile/.test(ranking)) fail('Ranking Panapass no abre perfiles mediante el contexto');
else ok('Ranking Panapass abre perfiles mediante el contexto');

if (process.exitCode) process.exit(process.exitCode);
console.log('ARCH_V2_RESULT: PASS');
