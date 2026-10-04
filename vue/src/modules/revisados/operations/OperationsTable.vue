<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CanonicalRevisadoRow } from '../types/revisados.types'
import RymIcon from '../components/RymIcon.vue'

const props=defineProps<{ rows: CanonicalRevisadoRow[] }>()
const emit=defineEmits<{ open:[row:CanonicalRevisadoRow] }>()

const pageSize=50
const page=ref(1)
const totalPages=computed(()=>Math.max(1,Math.ceil(props.rows.length/pageSize)))
const pageStart=computed(()=>props.rows.length ? (page.value-1)*pageSize+1 : 0)
const pageEnd=computed(()=>Math.min(page.value*pageSize,props.rows.length))
const pagedRows=computed(()=>props.rows.slice((page.value-1)*pageSize,page.value*pageSize))
function goPage(next:number){
  page.value=Math.min(totalPages.value,Math.max(1,next))
}
watch(()=>props.rows,()=>{
  if(page.value>totalPages.value) page.value=totalPages.value
  else page.value=1
},{deep:false})

function s(v:unknown){return String(v??'').trim()}
function n(v:unknown){return s(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
function date(v:unknown){
  try{return v?new Intl.DateTimeFormat('es-PA',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(String(v))):'—'}
  catch{return s(v)||'—'}
}
function rowPriority(r:CanonicalRevisadoRow){return s(r.prioridad||r['priority']||r['prioridad_operativa'])||'—'}
function rowMonth(r:CanonicalRevisadoRow){return s(r['mes_nombre']||r['mes']||r['mes_revisado']||r['mes_asignado']||r['ciclo_mes'])||'—'}
function rowStatus2(r:CanonicalRevisadoRow){return s(r['status2']||r['estatus2']||r.estado)||'—'}
function rowCupo(r:CanonicalRevisadoRow){return s(r['cupo_ecarcheck']||r['cupo_control']||r['cupo']||r['placa_comercial'])||'No aplica'}
function rowLastQuery(r:CanonicalRevisadoRow){return s(r['ecarcheck_ultima_consulta_at']||r['ecarcheck_ultima_consulta']||r['ultima_consulta_ecarcheck']||r['ecarcheck_at'])}
function rowEcarError(r:CanonicalRevisadoRow){return s(r['ecarcheck_detalle']||r['ecarcheck_error_detail']||r['ecarcheck_error'])}
function priorityTone(v:string){const x=n(v);if(x.includes('CRIT')||x.includes('URG'))return'high';if(x.includes('ALTA'))return'mid';if(x.includes('ACTUAL'))return'current';return'neutral'}
function categories(r:CanonicalRevisadoRow){
  return Array.isArray(r['ecarcheck_categorias']) ? r['ecarcheck_categorias'] as Array<Record<string,unknown>> : []
}
function ecarState(r:CanonicalRevisadoRow){
  const state=n(r['ecarcheck_estado'])
  const cats=categories(r)
  if(state==='ERROR'||cats.some(x=>n(x.tipo)==='ERROR_RESPUESTA'))return'error'
  if(state==='PENDIENTE'||n(r['ecarcheck_tipo_resultado']).includes('PENDIENTE'))return'pending'
  if(state==='BLOQUEADO'||cats.some(x=>n(x.tipo)!=='ERROR_RESPUESTA'))return'alert'
  if(state==='OK'||rowLastQuery(r))return'ok'
  return'none'
}
function categoryLabel(c:Record<string,unknown>){
  const type=n(c.tipo)
  const qty=Number(c.cantidad||0)
  if(type==='BOLETA_PLACA')return qty>0?`Boleta placa · ${qty}`:'Boleta placa'
  if(type==='ENA_EMPRESA_DOCUMENTO'){
    const doc=Number(c.boletas_documento||0), ena=Number(c.infracciones_ena||0)
    if(doc||ena)return `Empresa/doc · ${Math.max(doc,ena)}`
    return qty>0?`Empresa/doc · ${qty}`:'Empresa/documento'
  }
  if(type==='RESTRICCION_PLACA_HURTO')return'Restricción · Hurto'
  if(type==='RESTRICCION_PLACA_COLISION_FUGA')return'Restricción · Colisión y fuga'
  if(type==='RESTRICCION_PLACA_COLISION')return'Restricción · Colisión'
  if(type==='RESTRICCION_PLACA_FUGA')return'Restricción · Fuga'
  if(type==='ERROR_RESPUESTA')return'Error eCarCheck'
  return s(c.tipo).replaceAll('_',' ')
}
function detail(r:CanonicalRevisadoRow){
  const d=s(r['ecarcheck_detalle'])
  return d==='OK'?'':d
}
</script>

<template>
<div class="queue-table-shell">
<table class="queue-table">
<thead><tr>
  <th>Prioridad</th>
  <th>Unidad / empresa</th>
  <th>Placa / cupo</th>
  <th>Mes</th>
  <th>Galera / supervisora</th>
  <th>Último revisado</th>
  <th>Estatus 2</th>
  <th>eCarCheck</th>
  <th class="action-head">Acción</th>
</tr></thead>
<tbody>
<tr v-for="r in pagedRows" :key="String(r.unidad_id||r.placa||r.unidad)" :data-priority="priorityTone(rowPriority(r))" tabindex="0" @dblclick="emit('open',r)" @keydown.enter="emit('open',r)">
  <td><span class="priority" :data-tone="priorityTone(rowPriority(r))">{{rowPriority(r)}}</span></td>
  <td><div class="unit-company"><b>{{r.unidad||'—'}}</b><span>{{r.empresa||'—'}}</span></div></td>
  <td><div class="plate-cupo"><span class="plate">{{r.placa||'—'}}</span><small>{{rowCupo(r)}}</small></div></td>
  <td><span class="month">{{rowMonth(r)}}</span></td>
  <td><div class="location"><b>{{r.galera||'—'}}</b><small>{{r.supervisora||'—'}}</small></div></td>
  <td><div class="review"><span class="pending-pill">PENDIENTE</span><b>{{date(r.ultimo_revisado)}}</b><small v-if="r['ultimo_revisado_id']">ID {{r['ultimo_revisado_id']}}</small></div></td>
  <td><span class="status2" :title="rowStatus2(r)">{{rowStatus2(r)}}</span></td>
  <td>
    <div class="ecar" :data-state="ecarState(r)">
      <div class="ecar-top">
        <span v-if="ecarState(r)==='ok'" class="ecar-main">OK</span>
        <span v-else-if="ecarState(r)==='pending'" class="ecar-main">PENDIENTE</span>
        <span v-else-if="ecarState(r)==='error'" class="ecar-main">ERROR</span>
        <div v-else-if="ecarState(r)==='alert'" class="ecar-alerts">
          <span v-for="c in categories(r)" :key="String(c.tipo)">{{categoryLabel(c)}}</span>
        </div>
        <span v-else class="ecar-main">SIN CONSULTA</span>
      </div>
      <small v-if="detail(r) && ecarState(r)!=='ok'" class="ecar-detail" :title="detail(r)">{{detail(r)}}</small>
      <small v-if="rowLastQuery(r)" class="ecar-time">Consulta {{date(rowLastQuery(r))}}</small>
    </div>
  </td>
  <td class="action-cell"><button class="open-btn" type="button" @click="emit('open',r)">Ficha <RymIcon name="arrow_forward" :size="14"/></button></td>
</tr>
<tr v-if="!rows.length"><td colspan="9"><div class="empty"><RymIcon name="search_off" :size="22"/><span><b>No hay pendientes para estos filtros</b><small>Quita un filtro o cambia la búsqueda.</small></span></div></td></tr>
</tbody>
</table>
  <div v-if="rows.length" class="queue-pagination">
    <div class="pagination-summary">
      <b>{{pageStart}}–{{pageEnd}}</b>
      <span>de {{rows.length}} registros</span>
    </div>
    <div class="pagination-actions">
      <button type="button" :disabled="page<=1" @click="goPage(page-1)">← Anterior</button>
      <span>Página <b>{{page}}</b> de <b>{{totalPages}}</b></span>
      <button type="button" :disabled="page>=totalPages" @click="goPage(page+1)">Siguiente →</button>
    </div>
  </div>
</div>
</template>

<style scoped>
.queue-table-shell{max-width:100%;overflow:auto;border:1px solid #C0D1E4;border-radius:12px;background:#fff;box-shadow:0 9px 22px rgba(12,38,78,.06)}
.queue-table{width:100%;min-width:1280px;border-collapse:separate;border-spacing:0;table-layout:fixed}
.queue-table th{position:sticky;top:0;z-index:4;padding:10px 11px;border-bottom:1px solid #123B82;background:linear-gradient(180deg,#174EA6,#123F8E);color:#fff;font-size:7px;font-weight:900;text-align:left;text-transform:uppercase;letter-spacing:.04em;vertical-align:middle}
.queue-table th:nth-child(1){width:90px}.queue-table th:nth-child(2){width:170px}.queue-table th:nth-child(3){width:112px}.queue-table th:nth-child(4){width:72px}.queue-table th:nth-child(5){width:145px}.queue-table th:nth-child(6){width:138px}.queue-table th:nth-child(7){width:132px}.queue-table th:nth-child(8){width:315px}.queue-table th:nth-child(9){width:86px}
.queue-table td{height:68px;padding:9px 11px;border-bottom:1px solid #E3EAF3;color:#203454;font-size:9px;vertical-align:middle;background:inherit}
.queue-table tbody tr:nth-child(even){background:#FBFCFE}.queue-table tbody tr:hover,.queue-table tbody tr:focus{background:#F1F6FD;outline:0}
.queue-table tbody tr[data-priority="high"] td:first-child{box-shadow:inset 4px 0 0 #E2473F}.queue-table tbody tr[data-priority="mid"] td:first-child{box-shadow:inset 4px 0 0 #F2A11A}.queue-table tbody tr[data-priority="current"] td:first-child{box-shadow:inset 4px 0 0 #5A7FBC}
.unit-company,.plate-cupo,.location,.review{display:grid;align-content:center;gap:2px;min-width:0;text-align:left}.unit-company b,.location b,.review b{color:#0B214E;font-size:10px;line-height:1.2}.unit-company span,.plate-cupo small,.location small,.review small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#6A7C94;font-size:7px;line-height:1.2}
.plate{width:max-content;max-width:100%;padding:5px 7px;border:1px solid #AFC6E3;border-radius:6px;background:#F7FAFF;color:#123E86;font:850 8px/1 ui-monospace,monospace;letter-spacing:.05em}.month{white-space:nowrap;color:#314864}
.priority{display:inline-flex;align-items:center;min-height:22px;padding:4px 7px;border-radius:999px;font-size:7px;font-weight:900;line-height:1}.priority[data-tone="high"]{background:#FFE7C2;color:#994A00}.priority[data-tone="mid"]{background:#FFF0C9;color:#936000}.priority[data-tone="current"]{background:#E4EDF9;color:#466383}.priority[data-tone="neutral"]{background:#EEF2F6;color:#65758A}
.pending-pill{width:max-content;min-height:18px;display:inline-flex;align-items:center;padding:3px 6px;border-radius:999px;background:#FFE1DE;color:#AD281F;font-size:6px;font-weight:900;line-height:1}.status2{display:inline-flex;align-items:center;min-height:22px;max-width:100%;padding:4px 7px;border:1px solid #AFC9E8;border-radius:999px;background:#E9F2FF;color:#174EA6;font-size:7px;font-weight:850;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1}
.ecar{min-width:0;display:grid;align-content:center;gap:3px;padding:0;border:0;background:transparent!important;overflow:hidden}.ecar-top{min-width:0}.ecar-main{display:inline-flex;align-items:center;width:max-content;max-width:100%;min-height:20px;padding:4px 7px;border-radius:999px;background:#D9F8E7;color:#087746;font-size:7px;font-weight:900;line-height:1}.ecar[data-state="none"] .ecar-main{background:#E9EEF5;color:#617086}.ecar[data-state="error"] .ecar-main{background:#FEE4E2;color:#B42318}.ecar[data-state="pending"] .ecar-main{background:#E5E9FF;color:#3E4FA8}
.ecar-alerts{display:flex;align-items:center;flex-wrap:wrap;gap:3px}.ecar-alerts span{max-width:150px;min-height:20px;display:inline-flex;align-items:center;padding:4px 6px;border-radius:999px;background:#FFE7C7;color:#995000;font-size:6px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ecar-detail{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#6B5B45;font-size:6px;line-height:1.2}.ecar-time{color:#75849A;font-size:6px;line-height:1.2}
.action-head,.action-cell{position:sticky!important;right:0;z-index:5;background:#123F8E!important}.action-cell{z-index:3;background:#fff!important;box-shadow:-8px 0 14px -12px rgba(10,31,72,.5)}.queue-table tbody tr:nth-child(even) .action-cell{background:#FBFCFE!important}.queue-table tbody tr:hover .action-cell{background:#F1F6FD!important}
.open-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:4px!important;min-height:30px;padding:6px 8px!important;border:1px solid #AFC8E7!important;border-radius:7px!important;background:#F7FAFF!important;color:#174EA6!important;font-size:7px!important;font-weight:900!important;cursor:pointer!important}.open-btn:hover{background:#E8F2FF!important;border-color:#82A9D9!important}
.empty{min-height:130px;display:flex;align-items:center;justify-content:center;gap:9px;color:#8290A4}.empty span{display:grid;gap:2px}.empty b{color:#10224E}.empty small{font-size:8px}
</style>

<style scoped>
.queue-table tbody tr{position:relative}
.queue-table tbody tr[data-priority="high"] td:first-child{box-shadow:inset 4px 0 0 #E24A4A}
.queue-table tbody tr[data-priority="mid"] td:first-child{box-shadow:inset 4px 0 0 #F2A51A}
.queue-table tbody tr[data-priority="current"] td:first-child{box-shadow:inset 4px 0 0 #6E91C7}
.ecar{padding:7px 8px}
.ecar-alerts span{max-width:156px}
.ecar-detail{max-width:100%;font-size:7px}
.action-cell{min-width:78px}
</style>

<style scoped>
.queue-pagination{
  position:sticky;left:0;
  min-width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:10px 12px;border-top:1px solid #D7E1EC;background:#fff;
}
.pagination-summary{display:flex;align-items:baseline;gap:4px;color:#65758A;font-size:9px}
.pagination-summary b{color:#0B214E;font-size:10px}
.pagination-actions{display:flex;align-items:center;gap:8px;color:#66758B;font-size:9px}
.pagination-actions>span{white-space:nowrap}
.pagination-actions>span b{color:#0B214E}
.pagination-actions button{
  min-height:32px;padding:7px 10px!important;border:1px solid #AFC7E5!important;border-radius:8px!important;
  background:#F8FAFE!important;color:#174EA6!important;font-size:8px!important;font-weight:850!important;cursor:pointer!important;
}
.pagination-actions button:hover:not(:disabled){background:#EAF2FF!important;border-color:#7EA5D8!important}
.pagination-actions button:disabled{opacity:.38!important;cursor:not-allowed!important}
@media(max-width:680px){
  .queue-pagination{align-items:flex-start;flex-direction:column}
  .pagination-actions{width:100%;justify-content:space-between}
}
</style>

<style scoped>
/* readability + information preservation */
.queue-table th{font-size:8px;padding:11px 12px}
.queue-table td{height:72px;font-size:10px;padding:10px 12px}
.unit-company b,.location b,.review b{font-size:11px}
.unit-company span,.plate-cupo small,.location small,.review small{font-size:8px}
.plate{font-size:9px}
.priority{font-size:8px;min-height:23px}
.pending-pill{font-size:7px}
.status2{font-size:8px;min-height:23px}
.ecar-main{font-size:8px;min-height:22px}
.ecar-alerts span{font-size:7px;max-width:180px}
.ecar-detail{
  font-size:8px;
  white-space:normal;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
  line-height:1.25;
}
.ecar-time{font-size:7px}
.open-btn{font-size:8px!important}
</style>

<style scoped>
/* final tactical-table readability pass */
.queue-table{min-width:1380px}
.queue-table th:nth-child(1){width:94px}
.queue-table th:nth-child(2){width:178px}
.queue-table th:nth-child(3){width:118px}
.queue-table th:nth-child(4){width:76px}
.queue-table th:nth-child(5){width:152px}
.queue-table th:nth-child(6){width:145px}
.queue-table th:nth-child(7){width:138px}
.queue-table th:nth-child(8){width:360px}
.queue-table th:nth-child(9){width:96px}

.queue-table th{
  font-size:9px;
  line-height:1.15;
  padding:12px 13px;
}
.queue-table td{
  min-height:78px;
  height:auto;
  padding:12px 13px;
  font-size:10px;
}
.unit-company b,.location b,.review b{font-size:12px;line-height:1.25}
.unit-company span,.plate-cupo small,.location small,.review small{font-size:9px;line-height:1.25}
.plate{font-size:10px;padding:6px 8px}
.month{font-size:10px}
.priority{font-size:9px;min-height:24px;padding:5px 8px}
.pending-pill{font-size:8px;min-height:19px;padding:4px 7px}
.status2{font-size:9px;min-height:24px;padding:5px 8px}

.queue-table td:nth-child(8){
  padding-right:18px;
}
.ecar{
  gap:5px;
  padding:0 4px 0 0;
  overflow:visible;
}
.ecar-main{
  font-size:9px;
  min-height:23px;
  padding:5px 8px;
}
.ecar-alerts{
  gap:5px;
  align-items:flex-start;
}
.ecar-alerts span{
  max-width:210px;
  font-size:8px;
  min-height:23px;
  padding:5px 8px;
}
.ecar-detail{
  font-size:9px;
  line-height:1.35;
  color:#526178;
  max-width:100%;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
  overflow-wrap:anywhere;
}
.ecar-time{
  font-size:8px;
  color:#75849A;
}
.action-cell{
  min-width:96px;
  padding-left:10px!important;
  padding-right:10px!important;
  box-shadow:-14px 0 20px -18px rgba(10,31,72,.75);
}
.open-btn{
  min-height:32px!important;
  padding:7px 10px!important;
  font-size:9px!important;
}
</style>

<style scoped>
.queue-table-shell{
  border-radius:14px;
  border-color:#C4D4E8;
  box-shadow:0 10px 24px rgba(13,37,81,.07);
}
.queue-table th{
  background:linear-gradient(180deg,#1F5CB8,#174A98);
  font-size:9px;
}
.priority,.status2,.pending-pill,.ecar-main,.ecar-alerts span{
  border-radius:999px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.34);
}
.priority[data-tone="high"]{background:#FFE4BE;color:#9B4B00}
.status2{background:#E8F2FF;color:#1450A6}
.ecar-main{background:#D9F8E8;color:#08784A}
.ecar-alerts span{background:#FFE9C8;color:#9B5200}
.queue-table tbody tr:hover{background:#EEF5FF}
</style>
