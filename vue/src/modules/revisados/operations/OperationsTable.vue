<script setup lang="ts">
import type { CanonicalRevisadoRow } from '../types/revisados.types'
import RymIcon from '../components/RymIcon.vue'

defineProps<{ rows: CanonicalRevisadoRow[] }>()
const emit=defineEmits<{ open:[row:CanonicalRevisadoRow] }>()

function s(v:unknown){return String(v??'').trim()}
function n(v:unknown){return s(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
function date(v:unknown){try{return v?new Intl.DateTimeFormat('es-PA',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(String(v))):'—'}catch{return s(v)||'—'}}
function rowPriority(r:CanonicalRevisadoRow){return s(r.prioridad||r['priority']||r['prioridad_operativa'])||'—'}
function rowMonth(r:CanonicalRevisadoRow){return s(r['mes_nombre']||r['mes']||r['mes_revisado']||r['mes_asignado']||r['ciclo_mes'])||'—'}
function rowStatus2(r:CanonicalRevisadoRow){return s(r['status2']||r['estatus2']||r.estado)||'—'}
function rowCupo(r:CanonicalRevisadoRow){return s(r['cupo_ecarcheck']||r['cupo_control']||r['cupo']||r['placa_comercial'])||'No aplica'}
function rowLastQuery(r:CanonicalRevisadoRow){return s(r['ficha_ecarcheck_at']||r['ecarcheck_ultima_consulta']||r['ultima_consulta_ecarcheck']||r['ecarcheck_at']||r['ecarcheck_actualizado_at'])}
function rowEcarError(r:CanonicalRevisadoRow){return s(r['ecarcheck_error']||r['ficha_ecarcheck_error']||r['error_ecarcheck'])}
function priorityTone(v:string){const x=n(v);if(x.includes('ALTA')||x.includes('CRIT'))return'high';if(x.includes('MEDIA'))return'mid';if(x.includes('BAJA'))return'low';return'neutral'}
function alertItems(r:CanonicalRevisadoRow){
  const out:string[]=[]
  if(r['boleta_empresa']) out.push('ENA empresa/documento')
  if(r['boleta_pendiente']) out.push('Boleta placa')
  if(Array.isArray(r.alerts)) for(const a of r.alerts){const t=s(a.texto||a.tipo);if(t&&!out.includes(t))out.push(t)}
  if(Array.isArray(r.incidencias_abiertas)) for(const i of r.incidencias_abiertas){const t=s(i.tipo_nombre||i.tipo_codigo);if(t&&!out.includes(t))out.push(t)}
  return out.slice(0,3)
}
function ecarState(r:CanonicalRevisadoRow){if(rowEcarError(r))return'error';if(alertItems(r).length||r.bloqueado)return'alert';if(rowLastQuery(r))return'ok';return'none'}
</script>

<template>
<div class="queue-table-shell">
<table class="queue-table">
<thead><tr>
  <th>Prioridad</th><th>Unidad</th><th>Empresa</th><th>Placa</th><th>Cupo</th><th>Mes</th><th>Galera / supervisora</th><th>Último revisado</th><th>Estatus 2</th><th>eCarCheck</th><th>Acción</th>
</tr></thead>
<tbody>
<tr v-for="r in rows" :key="String(r.unidad_id||r.placa||r.unidad)" tabindex="0" @dblclick="emit('open',r)" @keydown.enter="emit('open',r)">
  <td><span class="priority" :data-tone="priorityTone(rowPriority(r))">{{rowPriority(r)}}</span></td>
  <td><div class="unit"><b>{{r.unidad||'—'}}</b><small>{{r.galera||'—'}}</small></div></td>
  <td><span class="company">{{r.empresa||'—'}}</span></td>
  <td><span class="plate">{{r.placa||'—'}}</span></td>
  <td><span class="cupo">{{rowCupo(r)}}</span></td>
  <td><span class="month">{{rowMonth(r)}}</span></td>
  <td><div class="location"><b>{{r.galera||'—'}}</b><small>{{r.supervisora||'—'}}</small></div></td>
  <td><div class="review"><span class="pending-pill">PENDIENTE</span><b>{{date(r.ultimo_revisado)}}</b><small v-if="r['revisado_id']">Emisión registrada · ID {{r['revisado_id']}}</small></div></td>
  <td><span class="status2">{{rowStatus2(r)}}</span></td>
  <td>
    <div class="ecar" :data-state="ecarState(r)">
      <template v-if="ecarState(r)==='ok'"><span class="ecar-main">OK</span></template>
      <template v-else-if="ecarState(r)==='alert'"><div class="ecar-alerts"><span v-for="x in alertItems(r)" :key="x">{{x}}</span></div></template>
      <template v-else-if="ecarState(r)==='error'"><span class="ecar-main">ERROR</span><small>{{rowEcarError(r)}}</small></template>
      <template v-else><span class="ecar-main">SIN CONSULTA</span></template>
      <small v-if="rowLastQuery(r)">Última consulta: {{date(rowLastQuery(r))}}</small>
    </div>
  </td>
  <td><button class="open-btn" type="button" @click="emit('open',r)">Ficha <RymIcon name="arrow_forward" :size="14"/></button></td>
</tr>
<tr v-if="!rows.length"><td colspan="11"><div class="empty"><RymIcon name="search_off" :size="22"/><span><b>No hay pendientes para estos filtros</b><small>Quita un filtro o cambia la búsqueda.</small></span></div></td></tr>
</tbody>
</table>
</div>
</template>

<style scoped>
.queue-table-shell{overflow:auto;border:1px solid #D8E3F2;border-radius:14px;background:#fff;box-shadow:0 10px 28px rgba(10,27,77,.045)}
.queue-table{width:100%;min-width:1500px;border-collapse:separate;border-spacing:0}.queue-table th{position:sticky;top:0;z-index:2;padding:10px 11px;border-bottom:1px solid #C9D8EA;background:#EAF2FD;color:#35598E;font-size:9px;font-weight:850;text-align:left;text-transform:uppercase;letter-spacing:.025em}.queue-table td{padding:11px;border-bottom:1px solid #E9EFF6;color:#203253;font-size:10px;vertical-align:middle}.queue-table tbody tr:last-child td{border-bottom:0}.queue-table tbody tr{outline:0;transition:background .15s}.queue-table tbody tr:hover,.queue-table tbody tr:focus{background:#F8FBFF}.queue-table tbody tr:focus{box-shadow:inset 3px 0 0 #244AA5}
.priority{display:inline-flex;padding:5px 7px;border-radius:999px;font-size:8px;font-weight:900}.priority[data-tone="high"]{background:#FFF1D6;color:#B54708}.priority[data-tone="mid"]{background:#EEF5FF;color:#244AA5}.priority[data-tone="low"],.priority[data-tone="neutral"]{background:#F1F4F8;color:#66758E}
.unit,.location,.review{display:grid;gap:2px}.unit b,.location b,.review b{color:#10224E;font-size:11px}.unit small,.location small,.review small{color:#7B899C;font-size:8px}.company{display:block;max-width:145px;color:#253B5D}.plate{display:inline-flex;min-width:63px;justify-content:center;padding:5px 7px;border:1px solid #BFCDE0;border-radius:6px;background:#F8FAFD;color:#17366F;font:800 9px/1 ui-monospace,monospace;letter-spacing:.05em}.cupo,.month{white-space:nowrap}.pending-pill{width:max-content;padding:3px 6px;border-radius:999px;background:#FEE4E2;color:#B42318;font-size:7px;font-weight:900}.status2{display:inline-flex;max-width:110px;padding:4px 7px;border:1px solid #C9DCF4;border-radius:999px;background:#EEF5FF;color:#244AA5;font-size:8px;font-weight:850}
.ecar{min-width:230px;display:grid;gap:5px;padding:8px 9px;border:1px solid #D8E3F2;border-radius:10px;background:#FAFCFF}.ecar[data-state="ok"]{border-color:#ABEFC6;background:#F1FCF5}.ecar[data-state="alert"]{border-color:#FED7AA;background:#FFFAF3}.ecar[data-state="error"]{border-color:#FECDCA;background:#FEF3F2}.ecar-main{width:max-content;padding:4px 7px;border-radius:999px;background:#D1FADF;color:#067647;font-size:8px;font-weight:900}.ecar[data-state="none"] .ecar-main{background:#EEF2F6;color:#66758E}.ecar[data-state="error"] .ecar-main{background:#FEE4E2;color:#B42318}.ecar>small{color:#66758E;font-size:7px}.ecar-alerts{display:flex;flex-wrap:wrap;gap:4px}.ecar-alerts span{padding:4px 6px;border-radius:999px;background:#FFEDD5;color:#B54708;font-size:7px;font-weight:850}
.open-btn{display:inline-flex!important;align-items:center!important;gap:5px!important;padding:7px 9px!important;border:1px solid #C9DCF4!important;border-radius:8px!important;background:#fff!important;color:#244AA5!important;font-size:9px!important;font-weight:850!important;cursor:pointer!important}.open-btn:hover{background:#EEF5FF!important}
.empty{min-height:150px;display:flex;align-items:center;justify-content:center;gap:10px;color:#8290A4}.empty span{display:grid;gap:2px}.empty b{color:#10224E}.empty small{font-size:9px}
</style>

<style scoped>
/* denser visual hierarchy and overflow control */
.queue-table-shell{
  border-color:#BFD0E4;
  box-shadow:0 12px 28px rgba(13,37,81,.07);
  background:#FFFFFF;
  max-width:100%;
}
.queue-table{
  min-width:1460px;
  table-layout:auto;
}
.queue-table th{
  padding:11px 12px;
  background:linear-gradient(180deg,#174EA6 0%,#123F8E 100%);
  color:#FFFFFF;
  border-bottom-color:#123A82;
  font-size:8px;
  letter-spacing:.045em;
}
.queue-table td{
  padding:12px;
  border-bottom-color:#E3EAF3;
  color:#1E3153;
  font-size:10px;
}
.queue-table tbody tr:nth-child(even){background:#FBFCFE}
.queue-table tbody tr:hover,.queue-table tbody tr:focus{background:#F0F6FF}
.unit b,.location b,.review b{color:#0B1F4D;font-size:11px}
.unit small,.location small,.review small{color:#6B7C93}
.company{
  max-width:150px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  color:#243A5A;
}
.plate{
  border-color:#AFC6E3;
  background:#F6FAFF;
  color:#123E86;
}
.priority{box-shadow:inset 0 0 0 1px rgba(255,255,255,.42)}
.priority[data-tone="high"]{background:#FFE8C2;color:#9A4D00}
.priority[data-tone="mid"]{background:#E2EDFF;color:#174EA6}
.pending-pill{background:#FFE0DD;color:#A9231A}
.status2{
  max-width:135px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  border-color:#AFC9E8;
  background:#E8F2FF;
  color:#174EA6;
}
.ecar{
  min-width:220px;
  max-width:320px;
  border-color:#C7D7E9;
  background:#F7FAFD;
  overflow:hidden;
}
.ecar[data-state="ok"]{border-color:#8CD9B4;background:#EDF9F2}
.ecar[data-state="alert"]{border-color:#F3B56A;background:#FFF6E9}
.ecar[data-state="error"]{border-color:#F29A95;background:#FFF0EF}
.ecar-alerts{
  max-width:100%;
  overflow:hidden;
}
.ecar-alerts span{
  max-width:145px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  background:#FFE4C2;color:#9C4F00;
}
.open-btn{
  border-color:#AFC9E8!important;
  background:#F6F9FF!important;
  color:#174EA6!important;
}
.open-btn:hover{background:#E8F2FF!important}
@media(max-width:1280px){
  .queue-table{min-width:1380px}
}
</style>
