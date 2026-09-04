const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync('modules/panapass/negativos/index.js','utf8');
const calls=[];
const sample=[
 {fecha:'2026-09-04',galera:'VCOMP',supervisora:'SUP1',unidad:'V1',monto:-10},
 {fecha:'2026-09-04',galera:'VIPCO',supervisora:'SUP2',unidad:'V2',monto:-20},
 {fecha:'2026-09-04',galera:'VCOMP',supervisora:'SUP1',unidad:'V3',monto:-5}
];
const context={session:Object.freeze({}),api:{panapass:{negativosActual:async(params)=>{calls.push(params);return sample;}}}};
const sandbox={window:{RYM_CONTEXT:{create:()=>context},RYM_MODULES:{has:()=>false,register:(n,d)=>sandbox.registered={n,d}}},Intl,Date};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
(async()=>{
 const api=sandbox.window.RYM_PANAPASS_NEGATIVOS;if(!api)throw Error('Negativos API missing');
 const rows=await api.load(context,{fecha:'2026-09-04',galera:'VCOMP'});if(calls.length!==1)throw Error('negativosActual no llamado');
 if(calls[0].fecha!=='2026-09-04'||calls[0].galera!=='VCOMP')throw Error('Parametros negativos incorrectos');
 const m=api.model(rows,{galera:'VCOMP'});if(m.count!==2||m.unidades!==2||m.monto!==-15)throw Error('Modelo negativos incorrecto');
 const p=api.buildParams({fecha:'2026-09-04',supervisora:'SUP1'});if(p.supervisora!=='SUP1')throw Error('Filtro supervisora incorrecto');
 console.log('V172_NEGATIVOS_CONTRACT_OK',JSON.stringify({source:api.SOURCE,count:m.count,monto:m.monto}));
})().catch(e=>{console.error(e);process.exit(1)});
