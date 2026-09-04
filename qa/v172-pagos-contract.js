const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync('modules/panapass/pagos/index.js','utf8');
const calls=[];
const sample=[
 {fecha:'2026-09-01',galera:'VCOMP',unidad:'V1',a_pagar:10},
 {fecha:'2026-09-01',galera:'VCOMP',unidad:'V2',a_pagar:20},
 {fecha:'2026-09-02',galera:'VIPCO',unidad:'V3',a_pagar:30}
];
const context={session:Object.freeze({}),api:{panapass:{pagos7d:async()=>{calls.push('pagos7d');return sample;}}}};
const sandbox={window:{RYM_CONTEXT:{create:()=>context},RYM_MODULES:{has:()=>false,register:(n,d)=>sandbox.registered={n,d}}}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
(async()=>{
 const api=sandbox.window.RYM_PANAPASS_PAGOS;if(!api)throw Error('Pagos API missing');
 const rows=await api.load(context);if(calls.length!==1)throw Error('pagos7d no llamado');
 const m=api.model(rows);if(m.monto!==60||m.unidades!==3)throw Error('Resumen pagos incorrecto');
 if(m.byGalera.VCOMP.monto!==30||m.byGalera.VCOMP.unidades!==2)throw Error('Galera VCOMP incorrecta');
 console.log('V172_PAGOS_CONTRACT_OK',JSON.stringify({source:api.SOURCE,monto:m.monto,unidades:m.unidades}));
})().catch(e=>{console.error(e);process.exit(1)});
