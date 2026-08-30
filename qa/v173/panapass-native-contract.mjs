import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const registry=new Map();
const app={registry,register:(name,value)=>registry.set(name,value)};
const context=vm.createContext({window:{RYM173:app},console,Date,Intl,Object,Array,Map,Set,String,Number,Boolean,Math,Promise});
const run=file=>new vm.Script(fs.readFileSync(file,'utf8'),{filename:file}).runInContext(context);

run('modules/v173/panapass/contracts.js');
run('modules/v173/panapass/negativos.js');
run('modules/v173/panapass/pagos.js');
run('modules/v173/panapass/historial.js');

const negativos=registry.get('panapass-negativos');
const neg=negativos.model([
  {unidad:'A1',saldo:-12.5,neg7:3,empresa:'RYM'},
  {unidad:'B2',saldo:-5,neg7:1,empresa:'OTRA'}
],{search:'rym'});
assert.equal(neg.count,1);
assert.equal(neg.saldo,-12.5);
assert.equal(neg.riesgo,'ALERTA');

const pagos=registry.get('panapass-pagos');
const pay=pagos.model([
  {unidad:'A1',a_pagar:15,boleta:10,pag7:2,operador:'Juan'},
  {unidad:'B2',a_pagar:8,boleta:8,pag7:1,operador:'Ana'}
],{search:'a1'});
assert.equal(pay.count,1);
assert.equal(pay.total,15);
assert.equal(pay.boleta,10);

const historial=registry.get('panapass-historial');
assert.deepEqual({...historial.params({mode:'COBRA',unidad:'A1'})},{p_modo:'COBRA',p_unidad:'A1',p_operador:null,p_desde:null,p_hasta:null});

console.log('V173 Panapass native contract OK');
