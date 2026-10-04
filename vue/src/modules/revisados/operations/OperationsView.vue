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
function rowEcarError(r:CanonicalRevisadoRow){ return s(r['ecarcheck_error_detail'] || r['ecarcheck_error'] || r['ficha_ecarcheck_error'] || r['error_ecarcheck']) }
function rowEcarCategories(r:CanonicalRevisadoRow){
  return Array.isArray(r['ecarcheck_categorias']) ? r['ecarcheck_categorias'] as Array<Record<string,unknown>> : []
}
function rowEcarState(r:CanonicalRevisadoRow){
  const state=n(r['ecarcheck_estado'])
  const cats=rowEcarCategories(r)
  if(state==='ERROR' || cats.some(x=>n(x.tipo)==='ERROR_RESPUESTA')) return 'ERROR'
  if(state==='PENDIENTE' || n(r['ecarcheck_tipo_resultado']).includes('PENDIENTE')) return 'PENDIENTE'
  if(state==='BLOQUEADO' || cats.some(x=>[
    'BOLETA_PLACA','ENA_EMPRESA_DOCUMENTO',
    'RESTRICCION_PLACA_HURTO','RESTRICCION_PLACA_COLISION_FUGA',
    'RESTRICCION_PLACA_COLISION','RESTRICCION_PLACA_FUGA'
  ].includes(n(x.tipo)))) return 'ALERTA'
  if(state==='OK' || rowLastQuery(r)) return 'OK'
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
  let ok=0,alert=0,error=0,pendingEcar=0,noQuery=0
  for(const row of filteredRows.value){
    const state=rowEcarState(row)
    if(state==='OK')ok++
    else if(state==='ALERTA')alert++
    else if(state==='ERROR')error++
    else if(state==='PENDIENTE')pendingEcar++
    else noQuery++
  }
  return {pending:filteredRows.value.length,ok,alert,error,pendingEcar,noQuery}
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

const managementKpis=computed(()=>{
  let ready=0, blocked=0, urgent=0
  for(const row of filteredRows.value){
    const state=rowEcarState(row)
    const isBlocked=Boolean(row.bloqueado) || state==='ALERTA' || state==='ERROR'
    if(isBlocked) blocked++
    if(!isBlocked && state==='OK') ready++
    const p=n(rowPriority(row))
    if(p.includes('CRIT') || p.includes('URG')) urgent++
  }
  return {
    pending:filteredRows.value.length,
    ready,
    blocked,
    urgent,
    noQuery:filteredCounters.value.noQuery,
  }
})

const prioritySegments=computed(()=>{
  const total=Math.max(1,filteredRows.value.length)
  const labels=['CRITICA','URGENTE','ALTA','ACTUAL']
  return labels.map((label,index)=>{
    const value=filteredRows.value.filter(r=>n(rowPriority(r)).includes(label)).length
    return {label,value,index,pct:value*100/total}
  })
})
</script>


<template>
<section class="ops-stitch">

  <section class="context-strip">
    <div class="context-copy">
      <span class="context-kicker">COLA OPERATIVA</span>
      <div class="context-title">
        <b>{{num(managementKpis.pending)}} pendientes</b>
        <span>{{num(managementKpis.ready)}} listas · {{num(managementKpis.blocked)}} bloqueadas · {{num(managementKpis.noQuery)}} sin consulta eCarCheck</span>
      </div>
    </div>
    <div class="context-fleet">
      <span><small>Flota</small><b>{{num(totalFleet)}}</b></span>
      <i></i>
      <span><small>Al día</small><b>{{num(upToDate)}}</b><em>{{coverage}}%</em></span>
    </div>
  </section>

  <section class="ecar-command">
    <div class="ecar-command-head">
      <div>
        <span>ECARCHECK V2</span>
        <h3>Consulta y sincronización</h3>
        <p>Sincroniza datos o verifica una placa en tiempo real.</p>
      </div>
      <span class="live-pill"><i></i> Datos reales</span>
    </div>

    <div class="command-grid">
      <button class="command-card command-sync" type="button" :disabled="syncBusy" @click="emit('sync')">
        <span class="command-icon"><RymIcon name="sync" :size="20"/></span>
        <span class="command-copy">
          <small>ACTUALIZACIÓN GENERAL</small>
          <b>{{syncBusy?'Actualizando eCarCheck…':'Actualizar eCarCheck'}}</b>
          <em>{{syncState}}</em>
        </span>
        <span class="command-button">{{syncBusy?'Procesando':'Sincronizar'}} <RymIcon name="arrow_forward" :size="15"/></span>
      </button>

      <div class="command-card command-lookup">
        <span class="command-icon"><RymIcon name="manage_search" :size="20"/></span>
        <span class="command-copy">
          <small>CONSULTA PUNTUAL V2</small>
          <b>Verificar una placa</b>
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
            {{manualBusy?'…':'Consultar'}}
          </button>
        </div>
      </div>
    </div>

    <div v-if="manualResult?.result" class="query-result">
      <div>
        <small>RESULTADO ECARCHECK</small>
        <b>{{manualResult.result?.vehiculo?.nroPlaca||manualPlate}}</b>
        <span>{{manualResult.result?.vehiculo?.nombrePropietario||'—'}} · {{manualResult.result?.vehiculo?.colorVehiculo||'—'}} · Revisado {{manualResult.result?.vehiculo?.fechaRevisado||'—'}}</span>
      </div>
      <div class="query-signals">
        <span><small>ENA</small><b>{{num(manualResult.result?.boletas?.infraccionesEna?.cantidad)}}</b></span>
        <span><small>Documento</small><b>{{num(manualResult.result?.boletas?.boletasPorDocumento?.cantidad)}}</b></span>
        <span><small>Placa</small><b>{{num(manualResult.result?.boletas?.boletasPorPlaca?.cantidad)}}</b></span>
      </div>
    </div>
  </section>

  <section class="filter-workspace">
    <div class="filter-head">
      <div>
        <span>FILTROS INTELIGENTES</span>
        <h3>Contexto operativo</h3>
        <p>Cada selección recalcula las opciones disponibles y todos los indicadores.</p>
      </div>
      <button class="reset" type="button" :disabled="!activeFilters.length&&!search" @click="resetFilters">
        <RymIcon name="filter_alt_off" :size="15"/> Limpiar todo
      </button>
    </div>

    <div class="smart-search">
      <RymIcon name="search" :size="18"/>
      <input v-model="search" placeholder="Buscar unidad, placa, empresa, cupo o supervisora…">
      <kbd>⌘K</kbd>
    </div>

    <div class="filter-group">
      <span class="group-label">PRINCIPALES</span>
      <div class="facet-grid primary">
        <SmartFacetSelect v-model="galeras" label="Galera" placeholder="Todas las galeras" :options="galeraOptions"/>
        <SmartFacetSelect v-model="statuses2" label="Estatus 2" placeholder="Todos Estatus 2" :options="status2Options"/>
        <SmartFacetSelect v-model="priorities" label="Prioridad" placeholder="Todas las prioridades" :options="priorityOptions"/>
        <SmartFacetSelect v-model="months" label="Mes / ciclo" placeholder="Todos los meses" :options="monthOptions"/>
      </div>
    </div>

    <div class="filter-group secondary-group">
      <span class="group-label">SECUNDARIOS</span>
      <div class="facet-grid secondary">
        <SmartFacetSelect v-model="supervisoras" label="Supervisora" placeholder="Todas las supervisoras" :options="supervisorOptions"/>
        <SmartFacetSelect v-model="ecarStates" label="eCarCheck" placeholder="eCarCheck: todos" :options="ecarOptions"/>
      </div>
    </div>

    <div v-if="activeFilters.length" class="active-context">
      <span>CONTEXTO ACTIVO</span>
      <button v-for="f in activeFilters" :key="f.group+'|'+f.value" type="button" @click="removeFilter(f.group,f.value)">
        {{f.value}} <RymIcon name="close" :size="12"/>
      </button>
    </div>
  </section>

  <section class="decision-kpis">
    <article class="kpi kpi-primary">
      <span class="kpi-icon"><RymIcon name="assignment_late" :size="18"/></span>
      <div><small>PENDIENTES</small><b>{{num(managementKpis.pending)}}</b><em>Unidades que requieren gestión</em></div>
    </article>
    <article class="kpi kpi-ready">
      <span class="kpi-icon"><RymIcon name="task_alt" :size="18"/></span>
      <div><small>LISTAS PARA GESTIONAR</small><b>{{num(managementKpis.ready)}}</b><em>Sin impedimento crítico</em></div>
    </article>
    <article class="kpi kpi-blocked">
      <span class="kpi-icon"><RymIcon name="gpp_bad" :size="18"/></span>
      <div><small>BLOQUEADAS</small><b>{{num(managementKpis.blocked)}}</b><em>Boleta, restricción o incidencia</em></div>
    </article>
    <article class="kpi kpi-urgent">
      <span class="kpi-icon"><RymIcon name="priority_high" :size="18"/></span>
      <div><small>ATENCIÓN INMEDIATA</small><b>{{num(managementKpis.urgent)}}</b><em>Críticas + urgentes</em></div>
    </article>
    <article class="kpi kpi-query">
      <span class="kpi-icon"><RymIcon name="manage_search" :size="18"/></span>
      <div><small>SIN CONSULTA ECARCHECK</small><b>{{num(managementKpis.noQuery)}}</b><em>Requieren verificación</em></div>
    </article>
  </section>

  <section class="priority-band">
    <div class="priority-head">
      <div><span>DISTRIBUCIÓN DE PRIORIDAD</span><b>Qué atender primero</b></div>
      <small>{{num(filteredRows.length)}} unidades en el contexto actual</small>
    </div>
    <div class="priority-track" aria-label="Distribución de prioridad">
      <span
        v-for="seg in prioritySegments"
        :key="seg.label"
        :data-rank="seg.index"
        :style="{width:seg.pct+'%'}"
      ></span>
    </div>
    <div class="priority-legend">
      <div v-for="seg in prioritySegments" :key="seg.label" :data-rank="seg.index">
        <i></i><span>{{seg.label}}</span><b>{{num(seg.value)}}</b>
      </div>
    </div>
  </section>

  <div class="list-head">
    <div>
      <span>COLA DE TRABAJO</span>
      <b>{{num(filteredRows.length)}} unidades visibles</b>
      <small>Ordenada por prioridad y antigüedad.</small>
    </div>
    <button type="button" @click="copyList"><RymIcon name="content_copy" :size="15"/> Copiar lista</button>
  </div>

  <OperationsTable :rows="filteredRows" @open="emit('open',$event)"/>
</section>
</template>

<style scoped>
.ops-stitch{
  --navy:#0B1F4D;--blue:#174EA6;--blue2:#2F63D8;--cyan:#5B9FEA;
  --line:#C7D7EA;--muted:#62728A;--surface:#FFFFFF;--soft:#F4F7FB;
  display:grid;gap:14px;color:#1E3153;padding-bottom:12px;
}
.ops-stitch *{box-sizing:border-box}

.context-strip{
  min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:14px;
  padding:10px 13px;border:1px solid #C7D7EA;border-radius:14px;
  background:linear-gradient(100deg,#EAF2FF 0%,#F7FAFF 52%,#FFFFFF 100%);
  box-shadow:0 7px 18px rgba(15,51,107,.06);
}
.context-copy{display:grid;gap:4px}.context-kicker{font-size:8px;font-weight:900;letter-spacing:.075em;color:#174EA6}
.context-title{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.context-title b{font-size:18px;color:#0B1F4D}.context-title span{font-size:9px;color:#5B6D86}
.context-fleet{display:flex;align-items:center;gap:12px;padding-left:14px;border-left:1px solid #C4D4E8}
.context-fleet>span{display:grid;grid-template-columns:auto auto;gap:2px 6px;align-items:baseline}.context-fleet small{grid-column:1/-1;font-size:7px;font-weight:850;color:#6A7B93;text-transform:uppercase}.context-fleet b{font-size:14px;color:#0B1F4D}.context-fleet em{font-size:8px;font-style:normal;font-weight:850;color:#174EA6}.context-fleet i{width:1px;height:25px;background:#C4D4E8}

.ecar-command{
  position:relative;overflow:hidden;display:grid;gap:12px;padding:15px;
  border:1px solid #B9CDEA;border-radius:18px;
  background:linear-gradient(135deg,#EFF6FF 0%,#F7FAFF 46%,#FFFFFF 100%);
  box-shadow:0 14px 30px rgba(15,51,107,.08);
}
.ecar-command:after{content:"";position:absolute;right:-90px;top:-120px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,#CFE3FF 0%,rgba(207,227,255,0) 68%);pointer-events:none}
.ecar-command-head{position:relative;z-index:1;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.ecar-command-head>div{display:grid;gap:3px}.ecar-command-head>div>span{font-size:8px;font-weight:900;letter-spacing:.08em;color:#174EA6}.ecar-command h3{margin:0;color:#0B1F4D;font-size:17px}.ecar-command p{margin:0;color:#5E7089;font-size:9px}
.live-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border:1px solid #A7E4C4;border-radius:999px;background:#EAFBF1;color:#0A7A46;font-size:8px;font-weight:850}.live-pill i{width:6px;height:6px;border-radius:50%;background:#16B364;box-shadow:0 0 0 4px rgba(22,179,100,.10)}
.command-grid{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.command-card{
  min-width:0;min-height:84px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:11px;
  padding:12px;border-radius:14px;border:1px solid #BDD0E9;background:#fff;box-shadow:0 8px 20px rgba(15,51,107,.06)
}
.command-sync{background:linear-gradient(135deg,#E9F2FF 0%,#FFFFFF 75%);cursor:pointer;text-align:left}
.command-lookup{background:linear-gradient(135deg,#FFFFFF 0%,#F4F8FF 100%)}
.command-card:hover{border-color:#8FB1DC;transform:translateY(-1px)}
.command-icon{width:40px;height:40px;display:grid;place-items:center;border:1px solid #AFC8E8;border-radius:11px;background:linear-gradient(145deg,#D8E9FF,#EDF5FF);color:#174EA6}
.command-copy{min-width:0;display:grid;gap:2px}.command-copy small{font-size:7px;font-weight:900;color:#6A7C94;letter-spacing:.05em}.command-copy b{font-size:11px;color:#0B1F4D}.command-copy em{font-size:8px;font-style:normal;color:#61738B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.command-button,.lookup-form button{display:inline-flex;align-items:center;gap:5px;padding:8px 10px!important;border-radius:9px!important;background:linear-gradient(135deg,#174EA6,#2F63D8)!important;color:#fff!important;border:1px solid #174EA6!important;font-size:8px!important;font-weight:850!important;box-shadow:0 5px 12px rgba(23,78,166,.2)}
.lookup-form{display:flex;gap:6px;align-items:center}.lookup-form input{width:92px;padding:8px;border:1px solid #B7C9DF;border-radius:9px;background:#fff;color:#0B1F4D;font:800 9px/1 ui-monospace,monospace;text-transform:uppercase}.lookup-form button:disabled{opacity:.45!important}
.query-result{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border:1px solid #B9D0EE;border-radius:10px;background:#EAF2FF}.query-result>div:first-child{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;align-items:baseline}.query-result small{font-size:7px;color:#64758C;font-weight:850}.query-result>div:first-child>small{grid-column:1/-1}.query-result>div:first-child>b{font:850 13px/1 ui-monospace,monospace;color:#0B1F4D}.query-result>div:first-child>span{font-size:8px;color:#5E7089}.query-signals{display:flex;gap:5px}.query-signals span{min-width:56px;padding:6px;border-radius:8px;background:#fff;text-align:center;display:grid;gap:1px}.query-signals b{color:#0B1F4D}

.filter-workspace{display:grid;gap:11px;padding:14px;border:1px solid #C2D2E6;border-radius:16px;background:#fff;box-shadow:0 10px 24px rgba(12,40,84,.05)}
.filter-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.filter-head>div{display:grid;gap:2px}.filter-head span{font-size:8px;font-weight:900;letter-spacing:.07em;color:#174EA6}.filter-head h3{margin:0;color:#0B1F4D;font-size:14px}.filter-head p{margin:0;color:#687991;font-size:8px}
.reset{display:inline-flex!important;align-items:center!important;gap:5px!important;padding:7px 9px!important;border:1px solid #C8D5E5!important;border-radius:8px!important;background:#F7F9FC!important;color:#52657E!important;font-size:8px!important;font-weight:850!important}.reset:disabled{opacity:.4!important}
.smart-search{height:42px;display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid #BCD0E7;border-radius:10px;background:#F9FBFE;color:#7D8BA0}.smart-search:focus-within{background:#fff;border-color:#6F9FDC;box-shadow:0 0 0 3px rgba(23,78,166,.08)}.smart-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#203253;font-size:10px}.smart-search kbd{padding:3px 5px;border:1px solid #D1DCE9;border-radius:5px;background:#fff;color:#718198;font:700 7px/1 ui-monospace,monospace}
.filter-group{display:grid;gap:6px}.group-label{font-size:7px!important;color:#7A899E!important;letter-spacing:.08em!important}.facet-grid.primary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.facet-grid.secondary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.secondary-group{padding-top:2px;border-top:1px dashed #D9E2EC}
.active-context{display:flex;align-items:center;flex-wrap:wrap;gap:5px}.active-context>span{margin-right:2px;font-size:7px;font-weight:900;color:#7B8A9F}.active-context button{display:inline-flex!important;align-items:center!important;gap:4px!important;padding:5px 7px!important;border:1px solid #B7CEEB!important;border-radius:999px!important;background:#E9F2FF!important;color:#174EA6!important;font-size:8px!important;font-weight:850!important}

.decision-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}
.kpi{position:relative;min-width:0;display:grid;grid-template-columns:auto 1fr;gap:9px;align-items:center;padding:11px;border:1px solid #C7D6E8;border-radius:13px;background:#fff;box-shadow:0 7px 18px rgba(12,40,84,.045);overflow:hidden}
.kpi:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#174EA6}.kpi-ready:before{background:#18A66E}.kpi-blocked:before{background:#E6544B}.kpi-urgent:before{background:#F39A13}.kpi-query:before{background:#7385A3}
.kpi-primary{background:linear-gradient(135deg,#EDF4FF,#FFFFFF)}.kpi-ready{background:linear-gradient(135deg,#EFFAF4,#FFFFFF)}.kpi-blocked{background:linear-gradient(135deg,#FFF3F2,#FFFFFF)}.kpi-urgent{background:linear-gradient(135deg,#FFF7E9,#FFFFFF)}.kpi-query{background:linear-gradient(135deg,#F4F6FA,#FFFFFF)}
.kpi-icon{width:32px;height:32px;display:grid;place-items:center;border-radius:9px;background:rgba(255,255,255,.82);border:1px solid rgba(159,182,212,.55);color:#174EA6}.kpi-ready .kpi-icon{color:#0A8755}.kpi-blocked .kpi-icon{color:#C63D34}.kpi-urgent .kpi-icon{color:#C77700}.kpi-query .kpi-icon{color:#61738C}
.kpi>div{min-width:0;display:grid;grid-template-columns:auto 1fr;gap:1px 6px;align-items:baseline}.kpi small{grid-column:1/-1;font-size:7px;font-weight:900;color:#64758D;letter-spacing:.035em}.kpi b{font-size:20px;color:#0B1F4D}.kpi em{font-size:8px;font-style:normal;color:#62728A;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.priority-band{display:grid;gap:8px;padding:11px 12px;border:1px solid #C7D7EA;border-radius:13px;background:#fff;box-shadow:0 7px 18px rgba(12,40,84,.04)}
.priority-head{display:flex;align-items:end;justify-content:space-between;gap:10px}.priority-head>div{display:grid;gap:2px}.priority-head span{font-size:7px;font-weight:900;letter-spacing:.07em;color:#174EA6}.priority-head b{font-size:11px;color:#0B1F4D}.priority-head>small{font-size:8px;color:#687991}
.priority-track{display:flex;width:100%;height:8px;border-radius:999px;overflow:hidden;background:#EDF1F6}.priority-track span[data-rank="0"]{background:#D83A32}.priority-track span[data-rank="1"]{background:#F07B14}.priority-track span[data-rank="2"]{background:#F5B642}.priority-track span[data-rank="3"]{background:#6E91C7}
.priority-legend{display:flex;flex-wrap:wrap;gap:14px}.priority-legend>div{display:flex;align-items:center;gap:5px;font-size:8px;color:#61728A}.priority-legend i{width:7px;height:7px;border-radius:50%;background:#6E91C7}.priority-legend>div[data-rank="0"] i{background:#D83A32}.priority-legend>div[data-rank="1"] i{background:#F07B14}.priority-legend>div[data-rank="2"] i{background:#F5B642}.priority-legend b{color:#0B1F4D}

.list-head{display:flex;align-items:end;justify-content:space-between;gap:12px;padding:1px 2px}.list-head>div{display:grid;grid-template-columns:auto 1fr;gap:2px 7px;align-items:baseline}.list-head span{grid-column:1/-1;font-size:7px;font-weight:900;letter-spacing:.07em;color:#174EA6}.list-head b{font-size:12px;color:#0B1F4D}.list-head small{font-size:8px;color:#6A7990}.list-head button{display:inline-flex!important;align-items:center!important;gap:5px!important;padding:7px 9px!important;border:1px solid #B8CDE8!important;border-radius:8px!important;background:#F7FAFF!important;color:#174EA6!important;font-size:8px!important;font-weight:850!important}

@media(max-width:1250px){.decision-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.facet-grid.primary{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){.command-grid{grid-template-columns:1fr}.decision-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.context-strip{align-items:flex-start;flex-direction:column}.context-fleet{padding-left:0;border-left:0}}
@media(max-width:680px){.facet-grid.primary,.facet-grid.secondary,.decision-kpis{grid-template-columns:1fr}.filter-head,.list-head,.ecar-command-head{flex-direction:column;align-items:flex-start}.lookup-form{grid-column:2}.context-title{display:grid}.kpi em{white-space:normal}}
</style>
