import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html');
for(const asset of ['core/api.js','core/permissions.js','core/auth.js','login/index.js','panapass/ranking.js','panapass/recurrentes.js','panapass/bajas.js','panapass/index.js']) assert.ok(html.includes('/modules/v173/'+asset),`missing asset ${asset}`);
assert.ok(html.indexOf('/modules/v173/core/api.js')<html.indexOf('/modules/v173/core/auth.js'),'api must load before auth');
assert.ok(html.indexOf('/modules/v173/core/rpc-adapter.js')<html.indexOf('/modules/v173/core/auth.js'),'rpc adapter must load before auth');
assert.ok(html.indexOf('/modules/v173/panapass/ranking.js')<html.indexOf('/modules/v173/panapass/index.js'),'features must load before Panapass shell');

const files=['modules/v173/bootstrap.js','modules/v173/core/index.js','modules/v173/core/api.js','modules/v173/core/permissions.js','modules/v173/core/auth.js','modules/v173/core/rpc-adapter.js','modules/v173/core/router.js','modules/v173/login/index.js','modules/v173/portal/index.js','modules/v173/panapass/contracts.js','modules/v173/panapass/ranking.js','modules/v173/panapass/recurrentes.js','modules/v173/panapass/bajas.js','modules/v173/panapass/index.js'];
for(const f of files)new vm.Script(read(f),{filename:f});

const pan=read('modules/v173/panapass/index.js');
assert.ok(pan.includes("document.getElementById('rym-app')"),'Panapass must own #rym-app');
assert.ok(!pan.includes("document.querySelector('#app') || document.body"),'legacy body fallback forbidden');
const core=read('modules/v173/core/index.js');
assert.ok(core.includes("activate('login')"),'startup must gate on login');
assert.ok(!core.includes("()=>bootPortal().catch"),'startup must not open portal unconditionally');
const ranking=read('modules/v173/panapass/ranking.js');
assert.ok(ranking.includes("{p_periodo:p}"),'ranking RPC contract changed');
const recurrentes=read('modules/v173/panapass/recurrentes.js');
assert.ok(recurrentes.includes('p_limit:2000'),'recurrentes max load changed');
const bajas=read('modules/v173/panapass/bajas.js');
assert.ok(bajas.includes('Transferencia de saldo por baja de Panapass - placa'),'ENA motive contract changed');
console.log('V173 smoke contract OK');
