<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CanonicalRevisadoRow } from '../types/revisados.types'
import RymIcon from '../components/RymIcon.vue'
import OperationsTable from './OperationsTable.vue'
import EcarCheckResultModal from './EcarCheckResultModal.vue'
import SmartFacetSelect, { type FacetOption } from './SmartFacetSelect.vue'

const props=defineProps<{
  rows:CanonicalRevisadoRow[]
  totalFleet:number
  upToDate:number
  syncBusy:boolean
  syncState:string
  manualPlate:string
  manualBusy:boolean
  manualState:string
  manualResult:Record<string,any>|null
  resetKey:number
}>()

const emit=defineEmits<{
  'manual-plate-change':[value:string]
  sync:[]
  lookup:[]
  open:[row:CanonicalRevisadoRow]
}>()

const search=ref('')
const priorities=ref<string[]>([])
const galeras=ref<string[]>([])
const months=ref<string[]>([])
const supervisoras=ref<string[]>([])
const statuses2=ref<string[]>([])
const ecarStates=ref<string[]>([])
const resultModalOpen=ref(false)

function s(v:unknown){return String(v??'').trim()}
function n(v:unknown){return s(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
function num(v:unknown){return new Intl.NumberFormat('es-PA').format(Number(v)||0)}
function rowPriority(r:CanonicalRevisadoRow){return s(r.prioridad||r['priority']||r['prioridad_operativa'])||'Sin prioridad'}
function rowMonth(r:CanonicalRevisadoRow){return s(r['mes_nombre']||r['mes']||r['mes_revisado']||r['mes_asignado']||r['ciclo_mes'])||'Sin mes'}
function rowStatus2(r:CanonicalRevisadoRow){return s(r['status2']||r['estatus2']||r.estado)||'Sin Estatus 2'}
function rowCupo(r:CanonicalRevisadoRow){return s(r['cupo_ecarcheck']||r['cupo_control']||r['cupo']||r['placa_comercial'])}
function rowLastQuery(r:CanonicalRevisadoRow){return s(r['ecarcheck_ultima_consulta_at']||r['ecarcheck_ultima_consulta']||r['ultima_consulta_ecarcheck']||r['ecarcheck_at'])}
function rowEcarError(r:CanonicalRevisadoRow){return s(r['ecarcheck_detalle']||r['ecarcheck_error_detail']||r['ecarcheck_error'])}
function rowEcarCategories(r:CanonicalRevisadoRow){
  return Array.isArray(r['ecarcheck_categorias']) ? r['ecarcheck_categorias'] as Array<Record<string,unknown>> : []
}
function rowEcarState(r:CanonicalRevisadoRow){
  const state=n(r['ecarcheck_estado'])
  const cats=rowEcarCategories(r)
  if(state==='ERROR'||cats.some(x=>n(x.tipo)==='ERROR_RESPUESTA')) return 'ERROR'
  if(state==='PENDIENTE'||n(r['ecarcheck_tipo_resultado']).includes('PENDIENTE')) return 'PENDIENTE'
  if(state==='BLOQUEADO'||cats.some(x=>[
    'BOLETA_PLACA','ENA_EMPRESA_DOCUMENTO',
    'RESTRICCION_PLACA_HURTO','RESTRICCION_PLACA_COLISION_FUGA',
    'RESTRICCION_PLACA_COLISION','RESTRICCION_PLACA_FUGA'
  ].includes(n(x.tipo)))) return 'ALERTA'
  if(state==='OK'||rowLastQuery(r)) return 'OK'
  return 'SIN CONSULTA'
}
function matchesSearch(r:CanonicalRevisadoRow){
  const q=n(search.value)
  if(!q)return true
  return [r.unidad,r.placa,r.empresa,r.galera,r.supervisora,rowCupo(r),rowMonth(r),rowStatus2(r),rowPriority(r),rowEcarState(r)]
    .map(n).join(' ').includes(q)
}
function has(selected:string[],value:string){return !selected.length||selected.includes(value)}
type Dimension='priority'|'galera'|'month'|'supervisora'|'status2'|'ecar'
function matchesFilters(r:CanonicalRevisadoRow,exclude?:Dimension){
  if(!matchesSearch(r))return false
  return (exclude==='priority'||has(priorities.value,rowPriority(r)))
    &&(exclude==='galera'||has(galeras.value,s(r.galera)||'Sin galera'))
    &&(exclude==='month'||has(months.value,rowMonth(r)))
    &&(exclude==='supervisora'||has(supervisoras.value,s(r.supervisora)||'Sin supervisora'))
    &&(exclude==='status2'||has(statuses2.value,rowStatus2(r)))
    &&(exclude==='ecar'||has(ecarStates.value,rowEcarState(r)))
}
function facetOptions(dim:Dimension,getter:(r:CanonicalRevisadoRow)=>string):FacetOption[]{
  const counts=new Map<string,number>()
  for(const row of props.rows){
    if(!matchesFilters(row,dim))continue
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
  if(x.includes('CRIT'))return 0
  if(x.includes('URG'))return 1
  if(x.includes('ALTA')||x.includes('HIGH'))return 2
  if(x.includes('ACTUAL'))return 3
  if(x.includes('MEDIA')||x.includes('MED'))return 4
  if(x.includes('BAJA')||x.includes('LOW'))return 5
  return 6
}
function timestamp(v:unknown){const t=Date.parse(s(v));return Number.isFinite(t)?t:Number.MAX_SAFE_INTEGER}

const filteredRows=computed(()=>props.rows.filter(r=>matchesFilters(r)).sort((a,b)=>{
  const p=priorityRank(rowPriority(a))-priorityRank(rowPriority(b))
  return p!==0?p:timestamp(a.ultimo_revisado)-timestamp(b.ultimo_revisado)
}))

const counters=computed(()=>{
  let ok=0,alert=0,error=0,pending=0,noQuery=0,blocked=0,ready=0,urgent=0
  for(const row of filteredRows.value){
    const state=rowEcarState(row)
    if(state==='OK')ok++
    else if(state==='ALERTA')alert++
    else if(state==='ERROR')error++
    else if(state==='PENDIENTE')pending++
    else noQuery++
    const isBlocked=Boolean(row.bloqueado)||state==='ALERTA'||state==='ERROR'
    if(isBlocked)blocked++
    else if(state==='OK')ready++
    const p=n(rowPriority(row))
    if(p.includes('CRIT')||p.includes('URG'))urgent++
  }
  return {total:filteredRows.value.length,ok,alert,error,pending,noQuery,blocked,ready,urgent}
})

const prioritySegments=computed(()=>{
  const total=Math.max(1,filteredRows.value.length)
  const defs=[['CRITICA','Crítica'],['URGENTE','Urgente'],['ALTA','Alta'],['ACTUAL','Actual']]
  return defs.map(([match,label],index)=>{
    const value=filteredRows.value.filter(r=>n(rowPriority(r)).includes(match)).length
    return {label,value,index,pct:value*100/total}
  })
})

const activeFilters=computed(()=>{
  const out:Array<{group:string,value:string}>=[]
  for(const v of galeras.value)out.push({group:'galera',value:v})
  for(const v of statuses2.value)out.push({group:'status2',value:v})
  for(const v of priorities.value)out.push({group:'priority',value:v})
  for(const v of months.value)out.push({group:'month',value:v})
  for(const v of supervisoras.value)out.push({group:'supervisora',value:v})
  for(const v of ecarStates.value)out.push({group:'ecar',value:v})
  return out
})
function removeFilter(group:string,value:string){
  const target=group==='priority'?priorities:group==='galera'?galeras:group==='month'?months:group==='supervisora'?supervisoras:group==='status2'?statuses2:ecarStates
  target.value=target.value.filter(x=>x!==value)
}
function resetFilters(){
  search.value=''
  priorities.value=[]
  galeras.value=[]
  months.value=[]
  supervisoras.value=[]
  statuses2.value=[]
  ecarStates.value=[]
}
watch(()=>props.resetKey,()=>resetFilters())
watch(()=>props.manualResult,(value)=>{
  if(value?.result) resultModalOpen.value=true
})

async function copyList(){
  const text=filteredRows.value.map(r=>[
    rowPriority(r),s(r.unidad)||'—',s(r.empresa)||'—',s(r.placa)||'—',rowCupo(r)||'—',
    rowMonth(r),s(r.galera)||'—',s(r.supervisora)||'—',rowStatus2(r),rowEcarState(r)
  ].join(' | ')).join('\n')
  try{await navigator.clipboard?.writeText(text)}catch{}
}
</script>

<template>
<section class="operations-stitch">

  <section class="ecar-command">
    <div class="command-head">
      <div>
        <span>CONSULTA Y SINCRONIZACIÓN</span>
        <h2>eCarCheck V2</h2>
        <p>Actualización masiva y verificación puntual desde un solo centro operativo.</p>
      </div>
      <div class="sync-meta">
        <small>ESTADO</small>
        <b><i></i> Datos reales</b>
      </div>
    </div>

    <div class="command-actions">
      <button class="sync-card" type="button" :disabled="syncBusy" @click="emit('sync')">
        <span class="action-icon"><RymIcon name="sync" :size="20"/></span>
        <span class="action-copy">
          <small>SINCRONIZACIÓN EN LOTE</small>
          <b>{{syncBusy?'Actualizando eCarCheck…':'Sincronización en lote eCarCheck'}}</b>
          <em>{{syncState}}</em>
        </span>
        <span class="action-button">{{syncBusy?'Procesando':'Sincronizar lote'}} <RymIcon name="arrow_forward" :size="14"/></span>
      </button>

      <div class="lookup-card">
        <span class="action-icon lookup-icon"><RymIcon name="manage_search" :size="20"/></span>
        <span class="action-copy">
          <small>CONSULTA PUNTUAL V2</small>
          <b>Verificar una placa vehicular</b>
          <em>{{manualState}}</em>
        </span>
        <div class="lookup-form">
          <input
            :value="manualPlate"
            maxlength="12"
            placeholder="PLACA"
            @input="emit('manual-plate-change',($event.target as HTMLInputElement).value.toUpperCase())"
            @keydown.enter="emit('lookup')"
          >
          <button type="button" :disabled="manualBusy||!manualPlate.trim()" @click="emit('lookup')">
            <RymIcon name="search" :size="14"/>
            {{manualBusy?'Consultando…':'Consultar'}}
          </button>
        </div>
      </div>
    </div>
  </section>

  <section class="filters-panel">
    <div class="search-row">
      <RymIcon name="search" :size="18"/>
      <input v-model="search" placeholder="Buscar unidad, placa, empresa, cupo o supervisora…">
      <kbd>⌘K</kbd>
    </div>

    <div class="facet-grid">
      <SmartFacetSelect v-model="galeras" label="Galera" placeholder="Todas las galeras" :options="galeraOptions"/>
      <SmartFacetSelect v-model="statuses2" label="Estatus 2" placeholder="Todos Estatus 2" :options="status2Options"/>
      <SmartFacetSelect v-model="priorities" label="Prioridad" placeholder="Todas las prioridades" :options="priorityOptions"/>
      <SmartFacetSelect v-model="months" label="Mes / ciclo" placeholder="Todos los meses" :options="monthOptions"/>
      <SmartFacetSelect v-model="supervisoras" label="Supervisora" placeholder="Todas las supervisoras" :options="supervisorOptions"/>
      <SmartFacetSelect v-model="ecarStates" label="eCarCheck" placeholder="eCarCheck: todos" :options="ecarOptions"/>
    </div>

    <div class="filter-foot">
      <div class="chips">
        <span v-if="!activeFilters.length">Sin filtros adicionales</span>
        <button v-for="f in activeFilters" :key="f.group+'|'+f.value" type="button" @click="removeFilter(f.group,f.value)">
          {{f.value}} <RymIcon name="close" :size="11"/>
        </button>
      </div>
      <b>{{num(filteredRows.length)}} resultados</b>
    </div>
  </section>

  <section class="kpi-row">
    <article class="kpi blue">
      <small>PENDIENTES</small><b>{{num(counters.total)}}</b><span>Unidades que requieren gestión</span>
    </article>
    <article class="kpi green">
      <small>LISTAS PARA GESTIONAR</small><b>{{num(counters.ready)}}</b><span>Sin impedimento crítico</span>
    </article>
    <article class="kpi red">
      <small>BLOQUEADAS</small><b>{{num(counters.blocked)}}</b><span>Boleta, restricción o incidencia</span>
    </article>
    <article class="kpi amber">
      <small>ATENCIÓN INMEDIATA</small><b>{{num(counters.urgent)}}</b><span>Críticas + urgentes</span>
    </article>
    <article class="kpi slate">
      <small>SIN ECARCHECK</small><b>{{num(counters.noQuery)}}</b><span>Requieren verificación</span>
    </article>
  </section>

  <section class="priority-strip">
    <div class="priority-copy">
      <span>QUÉ ATENDER PRIMERO</span>
      <b>Prioridades dentro del contexto actual</b>
    </div>
    <div class="priority-visual">
      <div class="priority-track">
        <span v-for="seg in prioritySegments" :key="seg.label" :data-rank="seg.index" :style="{width:seg.pct+'%'}"></span>
      </div>
      <div class="priority-legend">
        <div v-for="seg in prioritySegments" :key="seg.label" :data-rank="seg.index">
          <i></i><span>{{seg.label}}</span><b>{{num(seg.value)}}</b>
        </div>
      </div>
    </div>
  </section>

  <div class="queue-head">
    <div>
      <span>COLA DE TRABAJO TÁCTICA</span>
      <b>{{num(filteredRows.length)}} unidades visibles</b>
      <small>Ordenada por prioridad y antigüedad.</small>
    </div>
    <button type="button" @click="copyList"><RymIcon name="content_copy" :size="14"/> Copiar lista</button>
  </div>

  <OperationsTable :rows="filteredRows" @open="emit('open',$event)"/>

  <EcarCheckResultModal
    :open="resultModalOpen"
    :plate="manualPlate"
    :payload="manualResult"
    @close="resultModalOpen=false"
  />
</section>
</template>

<style scoped>
.operations-stitch{
  --navy:#081B46;--navy2:#0D2D72;--blue:#1D59C8;--blue2:#3D77E2;--cyan:#67A7FF;
  --line:#C6D5E8;--text:#1B2F50;--muted:#65758E;--soft:#F4F7FB;
  display:grid;gap:12px;padding-bottom:12px;color:var(--text);
}
.operations-stitch *{box-sizing:border-box}

.ecar-command{
  overflow:hidden;border:1px solid #173E87;border-radius:16px;
  background:linear-gradient(135deg,#081B46 0%,#0D2D72 52%,#17479C 100%);
  box-shadow:0 16px 34px rgba(8,27,70,.16);
  color:#fff;
}
.command-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:13px 15px 9px}
.command-head>div:first-child{display:grid;gap:2px}.command-head span{font-size:7px;font-weight:900;letter-spacing:.08em;color:#A9C8FF}.command-head h2{margin:0;font-size:16px;color:#fff}.command-head p{margin:0;font-size:8px;color:#C7D8F7}
.sync-meta{display:grid;justify-items:end;gap:2px}.sync-meta small{font-size:6px;color:#9EBBEE}.sync-meta b{display:flex;align-items:center;gap:5px;font-size:8px;color:#D9FBE9}.sync-meta i{width:6px;height:6px;border-radius:50%;background:#2DD47A;box-shadow:0 0 0 4px rgba(45,212,122,.12)}
.command-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 10px 10px}
.sync-card,.lookup-card{
  min-width:0;min-height:78px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;
  padding:11px;border:1px solid rgba(174,204,255,.25);border-radius:11px;
}
.sync-card{background:linear-gradient(135deg,#164DAF,#2D68D4);color:#fff;text-align:left;cursor:pointer}
.lookup-card{background:linear-gradient(135deg,#255DBD,#3D77D7)}
.action-icon{width:37px;height:37px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.24);border-radius:9px;background:rgba(255,255,255,.12);color:#fff}
.lookup-icon{background:rgba(72,220,174,.14);color:#9AF0D1}
.action-copy{min-width:0;display:grid;gap:2px}.action-copy small{font-size:6px;font-weight:900;letter-spacing:.05em;color:#C0D5FA}.action-copy b{font-size:10px;color:#fff}.action-copy em{font-size:7px;font-style:normal;color:#D5E2F8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.action-button{
  display:inline-flex;align-items:center;gap:5px;padding:7px 9px;border-radius:7px;
  background:#fff;color:#17479C;font-size:7px;font-weight:900;box-shadow:0 4px 10px rgba(4,18,50,.16)
}
.lookup-form{display:flex;align-items:center;gap:6px}.lookup-form input{width:108px;padding:8px;border:1px solid rgba(255,255,255,.55);border-radius:7px;background:#fff;color:#0B214E;font:800 8px/1 ui-monospace,monospace;text-transform:uppercase}
.lookup-form button{
  min-width:82px;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:4px!important;
  padding:8px 9px!important;border:1px solid #071C48!important;border-radius:7px!important;
  background:#071C48!important;color:#fff!important;font-size:7px!important;font-weight:900!important;cursor:pointer!important;
  box-shadow:0 4px 12px rgba(2,12,34,.22)!important;
}
.lookup-form button:hover:not(:disabled){background:#020F2F!important}
.lookup-form button:disabled{opacity:.58!important;background:#183A78!important;color:#E5ECFA!important;border-color:#183A78!important;cursor:not-allowed!important}
.query-result{margin:0 10px 10px;padding:8px 10px;border:1px solid rgba(188,215,255,.32);border-radius:9px;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;gap:10px}
.query-identity{display:grid;grid-template-columns:auto 1fr;gap:2px 7px;align-items:baseline}.query-identity small{grid-column:1/-1;font-size:6px;color:#AFC8F2}.query-identity b{font:850 11px/1 ui-monospace,monospace;color:#fff}.query-identity span{font-size:7px;color:#D2DFF5}
.query-signals{display:flex;gap:5px}.query-signals>span{min-width:54px;padding:5px;border-radius:7px;background:rgba(255,255,255,.1);display:grid;gap:1px;text-align:center}.query-signals small{font-size:6px;color:#BBD0F1}.query-signals b{font-size:10px;color:#fff}

.filters-panel{display:grid;gap:9px;padding:11px;border:1px solid #C4D3E5;border-radius:14px;background:#fff;box-shadow:0 8px 20px rgba(12,39,82,.05)}
.search-row{height:38px;display:flex;align-items:center;gap:8px;padding:0 10px;border:1px solid #C3D3E6;border-radius:9px;background:#F8FAFD;color:#7A8AA1}.search-row:focus-within{background:#fff;border-color:#6E9EDF;box-shadow:0 0 0 3px rgba(29,89,200,.07)}.search-row input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#1B2F50;font-size:9px}.search-row kbd{padding:3px 5px;border:1px solid #D3DDE9;border-radius:4px;background:#fff;color:#74839A;font:700 7px/1 ui-monospace,monospace}
.facet-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.filter-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:2px}.filter-foot>b{font-size:8px;color:#52647D}.chips{display:flex;align-items:center;flex-wrap:wrap;gap:4px}.chips>span{font-size:7px;color:#8794A8}.chips button{display:inline-flex!important;align-items:center!important;gap:3px!important;padding:4px 6px!important;border:1px solid #B7CBE7!important;border-radius:999px!important;background:#EDF4FF!important;color:#174EA6!important;font-size:7px!important;font-weight:850!important}

.kpi-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
.kpi{position:relative;min-width:0;display:grid;grid-template-columns:auto 1fr;gap:1px 7px;align-items:baseline;padding:10px 10px 9px;border:1px solid #C7D6E8;border-radius:10px;background:#fff;overflow:hidden;box-shadow:0 5px 14px rgba(14,41,82,.04)}
.kpi:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#1D59C8}.kpi.green:before{background:#19A76F}.kpi.red:before{background:#E2473F}.kpi.amber:before{background:#F2A11A}.kpi.slate:before{background:#8392A8}
.kpi small{grid-column:1/-1;font-size:6px;font-weight:900;color:#697B93;letter-spacing:.04em}.kpi b{font-size:19px;color:#0B214E;line-height:1}.kpi span{font-size:7px;color:#687991;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kpi.blue{background:linear-gradient(135deg,#EEF5FF,#fff)}.kpi.green{background:linear-gradient(135deg,#F0FAF5,#fff)}.kpi.red{background:linear-gradient(135deg,#FFF2F1,#fff)}.kpi.amber{background:linear-gradient(135deg,#FFF8EA,#fff)}.kpi.slate{background:linear-gradient(135deg,#F5F7FA,#fff)}

.priority-strip{display:grid;grid-template-columns:220px 1fr;gap:12px;align-items:center;padding:8px 10px;border:1px solid #C7D6E8;border-radius:10px;background:#fff}
.priority-copy{display:grid;gap:2px}.priority-copy span{font-size:6px;font-weight:900;color:#174EA6;letter-spacing:.06em}.priority-copy b{font-size:9px;color:#0B214E}
.priority-visual{display:grid;gap:6px}.priority-track{height:7px;display:flex;border-radius:999px;overflow:hidden;background:#EDF1F6}.priority-track span[data-rank="0"]{background:#E2473F}.priority-track span[data-rank="1"]{background:#F47D20}.priority-track span[data-rank="2"]{background:#F4BB3B}.priority-track span[data-rank="3"]{background:#4E75B9}
.priority-legend{display:flex;flex-wrap:wrap;gap:12px}.priority-legend>div{display:flex;align-items:center;gap:4px;font-size:7px;color:#697990}.priority-legend i{width:6px;height:6px;border-radius:50%;background:#4E75B9}.priority-legend>div[data-rank="0"] i{background:#E2473F}.priority-legend>div[data-rank="1"] i{background:#F47D20}.priority-legend>div[data-rank="2"] i{background:#F4BB3B}.priority-legend b{color:#0B214E}

.queue-head{display:flex;align-items:end;justify-content:space-between;gap:10px;padding:1px}.queue-head>div{display:grid;grid-template-columns:auto 1fr;gap:2px 6px;align-items:baseline}.queue-head span{grid-column:1/-1;font-size:6px;font-weight:900;color:#174EA6;letter-spacing:.06em}.queue-head b{font-size:11px;color:#0B214E}.queue-head small{font-size:7px;color:#6A7990}.queue-head button{display:inline-flex!important;align-items:center!important;gap:4px!important;padding:6px 8px!important;border:1px solid #B8CBE4!important;border-radius:7px!important;background:#fff!important;color:#174EA6!important;font-size:7px!important;font-weight:850!important}

@media(max-width:1180px){.kpi-row{grid-template-columns:repeat(3,minmax(0,1fr))}.facet-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){.command-actions{grid-template-columns:1fr}.priority-strip{grid-template-columns:1fr}.kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:680px){.facet-grid,.kpi-row{grid-template-columns:1fr}.command-head,.queue-head,.filter-foot{align-items:flex-start;flex-direction:column}.sync-card,.lookup-card{grid-template-columns:auto minmax(0,1fr)}.action-button,.lookup-form{grid-column:2}.lookup-form{flex-wrap:wrap}.kpi span{white-space:normal}}
</style>

<style scoped>
/* readability pass */
.command-head h2{font-size:18px}
.command-head p{font-size:10px}
.action-copy small{font-size:8px}
.action-copy b{font-size:12px}
.action-copy em{font-size:9px}
.action-button{font-size:9px;padding:8px 11px}
.lookup-form input{font-size:10px}
.lookup-form button{font-size:9px!important}
.search-row input{font-size:10px}
.filter-foot>b,.chips>span,.chips button{font-size:8px!important}
.kpi small{font-size:7px}
.kpi b{font-size:21px}
.kpi span{font-size:8px}
.priority-copy span{font-size:7px}
.priority-copy b{font-size:10px}
.priority-legend>div{font-size:8px}
.queue-head span{font-size:7px}
.queue-head b{font-size:12px}
.queue-head small{font-size:8px}
</style>
