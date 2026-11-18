import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const H={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-cron-token","Access-Control-Allow-Methods":"POST, OPTIONS"};
const API_URL="http://162.254.207.218:4001/ver-panapass-actualizado";
const CONTROL_SHEET_ID="1LDwD69odwu2vESF1Z4zUX9CdkUZGzEoHEdS4oQJjJ9M";
const SHEET_NAME="Consulta Panapass";
const HEADERS=["Unidad","Panapass","Saldo","Operador#","Cedula","Nombres","Supervisor","Actualizado"];
const MIN_WAIT_MINUTES=35;
const STABLE_GAP_SECONDS=180;
const MIN_RELATIVE_ROWS=0.95;

const out=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:H});
const cleanStr=(v:any)=>String(v??"").trim();
const norm=(v:any)=>cleanStr(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[\s_-]+/g,"");
const normUnit=(v:any)=>cleanStr(v).toUpperCase();
const panamaYMD=(d=new Date())=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Panama",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);

function pick(obj:any,names:string[]){
  const entries=Object.entries(obj||{});
  for(const wanted of names){const w=norm(wanted);for(const [k,v] of entries){if(norm(k)===w&&v!==null&&v!==undefined&&cleanStr(v)!=="")return v;}}
  return null;
}
function toNum(v:any){
  if(v===null||v===undefined||cleanStr(v)==="")return null;
  let s=cleanStr(v).replace(/[$\s]/g,"");
  if(s.includes(",")&&!s.includes("."))s=s.replace(",",".");else s=s.replace(/,/g,"");
  const n=Number(s);return Number.isFinite(n)?n:null;
}
function parseTs(v:any,expectedDay=panamaYMD()){
  if(v===null||v===undefined||cleanStr(v)==="")return 0;
  if(v instanceof Date)return v.getTime();
  if(typeof v==="number"||/^\d{10,13}$/.test(cleanStr(v))){
    const n=Number(v);const ts=n<1e11?n*1000:n;
    return Number.isFinite(ts)&&panamaYMD(new Date(ts))===expectedDay&&ts<=Date.now()+60000?ts:0;
  }
  const s=cleanStr(v).replace(/\u202f|\u00a0/g," ").trim();
  const normalized=s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");
  const valid=(ts:number)=>Number.isFinite(ts)&&ts>0&&panamaYMD(new Date(ts))===expectedDay&&ts<=Date.now()+60000?ts:0;
  if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(s)){
    const iso=s.replace(" ","T").replace(/([+-]\d{2})(\d{2})$/,"$1:$2");
    return valid(Date.parse(iso));
  }
  const isoLocal=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
  if(isoLocal){
    const y=+isoLocal[1],m=+isoLocal[2],d=+isoLocal[3],h=+isoLocal[4],mi=+isoLocal[5],se=+(isoLocal[6]||0),ms=+(isoLocal[7]||0);
    const check=new Date(Date.UTC(y,m-1,d));if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d||h>23||mi>59||se>59)return 0;
    return valid(Date.UTC(y,m-1,d,h+5,mi,se,ms));
  }
  const local=normalized.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?$/i);
  if(!local)return 0;
  const a=+local[1],b=+local[2],y=+local[3];let h=+local[4];const mi=+local[5],se=+(local[6]||0),ms=+(local[7]||0);
  const ap=(local[8]||"").replace(/[.\s]/g,"").toLowerCase();
  if(ap&&(h<1||h>12))return 0;if(ap==="am"&&h===12)h=0;else if(ap==="pm"&&h<12)h+=12;
  const mk=(m:number,d:number)=>{const c=new Date(Date.UTC(y,m-1,d));if(c.getUTCFullYear()!==y||c.getUTCMonth()!==m-1||c.getUTCDate()!==d||h>23||mi>59||se>59)return 0;return valid(Date.UTC(y,m-1,d,h+5,mi,se,ms));};
  const candidates=[mk(a,b),mk(b,a)].filter(Boolean);const unique=[...new Set(candidates)];
  return unique.length===1?unique[0]:0;
}
function sourceRow(obj:any){
  const unidad=cleanStr(pick(obj,["Unidad","UNIDAD","unidad"]));
  const pan=toNum(pick(obj,["Panapass","PANAPASS","panapass","Panapass_numero","Numero Panapass","Nro Panapass"]));
  const saldo=toNum(pick(obj,["Saldo","SALDO","saldo","Balance","balance","Saldo Actual","saldo_actual"]));
  const actualizado=pick(obj,["Actualizado","ACTUALIZADO","actualizado","Actualizado_en","actualizado_en","updatedAt","updated_at","timestamp","fecha_actualizado","Fecha_actualizado","fecha","Fecha","ultima_actualizacion","fecha_actualizacion","fechaConsulta","ultimaConsulta","lastUpdated","last_updated","Fecha Actualizacion"]);
  const operador=pick(obj,["Operador#","Operador","operador","N_OP","n_op"]);
  const cedula=pick(obj,["Cedula","Cédula","cedula"]);
  const nombres=pick(obj,["Nombres","Nombre","nombres","nombre","Nombre_operador","nombre_operador"]);
  const supervisor=pick(obj,["Supervisor","Supervisora","supervisor","supervisora","Supervisor_nombre","supervisor_nombre"]);
  return {unidad,panapass_numero:pan===null?null:Math.trunc(pan),saldo,operador:operador??"",cedula:cedula??"",nombres:nombres??"",supervisor:supervisor??"",actualizado:actualizado??"",updated_ms:parseTs(actualizado)};
}
function transform(raw:any[],expectedDay=panamaYMD(),cutoffMs:number|null=null){
  let filtered=0,invalid=0,dups=0,maxMs=0;const map=new Map<string,any>();
  for(const obj of raw){
    const r=sourceRow(obj);r.updated_ms=parseTs(r.actualizado,expectedDay);
    if(!r.unidad||r.panapass_numero===null||r.saldo===null){invalid++;continue;}if(!r.updated_ms){filtered++;continue;}
    if(cutoffMs!==null&&r.updated_ms>cutoffMs){filtered++;continue;}
    const key=`${r.unidad}||${r.panapass_numero}`;const prev=map.get(key);
    if(prev){dups++;if(r.updated_ms>=prev.updated_ms)map.set(key,r);}else map.set(key,r);
    if(r.updated_ms>maxMs)maxMs=r.updated_ms;
  }
  const full=[...map.values()].sort((a,b)=>a.panapass_numero-b.panapass_numero||a.unidad.localeCompare(b.unidad));
  const db=full.map(r=>({unidad:r.unidad,panapass_numero:r.panapass_numero,saldo:r.saldo}));
  return {hoy:expectedDay,full,db,filtered,invalid,dups,maxMs,maxIso:maxMs?new Date(maxMs).toISOString():null};
}
async function fetchExternal(){
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),45000);
  try{
    const r=await fetch(API_URL,{method:"GET",headers:{Accept:"application/json"},redirect:"follow",signal:ctl.signal});
    const text=await r.text();if(!r.ok)throw Error(`API ENA HTTP ${r.status}: ${text.slice(0,300)}`);
    let j:any;try{j=JSON.parse(text)}catch{throw Error(`API ENA devolvió JSON inválido: ${text.slice(0,200)}`)}
    const rows=Array.isArray(j?.datos)?j.datos:Array.isArray(j?.data)?j.data:Array.isArray(j)?j:[];
    if(!rows.length)throw Error("API ENA no devolvió filas.");return rows;
  }finally{clearTimeout(timer)}
}
async function digest(value:any){
  const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(value))));
  return [...bytes].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function loadAll(admin:any){
  const rows:any[]=[];for(let from=0;;from+=1000){const {data,error}=await admin.from("saldos_actuales").select("panapass_numero,unidad,saldo").order("panapass_numero",{ascending:true}).range(from,from+999);if(error)throw error;const part=data||[];rows.push(...part);if(part.length<1000)break;}return rows;
}
function verifyDb(source:any[],dbRows:any[]){
  if(source.length!==dbRows.length)return {ok:false,diferencias:Math.abs(source.length-dbRows.length)+1};
  const map=new Map<number,any>();for(const r of dbRows)map.set(Number(r.panapass_numero),r);
  let dif=0;for(const r of source){const d=map.get(Number(r.panapass_numero));if(!d||normUnit(d.unidad)!==normUnit(r.unidad)||Math.abs(Number(d.saldo)-Number(r.saldo))>0.000001)dif++;}
  return {ok:dif===0,diferencias:dif};
}
function supervisorRows(full:any[]){const rows:any[]=[];for(const r of full){if(cleanStr(r.unidad)&&cleanStr(r.supervisor))rows.push({unidad:cleanStr(r.unidad),supervisora:cleanStr(r.supervisor)});}return rows;}
function b64url(input:Uint8Array|string){const b=typeof input==="string"?new TextEncoder().encode(input):input;let s="";for(const x of b)s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
async function googleJwt(sa:any){
  const now=Math.floor(Date.now()/1000),head={alg:"RS256",typ:"JWT"},pay={iss:sa.client_email,scope:"https://www.googleapis.com/auth/spreadsheets",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600};
  const data=`${b64url(JSON.stringify(head))}.${b64url(JSON.stringify(pay))}`;const pem=sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"");const der=Uint8Array.from(atob(pem),(c:any)=>c.charCodeAt(0));const key=await crypto.subtle.importKey("pkcs8",der.buffer,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);const sig=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(data)));return `${data}.${b64url(sig)}`;
}
async function googleToken(sa:any){const assertion=await googleJwt(sa);const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})});const j=await r.json();if(!r.ok||!j.access_token)throw Error(j.error_description||j.error||"No se pudo autenticar con Google");return j.access_token;}
async function sheetWriteAndVerify(full:any[]){
  const sa=JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")||"{}");if(!sa.client_email||!sa.private_key)throw Error("Credencial Google incompleta");const tok=await googleToken(sa);
  const rows=full.map(r=>[r.unidad,r.panapass_numero,r.saldo,r.operador??"",r.cedula??"",r.nombres??"",r.supervisor??"",r.actualizado??""]);
  const values=[HEADERS,...rows];const range=`'${SHEET_NAME}'!A1:H${values.length}`;
  const u=`https://sheets.googleapis.com/v4/spreadsheets/${CONTROL_SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const wr=await fetch(u,{method:"PUT",headers:{Authorization:`Bearer ${tok}`,"Content-Type":"application/json"},body:JSON.stringify({majorDimension:"ROWS",values})});const wj=await wr.json().catch(()=>({}));if(!wr.ok)throw Error(wj?.error?.message||`Google Sheets write HTTP ${wr.status}`);
  const clearStart=values.length+1;const clearRange=`'${SHEET_NAME}'!A${clearStart}:Z5000`;
  const cr=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONTROL_SHEET_ID}/values/${encodeURIComponent(clearRange)}:clear`,{method:"POST",headers:{Authorization:`Bearer ${tok}`,"Content-Type":"application/json"},body:"{}"});if(!cr.ok){const cj=await cr.json().catch(()=>({}));throw Error(cj?.error?.message||`Google Sheets clear HTTP ${cr.status}`);}
  const rr=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONTROL_SHEET_ID}/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`,{headers:{Authorization:`Bearer ${tok}`}});const rj=await rr.json();if(!rr.ok)throw Error(rj?.error?.message||`Google Sheets readback HTTP ${rr.status}`);
  const got=rj.values||[];if(got.length!==values.length)throw Error(`Verificación Sheets falló: esperado ${values.length-1}, leído ${Math.max(0,got.length-1)}`);
  let dif=0;for(let i=1;i<values.length;i++){const a=values[i],b=got[i]||[];if(normUnit(a[0])!==normUnit(b[0])||Number(a[1])!==Number(b[1])||Math.abs(Number(a[2])-Number(b[2]))>0.000001||cleanStr(a[7])!==cleanStr(b[7]))dif++;}
  if(dif)throw Error(`Verificación Sheets falló: ${dif} filas no coinciden.`);return {ok:true,filas:rows.length,diferencias:0};
}
async function patchRun(admin:any,hoy:string,tipo:string,patch:any){patch.updated_at=new Date().toISOString();const {error}=await admin.from("panapass_ena_runs").update(patch).eq("fecha",hoy).eq("tipo",tipo);if(error)throw error;}

Deno.serve(async req=>{
  try{
    if(req.method==="OPTIONS")return new Response("ok",{headers:H});
    if(req.method!=="POST")return out({ok:false,error:"Método no permitido"},405);
    const url=Deno.env.get("SUPABASE_URL")!;
    const admin=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token=req.headers.get("x-cron-token")||"";
    const bearer=req.headers.get("Authorization")||"";
    let autorizado=false;
    if(token){
      const {data:valid,error:cronAuthError}=await admin.rpc("panapass_cron_token_valid",{p_token:token});
      if(cronAuthError&&!bearer)throw cronAuthError;
      if(valid===true)autorizado=true;
    }
    if(!autorizado&&bearer.startsWith("Bearer ")){
      const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
      if(anon){
        const userClient=createClient(url,anon,{global:{headers:{Authorization:bearer}}});
        const {data:userData,error:userError}=await userClient.auth.getUser();
        if(!userError&&userData?.user){
          const {error:permissionError}=await userClient.rpc("panapass_v10_estado_operativo");
          if(!permissionError)autorizado=true;
        }
      }
    }
    if(!autorizado)return out({ok:false,error:"No autorizado"},401);
    const body=await req.json().catch(()=>({}));const hoy=panamaYMD();
    if(body?.action==="diagnose"){
      const raw=await fetchExternal();
      const tr=transform(raw);
      const samples=raw.slice(0,6).map((item:any)=>{
        const rawDate=pick(item,["Actualizado","ACTUALIZADO","actualizado","Actualizado_en","actualizado_en","updatedAt","updated_at","timestamp","fecha_actualizado","Fecha_actualizado","fecha","Fecha"]);
        const stamp=parseTs(rawDate);
        return {keys:Object.keys(item||{}),actualizado:String(rawDate??"").slice(0,80),parsed_iso:stamp?new Date(stamp).toISOString():null,panama_day:stamp?panamaYMD(new Date(stamp)):null};
      });
      return out({ok:true,diagnostic:true,today:hoy,raw_rows:raw.length,valid_rows:tr.full.length,rejected_date:tr.filtered,invalid:tr.invalid,samples});
    }
    if(body?.action==="diagnose_snapshot"){
      const expectedDay=cleanStr(body?.expected_date)||hoy;
      const cutoffRaw=body?.cutoff_iso?Date.parse(String(body.cutoff_iso)):NaN;
      const cutoffMs=Number.isFinite(cutoffRaw)?cutoffRaw:null;
      const raw=await fetchExternal();const tr=transform(raw,expectedDay,cutoffMs);
      const negativos=tr.db.filter((r:any)=>Number(r.saldo)<0).length;
      const saldo_total=Number(tr.db.reduce((a:number,r:any)=>a+Number(r.saldo||0),0).toFixed(2));
      return out({ok:true,diagnostic:true,expected_date:expectedDay,cutoff_iso:cutoffMs?new Date(cutoffMs).toISOString():null,raw_rows:raw.length,valid_rows:tr.db.length,negativos,saldo_total,max_actualizado:tr.maxIso,descartadas:tr.filtered,invalidas:tr.invalid,duplicadas:tr.dups});
    }
    if(body?.action==="recover_am"){
      const expectedDay=cleanStr(body?.expected_date)||hoy;
      if(expectedDay!==hoy)return out({ok:false,error:"La recuperación solo puede registrar la fecha operativa actual."},400);
      const cutoffRaw=Date.parse(String(body?.cutoff_iso||""));if(!Number.isFinite(cutoffRaw))return out({ok:false,error:"cutoff_iso requerido."},400);
      const expectedCount=Number(body?.expected_count), expectedNeg=Number(body?.expected_negatives), expectedSum=Number(body?.expected_sum);
      const raw=await fetchExternal();const tr=transform(raw,expectedDay,cutoffRaw);
      const negativos=tr.db.filter((r:any)=>Number(r.saldo)<0).length;
      const saldo_total=Number(tr.db.reduce((a:number,r:any)=>a+Number(r.saldo||0),0).toFixed(2));
      if(tr.db.length!==expectedCount||negativos!==expectedNeg||Math.abs(saldo_total-expectedSum)>0.005)return out({ok:false,estado:"VALIDACION_FALLIDA",filas:tr.db.length,negativos,saldo_total,max_actualizado:tr.maxIso},409);
      const {data:res,error:err}=await admin.rpc("panapass_recover_corte_json",{p_tipo:"6AM",p_source_max:tr.maxIso,p_rows:tr.db,p_expected_count:expectedCount,p_expected_negatives:expectedNeg,p_expected_sum:expectedSum,p_run_fecha:expectedDay});if(err)throw err;
      return out({ok:true,estado:"LISTO",recuperacion:true,resultado:res?.[0]||null});
    }
    let tipo=cleanStr(body?.tipo).toUpperCase();
    let q=admin.from("panapass_ena_runs").select("fecha,tipo,estado,iniciado_en,intentos,detalle,source_max_detectado").eq("fecha",hoy).in("estado",["DISPARADO","ESPERANDO","OBSERVANDO","FUENTE_INCOMPLETA","ERROR"]);
    if(["6AM","11AM"].includes(tipo))q=q.eq("tipo",tipo);else q=q.order("iniciado_en",{ascending:true}).limit(1);
    const {data:runs,error:re}=await q;if(re)throw re;const run=Array.isArray(runs)?runs[0]:runs;if(!run)return out({ok:true,estado:"SIN_PROCESO",mensaje:"No hay corte ENA pendiente."});tipo=run.tipo;
    const elapsed=(Date.now()-new Date(run.iniciado_en).getTime())/60000;if(elapsed<MIN_WAIT_MINUTES)return out({ok:true,tipo,estado:"ESPERANDO_TIEMPO",minutos:Math.floor(elapsed),faltan:Math.ceil(MIN_WAIT_MINUTES-elapsed)});

    const raw=await fetchExternal();const tr=transform(raw);
    if(!tr.maxIso||tr.full.length<1000){await patchRun(admin,hoy,tipo,{estado:"FUENTE_INCOMPLETA",intentos:Number(run.intentos||0)+1,filas_api:raw.length,filas_validas:tr.full.length,error:null,detalle:{...(run.detalle||{}),ultima_observacion:{filas_api:raw.length,filas_validas:tr.full.length,invalidas:tr.invalid,descartadas_fecha:tr.filtered,duplicadas:tr.dups,max_actualizado:tr.maxIso,formatos_fecha_muestra:raw.slice(0,4).map((x:any)=>String(pick(x,["Actualizado","ACTUALIZADO","actualizado","Actualizado_en","actualizado_en","updatedAt","updated_at","timestamp","fecha_actualizado","Fecha_actualizado","fecha","Fecha"])??"").slice(0,60)),minimo_dinamico:1000,motivo:tr.full===0&&tr.filtered>0?"FUENTE_SIN_FECHA_HOY":"MENOS_DE_1000"}}});return out({ok:true,tipo,estado:"FUENTE_INCOMPLETA",filas:tr.full.length,filas_api:raw.length,descartadas_fecha:tr.filtered,invalidas:tr.invalid});}

    const {data:ref}=await admin.from("panapass_cortes_fuente").select("tipo,total_registros,max_actualizado,capturado_en").order("capturado_en",{ascending:false}).limit(1).maybeSingle();
    const minRows=ref?.total_registros?Math.floor(Number(ref.total_registros)*MIN_RELATIVE_ROWS):1000;
    if(tr.full.length<minRows){await patchRun(admin,hoy,tipo,{estado:"FUENTE_INCOMPLETA",intentos:Number(run.intentos||0)+1,filas_api:raw.length,filas_validas:tr.full.length,source_max_detectado:tr.maxIso,error:null,detalle:{...(run.detalle||{}),ultima_observacion:{filas_api:raw.length,filas_validas:tr.full.length,invalidas:tr.invalid,descartadas_fecha:tr.filtered,duplicadas:tr.dups,max_actualizado:tr.maxIso,minimo_dinamico:minRows,referencia:ref?.total_registros??null,motivo:"CONTEO_BAJO"}}});return out({ok:true,tipo,estado:"FUENTE_INCOMPLETA",filas:tr.full.length,minimo_dinamico:minRows,descartadas_fecha:tr.filtered,invalidas:tr.invalid});}

    if(tipo==="11AM"){
      const {data:am}=await admin.from("panapass_cortes_fuente").select("max_actualizado,total_registros").eq("fecha",hoy).eq("tipo","6AM").order("capturado_en",{ascending:false}).limit(1).maybeSingle();
      if(!am?.max_actualizado)return out({ok:true,tipo,estado:"ESPERANDO_AM",mensaje:"No existe corte AM aceptado de hoy."});
      const amMs=new Date(am.max_actualizado).getTime();
      const filasPosteriores=tr.full.filter((r:any)=>Number(r.updated_ms)>amMs).length;
      const minimoPosteriores=Math.floor(Number(am.total_registros||tr.full.length)*MIN_RELATIVE_ROWS);
      if(filasPosteriores<minimoPosteriores){
        await patchRun(admin,hoy,tipo,{estado:"ESPERANDO",intentos:Number(run.intentos||0)+1,filas_api:raw.length,filas_validas:tr.full.length,source_max_detectado:tr.maxIso,error:null,detalle:{...(run.detalle||{}),ultima_observacion:{filas_api:raw.length,filas_validas:tr.full.length,invalidas:tr.invalid,descartadas_fecha:tr.filtered,duplicadas:tr.dups,max_actualizado:tr.maxIso,minimo_dinamico:minRows,baseline_am:am.max_actualizado,filas_posteriores_am:filasPosteriores,minimo_posteriores:minimoPosteriores,motivo:"FUENTE_PM_NO_INDEPENDIENTE"}}});
        return out({ok:true,tipo,estado:"ESPERANDO_NUEVA_FUENTE",source_max:tr.maxIso,baseline_am:am.max_actualizado,filas_posteriores_am:filasPosteriores,minimo_posteriores:minimoPosteriores});
      }
      if(new Date(tr.maxIso).getTime()<=amMs){await patchRun(admin,hoy,tipo,{estado:"ESPERANDO",intentos:Number(run.intentos||0)+1,filas_api:raw.length,filas_validas:tr.full.length,source_max_detectado:tr.maxIso,error:null,detalle:{...(run.detalle||{}),ultima_observacion:{filas_api:raw.length,filas_validas:tr.full.length,invalidas:tr.invalid,descartadas_fecha:tr.filtered,duplicadas:tr.dups,max_actualizado:tr.maxIso,minimo_dinamico:minRows,baseline_am:am.max_actualizado,motivo:"MISMO_CORTE_AM"}}});return out({ok:true,tipo,estado:"ESPERANDO_NUEVA_FUENTE",source_max:tr.maxIso,baseline_am:am.max_actualizado});}
    }

    const signature=await digest(tr.db);
    const prev=run.detalle?.probe||null;const nowIso=new Date().toISOString();
    if(!prev||prev.signature!==signature||!prev.observed_at){await patchRun(admin,hoy,tipo,{estado:"OBSERVANDO",intentos:Number(run.intentos||0)+1,filas_api:raw.length,filas_validas:tr.full.length,source_max_detectado:tr.maxIso,error:null,detalle:{...(run.detalle||{}),probe:{signature,observed_at:nowIso,filas:tr.full.length,max_actualizado:tr.maxIso},mensaje:"Primera lectura estable registrada; falta una segunda lectura igual."}});return out({ok:true,tipo,estado:"OBSERVANDO",filas:tr.full.length,source_max:tr.maxIso,mensaje:"Primera lectura candidata. Se confirmará en la próxima revisión."});}
    const gap=(Date.now()-new Date(prev.observed_at).getTime())/1000;if(gap<STABLE_GAP_SECONDS)return out({ok:true,tipo,estado:"OBSERVANDO",filas:tr.full.length,source_max:tr.maxIso,faltan_segundos:Math.ceil(STABLE_GAP_SECONDS-gap)});

    const {data:sync,error:se}=await admin.rpc("panapass_sync_fuente_replace_json",{p_rows:tr.db});if(se)throw se;
    const dbRows=await loadAll(admin);const dbCheck=verifyDb(tr.db,dbRows);if(!dbCheck.ok)throw Error(`Verificación Supabase falló: ${dbCheck.diferencias} diferencias.`);
    const {data:corte,error:ce}=await admin.rpc("panapass_registrar_corte_json",{p_tipo:tipo,p_source_max:tr.maxIso,p_rows:tr.db});if(ce)throw ce;
    const c=corte?.[0]||{},s=sync?.[0]||{};
    /* El corte y los saldos son el cierre crítico. Persistirlos antes de
       integraciones accesorias evita que Google/una sincronización lenta bloquee AM. */
    const baseDetail={...(run.detalle||{}),origen:"ENA_DIRECTO_V4",api_url:API_URL,espera_minima:MIN_WAIT_MINUTES,estabilidad:{ok:true,signature,intervalo_segundos:Math.floor(gap)},validacion_conteo:{filas:tr.full.length,referencia:ref?.total_registros??null,minimo_dinamico:minRows},supabase:{ok:true,filas:dbRows.length,diferencias:0,sync:s},corte:c,integraciones:{estado:"PENDIENTE_POST_CORTE"}};
    await patchRun(admin,hoy,tipo,{estado:"LISTO",intentos:Number(run.intentos||0)+1,filas_api:raw.length,filas_validas:tr.full.length,source_max_detectado:tr.maxIso,finalizado_en:new Date().toISOString(),corte_id:c.corte_id??null,error:null,detalle:baseDetail});
    let supervisoraCheck:any={estado:"NO_EJECUTADA"},sheetCheck:any={estado:"NO_EJECUTADA"},integrationError:any=null;
    try{
      const supRows=supervisorRows(tr.full);
      if(supRows.length){const {data:supData,error:supErr}=await admin.rpc("sync_asignacion_supervisoras_consulta",{p_rows:supRows});if(supErr)throw supErr;supervisoraCheck={...(supData?.[0]||{total:supRows.length,cambios:0,no_encontradas:0}),origen:"ENA_DIRECTO"};}
      sheetCheck=await sheetWriteAndVerify(tr.full);
    }catch(e){integrationError=String((e as any)?.message||e);}
    await patchRun(admin,hoy,tipo,{estado:"LISTO",detalle:{...baseDetail,supervisoras:supervisoraCheck,sheets:sheetCheck,integraciones:{estado:integrationError?"PENDIENTE_REINTENTO":"LISTAS",error:integrationError}}});
    return out({ok:true,tipo,estado:"LISTO",origen:"ENA_DIRECTO_V4",filas:tr.full.length,source_max:tr.maxIso,supabase:{ok:true,diferencias:0},supervisoras:supervisoraCheck,sheets:sheetCheck,corte:c});
  }catch(e){return out({ok:false,error:String((e as any)?.name==="AbortError"?"Timeout consultando API ENA":(e as any)?.message||e)},500);}
});