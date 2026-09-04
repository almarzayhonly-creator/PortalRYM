const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync('modules/panapass/bajas/index.js','utf8');
const calls=[];
const sample=[
 {unidad:'V100',galera:'VCOMP',empresa:'EMPRESA A',placa:'AB1234',panapass_numero:'10001',tags_ena:'TAG1',cantidad_tags:1,saldo:-5,ena_consultado_at:'2026-08-28T12:00:00Z',alerta_admin:false},
 {unidad:'V200',galera:'VIPCO',empresa:'EMPRESA B',placa:'CD5678',panapass_numero:'10002',tags_ena:'TAG2,TAG3',cantidad_tags:2,saldo:25.5,ena_consultado_at:'2026-08-28T12:00:00Z',alerta_admin:false},
 {unidad:'V300',galera:'VINDU',empresa:'EMPRESA C',placa:'EF9012',panapass_numero:'10003',tags_ena:'',cantidad_tags:0,saldo:0,ena_consultado_at:'',alerta_admin:true}
];
const context={session:{},api:{panapass:{bajas:async()=>{calls.push('bajas');return sample;}}}};
const sandbox={window:{RYM_CONTEXT:{create:()=>context},RYM_MODULES:{has:()=>false,register:(n,d)=>sandbox.registered={n,d}}},document:{querySelector:()=>null},CustomEvent:function(){}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
(async()=>{
 const api=sandbox.window.RYM_PANAPASS_BAJAS;if(!api)throw Error('Bajas API missing');
 const rows=await api.load(context);
 if(calls.length!==1)throw Error('API Bajas no llamada exactamente una vez');
 if(api.status(rows[0])!=='PENDIENTE_BAJA')throw Error('Estado pendiente incorrecto');
 if(api.status(rows[1])!=='BAJA_PENDIENTE_DEVOLUCION')throw Error('Estado devolucion incorrecto');
 if(api.status(rows[2])!=='REVISION_ADMIN')throw Error('Estado revision incorrecto');
 const s=api.summary(rows);if(s.tags!==3||s.pendientes!==2||s.revisionAdmin!==1||s.devolucion!==1)throw Error('Resumen Bajas incorrecto '+JSON.stringify(s));
 const ena=api.enaContext(rows[1]);
 if(ena.telefono!=='')throw Error('ENA telefono debe quedar vacio');
 if(!ena.motivo.includes('CD5678'))throw Error('ENA motivo debe incluir placa');
 if(ena.cuentaOrigen!=='10002')throw Error('ENA cuenta origen incorrecta');
 console.log('V171_BAJAS_CONTRACT_OK',JSON.stringify({source:api.SOURCE,summary:s,ena:{unidad:ena.unidad,placa:ena.placa,cuentaOrigen:ena.cuentaOrigen,motivo:ena.motivo,telefono:ena.telefono}}));
})().catch(e=>{console.error(e);process.exit(1)});
