<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CanonicalRevisadoRow } from '../types/revisados.types'
import RymIcon from '../components/RymIcon.vue'
import OperationsTable from './OperationsTable.vue'
import SmartFacetSelect, { type FacetOption } from './SmartFacetSelect.vue'

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
const priorities=ref<string[]>([])
const galeras=ref<string[]>([])
const months=ref<string[]>([])
const supervisoras=ref<string[]>([])
const statuses2=ref<string[]>([])
const ecarStates=ref<string[]>([])

function s(v: unknown){ return String(v ?? '').trim() }
function n(v: unknown){ return s(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase() }
function num(v: unknown){ return new Intl.NumberFormat('es-PA').format(Number(v)||0) }

function rowPriority(r:CanonicalRevisadoRow){ return s(r.prioridad || r['priority'] || r['prioridad_operativa']) || 'Sin prioridad' }
function rowMonth(r:CanonicalRevisadoRow){ return s(r['mes_nombre'] || r['mes'] || r['mes_revisado'] || r['mes_asignado'] || r['ciclo_mes']) || 'Sin mes' }
function rowStatus2(r:CanonicalRevisadoRow){ return s(r['status2'] || r['estatus2'] || r.estado) || 'Sin Estatus 2' }
function rowCupo(r:CanonicalRevisadoRow){ return s(r['cupo_ecarcheck'] || r['cupo_control'] || r['cupo'] || r['placa_comercial']) }
function rowLastQuery(r:CanonicalRevisadoRow){ return s(r['ficha_ecarcheck_at'] || r['ecarcheck_ultima_consulta'] || r['ultima_consulta_ecarcheck'] || r['ecarcheck_at'] || r['ecarcheck_actualizado_at']) }
function rowEcarError(r:CanonicalRevisadoRow){ return s(r['ecarcheck_error'] || r['ficha_ecarcheck_error'] || r['error_ecarcheck']) }
function rowHasAlert(r:CanonicalRevisadoRow){
  return Boolean(r.bloqueado || r['boleta_empresa'] || r['boleta_pendiente'] || (Array.isArray(r.alerts)&&r.alerts.length) || (Array.isArray(r.incidencias_abiertas)&&r.incidencias_abiertas.length))
}
function rowEcarState(r:CanonicalRevisadoRow){
  if(rowEcarError(r)) return 'ERROR'
  if(rowHasAlert(r)) return 'ALERTA'
  if(rowLastQuery(r)) return 'OK'
  return 'SIN CONSULTA'
}
function matchesSearch(r:CanonicalRevisadoRow){
  const q=n(search.value)
  if(!q) return true
  return [r.unidad,r.placa,r.empresa,r.galera,r.supervisora,rowCupo(r),rowMonth(r),rowStatus2(r),rowPriority(r),rowEcarState(r)].map(n).join(' ').includes(q)
}
function has(selected:string[],value:string){ return !selected.length || selected.includes(value) }

type Dimension='priority'|'galera'|'month'|'supervisora'|'status2'|'ecar'
function matchesFilters(r:CanonicalRevisadoRow, exclude?:Dimension){
  if(!matchesSearch(r)) return false
  return (exclude==='priority'||has(priorities.value,rowPriority(r)))
    && (exclude==='galera'||has(galeras.value,s(r.galera)||'Sin galera'))
    && (exclude==='month'||has(months.value,rowMonth(r)))
    && (exclude==='supervisora'||has(supervisoras.value,s(r.supervisora)||'Sin supervisora'))
    && (exclude==='status2'||has(statuses2.value,rowStatus2(r)))
    && (exclude==='ecar'||has(ecarStates.value,rowEcarState(r)))
}
function facetOptions(dim:Dimension, getter:(r:CanonicalRevisadoRow)=>string):FacetOption[]{
  const counts=new Map<string,number>()
  for(const row of props.rows){
    if(!matchesFilters(row,dim)) continue
    const value=getter(row)
    counts.set(value,(counts.get(value)||0)+1)
  }
  return [...counts.entries()]
    .map(([value,count])=>({value,label:value,count}))
    .sort((a,b)=>a.label.localeCompare(b.label,'es',{numeric:true}))
}
const priorityOptions=computed(()=>facetOptions('priority',rowPriority))
const galeraOptions=computed(()=>facetOptions('galera',r=>s(r.galera)||'Sin galera'))
const monthOptions=computed(()=>facetOptions('month',rowMonth))
const supervisorOptions=computed(()=>facetOptions('supervisora',r=>s(r.supervisora)||'Sin supervisora'))
const status2Options=computed(()=>facetOptions('status2',rowStatus2))
const ecarOptions=computed(()=>facetOptions('ecar',rowEcarState))

function priorityRank(v:string){
  const x=n(v)
  if(x.includes('CRIT')) return 0
  if(x.includes('URG')) return 1
  if(x.includes('ALTA')||x.includes('HIGH')) return 2
  if(x.includes('ACTUAL')) return 3
  if(x.includes('MEDIA')||x.includes('MED')) return 4
  if(x.includes('BAJA')||x.includes('LOW')) return 5
  return 6
}
function timestamp(v:unknown){ const t=Date.parse(s(v)); return Number.isFinite(t)?t:Number.MAX_SAFE_INTEGER }

const filteredRows=computed(()=>props.rows.filter(r=>matchesFilters(r)).sort((a,b)=>{
  const p=priorityRank(rowPriority(a))-priorityRank(rowPriority(b))
  return p!==0?p:timestamp(a.ultimo_revisado)-timestamp(b.ultimo_revisado)
}))

const filteredCounters=computed(()=>{
  let ok=0,alert=0,error=0,noQuery=0
  for(const row of filteredRows.value){
    const state=rowEcarState(row)
    if(state==='OK')ok++; else if(state==='ALERTA')alert++; else if(state==='ERROR')error++; else noQuery++
  }
  return {pending:filteredRows.value.length,ok,alert,error,noQuery}
})

const priorityCards=computed(()=>{
  const map=new Map<string,number>()
  for(const row of filteredRows.value) map.set(rowPriority(row),(map.get(rowPriority(row))||0)+1)
  return [...map.entries()]
    .sort((a,b)=>priorityRank(a[0])-priorityRank(b[0]))
    .slice(0,4)
    .map(([label,value],index)=>({label,value,index}))
})

const activeFilters=computed(()=>{
  const out:Array<{group:string,value:string}>=[] 
  for(const v of priorities.value)out.push({group:'priority',value:v})
  for(const v of galeras.value)out.push({group:'galera',value:v})
  for(const v of months.value)out.push({group:'month',value:v})
  for(const v of supervisoras.value)out.push({group:'supervisora',value:v})
  for(const v of statuses2.value)out.push({group:'status2',value:v})
  for(const v of ecarStates.value)out.push({group:'ecar',value:v})
  return out
})
function removeFilter(group:string,value:string){
  const target=group==='priority'?priorities:group==='galera'?galeras:group==='month'?months:group==='supervisora'?supervisoras:group==='status2'?statuses2:ecarStates
  target.value=target.value.filter(x=>x!==value)
}
function resetFilters(){
  search.value=''; priorities.value=[]; galeras.value=[]; months.value=[]; supervisoras.value=[]; statuses2.value=[]; ecarStates.value=[]
}

const coverage=computed(()=>props.totalFleet?Math.round(props.upToDate*100/props.totalFleet):0)

async function copyList(){
  const text=filteredRows.value.map(r=>[
    rowPriority(r),s(r.unidad)||'—',s(r.empresa)||'—',s(r.placa)||'—',rowCupo(r)||'—',
    rowMonth(r),s(r.galera)||'—',s(r.supervisora)||'—',rowStatus2(r),rowEcarState(r)
  ].join(' | ')).join('\n')
  try{await navigator.clipboard?.writeText(text)}catch{}
}
</script>

<template>
<section class="ops-v4">
  <div class="ops-heading">
    <div>
      <span class="ops-eyebrow"><RymIcon name="fact_check" :size="14"/> OPERACIONES</span>
      <h2>Centro de decisión</h2>
      <p>La cola, los filtros y los indicadores reaccionan al mismo contexto operativo.</p>
    </div>
    <div class="ops-heading-metrics">
      <span><small>Total flota</small><b>{{num(totalFleet)}}</b></span><i></i>
      <span><small>Al día</small><b>{{num(upToDate)}}</b><em>{{coverage}}%</em></span>
    </div>
  </div>

  <section class="ops-command-center">
    <header>
      <div><span>ECARCHECK V2</span><h3>Consulta y sincronización</h3><p>Procesos existentes, ahora integrados al contexto filtrado.</p></div>
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

  <section class="smart-filter-hub">
    <div class="smart-filter-head">
      <div>
        <span>FILTROS INTELIGENTES</span>
        <h3>Explora la cola sin perder contexto</h3>
        <p>Al elegir una galera —por ejemplo VCARS— los demás filtros, conteos y resultados se recalculan automáticamente.</p>
      </div>
      <button type="button" class="reset" :disabled="!activeFilters.length&&!search" @click="resetFilters"><RymIcon name="filter_alt_off" :size="15"/> Limpiar todo</button>
    </div>

    <div class="smart-search"><RymIcon name="search" :size="18"/><input v-model="search" placeholder="Buscar unidad, placa, empresa, cupo, supervisora…"><kbd>⌘K</kbd></div>

    <div class="facet-grid">
      <SmartFacetSelect v-model="galeras" label="Galera" placeholder="Todas las galeras" :options="galeraOptions"/>
      <SmartFacetSelect v-model="statuses2" label="Estatus 2" placeholder="Todos Estatus 2" :options="status2Options"/>
      <SmartFacetSelect v-model="priorities" label="Prioridad" placeholder="Todas las prioridades" :options="priorityOptions"/>
      <SmartFacetSelect v-model="months" label="Mes / ciclo" placeholder="Todos los meses" :options="monthOptions"/>
      <SmartFacetSelect v-model="supervisoras" label="Supervisora" placeholder="Todas las supervisoras" :options="supervisorOptions"/>
      <SmartFacetSelect v-model="ecarStates" label="eCarCheck" placeholder="eCarCheck: todos" :options="ecarOptions"/>
    </div>

    <div v-if="activeFilters.length" class="active-filter-row">
      <span class="active-label">CONTEXTO ACTIVO</span>
      <button v-for="f in activeFilters" :key="f.group+'|'+f.value" type="button" @click="removeFilter(f.group,f.value)">
        {{f.value}} <RymIcon name="close" :size="12"/>
      </button>
    </div>

    <div class="smart-summary">
      <div class="summary-main"><small>COLA EN CONTEXTO</small><b>{{num(filteredCounters.pending)}}</b><span>unidades</span></div>
      <div class="summary-stat ok"><i></i><span><b>{{num(filteredCounters.ok)}}</b> eCarCheck OK</span></div>
      <div class="summary-stat warn"><i></i><span><b>{{num(filteredCounters.alert)}}</b> con alerta</span></div>
      <div class="summary-stat danger"><i></i><span><b>{{num(filteredCounters.error)}}</b> con error</span></div>
      <div class="summary-stat neutral"><i></i><span><b>{{num(filteredCounters.noQuery)}}</b> sin consulta</span></div>
    </div>
  </section>

  <section v-if="priorityCards.length" class="priority-radar">
    <div class="priority-radar-title"><span>RADAR DE PRIORIDAD</span><b>Qué atender primero dentro del contexto actual</b></div>
    <article v-for="card in priorityCards" :key="card.label" :data-rank="card.index">
      <span>{{card.index+1}}</span><div><small>{{card.label}}</small><b>{{num(card.value)}}</b></div>
    </article>
  </section>

  <div class="ops-list-head">
    <div><span>COLA FILTRADA</span><b>{{num(filteredRows.length)}} unidades visibles</b><small>Todos los indicadores y opciones de filtro corresponden a esta misma selección.</small></div>
    <button type="button" class="ops-copy" @click="copyList"><RymIcon name="content_copy" :size="15"/> Copiar lista</button>
  </div>

  <OperationsTable :rows="filteredRows" @open="emit('open',$event)"/>
</section>
</template>

<style scoped>
.ops-v4{--blue:#244AA5;--navy:#10224E;--muted:#62708C;--border:#D8E3F2;display:grid;gap:14px;color:#203253}
.ops-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}.ops-heading>div:first-child{display:grid;gap:5px}.ops-eyebrow{width:max-content;display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border:1px solid #C9DCF4;border-radius:7px;background:#EAF4FF;color:var(--blue);font-size:9px;font-weight:850;letter-spacing:.07em}.ops-heading h2{margin:0;color:var(--navy);font:850 25px/1.15 Inter,system-ui,sans-serif}.ops-heading p{margin:0;color:var(--muted);font-size:11px}
.ops-heading-metrics{display:flex;align-items:center;gap:12px;padding:9px 12px;border:1px solid var(--border);border-radius:11px;background:#fff}.ops-heading-metrics>span{display:grid;grid-template-columns:auto auto;gap:2px 7px;align-items:baseline}.ops-heading-metrics small{grid-column:1/-1;color:#7B899C;font-size:8px;font-weight:800;text-transform:uppercase}.ops-heading-metrics b{color:var(--navy);font-size:16px}.ops-heading-metrics em{color:var(--blue);font-size:9px;font-style:normal;font-weight:800}.ops-heading-metrics>i{width:1px;height:28px;background:var(--border)}
.ops-command-center{display:grid;gap:13px;padding:16px;border:1px solid #C9DCF4;border-radius:16px;background:linear-gradient(180deg,#F7FAFF 0%,#fff 76%);box-shadow:0 12px 30px rgba(10,27,77,.045)}.ops-command-center>header{display:flex;justify-content:space-between;gap:14px}.ops-command-center>header>div{display:grid;gap:3px}.ops-command-center>header>div>span{color:var(--blue);font-size:9px;font-weight:850;letter-spacing:.07em}.ops-command-center h3{margin:0;color:var(--navy);font-size:17px}.ops-command-center p{margin:0;color:#71809A;font-size:10px}.ops-live{display:inline-flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid #ABEFC6;border-radius:999px;background:#ECFDF3;color:#067647;font-size:9px;font-weight:800}.ops-live i{width:6px;height:6px;border-radius:50%;background:#17B26A}
.ops-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ops-action-card,.ops-lookup-card{min-height:82px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:12px;border:1px solid var(--border)!important;border-radius:12px!important;background:#fff!important}.ops-action-card{text-align:left;cursor:pointer}.ops-action-icon{width:38px;height:38px;display:grid;place-items:center;border:1px solid #C9DCF4;border-radius:10px;background:#EAF4FF;color:var(--blue)}.ops-action-copy{min-width:0;display:grid;gap:2px}.ops-action-copy small{color:#8290A4;font-size:8px;font-weight:800}.ops-action-copy b{color:var(--navy);font-size:12px}.ops-action-copy em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#71809A;font-size:9px;font-style:normal}.ops-action-cta{display:inline-flex;align-items:center;gap:4px;color:var(--blue);font-size:9px;font-weight:850}.ops-lookup-form{display:flex;gap:6px}.ops-lookup-form input{width:94px;padding:8px 9px;border:1px solid #C9D5E5;border-radius:8px;background:#F8FAFD;color:var(--navy);font:800 10px/1 ui-monospace,monospace;text-transform:uppercase}.ops-lookup-form button{padding:9px 11px!important;border:1px solid var(--blue)!important;border-radius:8px!important;background:var(--blue)!important;color:#fff!important;font-size:9px!important;font-weight:850!important;cursor:pointer!important}.ops-lookup-form button:disabled{opacity:.5!important}
.ops-query-result{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:10px 12px;border:1px solid #C9DCF4;border-radius:10px;background:#EEF5FF}.ops-query-result>div:first-child{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;align-items:baseline}.ops-query-result small{color:#66758E;font-size:8px;font-weight:800}.ops-query-result>div:first-child>small{grid-column:1/-1}.ops-query-result>div:first-child>b{color:var(--navy);font:850 15px/1 ui-monospace,monospace}.ops-query-result>div:first-child>span{color:#62708C;font-size:9px}.ops-query-signals{display:flex;gap:6px}.ops-query-signals span{min-width:62px;display:grid;gap:2px;padding:7px;border-radius:8px;background:#fff;text-align:center}.ops-query-signals b{color:var(--navy)}

.smart-filter-hub{display:grid;gap:12px;padding:15px;border:1px solid #C9D8EA;border-radius:16px;background:#fff;box-shadow:0 10px 26px rgba(10,27,77,.045)}
.smart-filter-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.smart-filter-head>div{display:grid;gap:3px}.smart-filter-head span{color:#244AA5;font-size:8px;font-weight:900;letter-spacing:.07em}.smart-filter-head h3{margin:0;color:#10224E;font-size:15px}.smart-filter-head p{margin:0;color:#71809A;font-size:9px}.reset{display:inline-flex!important;align-items:center!important;gap:6px!important;padding:8px 10px!important;border:1px solid #D8E3F2!important;border-radius:9px!important;background:#F8FAFD!important;color:#52627A!important;font-size:9px!important;font-weight:850!important}.reset:disabled{opacity:.45!important}
.smart-search{height:44px;display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid #D8E3F2;border-radius:11px;background:#F8FAFD;color:#8290A4}.smart-search:focus-within{border-color:#AFC9EB;box-shadow:0 0 0 3px rgba(36,74,165,.05)}.smart-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#203253;font-size:11px}.smart-search kbd{padding:3px 5px;border:1px solid #D8E3F2;border-radius:5px;background:#fff;color:#7B899C;font:700 8px/1 ui-monospace,monospace}
.facet-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.active-filter-row{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding-top:2px}.active-label{margin-right:2px;color:#8290A4;font-size:7px;font-weight:900;letter-spacing:.07em}.active-filter-row button{display:inline-flex!important;align-items:center!important;gap:4px!important;padding:5px 7px!important;border:1px solid #C9DCF4!important;border-radius:999px!important;background:#EEF5FF!important;color:#244AA5!important;font-size:8px!important;font-weight:850!important;cursor:pointer!important}
.smart-summary{display:grid;grid-template-columns:minmax(150px,1.15fr) repeat(4,minmax(120px,.7fr));gap:7px;padding-top:2px}.summary-main,.summary-stat{min-height:48px;display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid #E0E8F2;border-radius:10px;background:#F9FBFD}.summary-main{display:grid;grid-template-columns:auto 1fr;gap:1px 7px;align-content:center}.summary-main small{grid-column:1/-1;color:#7B899C;font-size:7px;font-weight:850}.summary-main b{color:#10224E;font-size:18px}.summary-main span{color:#62708C;font-size:9px}.summary-stat i{width:7px;height:7px;border-radius:50%;background:#A9B5C5}.summary-stat span{font-size:9px;color:#62708C}.summary-stat b{color:#10224E}.summary-stat.ok i{background:#17B26A}.summary-stat.warn i{background:#F79009}.summary-stat.danger i{background:#F04438}

.priority-radar{display:grid;grid-template-columns:minmax(210px,1.15fr) repeat(4,minmax(130px,.7fr));gap:8px;align-items:stretch}.priority-radar-title{display:grid;align-content:center;gap:3px;padding:11px 12px;border:1px solid #D8E3F2;border-radius:12px;background:#F8FAFD}.priority-radar-title span{font-size:7px;color:#244AA5;font-weight:900;letter-spacing:.07em}.priority-radar-title b{font-size:10px;color:#10224E}.priority-radar article{position:relative;display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:center;padding:10px;border:1px solid #E0E8F2;border-radius:12px;background:#fff;overflow:hidden}.priority-radar article:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#C9D8EA}.priority-radar article[data-rank="0"]:before{background:#D92D20}.priority-radar article[data-rank="1"]:before{background:#F79009}.priority-radar article[data-rank="2"]:before{background:#F5B546}.priority-radar article>span{width:23px;height:23px;display:grid;place-items:center;border-radius:7px;background:#F1F4F8;color:#66758E;font-size:8px;font-weight:900}.priority-radar article>div{display:grid;gap:1px}.priority-radar small{font-size:8px;color:#71809A;font-weight:850}.priority-radar b{font-size:18px;color:#10224E}

.ops-list-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:2px}.ops-list-head>div{display:grid;grid-template-columns:auto 1fr;gap:2px 7px;align-items:baseline}.ops-list-head span{grid-column:1/-1;color:var(--blue);font-size:8px;font-weight:850;letter-spacing:.07em}.ops-list-head b{color:var(--navy);font-size:12px}.ops-list-head small{color:#7B899C;font-size:9px}.ops-copy{display:inline-flex!important;align-items:center!important;gap:6px!important;padding:8px 10px!important;border:1px solid #C9DCF4!important;border-radius:8px!important;background:#fff!important;color:var(--blue)!important;font-size:9px!important;font-weight:850!important}
@media(max-width:1180px){.ops-actions{grid-template-columns:1fr}.facet-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.smart-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.priority-radar{grid-template-columns:repeat(2,minmax(0,1fr))}.priority-radar-title{grid-column:1/-1}}
@media(max-width:760px){.ops-heading,.ops-list-head,.smart-filter-head{align-items:flex-start;flex-direction:column}.ops-heading-metrics{width:100%;box-sizing:border-box}.ops-action-card,.ops-lookup-card{grid-template-columns:auto minmax(0,1fr)}.ops-action-cta,.ops-lookup-form{grid-column:2}.facet-grid,.smart-summary,.priority-radar{grid-template-columns:1fr}.ops-query-result{align-items:flex-start;flex-direction:column}}
</style>
