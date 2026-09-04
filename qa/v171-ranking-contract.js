const fs=require('fs');
const vm=require('vm');
const code=fs.readFileSync('modules/panapass/ranking/index.js','utf8');
const calls=[];
const rows=[
 {supervisora_id:'1',supervisora_nombre:'ANA',galera:'VCOMP',unidades_pagadas:3,monto_pagado:90,posicion_galera:3,total_galera:3,posicion_global:3,total_global:3,fecha_desde:'2026-08-28'},
 {supervisora_id:'2',supervisora_nombre:'BERTA',galera:'VCOMP',unidades_pagadas:1,monto_pagado:120,posicion_galera:1,total_galera:3,posicion_global:1,total_global:3,fecha_desde:'2026-08-28'},
 {supervisora_id:'3',supervisora_nombre:'CARLA',galera:'VIPCO',unidades_pagadas:2,monto_pagado:40,posicion_galera:1,total_galera:1,posicion_global:2,total_global:3,fecha_desde:'2026-08-28'}
];
const moduleContext={
 moduleId:'panapass-ranking',
 root:null,
 session:{profile:{rol:'ADMIN_TOTAL',supervisora_id:'1'},role:'ADMIN_TOTAL',userId:'x'},
 api:{
  panapass:{
   ranking:async(periodo)=>{calls.push({name:'panapass_ranking_pagos',args:{p_periodo:periodo}});return rows;},
   openSupervisoraProfile:()=>null
  }
 },
 events:null,
 router:{},
 extra:{}
};
const sandbox={
 window:{
  RYM_CONTEXT:{create:()=>moduleContext},
  RYM_MODULES:{has:()=>false,register:(n,d)=>{sandbox.registered={n,d}}}
 },
 document:{querySelector:()=>null}
};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const api=sandbox.window.RYM_PANAPASS_RANKING;if(!api)throw new Error('Ranking API missing');
if(api.SOURCE!=='panapass_ranking_pagos')throw new Error('RPC source incorrecto: '+api.SOURCE);
const data={DIA:rows,MES:rows};
const u=api.model(data,{period:'MES',metric:'unidades',galera:'TODAS'}).rows.map(x=>x.supervisora).join(',');
const m=api.model(data,{period:'MES',metric:'monto',galera:'TODAS'}).rows.map(x=>x.supervisora).join(',');
if(u!=='BERTA,CARLA,ANA')throw new Error('Orden menos unidades incorrecto: '+u);
if(m!=='CARLA,ANA,BERTA')throw new Error('Orden menos monto incorrecto: '+m);
const vc=api.model(data,{period:'MES',metric:'unidades',galera:'VCOMP'}).rows;
if(vc.length!==2||vc.some(x=>x.galera!=='VCOMP'))throw new Error('Filtro de galera incorrecto');
if(api.model(data,{period:'MES',metric:'unidades',galera:'TODAS'}).podio.length!==3)throw new Error('Podio incorrecto');
const c=api.canonicalRow(rows[0]);
if(c.id!=='1'||c.supervisora!=='ANA'||c.unidades!==3||c.monto!==90)throw new Error('Mapeo de campos de produccion incorrecto');
if(api.initialGalera(data,{context:moduleContext})!=='TODAS')throw new Error('Rol de contexto no aplicado');
(async()=>{
 const loaded=await api.load(moduleContext);
 if(loaded.DIA.length!==3||loaded.MES.length!==3)throw new Error('Carga DIA/MES incompleta');
 if(calls.length!==2)throw new Error('Cantidad de llamadas API incorrecta: '+calls.length);
 if(calls[0].name!=='panapass_ranking_pagos'||calls[0].args?.p_periodo!=='DIA')throw new Error('API DIA incorrecta');
 if(calls[1].name!=='panapass_ranking_pagos'||calls[1].args?.p_periodo!=='MES')throw new Error('API MES incorrecta');
 console.log('V171_RANKING_CONTRACT_OK',JSON.stringify({source:api.SOURCE,menosUnidades:u,menosMonto:m,vcomp:vc.map(x=>x.supervisora),apiCalls:calls}));
})().catch(e=>{console.error(e);process.exit(1)});
