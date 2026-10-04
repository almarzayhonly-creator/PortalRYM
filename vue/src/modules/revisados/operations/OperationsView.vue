<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CanonicalRevisadoRow } from '../types/revisados.types'
import RymIcon from '../components/RymIcon.vue'
import OperationsTable from './OperationsTable.vue'

const props = defineProps<{
  rows: CanonicalRevisadoRow[]
  totalFleet: number
  upToDate: number
  syncBusy: boolean
  syncState: string
  manualPlate: string
  manualBusy: boolean
  manualState: string
  manualResult: Record<string, any> | null
}>()

const emit = defineEmits<{
  'manual-plate-change': [value: string]
  sync: []
  lookup: []
  open: [row: CanonicalRevisadoRow]
}>()

const search=ref('')
const priority=ref('')
const galera=ref('')
const month=ref('')
const supervisora=ref('')
const status2=ref('')
const ecarcheck=ref('')

function s(v: unknown){ return String(v ?? '').trim() }
function n(v: unknown){ return s(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase() }
function num(v: unknown){ return new Intl.NumberFormat('es-PA').format(Number(v)||0) }

function rowPriority(r:CanonicalRevisadoRow){
  return s(r.prioridad || r['priority'] || r['prioridad_operativa'])
}
function rowMonth(r:CanonicalRevisadoRow){
  return s(r['mes_nombre'] || r['mes'] || r['mes_revisado'] || r['mes_asignado'] || r['ciclo_mes'])
}
function rowStatus2(r:CanonicalRevisadoRow){
  return s(r['status2'] || r['estatus2'] || r.estado)
}
function rowCupo(r:CanonicalRevisadoRow){
  return s(r['cupo_ecarcheck'] || r['cupo_control'] || r['cupo'] || r['placa_comercial'])
}
function rowLastQuery(r:CanonicalRevisadoRow){
  return s(r['ficha_ecarcheck_at'] || r['ecarcheck_ultima_consulta'] || r['ultima_consulta_ecarcheck'] || r['ecarcheck_at'] || r['ecarcheck_actualizado_at'])
}
function rowEcarError(r:CanonicalRevisadoRow){
  return s(r['ecarcheck_error'] || r['ficha_ecarcheck_error'] || r['error_ecarcheck'])
}
function rowHasAlert(r:CanonicalRevisadoRow){
  return Boolean(
    r.bloqueado ||
    r['boleta_empresa'] ||
    r['boleta_pendiente'] ||
    (Array.isArray(r.alerts) && r.alerts.length) ||
    (Array.isArray(r.incidencias_abiertas) && r.incidencias_abiertas.length)
  )
}
function rowEcarState(r:CanonicalRevisadoRow){
  if(rowEcarError(r)) return 'ERROR'
  if(rowHasAlert(r)) return 'ALERTA'
  if(rowLastQuery(r)) return 'OK'
  return 'SIN CONSULTA'
}

function unique(values:string[]){
  return [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}))
}
const priorities=computed(()=>unique(props.rows.map(rowPriority)))
const galeras=computed(()=>unique(props.rows.map(r=>s(r.galera))))
const months=computed(()=>unique(props.rows.map(rowMonth)))
const supervisoras=computed(()=>unique(props.rows.map(r=>s(r.supervisora))))
const statuses=computed(()=>unique(props.rows.map(rowStatus2)))

const queueCounters=computed(()=>{
  let ok=0, alert=0, error=0, noQuery=0
  for(const row of props.rows){
    const state=rowEcarState(row)
    if(state==='OK') ok++
    else if(state==='ALERTA') alert++
    else if(state==='ERROR') error++
    else noQuery++
  }
  return {pending:props.rows.length,ok,alert,error,noQuery}
})

function priorityRank(v:string){
  const x=n(v)
  if(x.includes('CRIT')) return 0
  if(x.includes('ALTA') || x.includes('HIGH')) return 1
  if(x.includes('MEDIA') || x.includes('MED')) return 2
  if(x.includes('BAJA') || x.includes('LOW')) return 3
  return 4
}
function timestamp(v:unknown){
  const t=Date.parse(s(v))
  return Number.isFinite(t)?t:Number.MAX_SAFE_INTEGER
}

const filteredRows=computed(()=>{
  const q=n(search.value)
  return props.rows
    .filter(r=>{
      const searchable=[
        r.unidad,r.placa,r.empresa,r.galera,r.supervisora,
        rowCupo(r),rowMonth(r),rowStatus2(r),rowPriority(r)
      ].map(n).join(' ')
      return (!q || searchable.includes(q))
        && (!priority.value || rowPriority(r)===priority.value)
        && (!galera.value || s(r.galera)===galera.value)
        && (!month.value || rowMonth(r)===month.value)
        && (!supervisora.value || s(r.supervisora)===supervisora.value)
        && (!status2.value || rowStatus2(r)===status2.value)
        && (!ecarcheck.value || rowEcarState(r)===ecarcheck.value)
    })
    .sort((a,b)=>{
      const p=priorityRank(rowPriority(a))-priorityRank(rowPriority(b))
      if(p!==0) return p
      return timestamp(a.ultimo_revisado)-timestamp(b.ultimo_revisado)
    })
})

const coverage=computed(()=>props.totalFleet?Math.round(props.upToDate*100/props.totalFleet):0)

function resetFilters(){
  search.value=''
  priority.value=''
  galera.value=''
  month.value=''
  supervisora.value=''
  status2.value=''
  ecarcheck.value=''
}

async function copyList(){
  const text=filteredRows.value.map(r=>[
    rowPriority(r)||'—',
    s(r.unidad)||'—',
    s(r.empresa)||'—',
    s(r.placa)||'—',
    rowCupo(r)||'—',
    rowMonth(r)||'—',
    s(r.galera)||'—',
    s(r.supervisora)||'—',
    rowStatus2(r)||'—',
    rowEcarState(r)
  ].join(' | ')).join('\n')
  try{ await navigator.clipboard?.writeText(text) }catch{}
}
</script>

<template>
  <section class="ops-v3">
    <div class="ops-heading">
      <div>
        <span class="ops-eyebrow"><RymIcon name="fact_check" :size="14"/> OPERACIONES</span>
        <h2>Cola de trabajo</h2>
        <p>Ordenada por prioridad y antigüedad. Aquí solo aparecen unidades que requieren gestión.</p>
      </div>
      <div class="ops-heading-metrics">
        <span><small>Total flota</small><b>{{num(totalFleet)}}</b></span>
        <i></i>
        <span><small>Al día</small><b>{{num(upToDate)}}</b><em>{{coverage}}%</em></span>
      </div>
    </div>

    <section class="ops-command-center">
      <header>
        <div>
          <span>CENTRO DE OPERACIÓN</span>
          <h3>Consulta y sincronización eCarCheck</h3>
          <p>Se conservan los procesos V2 existentes; esta capa solo reorganiza la experiencia.</p>
        </div>
        <span class="ops-live"><i></i> Datos reales</span>
      </header>
      <div class="ops-actions">
        <button class="ops-action-card" type="button" :disabled="syncBusy" @click="emit('sync')">
          <span class="ops-action-icon"><RymIcon name="sync" :size="19"/></span>
          <span class="ops-action-copy"><small>ACTUALIZACIÓN GENERAL</small><b>{{syncBusy?'Actualizando eCarCheck…':'Actualizar eCarCheck'}}</b><em>{{syncState}}</em></span>
          <span class="ops-action-cta">{{syncBusy?'Procesando':'Sincronizar'}} <RymIcon name="arrow_forward" :size="15"/></span>
        </button>
        <div class="ops-lookup-card">
          <span class="ops-action-icon"><RymIcon name="manage_search" :size="20"/></span>
          <span class="ops-action-copy"><small>CONSULTA PUNTUAL V2</small><b>Verificar una placa</b><em>{{manualState}}</em></span>
          <div class="ops-lookup-form">
            <input :value="manualPlate" maxlength="12" placeholder="PLACA" @input="emit('manual-plate-change',($event.target as HTMLInputElement).value.toUpperCase())" @keydown.enter="emit('lookup')">
            <button type="button" :disabled="manualBusy||!manualPlate.trim()" @click="emit('lookup')">{{manualBusy?'…':'Consultar'}}</button>
          </div>
        </div>
      </div>
      <div v-if="manualResult?.result" class="ops-query-result">
        <div><small>RESULTADO ECARCHECK</small><b>{{manualResult.result?.vehiculo?.nroPlaca||manualPlate}}</b><span>{{manualResult.result?.vehiculo?.nombrePropietario||'—'}} · {{manualResult.result?.vehiculo?.colorVehiculo||'—'}} · Revisado {{manualResult.result?.vehiculo?.fechaRevisado||'—'}}</span></div>
        <div class="ops-query-signals"><span><small>ENA</small><b>{{num(manualResult.result?.boletas?.infraccionesEna?.cantidad)}}</b></span><span><small>Documento</small><b>{{num(manualResult.result?.boletas?.boletasPorDocumento?.cantidad)}}</b></span><span><small>Placa</small><b>{{num(manualResult.result?.boletas?.boletasPorPlaca?.cantidad)}}</b></span></div>
      </div>
    </section>

    <section class="ops-filter-panel">
      <div class="ops-filter-top">
        <div class="ops-search"><RymIcon name="search" :size="18"/><input v-model="search" placeholder="Buscar unidad, placa, empresa, cupo…"><kbd>⌘K</kbd></div>
        <button class="ops-reset" type="button" @click="resetFilters"><RymIcon name="filter_alt_off" :size="15"/> Limpiar filtros</button>
      </div>
      <div class="ops-filter-grid">
        <label><span>Prioridad</span><select v-model="priority"><option value="">Todas las prioridades</option><option v-for="x in priorities" :key="x">{{x}}</option></select></label>
        <label><span>Galera</span><select v-model="galera"><option value="">Todas las galeras</option><option v-for="x in galeras" :key="x">{{x}}</option></select></label>
        <label><span>Mes / ciclo</span><select v-model="month"><option value="">Todos los meses</option><option v-for="x in months" :key="x">{{x}}</option></select></label>
        <label><span>Supervisora</span><select v-model="supervisora"><option value="">Todas las supervisoras</option><option v-for="x in supervisoras" :key="x">{{x}}</option></select></label>
        <label><span>Estatus 2</span><select v-model="status2"><option value="">Todos Estatus 2</option><option v-for="x in statuses" :key="x">{{x}}</option></select></label>
        <label><span>eCarCheck</span><select v-model="ecarcheck"><option value="">eCarCheck: todos</option><option value="OK">OK</option><option value="ALERTA">Con alerta</option><option value="ERROR">Con error</option><option value="SIN CONSULTA">Sin consulta</option></select></label>
      </div>
      <div class="ops-counter-line">
        <span><b>{{num(queueCounters.pending)}}</b> pendientes</span>
        <i></i><span><b>{{num(queueCounters.ok)}}</b> eCarCheck OK</span>
        <i></i><span class="warn"><b>{{num(queueCounters.alert)}}</b> con alerta</span>
        <i></i><span class="danger"><b>{{num(queueCounters.error)}}</b> con error</span>
        <i></i><span><b>{{num(queueCounters.noQuery)}}</b> sin consulta</span>
      </div>
    </section>

    <div class="ops-list-head">
      <div><span>COLA FILTRADA</span><b>{{num(filteredRows.length)}} unidades visibles</b><small>Selecciona una unidad para abrir su ficha legal completa.</small></div>
      <button type="button" class="ops-copy" @click="copyList"><RymIcon name="content_copy" :size="15"/> Copiar lista</button>
    </div>

    <OperationsTable :rows="filteredRows" @open="emit('open',$event)"/>
  </section>
</template>

<style scoped>
.ops-v3{--blue:#244AA5;--navy:#10224E;--muted:#62708C;--border:#D8E3F2;display:grid;gap:14px;color:#203253}
.ops-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}
.ops-heading>div:first-child{display:grid;gap:5px}.ops-eyebrow{width:max-content;display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border:1px solid #C9DCF4;border-radius:7px;background:#EAF4FF;color:var(--blue);font-size:9px;font-weight:850;letter-spacing:.07em}
.ops-heading h2{margin:0;color:var(--navy);font:850 25px/1.15 Inter,system-ui,sans-serif}.ops-heading p{margin:0;color:var(--muted);font-size:11px}
.ops-heading-metrics{display:flex;align-items:center;gap:12px;padding:9px 12px;border:1px solid var(--border);border-radius:11px;background:#fff}.ops-heading-metrics>span{display:grid;grid-template-columns:auto auto;gap:2px 7px;align-items:baseline}.ops-heading-metrics small{grid-column:1/-1;color:#7B899C;font-size:8px;font-weight:800;text-transform:uppercase}.ops-heading-metrics b{color:var(--navy);font-size:16px}.ops-heading-metrics em{color:var(--blue);font-size:9px;font-style:normal;font-weight:800}.ops-heading-metrics>i{width:1px;height:28px;background:var(--border)}
.ops-command-center{display:grid;gap:13px;padding:16px;border:1px solid #C9DCF4;border-radius:16px;background:linear-gradient(180deg,#F7FAFF 0%,#fff 76%);box-shadow:0 12px 30px rgba(10,27,77,.045)}
.ops-command-center>header{display:flex;justify-content:space-between;gap:14px}.ops-command-center>header>div{display:grid;gap:3px}.ops-command-center>header>div>span{color:var(--blue);font-size:9px;font-weight:850;letter-spacing:.07em}.ops-command-center h3{margin:0;color:var(--navy);font-size:17px}.ops-command-center p{margin:0;color:#71809A;font-size:10px}.ops-live{display:inline-flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid #ABEFC6;border-radius:999px;background:#ECFDF3;color:#067647;font-size:9px;font-weight:800}.ops-live i{width:6px;height:6px;border-radius:50%;background:#17B26A}
.ops-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ops-action-card,.ops-lookup-card{min-height:82px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:12px;border:1px solid var(--border)!important;border-radius:12px!important;background:#fff!important}.ops-action-card{text-align:left;cursor:pointer}.ops-action-icon{width:38px;height:38px;display:grid;place-items:center;border:1px solid #C9DCF4;border-radius:10px;background:#EAF4FF;color:var(--blue)}.ops-action-copy{min-width:0;display:grid;gap:2px}.ops-action-copy small{color:#8290A4;font-size:8px;font-weight:800}.ops-action-copy b{color:var(--navy);font-size:12px}.ops-action-copy em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#71809A;font-size:9px;font-style:normal}.ops-action-cta{display:inline-flex;align-items:center;gap:4px;color:var(--blue);font-size:9px;font-weight:850}
.ops-lookup-form{display:flex;gap:6px}.ops-lookup-form input{width:94px;padding:8px 9px;border:1px solid #C9D5E5;border-radius:8px;background:#F8FAFD;color:var(--navy);font:800 10px/1 ui-monospace,monospace;text-transform:uppercase}.ops-lookup-form button{padding:9px 11px!important;border:1px solid var(--blue)!important;border-radius:8px!important;background:var(--blue)!important;color:#fff!important;font-size:9px!important;font-weight:850!important;cursor:pointer!important}.ops-lookup-form button:disabled{opacity:.5!important}
.ops-query-result{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:10px 12px;border:1px solid #C9DCF4;border-radius:10px;background:#EEF5FF}.ops-query-result>div:first-child{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;align-items:baseline}.ops-query-result small{color:#66758E;font-size:8px;font-weight:800}.ops-query-result>div:first-child>small{grid-column:1/-1}.ops-query-result>div:first-child>b{color:var(--navy);font:850 15px/1 ui-monospace,monospace}.ops-query-result>div:first-child>span{color:#62708C;font-size:9px}.ops-query-signals{display:flex;gap:6px}.ops-query-signals span{min-width:62px;display:grid;gap:2px;padding:7px;border-radius:8px;background:#fff;text-align:center}.ops-query-signals b{color:var(--navy)}
.ops-filter-panel{display:grid;gap:10px;padding:12px;border:1px solid var(--border);border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(10,27,77,.035)}
.ops-filter-top{display:flex;gap:8px}.ops-search{height:42px;display:flex;align-items:center;gap:8px;flex:1;padding:0 11px;border:1px solid var(--border);border-radius:10px;background:#F8FAFD;color:#8290A4}.ops-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#203253;font-size:11px}.ops-search kbd{padding:3px 5px;border:1px solid var(--border);border-radius:5px;background:#fff;color:#7B899C;font:700 8px/1 ui-monospace,monospace}.ops-reset{display:inline-flex;align-items:center;gap:6px;padding:0 11px!important;border:1px solid var(--border)!important;border-radius:10px!important;background:#fff!important;color:#52627A!important;font-size:9px!important;font-weight:800!important}
.ops-filter-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ops-filter-grid label{display:grid;gap:4px}.ops-filter-grid label>span{color:#7B899C;font-size:8px;font-weight:800;text-transform:uppercase}.ops-filter-grid select{width:100%;padding:9px 10px;border:1px solid var(--border);border-radius:9px;background:#fff;color:#203253;font:700 10px Inter,system-ui,sans-serif}
.ops-counter-line{display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding:3px 2px 0;color:#68778D;font-size:9px}.ops-counter-line b{color:#10224E}.ops-counter-line i{width:3px;height:3px;border-radius:50%;background:#B8C3D1}.ops-counter-line .warn,.ops-counter-line .warn b{color:#B54708}.ops-counter-line .danger,.ops-counter-line .danger b{color:#B42318}
.ops-list-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:2px}.ops-list-head>div{display:grid;grid-template-columns:auto 1fr;gap:2px 7px;align-items:baseline}.ops-list-head span{grid-column:1/-1;color:var(--blue);font-size:8px;font-weight:850;letter-spacing:.07em}.ops-list-head b{color:var(--navy);font-size:12px}.ops-list-head small{color:#7B899C;font-size:9px}.ops-copy{display:inline-flex;align-items:center;gap:6px;padding:8px 10px!important;border:1px solid #C9DCF4!important;border-radius:8px!important;background:#fff!important;color:var(--blue)!important;font-size:9px!important;font-weight:850!important}
@media(max-width:1120px){.ops-actions{grid-template-columns:1fr}.ops-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.ops-heading,.ops-list-head{align-items:flex-start;flex-direction:column}.ops-heading-metrics{width:100%;box-sizing:border-box}.ops-action-card,.ops-lookup-card{grid-template-columns:auto minmax(0,1fr)}.ops-action-cta,.ops-lookup-form{grid-column:2}.ops-filter-top{flex-direction:column}.ops-filter-grid{grid-template-columns:1fr}.ops-query-result{align-items:flex-start;flex-direction:column}}
</style>
