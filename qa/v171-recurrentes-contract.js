const fs=require('fs');
const vm=require('vm');
const code=fs.readFileSync('modules/panapass/recurrentes/index.js','utf8');
const calls=[];
const sandbox={window:{state:{meta:{max_pago:'2026-08-28'}},rpc:async(name,args)=>{calls.push({name,args});return [
 {tipo_entidad:'OPERADOR',identificador:'OP1',nombre:'ANA',unidad:'V1',supervisora:'SUP1',galera:'VCOMP',pagos:6,dias_con_pago:4,total_pagado:55,nivel:'RECURRENTE'},
 {tipo_entidad:'OPERADOR',identificador:'OP2',nombre:'BERTA',unidad:'V2',supervisora:'SUP2',galera:'VIPCO',pagos:8,dias_con_pago:6,total_pagado:90,nivel:'CRITICO'},
 {tipo_entidad:'UNIDAD',identificador:'V1',unidad:'V1',supervisora:'SUP1',galera:'VCOMP',pagos:7,dias_con_pago:5,total_pagado:70,nivel:'RECURRENTE'}
]},RYM_MODULES:{has:()=>false,register:(n,d)=>{sandbox.registered={n,d}}}},document:{querySelector:()=>null}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const api=sandbox.window.RYM_PANAPASS_RECURRENTES;if(!api)throw new Error('Recurrentes API missing');
const r=api.monthRange('2026-02');if(r.desde!=='2026-02-01'||r.hasta!=='2026-02-28')throw new Error('Rango de mes incorrecto');
const p=api.buildParams({month:'2026-08',minPagos:5});if(p.p_desde!=='2026-08-01'||p.p_hasta!=='2026-08-31'||p.p_min_pagos!==5||p.p_limit!==2000)throw new Error('Parametros RPC incorrectos');
(async()=>{const rows=await api.load({month:'2026-08',minPagos:5});if(calls.length!==1||calls[0].name!=='panapass_recurrentes_entidad')throw new Error('RPC incorrecto');const op=api.model(rows,{mode:'OPERADOR'});if(op.count!==2||op.critical!==1||op.total!==145)throw new Error('Modelo operador incorrecto');const unit=api.model(rows,{mode:'UNIDAD'});if(unit.count!==1||unit.pageRows[0].unidad!=='V1')throw new Error('Modelo unidad incorrecto');console.log('V171_RECURRENTES_CONTRACT_OK',JSON.stringify({rpc:calls[0],operadores:op.count,criticos:op.critical,unidades:unit.count}));})().catch(e=>{console.error(e);process.exit(1)});
