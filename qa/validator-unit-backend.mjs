import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const year=new Date().getFullYear();
const units=['V100','V101','I236'].map((unidad,i)=>({id:'u'+i,unidad,estatus:'ACTIVO',empresa_operadora:'VCARS',empresa_duena:'QA EMPRESA',placa_unica:'QA'+i,placa_comercial:'CUPO'+i,mes_revisado:'ENERO',supervisora_id:'s1',color:'AMARILLO'}));
const fixtures={
  unidades:units,supervisoras:[{id:'s1',galera:'VCARS',nombre:'QA'}],empresas:[{nombre:'QA EMPRESA',activo:true}],
  revisados_operacion_estado:units.map((u,i)=>({unidad_id:u.id,anio_requerido:year,ultimo_anio_emitido:i===1?year-1:year,fecha_ultimo_revisado:'2026-01-02',boleta_pendiente:i===1})),
  revisados_vehiculo_oficial:units.map(u=>({unidad_id:u.id,placa:u.placa_unica,color:'AMARILLO',cupo:u.placa_comercial,propietario:'QA EMPRESA',actualizado_at:'2026-01-01'})),
  logistictodo_estados:units.map((u,i)=>({unidad:u.unidad,status2:i===1?'CUSTODIA':'ACTIVO'})),
  revisados_incidencias:[{id:'incident',unidad_id:'u0',estado:'ABIERTA',bloquea_emision:true,nota:'PRIVATE NOTE'}],
  revisados_boletas_consulta:[],revisados_ecarcheck:[],revisados_sync_estado:[],ecarcheck_v2_ultima_por_placa:[],revisados_incidente_tipos:[]
};
async function invoke(file,input,options={}){
  const log=[],profile={id:'user',rol:options.basic?'OPERATIVO':'ADMIN_TOTAL',activo:true,galeras_scope:['VCARS']};
  const permissions=['portal.revisados','control_auto.validador_unidad_app','revisados.operaciones','revisados.historial','revisados.boletas','revisados.estadisticas','revisados.cupos','revisados.avance'].map(modulo_codigo=>({modulo_codigo,puede_ver:options.denied?false:!options.basic||modulo_codigo==='control_auto.validador_unidad_app'}));
  class Query{
    constructor(table){this.table=table;this.filters=[];this.max=Infinity}
    select(){return this}order(){return this}not(){return this}gte(){return this}lt(){return this}
    limit(n){this.max=n;return this}
    eq(key,value){this.filters.push(row=>row[key]===value);log.push({table:this.table,key,value});return this}
    ilike(key,value){this.filters.push(row=>String(row[key]).toLowerCase()===value.toLowerCase());return this}
    in(key,values){this.filters.push(row=>values.includes(row[key]));log.push({table:this.table,key,values});return this}
    result(){const rows=this.table==='perfiles_usuario'?[profile]:this.table==='rol_modulo_permisos'?permissions:this.table==='usuario_permisos'?[]:fixtures[this.table]||[];return rows.filter(row=>this.filters.every(f=>f(row))).slice(0,this.max)}
    range(a,b){return Promise.resolve({data:this.result().slice(a,b+1),error:null})}
    maybeSingle(){return Promise.resolve({data:this.result()[0],error:null})}
    then(resolve,reject){return Promise.resolve({data:this.result(),error:null}).then(resolve,reject)}
  }
  // Permission rows include role/user identity because production applies these filters.
  permissions.forEach(p=>p.rol=profile.rol);
  const client={from:table=>new Query(table),auth:{getUser:async()=>({data:{user:{id:'user'}}})},rpc:async()=>({data:options.outside?[]:units})};
  let handler;
  const context=vm.createContext({Response,Date,Intl,Map,Set,Array,String,Number,Math,JSON,createClient:()=>client,Deno:{env:{get:()=> 'fixture'},serve:fn=>handler=fn}});
  const source=fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,'');
  vm.runInContext(stripTypeScriptTypes(source),context);
  const result=await handler(new Request('https://fixture.invalid',{method:'POST',headers:options.guest?{}:{authorization:'Bearer fixture'},body:JSON.stringify(input)}));
  return {status:result.status,data:await result.json(),log};
}
const original=await invoke('qa/backend/revisados-final-reference.ts',{});
assert.equal(original.status,200);
for(const unit of units){
  for(const basic of [false,true]){
    const scoped=await invoke('qa/backend/revisados-validator.ts',{unidad:unit.unidad},{basic});
    assert.equal(scoped.status,200);assert.equal(scoped.data.rows.length,1);
    const {incidencias_abiertas,...expected}=original.data.rows.find(row=>row.unidad===unit.unidad);
    assert.deepEqual(scoped.data.rows[0],expected,'Canonical row differs for '+unit.unidad+' basic='+basic);
    assert.ok(scoped.log.some(q=>q.table==='unidades'&&q.key==='unidad'&&q.value===unit.unidad));
    for(const query of scoped.log.filter(q=>q.key==='unidad_id'&&q.values))assert.deepEqual(Array.from(query.values),[unit.id]);
    assert.ok(!JSON.stringify(scoped.data).includes('PRIVATE NOTE'));
  }
}
for(const [input,options,status] of [[{}, {},400],[{unidad:'V100'},{guest:true},401],[{unidad:'V100'},{denied:true},403],[{unidad:'V100'},{outside:true},403]]){
  const result=await invoke('qa/backend/revisados-validator.ts',input,options);assert.equal(result.status,status);
  assert.ok(!result.log.some(q=>q.table==='unidades'),'Rejected request fetched units');
}
console.log('PASS per-unit backend: basic/full canonical row parity, blocked/manual/custody/color rules, one-unit filters, no incident notes, missing/guest/denied/out-of-scope rejection.');
