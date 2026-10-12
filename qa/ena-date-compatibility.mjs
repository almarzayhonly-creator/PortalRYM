// ENA source compatibility adapter. Pure functions, no database writes.
// Use from the Edge finalizer after authenticating and fetching the ENA source.
// Panama is UTC-05:00 year-round.
const DATE_ALIASES = [
  "Actualizado","Actualizado_en","updatedAt","updated_at","timestamp",
  "fecha_actualizado","Fecha_actualizado","fecha","Fecha",
  "ultima_actualizacion","fecha_actualizacion","fechaConsulta",
  "ultimaConsulta","lastUpdated","last_updated","Fecha Actualizacion"
];
const normalizeKey = x => String(x ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[\s_-]+/g,"");
const KEYS = new Set(DATE_ALIASES.map(normalizeKey));
export function sourceDate(row) {
  for (const [key,value] of Object.entries(row || {})) {
    if (KEYS.has(normalizeKey(key)) && value != null && String(value).trim() !== "") {
      return {key,value};
    }
  }
  return {key:null,value:null};
}
export function panamaYMD(ms) {
  return new Date(ms-5*3600000).toISOString().slice(0,10);
}
function localMs(y,m,d,h,min,s,ms) {
  if(![y,m,d,h,min,s,ms].every(Number.isFinite))return null;
  if(h<0||h>23||min<0||min>59||s<0||s>59)return null;
  const check = new Date(Date.UTC(y,m-1,d));
  if (check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d) return null;
  return Date.UTC(y,m-1,d,h,min,s,ms)+5*3600000;
}
export function parseEnaDate(value,expectedDate,now=Date.now()) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(expectedDate)) throw Error("expectedDate must be YYYY-MM-DD");
  const check = candidates=>{
    const valid=candidates.filter(x=>x.ms!=null&&Number.isFinite(x.ms)&&panamaYMD(x.ms)===expectedDate&&x.ms<=now+60000);
    const unique=new Set(valid.map(x=>x.ms));
    if(unique.size===1) return {ok:true,ms:valid[0].ms,format:valid[0].format};
    return {ok:false,reason:valid.length?"AMBIGUOUS_DATE":"STALE_OR_FUTURE_DATE"};
  };
  if(value instanceof Date) return check([{ms:value.getTime(),format:"date"}]);
  if(typeof value==="number"||/^\d{10,13}$/.test(String(value??""))) {
    const n=Number(value);
    return check([{ms:n<1e11?n*1000:n,format:n<1e11?"epoch_s":"epoch_ms"}]);
  }
  const s=String(value??"").replace(/[\u00a0\u202f]/g," ").trim();
  if(!s)return {ok:false,reason:"MISSING_DATE"};
  // ISO with explicit timezone, including Z; don't reinterpret the offset.
  if(/^\d{4}-\d\d-\d\d[T ]\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:?\d\d)$/i.test(s)) {
    const normalized=s.replace(" ","T").replace(/([+-]\d\d)(\d\d)$/,"$1:$2");
    return check([{ms:Date.parse(normalized),format:"iso_tz"}]);
  }
  const iso=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
  if(iso) return check([{ms:localMs(+iso[1],+iso[2],+iso[3],+iso[4],+iso[5],+(iso[6]||0),+(iso[7]||0)),format:"iso_local"}]);
  const n=s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");
  const m=n.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?$/);
  if(!m)return {ok:false,reason:"UNRECOGNIZED_DATE_FORMAT"};
  let h=+m[4];const suffix=(m[8]||"").replace(/[.\s]/g,"");
  if(suffix&& (h<1||h>12))return {ok:false,reason:"INVALID_HOUR"};
  if(suffix==="am"&&h===12)h=0;
  if(suffix==="pm"&&h<12)h+=12;
  const time=[h,+m[5],+(m[6]||0),+(m[7]||0)];
  return check([
    {ms:localMs(+m[3],+m[1],+m[2],...time),format:"mdy"},
    {ms:localMs(+m[3],+m[2],+m[1],...time),format:"dmy"}
  ]);
}
export function inspectEnaRows(rows,expectedDate,now=Date.now()) {
  const result={rows:rows.length,accepted:0,rejected:0,reasons:{},formats:{},dateKeys:{}};
  for(const row of rows){
    const {key,value}=sourceDate(row);
    const parsed=key?parseEnaDate(value,expectedDate,now):{ok:false,reason:"MISSING_DATE_FIELD"};
    if(key)result.dateKeys[key]=(result.dateKeys[key]||0)+1;
    if(parsed.ok){result.accepted++;result.formats[parsed.format]=(result.formats[parsed.format]||0)+1;}
    else{result.rejected++;result.reasons[parsed.reason]=(result.reasons[parsed.reason]||0)+1;}
  }
  return result;
}
