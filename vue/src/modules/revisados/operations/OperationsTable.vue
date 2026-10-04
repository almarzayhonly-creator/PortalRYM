<script setup lang="ts">
import type { CanonicalRevisadoRow } from '../types/revisados.types'
import RymIcon from '../components/RymIcon.vue'

defineProps<{ rows: CanonicalRevisadoRow[] }>()
const emit=defineEmits<{ open:[row:CanonicalRevisadoRow] }>()

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
<tr v-for="r in rows" :key="String(r.unidad_id||r.placa||r.unidad)" :data-priority="priorityTone(rowPriority(r))" tabindex="0" @dblclick="emit('open',r)" @keydown.enter="emit('open',r)">
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
