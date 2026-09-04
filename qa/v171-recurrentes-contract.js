const fs=require('fs');
const vm=require('vm');
const code=fs.readFileSync('modules/panapass/recurrentes/index.js','utf8');
const calls=[];
const rows=[
 {tipo_entidad:'OPERADOR',identificador:'OP1',nombre:'ANA',unidad:'V1',supervisora:'SUP1',galera:'VCOMP',pagos:6,dias_con_pago:4,total_pagado:55,nivel:'RECURRENTE'},
 {tipo_entidad:'OPERADOR',identificador:'OP2',nombre:'BERTA',unidad:'V2',supervisora:'SUP2',galera:'VIPCO',pagos:8,dias_con_pago:6,total_pagado:90,nivel:'CRITICO'},
 {tipo_entidad:'UNIDAD',identificador:'V1',unidad:'V1',supervisora:'SUP1',galera:'VCOMP',pagos:7,dias_con_pago:5,total_pagado:70,nivel:'RECURRENTE'}
];
const context={
 session:{meta:{maxPago:'2026-08-28'}},
 api:{panapass:{recurrentes:async(params)=>{calls.push(params);return rows;}}}
};
const sandbox={window:{RYM_CONTEXT:{create:()=>context},RYM_MODULES:{has:()=>false,register:(n,d)=>{sandbox.registered={n,d}}}},document:{querySelector:()=>null}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const api=sandbox.window.RYM_PANAPASS_RECURRENTES;if(!api)throw new Error('Recurrentes API missing');
if(api.defaultMonth(context)!=='2026-08')throw new Error('Mes por contexto incorrecto');
const r=api.monthRange('2026-02');if(r.desde!=='2026-02-01'||r.hasta!=='2026-02-28')throw new Error('Rango de mes incorrecto');
const p=api.buildParams({context,month:'2026-08',minPagos:5});if(p.p_desde!=='2026-08-01'||p.p_hasta!=='2026-08-31'||p.p_min_pagos!==5||p.p_limit!==2000)throw new Error('Parametros RPC incorrectos');
(async()=>{const loaded=await api.load({context,month:'2026-08',minPagos:5});if(calls.length!==1)throw new Error('API Recurrentes no llamada exactamente una vez');const c=calls[0];if(c.p_desde!=='2026-08-01'||c.p_hasta!=='2026-08-31'||c.p_min_pagos!==5)throw new Error('Parametros API incorrectos');const op=api.model(loaded,{mode:'OPERADOR'});if(op.count!==2||op.critical!==1||op.total!==145)throw new Error('Modelo operador incorrecto');const unit=api.model(loaded,{mode:'UNIDAD'});if(unit.count!==1||unit.pageRows[0].unidad!=='V1')throw new Error('Modelo unidad incorrecto');console.log('V171_RECURRENTES_CONTRACT_OK',JSON.stringify({params:c,operadores:op.count,criticos:op.critical,unidades:unit.count}));})().catch(e=>{console.error(e);process.exit(1)});
