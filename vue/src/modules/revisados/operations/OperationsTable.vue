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
<tr v-for="r in rows" :key="String(r.unidad_id||r.placa||r.unidad)" tabindex="0" @dblclick="emit('open',r)" @keydown.enter="emit('open',r)">
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
.queue-table-shell{max-width:100%;overflow:auto;border:1px solid #BFD0E4;border-radius:14px;background:#fff;box-shadow:0 12px 28px rgba(13,37,81,.07)}
.queue-table{width:100%;min-width:1240px;border-collapse:separate;border-spacing:0;table-layout:fixed}
.queue-table th{position:sticky;top:0;z-index:4;padding:11px 12px;border-bottom:1px solid #123A82;background:linear-gradient(180deg,#174EA6,#123F8E);color:#fff;font-size:8px;font-weight:850;text-align:left;text-transform:uppercase;letter-spacing:.045em}
.queue-table th:nth-child(1){width:92px}.queue-table th:nth-child(2){width:160px}.queue-table th:nth-child(3){width:110px}.queue-table th:nth-child(4){width:72px}.queue-table th:nth-child(5){width:145px}.queue-table th:nth-child(6){width:135px}.queue-table th:nth-child(7){width:130px}.queue-table th:nth-child(8){width:300px}.queue-table th:nth-child(9){width:84px}
.queue-table td{padding:11px 12px;border-bottom:1px solid #E3EAF3;color:#1E3153;font-size:10px;vertical-align:middle;background:inherit}
.queue-table tbody tr:nth-child(even){background:#FBFCFE}.queue-table tbody tr:hover,.queue-table tbody tr:focus{background:#F0F6FF;outline:0}
.unit-company,.plate-cupo,.location,.review{display:grid;gap:3px;min-width:0}.unit-company b,.location b,.review b{color:#0B1F4D;font-size:11px}.unit-company span,.plate-cupo small,.location small,.review small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#6B7C93;font-size:8px}
.plate{width:max-content;max-width:100%;padding:5px 7px;border:1px solid #AFC6E3;border-radius:6px;background:#F6FAFF;color:#123E86;font:800 9px/1 ui-monospace,monospace;letter-spacing:.05em}
.month{white-space:nowrap}.priority{display:inline-flex;padding:5px 7px;border-radius:999px;font-size:8px;font-weight:900}.priority[data-tone="high"]{background:#FFE2B8;color:#944600}.priority[data-tone="mid"]{background:#FFF0CC;color:#9A6000}.priority[data-tone="current"]{background:#E5EEFA;color:#44617F}.priority[data-tone="neutral"]{background:#EEF2F6;color:#66758E}
.pending-pill{width:max-content;padding:3px 6px;border-radius:999px;background:#FFE0DD;color:#A9231A;font-size:7px;font-weight:900}.status2{display:inline-flex;max-width:100%;padding:4px 7px;border:1px solid #AFC9E8;border-radius:999px;background:#E8F2FF;color:#174EA6;font-size:8px;font-weight:850;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ecar{min-width:0;display:grid;gap:5px;padding:8px 9px;border:1px solid #C7D7E9;border-radius:10px;background:#F7FAFD;overflow:hidden}.ecar[data-state="ok"]{border-color:#8CD9B4;background:#EDF9F2}.ecar[data-state="alert"]{border-color:#F3B56A;background:#FFF6E9}.ecar[data-state="error"]{border-color:#F29A95;background:#FFF0EF}.ecar[data-state="pending"]{border-color:#B8C8F0;background:#F1F4FF}
.ecar-top{min-width:0}.ecar-main{display:inline-flex;width:max-content;max-width:100%;padding:4px 7px;border-radius:999px;background:#D1FADF;color:#067647;font-size:8px;font-weight:900}.ecar[data-state="none"] .ecar-main{background:#E8EEF6;color:#5D6E84}.ecar[data-state="error"] .ecar-main{background:#FEE4E2;color:#B42318}.ecar[data-state="pending"] .ecar-main{background:#E0E7FF;color:#3949AB}
.ecar-alerts{display:flex;flex-wrap:wrap;gap:4px}.ecar-alerts span{max-width:135px;padding:4px 6px;border-radius:999px;background:#FFE4C2;color:#9C4F00;font-size:7px;font-weight:850;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ecar-detail{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#7A5A2D;font-size:7px}.ecar-time{color:#66758E;font-size:7px}
.action-head,.action-cell{position:sticky!important;right:0;z-index:5;background:#123F8E!important}.action-cell{z-index:3;background:#fff!important;box-shadow:-8px 0 14px -12px rgba(10,31,72,.5)}
.queue-table tbody tr:nth-child(even) .action-cell{background:#FBFCFE!important}.queue-table tbody tr:hover .action-cell{background:#F0F6FF!important}
.open-btn{display:inline-flex!important;align-items:center!important;gap:5px!important;padding:7px 9px!important;border:1px solid #AFC9E8!important;border-radius:8px!important;background:#F6F9FF!important;color:#174EA6!important;font-size:9px!important;font-weight:850!important;cursor:pointer!important}.open-btn:hover{background:#E8F2FF!important}
.empty{min-height:150px;display:flex;align-items:center;justify-content:center;gap:10px;color:#8290A4}.empty span{display:grid;gap:2px}.empty b{color:#10224E}.empty small{font-size:9px}
</style>
