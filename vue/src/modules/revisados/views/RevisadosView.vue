<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { revisadosService, type RevisadosNavItem } from '../services/revisados.service'
import type { CanonicalRevisadoRow, CanonicalRevisadosResponse, RevisadoRecord } from '../types/revisados.types'
import { useRevisados } from '../composables/useRevisados'
import GaleraComparison from '../components/GaleraComparison.vue'
import RevisadosFilterBar from '../components/RevisadosFilterBar.vue'
import RevisadosTable from '../components/RevisadosTable.vue'
import VehicleBadge from '../components/VehicleBadge.vue'
import RymIcon from '../components/RymIcon.vue'
import OperationsView from '../operations/OperationsView.vue'

const data=ref<CanonicalRevisadosResponse>(), records=ref<RevisadoRecord[]>([]), loading=ref(true), error=ref(''), active=ref('dashboard')
const profile=ref({nombre:'Portal RYM',rol:'',scope_label:''}), navItems=ref<RevisadosNavItem[]>([])
const {filters,filtered,metrics,options,clearFilters}=useRevisados(records)
const rawRows=computed(()=>Array.isArray(data.value?.rows)?data.value.rows as CanonicalRevisadoRow[]:[])
const pending=computed(()=>rawRows.value.filter(r=>!r.emitido))
const emitted=computed(()=>Array.isArray((data.value?.emitidos_hoy as {rows?:CanonicalRevisadoRow[]}|undefined)?.rows)?(data.value?.emitidos_hoy as {rows:CanonicalRevisadoRow[]}).rows:[])
const emittedToday=computed(()=>data.value?.emitidos_hoy as {emitidos?:number; limite?:number}|undefined)
const monthly=computed(()=>Array.isArray(data.value?.monthly)?data.value.monthly as Array<Record<string,unknown>>:[])
const gallery=computed(()=>Array.isArray(data.value?.por_galera)?data.value.por_galera as Array<Record<string,unknown>>:[])
const selectedGalera=ref(''), selectedStatus=ref(''), quickFilter=ref('all')
const operationsResetKey=ref(0)
const cupos=ref<Array<Record<string,unknown>>>([]), cuposLoading=ref(false), cuposError=ref('')
const fichaOpen=ref(false), fichaLoading=ref(false), fichaError=ref(''), ficha=ref<Record<string,any>|null>(null), fichaRow=ref<CanonicalRevisadoRow|null>(null)
const incidentBusy=ref(false), incidentType=ref(''), incidentCustom=ref(''), incidentNote=ref('')
const manualPlate=ref(''), manualBusy=ref(false), manualState=ref('Listo para consultar'), manualResult=ref<Record<string,any>|null>(null)
const syncBusy=ref(false), syncState=ref('Listo para actualizar'), syncProgress=ref({procesadas:0,total:0,nuevos:0,fichas_ok:0})
const boletaBusy=ref(false), boletaState=ref('Listo para actualizar'), boletaProgress=ref({procesadas:0,total:0}), boletaCompanies=ref<Array<Record<string,any>>>([]), boletaFilter=ref('TODAS')
const dailyRecipients=ref<Array<Record<string,any>>>([]), dailyRecipientsLoading=ref(false), dailyRecipientsError=ref(''), dailySearch=ref(''), dailySelected=ref<string[]>([]), dailyManualEmail=ref(''), dailySending=ref(false), dailySendState=ref(''), dailyPreview=ref(false)
const canOperate=computed(()=>Boolean(data.value?.profile?.can?.operations))
const isAdminTotal=computed(()=>String(profile.value.rol||'').trim().toUpperCase()==='ADMIN_TOTAL')
const dailyPendingGroups=computed(()=>{const map=new Map<string,CanonicalRevisadoRow[]>();for(const r of pending.value){const g=text(r.galera)==='—'?'OTROS':text(r.galera);if(!map.has(g))map.set(g,[]);map.get(g)!.push(r)}return [...map.entries()].map(([galera,rows])=>({galera,rows})).sort((a,b)=>b.rows.length-a.rows.length||a.galera.localeCompare(b.galera,'es'))})
const filteredDailyRecipients=computed(()=>{const q=dailySearch.value.trim().toLowerCase();if(!q)return dailyRecipients.value;return dailyRecipients.value.filter(r=>[r.nombre,r.email,r.tipo,r.galera].some(x=>String(x||'').toLowerCase().includes(q)))})
const filteredBoletaCompanies=computed(()=>boletaCompanies.value.filter(g=>boletaFilter.value==='TODAS'||boletaCompanyResult(g)===boletaFilter.value))
const incidentTypes=computed(()=>Array.isArray(data.value?.incident_types)?data.value?.incident_types as Array<Record<string,any>>:[])
const incidents=computed(()=>Array.isArray(data.value?.incidents)?data.value?.incidents as Array<Record<string,any>>:[])
const fichaOpenIncidents=computed(()=>{const id=ficha.value?.unidad?.id;if(id==null)return [];return incidents.value.filter(i=>String(i.unidad_id)===String(id)&&String(i.estado)==='ABIERTA')})
function text(v:unknown){return String(v??'—')}
function num(v:unknown){return new Intl.NumberFormat('es-PA').format(Number(v)||0)}
function date(v:unknown){try{return v?new Intl.DateTimeFormat('es-PA',{dateStyle:'medium'}).format(new Date(String(v))):'—'}catch{return text(v)}}
function share(v:unknown){return metrics.value.total?Math.max(0,Math.min(100,Number(v||0)*100/metrics.value.total)):0}
function state(r:CanonicalRevisadoRow){return r.emitido?'Vigente':r.requiere_atencion?'Pendiente':'Sin ciclo'}
function status(r:CanonicalRevisadoRow){return r.bloqueado?'Bloqueo real':String(r.pendiente_tipo||r.status2||state(r))}
const visibleRows=computed(()=>rawRows.value.filter(r=>{
  const q=String(filters.value.search||'').trim().toLowerCase()
  const matchesSearch=!q||[r.unidad,r.placa,r.empresa,r.supervisora,r.status2,r.pendiente_tipo].some(x=>String(x||'').toLowerCase().includes(q))
  const p=String(r.pendiente_tipo||r.status2||'').toUpperCase()
  const cupo=String(r.cupo_ecarcheck||r.cupo_control||'').trim().toUpperCase()
  const quick=quickFilter.value==='all'
    ||(quickFilter.value==='vigente'&&Boolean(r.emitido))
    ||(quickFilter.value==='pendiente'&&!r.emitido&&!p.includes('COLOR')&&!r.bloqueado)
    ||(quickFilter.value==='color'&&p.includes('COLOR'))
    ||(quickFilter.value==='boleta'&&Boolean(r.boleta_empresa||r.boleta_pendiente))
    ||(quickFilter.value==='cupo'&&(!cupo||['NO APLICA','N/A','NA','SIN CUPO'].includes(cupo)))
  return matchesSearch&&quick&&(!selectedGalera.value||text(r.galera)===selectedGalera.value)&&(!selectedStatus.value||text(r.status2)===selectedStatus.value)
}))
function vehicleStateTone(r:CanonicalRevisadoRow){if(r.bloqueado)return'incident';const p=String(r.pendiente_tipo||r.status2||'').toUpperCase();if(p.includes('COLOR'))return'color';return'pending'}
function vehicleStateLabel(r:CanonicalRevisadoRow){if(r.bloqueado)return'Incidencia';const p=String(r.pendiente_tipo||r.status2||'').trim();return p||'Pendiente'}
function vehicleModel(r:CanonicalRevisadoRow){return [r.marca,r.modelo].filter(Boolean).join(' ')||String(r.empresa||'Vehículo RYM')}
function vehicleSignals(r:CanonicalRevisadoRow){
  const out:{label:string,tone:string}[]=[]
  if(r.boleta_empresa)out.push({label:'Boleta empresa',tone:'bad'})
  else if(r.boleta_pendiente)out.push({label:'Boleta placa',tone:'bad'})
  else out.push({label:'Sin boleta',tone:'ok'})
  const colorDiff=Boolean(r.ficha_ecarcheck_at&&r.color_control&&r.color_ecarcheck&&String(r.color_control).trim().toUpperCase()!==String(r.color_ecarcheck).trim().toUpperCase())
  out.push({label:colorDiff?'Color difiere':'Color OK',tone:colorDiff?'warn':'ok'})
  const cupo=String(r.cupo_ecarcheck||r.cupo_control||'').trim().toUpperCase()
  out.push({label:!cupo||['NO APLICA','N/A','NA','SIN CUPO'].includes(cupo)?'Sin cupo':'Cupo OK',tone:!cupo||['NO APLICA','N/A','NA','SIN CUPO'].includes(cupo)?'warn':'info'})
  return out.slice(0,3)
}
function clearAllFilters(){
  clearFilters()
  selectedGalera.value=''
  selectedStatus.value=''
  quickFilter.value='all'
  operationsResetKey.value++
}
function navIcon(id:string){return ({dashboard:'dashboard',monthly:'fact_check',operations:'table_chart',daily:'description',history:'history',stats:'policy',boletas:'gavel',cupos:'confirmation_number'} as Record<string,string>)[id]||'circle'}
function navLabel(id:string,label:string){return ({dashboard:'Dashboard',monthly:'Avance mensual',operations:'Operaciones',history:'Historial',stats:'Estadísticas',boletas:'Boletas',cupos:'Cupos',daily:'Reporte diario'} as Record<string,string>)[id]||label}
const criticalCount=computed(()=>Number(kpis.value.bloqueadas||kpis.value.pendientes_criticos||metrics.value.incidencias||0))
const boletaCount=computed(()=>Number(kpis.value.con_boleta||kpis.value.con_boleta_empresa||0))
const sinCupoCount=computed(()=>rawRows.value.filter(r=>String(r.cupo_ecarcheck||r.cupo_control||'').trim().toUpperCase()==='SIN CUPO').length)
const quickOps=computed(()=>[
  {key:'all',label:'Todos',value:rawRows.value.length,tone:'blue'},
  {key:'vigente',label:'Vigente',value:metrics.value.vigentes,tone:'green'},
  {key:'pendiente',label:'Pendiente',value:metrics.value.pendientesCiclo,tone:'neutral'},
  {key:'color',label:'Cambio de color',value:metrics.value.cambiosColor,tone:'amber'},
  {key:'boleta',label:'Boleta',value:boletaCount.value,tone:'red'},
  {key:'cupo',label:'Sin cupo',value:sinCupoCount.value,tone:'neutral'},
].filter(x=>x.key==='all'||x.value>0))

const kpis=computed(()=>data.value?.kpis||{})
const coveragePct=computed(()=>metrics.value.total?Math.round(metrics.value.vigentes*100/metrics.value.total):0)
const focusRows=computed(()=>[...pending.value].sort((a,b)=>Number(Boolean(b.bloqueado))-Number(Boolean(a.bloqueado))).slice(0,4))
const attentionItems=computed(()=>[
  {label:'Pendientes de ciclo',value:metrics.value.pendientesCiclo,tone:'blue'},
  {label:'Cambio de color',value:metrics.value.cambiosColor,tone:'amber'},
  {label:'Alertas reales',value:metrics.value.incidencias,tone:'red'},
  {label:'Sin fotos',value:Number(kpis.value.sin_fotos||0),tone:'neutral'},
  {label:'Boletas',value:Number(kpis.value.con_boleta||kpis.value.con_boleta_empresa||0),tone:'red'},
].filter(x=>x.value>0))
const taxiCount=computed(()=>rawRows.value.filter(r=>(r.incidencias_abiertas||[]).some(i=>String(i.tipo_codigo||'').toUpperCase()==='CAMBIO_COLOR_REVISADO_TAXI')).length)
const hero=computed(()=>{
  const pendingCount=metrics.value.pendientesCiclo
  const alerts=metrics.value.incidencias
  if(!pendingCount)return {title:'Todo al día',detail:alerts?`${alerts} alerta${alerts===1?'':'s'} requiere${alerts===1?'':'n'} revisión.`:'Sin pendientes ni alertas detectadas.',action:'history',label:'Ver detalle'}
  return {title:`${pendingCount} unidades necesitan atención`,detail:`${metrics.value.vigentes} unidades están al día dentro de tu alcance.`,action:'operations',label:'Atender pendientes'}
})
const galeras=computed(()=>[...new Set(rawRows.value.map(r=>text(r.galera)).filter(x=>x!=='—'))].sort())
const statuses=computed(()=>[...new Set(pending.value.map(r=>text(r.status2)).filter(x=>x!=='—'))].sort())
async function load(force=false){loading.value=true;error.value='';try{const response=await revisadosService.load(force);data.value=response;records.value=await revisadosService.list(response);profile.value={nombre:response.profile?.nombre||'Portal RYM',rol:response.profile?.rol||'',scope_label:response.profile?.scope_label||''};navItems.value=revisadosService.context().tabs; if(!navItems.value.some(x=>x.id===active.value))active.value='dashboard'}catch(e){error.value=e instanceof Error?e.message:String(e)}finally{loading.value=false}}
async function loadCupos(){if(cupos.value.length||cuposLoading.value)return;cuposLoading.value=true;cuposError.value='';try{const result=await revisadosService.request('/rest/v1/revisados_compras_cupos?select=id_pago,tipo_comprado,cantidad,monto,estado,fecha_compra_local,comprado_por,taller,metodo&order=fecha_compra_local.desc&limit=100');cupos.value=Array.isArray(result)?result as Array<Record<string,unknown>>:[]}catch(e){cuposError.value=e instanceof Error?e.message:String(e)}finally{cuposLoading.value=false}}
function open(id:string){if(!navItems.value.some(x=>x.id===id))return;if(id==='dashboard')clearFilters();active.value=id;if(id==='cupos')void loadCupos();if(id==='daily'&&isAdminTotal.value)void prepareDailyMail();if(id==='boletas')void resumeBoletasV2()}
function copyPending(){navigator.clipboard?.writeText(visibleRows.value.map(r=>[r.unidad,r.placa,r.galera,r.supervisora,status(r)].join(' | ')).join('\n'))}
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))
async function openFicha(r:CanonicalRevisadoRow){fichaOpen.value=true;fichaLoading.value=true;fichaError.value='';ficha.value=null;fichaRow.value=r;incidentType.value='';incidentCustom.value='';incidentNote.value='';try{const x=await revisadosService.ficha(text(r.placa)==='—'?'':text(r.placa),text(r.unidad)==='—'?'':text(r.unidad));if(!x?.ok)throw new Error(String(x?.error||'No se pudo cargar la ficha'));ficha.value=x}catch(e){fichaError.value=e instanceof Error?e.message:String(e)}finally{fichaLoading.value=false}}
function closeFicha(){fichaOpen.value=false;ficha.value=null;fichaRow.value=null;fichaError.value=''}
async function saveIncident(){const unidadId=ficha.value?.unidad?.id??fichaRow.value?.unidad_id;if(!unidadId||!incidentType.value||incidentBusy.value)return;incidentBusy.value=true;try{const x=await revisadosService.crearIncidencia({unidad_id:unidadId,tipo_codigo:incidentType.value,tipo_personalizado:incidentCustom.value,nota:incidentNote.value});if(!x?.ok)throw new Error(String(x?.error||'No se pudo guardar la incidencia'));const current=fichaRow.value;await load(true);if(current)await openFicha(current)}catch(e){fichaError.value=e instanceof Error?e.message:String(e)}finally{incidentBusy.value=false}}
async function refreshAfterManualLookup(){
  try{
    const response=await revisadosService.load(true)
    data.value=response
    records.value=await revisadosService.list(response)
    profile.value={nombre:response.profile?.nombre||'Portal RYM',rol:response.profile?.rol||'',scope_label:response.profile?.scope_label||''}
    navItems.value=revisadosService.context().tabs
  }catch(e){
    console.warn('No se pudo refrescar Revisados después de la consulta eCarCheck',e)
  }
}
async function runManualEcarcheck(){const placa=manualPlate.value.trim().toUpperCase().replace(/\s+/g,'');if(!/^[A-Z0-9-]{3,12}$/.test(placa)||manualBusy.value)return;manualBusy.value=true;manualResult.value=null;manualState.value='Encolando consulta…';try{const started=await revisadosService.iniciarConsultaEcarcheck(placa);if(!started?.ok||!started?.queue_id)throw new Error(String(started?.error||'No se pudo iniciar la consulta'));for(let i=0;i<45;i++){const d=await revisadosService.estadoConsultaEcarcheck(String(started.queue_id));if(!d?.ok)throw new Error(String(d?.error||'No se pudo consultar el estado'));const st=String(d?.queue?.estado||'').toUpperCase();manualState.value=st==='PENDIENTE'?'Esperando puente V2…':st==='PROCESANDO'?'Consultando eCarCheck V2…':st==='BLOQUEADO'?'Procesando resultado…':st||'Procesando…';if(d.done){const result=d?.result||{};const http=Number(result?.status||0);const detail=String(result?.detalle||'').toUpperCase();if(http>=500||detail.includes('INTERMITEN'))manualState.value='Servicio ATTT no disponible · reintentar';else if(http===200)manualState.value='Consulta completada';else manualState.value='Resultado recibido';manualResult.value=d;void refreshAfterManualLookup();return}await wait(2000)}throw new Error('La consulta sigue pendiente; verifica que el puente V2 esté conectado.')}catch(e){manualState.value=e instanceof Error?e.message:String(e)}finally{manualBusy.value=false}}
async function runSyncEcarcheck(){if(syncBusy.value||!confirm('¿Actualizar los últimos revisados usando eCarCheck V2?'))return;syncBusy.value=true;syncState.value='Solicitando listado V2…';syncProgress.value={procesadas:0,total:0,nuevos:0,fichas_ok:0};try{const started=await revisadosService.iniciarSyncEcarcheck();if(!started?.ok||!started?.run_id)throw new Error(String(started?.error||'No se pudo iniciar la actualización'));for(let i=0;i<120;i++){const d=await revisadosService.estadoSyncEcarcheck(String(started.run_id));if(!d?.ok)throw new Error(String(d?.error||'No se pudo consultar el estado'));syncProgress.value={procesadas:Number(d.procesadas||0),total:Number(d.total||0),nuevos:Number(d.nuevos||0),fichas_ok:Number(d.fichas_ok||0)};syncState.value=String(d.estado)==='ESPERANDO_LISTADO'?'Esperando puente V2…':`V2 · ${syncProgress.value.procesadas}/${syncProgress.value.total} · ${syncProgress.value.nuevos} nuevos`;if(d.done){syncState.value=`Listo V2 · ${syncProgress.value.nuevos} nuevos · ${syncProgress.value.fichas_ok} fichas`;await load(true);return}await wait(2500)}throw new Error('La actualización continúa pendiente.')}catch(e){syncState.value=e instanceof Error?e.message:String(e)}finally{syncBusy.value=false}}

function boletaCompanyResult(g:Record<string,any>){const checks=Array.isArray(g.checks)?g.checks:[];return checks.some((x:Record<string,any>)=>Number(x.ena||0)>0||Number(x.documento||0)>0||Number(x.placa_boleta||0)>0)?'CON BOLETA':'SIN BOLETA'}
async function pollBoletasV2(runId:string){if(boletaBusy.value)return;boletaBusy.value=true;localStorage.setItem('rym_v166_boletas_run',runId);try{for(let i=0;i<120;i++){const d=await revisadosService.estadoBoletasV2(runId);if(!d?.ok)throw new Error(String(d?.error||'Error consultando lote V2'));boletaProgress.value={procesadas:Number(d.procesadas||0),total:Number(d.total||0)};boletaCompanies.value=Array.isArray(d.companies)?d.companies:[];boletaState.value=`${boletaProgress.value.procesadas}/${boletaProgress.value.total} procesadas`;if(d.done){boletaState.value=`Finalizado · ${boletaProgress.value.procesadas}/${boletaProgress.value.total}`;localStorage.removeItem('rym_v166_boletas_run');await load(true);return}await wait(2500)}throw new Error('El lote continúa en proceso.')}catch(e){boletaState.value=e instanceof Error?e.message:String(e)}finally{boletaBusy.value=false}}
async function runBoletasV2(){if(boletaBusy.value||!confirm('¿Consultar 2 placas activas de cada empresa usando eCarCheck V2?'))return;boletaState.value='Creando lote…';try{const d=await revisadosService.iniciarBoletasV2();if(!d?.ok||!d?.run_id)throw new Error(String(d?.error||'No se pudo iniciar'));await pollBoletasV2(String(d.run_id))}catch(e){boletaState.value=e instanceof Error?e.message:String(e)}}
async function resumeBoletasV2(){if(boletaBusy.value)return;const runId=localStorage.getItem('rym_v166_boletas_run');if(runId)await pollBoletasV2(runId)}
async function prepareDailyMail(){if(!isAdminTotal.value||dailyRecipientsLoading.value||dailyRecipients.value.length)return;dailyRecipientsLoading.value=true;dailyRecipientsError.value='';try{const [rec,fresh]=await Promise.all([revisadosService.destinatariosReporteDiario(),revisadosService.emitidosHoy().catch(()=>null)]);if(!rec?.ok)throw new Error(String(rec?.error||'No se pudieron cargar los correos'));dailyRecipients.value=Array.isArray(rec.recipients)?rec.recipients:[];if(fresh&&data.value)data.value.emitidos_hoy=fresh}catch(e){dailyRecipientsError.value=e instanceof Error?e.message:String(e)}finally{dailyRecipientsLoading.value=false}}
function toggleDailyEmail(email:string){const e=email.trim().toLowerCase();if(!e)return;dailySelected.value=dailySelected.value.includes(e)?dailySelected.value.filter(x=>x!==e):[...dailySelected.value,e]}
function selectVisibleDaily(){const emails=filteredDailyRecipients.value.map(r=>String(r.email||'').trim().toLowerCase()).filter(Boolean);dailySelected.value=[...new Set([...dailySelected.value,...emails])]}
function clearDailySelected(){dailySelected.value=[]}
function addManualDailyEmail(){const email=dailyManualEmail.value.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){dailySendState.value='Correo manual inválido';return}if(!dailyRecipients.value.some(r=>String(r.email||'').toLowerCase()===email))dailyRecipients.value=[{nombre:'Correo manual',email,tipo:'MANUAL'},...dailyRecipients.value];if(!dailySelected.value.includes(email))dailySelected.value=[...dailySelected.value,email];dailyManualEmail.value='';dailySendState.value=''}
async function sendDailyReport(){if(!isAdminTotal.value||dailySending.value)return;if(!dailySelected.value.length){dailySendState.value='Selecciona al menos un destinatario';return}if(!confirm(`¿Enviar reporte diario a ${dailySelected.value.length} destinatario(s)?\n\n${emitted.value.length} emitidos hoy\n${pending.value.length} pendientes`))return;dailySending.value=true;dailySendState.value='Enviando reporte…';try{const d=await revisadosService.enviarReporteDiario(dailySelected.value);if(!d?.ok)throw new Error(String(d?.error||'No se pudo enviar'));dailySendState.value=`Reporte enviado a ${Array.isArray(d.to)?d.to.length:dailySelected.value.length} destinatario(s)`}catch(e){dailySendState.value=e instanceof Error?e.message:String(e)}finally{dailySending.value=false}}
function dailyWhatsAppText(){const byGal=[...dailyPendingGroups.value].map(g=>`• ${g.galera}: ${g.rows.length}`).join('\n')||'• Sin pendientes';return [`*Revisados emitidos hoy*`,`Emitidos: ${emitted.value.length}`,`Pendientes: ${pending.value.length}`,'',`*Pendientes por galera:*`,byGal].join('\n')}
async function copyDailyWhatsApp(){const t=dailyWhatsAppText();try{await navigator.clipboard?.writeText(t);dailySendState.value='Resumen copiado para WhatsApp'}catch{dailySendState.value='No se pudo copiar el resumen'}}
onMounted(()=>load())
</script>

<template>
<main class="rym-revisados-vue" data-ui-source="portal-rym-main-contract">
  <aside class="rv-side">
    <div class="rv-brand-dark">
      <div class="rv-brand-mark"><RymIcon name="verified_user"/></div>
      <div class="rv-brand-copy"><b>Revisados RYM</b><small>Control legal vehicular</small></div>
      <span class="rv-version">{{num(metrics.total)}}</span>
    </div>
    <div class="rv-nav-label">MÓDULO REVISADOS</div>
    <nav>
      <button v-for="item in navItems" :key="item.id" :class="{active:active===item.id}" @click="open(item.id)">
        <RymIcon :name="navIcon(item.id)" :size="17"/>
        <em>{{navLabel(item.id,item.label)}}</em>
      </button>
    </nav>
    <div class="rv-side-profile">
      <span>{{profile.nombre}}</span><b>{{profile.rol}}</b><small>{{profile.scope_label}}</small>
    </div>
    <button class="rv-back" @click="revisadosService.back()">← Volver al Portal</button>
  </aside>
  <section class="rv-main"><header class="rv-topbar">
      <div class="rv-page-heading">
        <small>REVISADOS RYM</small>
        <h1>{{navLabel(active, active)}}</h1>
        <span>Control legal vehicular · datos operativos en tiempo real</span>
      </div>
      <div class="rv-top-actions">
        <button class="ghost" @click="clearAllFilters">Limpiar filtros</button>
        <button class="primary" :disabled="loading" @click="load(true)">{{loading?'Actualizando…':'Actualizar vista'}}</button>
      </div>
    </header>
    <div v-if="loading" class="rv-state">Cargando datos reales de Revisados…</div><div v-else-if="error" class="rv-state error"><b>No fue posible cargar Revisados.</b><span>{{error}}</span><button class="primary" @click="load(true)">Reintentar</button></div>
    <template v-else>
      <section v-if="active==='dashboard'" class="rv-stack rv-stitch-dashboard">
        <div class="rv-module-strip">
          <div><span>REVISADOS · CONTROL LEGAL</span><b>{{hero.title}}</b><small>{{hero.detail}}</small></div>
          <div class="rv-module-actions"><button class="primary" @click="open(hero.action)">{{hero.label}}</button><button v-if="criticalCount" class="ghost" @click="open(canOperate?'operations':'history')">Revisar alertas</button></div>
        </div>

        <section class="rv-global-control">
          <div class="rv-global-head rv-global-head-compact">
            <div><span>ESTADO ACTUAL</span><strong>{{num(metrics.total)}}</strong><em>unidades visibles · {{coveragePct}}% al día</em></div>
          </div>
          <div class="rv-kpi-deck">
            <article data-tone="green"><header><span>AL DÍA</span><RymIcon name="verified"/></header><b>{{num(metrics.vigentes)}}</b><small>{{coveragePct}}% del padrón visible</small></article>
            <article data-tone="blue"><header><span>PENDIENTES</span><RymIcon name="schedule"/></header><b>{{num(metrics.pendientesCiclo)}}</b><small>Requieren gestión del ciclo</small></article>
            <article data-tone="amber"><header><span>CAMBIO DE COLOR</span><RymIcon name="palette"/></header><b>{{num(metrics.cambiosColor)}}</b><small>Requieren nuevo revisado</small></article>
            <article data-tone="red"><header><span>ALERTAS REALES</span><RymIcon name="gavel"/></header><b>{{num(criticalCount)}}</b><small>Impedimentos que requieren acción</small></article>
            <article v-if="taxiCount" data-tone="amber"><header><span>PENDIENTE REVISADO TAXI</span><RymIcon name="schedule"/></header><b>{{num(taxiCount)}}</b><small>Cambio a amarillo</small></article>
            <article data-tone="neutral"><header><span>SIN FOTOS</span><RymIcon name="image"/></header><b>{{num(kpis.sin_fotos)}}</b><small>Unidades sin evidencia fotográfica</small></article>
            <article data-tone="blue"><header><span>EMITIDOS HOY</span><RymIcon name="verified"/></header><b>{{num(emittedToday?.emitidos)}}</b><small>{{isAdminTotal?'de '+num(emittedToday?.limite)+' cupos diarios':'Dentro de tu alcance'}}</small></article>
          </div>
        </section>

        <GaleraComparison :rows="records"/>

        <div class="rv-dashboard-lower">
          <section class="rv-focus-panel">
            <div class="rv-panel-title"><div><span>QUÉ ATENDER PRIMERO</span><h3>Pendientes con mayor prioridad</h3></div><button type="button" @click="open('operations')">Abrir Operaciones →</button></div>
            <div class="rv-focus-grid"><VehicleBadge v-for="r in focusRows" :key="String(r.unidad_id||r.placa||r.unidad)" :row="r" compact @open="openFicha"/></div>
          </section>
          <section class="rv-cycle-panel">
            <div class="rv-panel-title"><div><span>AVANCE POR MES</span><h3>Cobertura por ciclo</h3></div><button type="button" @click="open('monthly')">Ver completo →</button></div>
            <article v-for="m in monthly.slice(0,4)" :key="String(m.mes_num)">
              <div><b>{{m.mes_nombre||('Mes '+m.mes_num)}}</b><span>{{num(m.cubiertas)}} / {{num(m.total||m.activas)}} al día</span></div>
              <div class="rv-cycle-bar"><i :style="{width:(Number(m.total||m.activas)?Math.round(Number(m.cubiertas||0)*100/Number(m.total||m.activas)):0)+'%'}"></i></div>
              <strong>{{Number(m.total||m.activas)?Math.round(Number(m.cubiertas||0)*100/Number(m.total||m.activas)):0}}%</strong>
            </article>
          </section>
        </div>

      </section>
      <OperationsView
        v-else-if="active==='operations'"
        :rows="pending"
        :total-fleet="rawRows.length"
        :up-to-date="metrics.vigentes"
        :sync-busy="syncBusy"
        :sync-state="syncState"
        :manual-plate="manualPlate"
        :manual-busy="manualBusy"
        :manual-state="manualState"
        :manual-result="manualResult"
        :reset-key="operationsResetKey"
        @manual-plate-change="manualPlate=$event"
        @sync="runSyncEcarcheck"
        @lookup="runManualEcarcheck"
        @open="openFicha"
      />
      <section v-else-if="active==='monthly'" class="rv-stack rv-monthly">
        <div class="rv-monthly-head"><div><span class="rv-module-pill">AVANCE MENSUAL</span><h2>Cobertura por ciclo y galera</h2><p>Datos canónicos de Revisados dentro de tu alcance.</p></div><div class="rv-monthly-actions"><button class="ghost" :disabled="syncBusy" @click="runSyncEcarcheck"><RymIcon name="sync" :size="15"/>{{syncBusy?'Sincronizando…':'Actualizar eCarCheck'}}</button><div class="rv-monthly-total"><b>{{num(metrics.pendientesCiclo)}}</b><span>pendientes actuales</span></div></div></div>
        <div class="rv-cycle-grid">
          <article v-for="m in monthly.filter(x=>Number(x.pendientes||0)||Number(x.cubiertas||0))" :key="String(m.mes_num)">
            <header><div><span>CICLO OPERATIVO</span><h3>{{m.mes_nombre||('Mes '+m.mes_num)}}</h3></div><b>{{Number(m.total||m.activas)?Math.round(Number(m.cubiertas||0)*100/Number(m.total||m.activas)):0}}%</b></header>
            <div class="rv-cycle-bigbar"><i :style="{width:(Number(m.total||m.activas)?Math.round(Number(m.cubiertas||0)*100/Number(m.total||m.activas)):0)+'%'}"></i></div>
            <div class="rv-cycle-stats"><span><b>{{num(m.cubiertas)}}</b> al día</span><span><b>{{num(m.pendientes)}}</b> pendientes</span><span><b>{{num(m.total||m.activas)}}</b> total</span></div>
          </article>
        </div>
        <section class="rv-monthly-table"><div class="rv-panel-title"><div><span>MATRIZ POR GALERA</span><h3>Avance y pendientes</h3></div><small>{{gallery.length}} galeras</small></div><div class="rv-table"><table><thead><tr><th>Galera</th><th>Total</th><th>Al día</th><th>Pendientes</th><th>Cobertura</th></tr></thead><tbody><tr v-for="g in gallery" :key="String(g.galera)"><td><b>{{g.galera}}</b></td><td>{{num(g.total)}}</td><td>{{num(g.cubiertas)}}</td><td>{{num(g.pendientes)}}</td><td><div class="rv-mini-meter"><i :style="{width:(Number(g.total)?Math.round(Number(g.cubiertas||0)*100/Number(g.total)):0)+'%'}"></i></div><b>{{Number(g.total)?Math.round(Number(g.cubiertas||0)*100/Number(g.total)):0}}%</b></td></tr></tbody></table></div></section>
      </section>
      <section v-else-if="active==='daily'" class="rv-stack">
        <div class="rv-grid"><article class="rv-card"><b>Emitidos hoy</b><strong>{{num(emitted.length)}}</strong></article><article class="rv-card"><b>Pendientes</b><strong>{{num(pending.length)}}</strong></article><article class="rv-card"><b>Galera con más pendientes</b><strong>{{dailyPendingGroups[0]?.galera||'—'}}</strong><span>{{dailyPendingGroups[0]?num(dailyPendingGroups[0].rows.length)+' pendientes':'Sin pendientes'}}</span></article></div>
        <div class="rv-daily-layout">
          <div class="rv-stack">
            <section><h3>Emitidos hoy</h3><div class="rv-table"><table><thead><tr><th>Unidad</th><th>Placa</th><th>Galera</th><th>Empresa</th><th>Último revisado</th></tr></thead><tbody><tr v-for="r in emitted" :key="String(r.unidad_id||r.placa)"><td>{{r.unidad}}</td><td>{{r.placa}}</td><td>{{r.galera}}</td><td>{{r.empresa}}</td><td>{{date(r.ultimo_revisado)}}</td></tr></tbody></table></div></section>
            <section><h3>Pendientes por galera</h3><div class="rv-daily-groups"><article v-for="g in dailyPendingGroups" :key="g.galera"><header><b>{{g.galera}}</b><span>{{num(g.rows.length)}} pendientes</span></header><div class="rv-daily-units">{{g.rows.slice(0,12).map(r=>r.unidad||r.placa).join(' · ')}}<span v-if="g.rows.length>12"> · +{{g.rows.length-12}}</span></div></article></div></section>
          </div>
          <aside v-if="isAdminTotal" class="rv-mailer">
            <header><div><h3>Enviar reporte diario</h3><p>Destinatarios autorizados + correos manuales.</p></div><button class="ghost" @click="copyDailyWhatsApp">Copiar WhatsApp</button></header>
            <div class="rv-mail-from"><span>Remitente</span><b>panapassrym@gmail.com</b></div>
            <input v-model="dailySearch" class="rv-mail-search" placeholder="Buscar nombre, correo, rol o galera">
            <div class="rv-mail-actions"><button class="ghost" @click="selectVisibleDaily">Seleccionar visibles</button><button class="ghost" @click="clearDailySelected">Limpiar</button></div>
            <div v-if="dailyRecipientsLoading" class="rv-note">Cargando destinatarios…</div><div v-else-if="dailyRecipientsError" class="rv-note danger">{{dailyRecipientsError}}</div>
            <div v-else class="rv-recipient-list"><label v-for="r in filteredDailyRecipients" :key="String(r.email)"><input type="checkbox" :checked="dailySelected.includes(String(r.email||'').toLowerCase())" @change="toggleDailyEmail(String(r.email||''))"><span><b>{{r.nombre||r.email}}</b><small>{{r.email}}<template v-if="r.tipo"> · {{r.tipo}}</template><template v-if="r.galera"> · {{r.galera}}</template></small></span></label></div>
            <div class="rv-mail-manual"><input v-model="dailyManualEmail" type="email" placeholder="Agregar correo manual" @keydown.enter="addManualDailyEmail"><button class="ghost" @click="addManualDailyEmail">Agregar</button></div>
            <div class="rv-mail-selected"><b>{{dailySelected.length}}</b> destinatario(s) seleccionado(s)</div>
            <div class="rv-mail-actions"><button class="ghost" @click="dailyPreview=!dailyPreview">{{dailyPreview?'Ocultar vista previa':'Vista previa'}}</button><button class="primary" :disabled="dailySending||!dailySelected.length" @click="sendDailyReport">{{dailySending?'Enviando…':'Enviar reporte'}}</button></div>
            <div v-if="dailySendState" class="rv-note">{{dailySendState}}</div>
            <div v-if="dailyPreview" class="rv-mail-preview"><b>Vista previa operativa</b><span>{{num(emitted.length)}} emitidos hoy · {{num(pending.length)}} pendientes</span><span v-for="g in dailyPendingGroups" :key="g.galera">{{g.galera}} · {{num(g.rows.length)}} pendientes</span></div>
          </aside>
        </div>
      </section>
      <section v-else-if="active==='history'" class="rv-stack"><RevisadosFilterBar v-model="filters" :galeras="options.galeras" :supervisoras="options.supervisoras"/><RevisadosTable :rows="filtered"/></section>
      <section v-else-if="active==='stats'" class="rv-stack"><div class="rv-grid"><article class="rv-card"><b>Cobertura</b><strong>{{metrics.total?Math.round(metrics.vigentes/metrics.total*100):0}}%</strong></article><article class="rv-card"><b>Alertas reales</b><strong>{{metrics.incidencias}}</strong></article><article class="rv-card"><b>Cambio de color</b><strong>{{metrics.cambiosColor}}</strong></article></div><GaleraComparison :rows="filtered"/></section>
      <section v-else-if="active==='boletas'" class="rv-stack">
        <article class="rv-boleta-tool"><div><b>Actualizar boletas eCarCheck V2</b><span>Valida ENA, documento y placa usando el proceso V2 existente.</span></div><div class="rv-boleta-tool-actions"><span>{{boletaState}}</span><button class="primary" :disabled="boletaBusy" @click="runBoletasV2">{{boletaBusy?'Procesando…':'Actualizar boletas'}}</button></div><div v-if="boletaProgress.total" class="rv-progress"><i :style="{width:Math.min(100,Math.round(boletaProgress.procesadas*100/boletaProgress.total))+'%'}"></i></div></article>
        <section v-if="boletaCompanies.length" class="rv-boleta-results"><div class="rv-mail-actions"><button class="ghost" :class="{selected:boletaFilter==='TODAS'}" @click="boletaFilter='TODAS'">Todas</button><button class="ghost" :class="{selected:boletaFilter==='CON BOLETA'}" @click="boletaFilter='CON BOLETA'">Con boleta</button><button class="ghost" :class="{selected:boletaFilter==='SIN BOLETA'}" @click="boletaFilter='SIN BOLETA'">Sin boleta</button></div><div class="rv-table"><table><thead><tr><th>Empresa</th><th>Galera</th><th>Placas modelo</th><th>Resultado</th></tr></thead><tbody><tr v-for="g in filteredBoletaCompanies" :key="String(g.empresa)+'|'+String(g.galera)"><td>{{g.empresa||'—'}}</td><td>{{g.galera||'—'}}</td><td>{{(g.checks||[]).map((x:any)=>x.placa||'—').join(' · ')}}</td><td><b :class="{danger:boletaCompanyResult(g)==='CON BOLETA'}">{{boletaCompanyResult(g)}}</b></td></tr></tbody></table></div></section>
        <p class="rv-note">Boletas y restricciones persistidas en la fuente canónica.</p><div class="rv-table"><table><thead><tr><th>Unidad</th><th>Placa</th><th>Empresa</th><th>Galera</th><th>Restricción</th></tr></thead><tbody><tr v-for="r in rawRows.filter(x=>Array.isArray(x.alerts)&&x.alerts.length)" :key="String(r.unidad_id||r.placa)"><td>{{r.unidad}}</td><td>{{r.placa}}</td><td>{{r.empresa}}</td><td>{{r.galera}}</td><td>{{(r.alerts||[]).map(x=>x.tipo||x.texto).join(' · ')}}</td></tr></tbody></table></div>
      </section>
      <section v-else class="rv-stack"><div v-if="cuposLoading" class="rv-state">Cargando compras de cupos…</div><div v-else-if="cuposError" class="rv-state error"><b>No fue posible cargar Cupos.</b><span>{{cuposError}}</span></div><template v-else><p class="rv-note">{{num(cupos.length)}} compras visibles de la fuente canónica.</p><div class="rv-table"><table><thead><tr><th>Fecha</th><th>ID</th><th>Tipo</th><th>Cantidad</th><th>Monto</th><th>Estado</th><th>Taller</th><th>Método</th></tr></thead><tbody><tr v-for="c in cupos" :key="String(c.id_pago)"><td>{{date(c.fecha_compra_local)}}</td><td>{{c.id_pago||'—'}}</td><td>{{c.tipo_comprado||'—'}}</td><td>{{num(c.cantidad)}}</td><td>{{c.monto||'—'}}</td><td>{{c.estado||'—'}}</td><td>{{c.taller||'—'}}</td><td>{{c.metodo||'—'}}</td></tr></tbody></table></div></template></section>
    </template>
  </section>
  <div v-if="fichaOpen" class="rv-modal" @click.self="closeFicha">
    <section class="rv-drawer rv-drawer-v2">
      <header class="rv-ficha-hero">
        <button class="rv-close rv-close-v2" type="button" aria-label="Cerrar ficha" @click="closeFicha">×</button>
        <div class="rv-ficha-eyebrow">
          <span class="rv-ficha-icon"><RymIcon name="directions_car" :size="18"/></span>
          <span>FICHA OPERATIVA · ECARCHECK</span>
        </div>
        <div class="rv-ficha-main">
          <div>
            <small>UNIDAD</small>
            <h2>{{ficha?.unidad?.unidad||fichaRow?.unidad||fichaRow?.placa}}</h2>
          </div>
          <div class="rv-ficha-plate">
            <small>PLACA</small>
            <strong>{{ficha?.unidad?.placa_unica||fichaRow?.placa||'—'}}</strong>
          </div>
        </div>
        <div class="rv-ficha-subline">
          <span><RymIcon name="garage_home" :size="14"/>{{ficha?.unidad?.galera||fichaRow?.galera||'Sin galera'}}</span>
          <span><RymIcon name="directions_car" :size="14"/>{{[ficha?.unidad?.marca,ficha?.unidad?.modelo].filter(Boolean).join(' ')||'Ficha vehicular'}}</span>
        </div>
        <div class="rv-ficha-status-row">
          <span class="rv-ficha-state" :data-tone="fichaRow?.emitido?'ok':'attention'">
            {{fichaRow?.emitido?'VIGENTE':'REQUIERE ATENCIÓN'}}
          </span>
          <template v-if="fichaRow">
            <span v-for="signal in vehicleSignals(fichaRow)" :key="signal.label" class="rv-ficha-signal" :data-tone="signal.tone">{{signal.label}}</span>
          </template>
        </div>
      </header>

      <div v-if="fichaLoading" class="rv-state rv-ficha-loading">Cargando ficha guardada en Supabase…</div>
      <div v-else-if="fichaError" class="rv-state error"><b>No fue posible cargar la ficha.</b><span>{{fichaError}}</span></div>

      <template v-else-if="ficha">
        <div v-if="Array.isArray(ficha.diferencias)&&ficha.diferencias.length" class="rv-diffs rv-diffs-v2">
          <div class="rv-section-title">
            <span class="rv-section-icon warn"><RymIcon name="warning" :size="16"/></span>
            <div><small>VALIDACIÓN CRUZADA</small><b>{{ficha.diferencias.length}} diferencia(s) por revisar</b></div>
          </div>
          <div class="rv-diff-list">
            <span v-for="d in ficha.diferencias" :key="String(d.campo)">
              <b>{{d.campo}}</b><em>{{d.control||'—'}}</em><i>→</i><strong>{{d.ecarcheck||'—'}}</strong>
            </span>
          </div>
        </div>

        <section class="rv-ficha-summary">
          <article>
            <span class="rv-summary-icon"><RymIcon name="business" :size="16"/></span>
            <div><small>EMPRESA</small><b>{{ficha.unidad?.empresa_duena||fichaRow?.empresa||'—'}}</b></div>
          </article>
          <article>
            <span class="rv-summary-icon"><RymIcon name="person" :size="16"/></span>
            <div><small>SUPERVISORA</small><b>{{ficha.unidad?.supervisora||fichaRow?.supervisora||'—'}}</b></div>
          </article>
          <article>
            <span class="rv-summary-icon"><RymIcon name="verified" :size="16"/></span>
            <div><small>ESTATUS 2</small><b>{{ficha.logistica?.status2||fichaRow?.status2||'—'}}</b></div>
          </article>
        </section>

        <section class="rv-ficha-card">
          <div class="rv-section-title">
            <span class="rv-section-icon"><RymIcon name="directions_car" :size="17"/></span>
            <div><small>IDENTIDAD VEHICULAR</small><b>Información del vehículo</b></div>
          </div>
          <div class="rv-ficha-facts">
            <article class="wide"><small>Marca / modelo</small><b>{{[ficha.unidad?.marca,ficha.unidad?.modelo].filter(Boolean).join(' ')||'—'}}</b></article>
            <article><small>Color control</small><b>{{ficha.unidad?.color||'—'}}</b></article>
            <article><small>Color eCarCheck</small><b>{{ficha.oficial?.color||'—'}}</b></article>
            <article><small>Cupo control</small><b>{{ficha.unidad?.placa_comercial||'—'}}</b></article>
            <article><small>Cupo eCarCheck</small><b>{{ficha.oficial?.cupo||'—'}}</b></article>
            <article class="wide"><small>VIN</small><b class="mono">{{ficha.oficial?.vin||'—'}}</b></article>
            <article class="wide"><small>Chasis</small><b class="mono">{{ficha.oficial?.chasis||'—'}}</b></article>
            <article class="wide"><small>Motor</small><b class="mono">{{ficha.oficial?.motor||'—'}}</b></article>
          </div>
        </section>

        <section class="rv-ficha-card rv-owner-card">
          <div class="rv-section-title">
            <span class="rv-section-icon owner"><RymIcon name="badge" :size="17"/></span>
            <div><small>TITULAR Y VIGENCIA</small><b>Información oficial eCarCheck</b></div>
          </div>
          <div class="rv-owner-name">
            <small>PROPIETARIO REGISTRAL</small>
            <strong>{{ficha.oficial?.propietario||'—'}}</strong>
          </div>
          <div class="rv-date-grid">
            <article>
              <small>Último revisado</small>
              <b>{{date(ficha.oficial?.fecha_revisado)}}</b>
            </article>
            <article>
              <small>Última verificación</small>
              <b>{{date(ficha.oficial?.actualizado_at)}}</b>
            </article>
          </div>
        </section>


      </template>
    </section>
  </div>
</main>
</template>

<style scoped>
.rym-revisados-vue{min-height:100vh;display:grid;grid-template-columns:240px minmax(0,1fr);background:#f6f8fb;color:#17243a;font:14px Inter,system-ui,sans-serif}.rv-side{min-height:100vh;padding:18px 12px;background:#fff;border-right:1px solid #e5eaf1;display:flex;flex-direction:column}.rv-brand{display:flex;gap:10px;align-items:center;padding:4px 7px 18px}.rv-brand img{width:38px;height:38px;object-fit:contain}.rv-brand b,.rv-user b{display:block}.rv-brand small,.rv-user span,.rv-user small{display:block;color:#718097;font-size:11px;margin-top:3px}.rv-user{padding:12px;background:#f6f9fd;border:1px solid #e2e8f1;border-radius:11px;margin-bottom:16px}nav{display:grid;gap:4px}nav button,.rv-back{border:0;background:transparent;text-align:left;padding:11px;border-radius:9px;color:#52627a;font-weight:700}nav button i{display:inline-block;width:23px;font-style:normal}nav button.active{background:#eaf3ff;color:#0062ff}.rv-back{margin-top:auto;border-top:1px solid #e5eaf1;border-radius:0}.rv-main{padding:28px;min-width:0}.rv-main>header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:22px}.rv-main h1,.rv-main h2{margin:4px 0}.rv-main header small,.rv-intro span{font-size:10px;letter-spacing:.1em;color:#0062ff;font-weight:800}.primary,.ghost{border-radius:8px;padding:9px 12px;font-weight:800;border:1px solid #d5deeb;background:#fff;color:#31425c}.primary{background:#0062ff;color:#fff;border-color:#0062ff}.rv-stack{display:grid;gap:14px}.rv-intro,.rv-card,.rv-table,.rv-state,.rv-note,.rv-filters{background:#fff;border:1px solid #e1e7ef;border-radius:12px;padding:16px}.rv-intro p{color:#67768b;margin:5px 0 0}.rv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.rv-card{display:grid;gap:7px}.rv-card strong{font-size:25px}.rv-card span,.rv-note{color:#68788d}.rv-filters{display:flex;gap:8px;flex-wrap:wrap}.rv-filters input,.rv-filters select{padding:9px;border:1px solid #d5deeb;border-radius:8px}.rv-filters input{min-width:220px}.rv-table{overflow:auto;padding:0}.rv-table table{border-collapse:collapse;width:100%;min-width:760px}.rv-table th,.rv-table td{padding:11px;border-bottom:1px solid #edf0f4;text-align:left;font-size:12px}.rv-table th{color:#617187;background:#fafbfd}.rv-table tbody tr{cursor:default}.mini{border:1px solid #d5deeb;background:#fff;color:#24548c;border-radius:7px;padding:6px 9px;font-weight:800;cursor:pointer}.rv-op-tools{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.rv-tool-card{display:grid;gap:10px;padding:15px;border:1px solid #dce5f0;border-radius:12px;background:#fff}.rv-tool-card>div:first-child{display:grid;gap:3px}.rv-tool-card span,.rv-tool-card small{color:#6d7d91;font-size:11px}.rv-inline{display:flex;gap:8px}.rv-inline input{min-width:0;flex:1;padding:9px;border:1px solid #d5deeb;border-radius:8px}.rv-progress{height:7px;border-radius:99px;background:#eaf0f6;overflow:hidden}.rv-progress i{display:block;height:100%;background:#0062ff}.rv-manual-result{display:grid;gap:4px;padding:10px;border-radius:9px;background:#f5f9ff}.rv-modal{position:fixed;inset:0;z-index:2000;display:flex;justify-content:flex-end;background:rgba(15,29,48,.32)}.rv-drawer{width:min(560px,96vw);height:100vh;overflow:auto;background:#fff;box-shadow:-20px 0 50px rgba(19,35,58,.18);padding:20px;display:grid;align-content:start;gap:14px}.rv-drawer>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid #e5eaf1;padding-bottom:14px}.rv-drawer header small{font-size:9px;letter-spacing:.1em;color:#0062ff;font-weight:900}.rv-drawer header h2{margin:3px 0;font-size:26px}.rv-drawer header span{color:#718097;font-size:12px}.rv-close{border:0;background:#f1f4f8;width:36px;height:36px;border-radius:9px;font-size:22px;cursor:pointer}.rv-source-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rv-source-grid article,.rv-incident,.rv-diffs{border:1px solid #e1e7ef;border-radius:11px;padding:13px;background:#fff}.rv-source-grid h3,.rv-incident h3{margin:0 0 10px;font-size:14px}.rv-source-grid dl{display:grid;grid-template-columns:120px 1fr;gap:7px;margin:0}.rv-source-grid dt{color:#718097;font-size:11px}.rv-source-grid dd{margin:0;font-weight:700;font-size:11px;overflow-wrap:anywhere}.rv-diffs{display:grid;gap:5px;background:#fff8e8;border-color:#efdca8}.rv-diffs span{font-size:11px;color:#765a15}.rv-incident{display:grid;gap:10px}.rv-incident p{margin:3px 0 0;color:#718097;font-size:11px}.rv-inc-list{display:grid;gap:6px}.rv-inc-list span{padding:8px;border-radius:8px;background:#fff3f2;color:#92372e;font-size:11px}.rv-incident-form{display:grid;gap:8px}.rv-incident-form select,.rv-incident-form input,.rv-incident-form textarea{width:100%;padding:9px;border:1px solid #d5deeb;border-radius:8px;font:inherit}.rv-daily-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(320px,.7fr);gap:14px;align-items:start}.rv-daily-groups{display:grid;gap:8px}.rv-daily-groups article{padding:12px;border:1px solid #e1e7ef;border-radius:10px;background:#fff}.rv-daily-groups header{display:flex;justify-content:space-between;gap:10px}.rv-daily-groups header span,.rv-daily-units{color:#718097;font-size:11px}.rv-daily-units{margin-top:6px;line-height:1.45}.rv-mailer{position:sticky;top:18px;display:grid;gap:10px;padding:15px;background:#fff;border:1px solid #dce5f0;border-radius:12px}.rv-mailer>header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.rv-mailer h3{margin:0}.rv-mailer p{margin:3px 0 0;color:#718097;font-size:11px}.rv-mail-from{display:grid;gap:3px;padding:9px;border-radius:8px;background:#f6f9fd}.rv-mail-from span{font-size:10px;color:#718097}.rv-mail-search,.rv-mail-manual input{padding:9px;border:1px solid #d5deeb;border-radius:8px;min-width:0}.rv-mail-actions,.rv-mail-manual{display:flex;gap:7px;flex-wrap:wrap}.rv-mail-manual input{flex:1}.rv-recipient-list{display:grid;gap:6px;max-height:300px;overflow:auto}.rv-recipient-list label{display:flex;gap:8px;align-items:flex-start;padding:8px;border:1px solid #e5eaf1;border-radius:8px;cursor:pointer}.rv-recipient-list span{display:grid;gap:2px}.rv-recipient-list small{color:#718097}.rv-mail-selected{padding:8px;border-radius:8px;background:#f5f9ff}.rv-mail-preview{display:grid;gap:5px;padding:10px;border-radius:8px;background:#fafbfd;border:1px dashed #cdd8e6;font-size:11px}.rv-boleta-tool{display:grid;gap:10px;padding:15px;border:1px solid #dce5f0;border-radius:12px;background:#fff}.rv-boleta-tool>div:first-child{display:grid;gap:3px}.rv-boleta-tool span{color:#6d7d91;font-size:11px}.rv-boleta-tool-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}.rv-boleta-results{display:grid;gap:10px}.ghost.selected{background:#eaf3ff!important;color:#0062ff!important;border-color:#b9d6ff!important}

/* Revisados design-system isolation: neutral surfaces + eCarCheck electric blue */
.rym-revisados-vue{--rv-blue:#0b63f6;--rv-blue-soft:#edf5ff;--rv-navy:#102a46;--rv-text:#14263d;--rv-muted:#718197;--rv-bg:#f5f8fc;--rv-border:#dce5ef;--rv-green:#18a66b;--rv-amber:#d89514;--rv-red:#d94843;background:var(--rv-bg);color:var(--rv-text)}
.rym-revisados-vue :deep(button){background-image:none!important;box-shadow:none!important}
.rv-side{background:#fff!important;border-right:1px solid var(--rv-border)!important}
.rv-brand b{color:var(--rv-navy)}.rv-brand small{color:#8090a5}
.rv-user{background:#f8fafc!important;border-color:#e1e8f0!important}.rv-user b{color:#1a2f49}.rv-user span,.rv-user small{color:#7a8a9e}
.rv-side nav button{background:transparent!important;color:#586a80!important;border:1px solid transparent!important;box-shadow:none!important}
.rv-side nav button:hover{background:#f3f7fc!important;color:#183a63!important}
.rv-side nav button.active{background:var(--rv-blue)!important;color:#fff!important;border-color:var(--rv-blue)!important;box-shadow:0 7px 18px rgba(11,99,246,.16)!important}
.rv-side nav button.active i{color:#fff!important}
.rv-back{background:#f7f9fc!important;color:#45617f!important;border:1px solid #e1e8f0!important;border-radius:9px!important}
.rv-main>header{border-bottom:1px solid #e3eaf2;padding-bottom:14px}.rv-main>header h1{color:#102a46}
.rv-main>header .ghost,.ghost{background:#fff!important;color:#4f6279!important;border-color:#d7e1ec!important}
.rv-main>header .ghost:hover,.ghost:hover{background:#f4f8fc!important;color:#16395f!important}
.primary,.rv-action-main,.rv-command-input button{background:var(--rv-blue)!important;color:#fff!important;border-color:var(--rv-blue)!important}
.rv-intro,.rv-card,.rv-table,.rv-state,.rv-note,.rv-filters,.rv-tool-card,.rv-command,.rv-mailer,.rv-boleta-tool{border-color:var(--rv-border);box-shadow:0 4px 16px rgba(28,58,91,.035)}
.rv-intro span,.rv-eyebrow{color:var(--rv-blue)}.rv-intro h2{color:var(--rv-navy)}
.rv-view-toggle button{background:transparent!important;color:#6a7b90!important}.rv-view-toggle button.active{background:var(--rv-blue)!important;color:#fff!important}
.rv-copy-btn{background:#fff!important;color:#53677f!important;border-color:#d6e0eb!important}
.rv-command-icon{background:var(--rv-blue-soft);color:var(--rv-blue)}
.rv-command-progress i,.rv-progress i{background:var(--rv-blue)}
.rv-badge-footer button{background:transparent!important;color:var(--rv-blue)!important}
.rv-close{background:#f1f5f9!important;color:#4e627a!important}
.rv-drawer-hero{background:#f8fbff}.rv-drawer-plate{border-color:#d5e0eb;color:#173653}
.rv-plate-zone{background:#f8fafc}.rv-plate-zone strong{color:#0f2c4b}
.rv-vehicle-badge:before{background:var(--rv-blue)}
.rv-state-chip,.rv-badge-top>b{background:#eef5ff;color:#175fae}

/* Dashboard presentation primitives */
.rv-mission{gap:12px}.rv-mission-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:2px 2px 7px}.rv-mission-head h2{font-size:27px;letter-spacing:-.035em;color:var(--rv-navy)}.rv-mission-head p{margin:4px 0 0;color:#738398}.rv-mission-summary{display:flex;align-items:baseline;gap:6px;padding:8px 10px;border:1px solid var(--rv-border);border-radius:10px;background:#fff}.rv-mission-summary b{font-size:17px;color:var(--rv-navy)}.rv-mission-summary span{font-size:9px;color:#8190a3;text-transform:uppercase}.rv-mission-summary i{width:1px;height:22px;background:#e2e8f0;margin:0 4px}
.rv-mission-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(300px,.75fr);gap:10px}.rv-fleet-radar,.rv-attention,.rv-focus-panel{border:1px solid var(--rv-border);border-radius:12px;background:#fff;box-shadow:0 5px 18px rgba(28,58,91,.035)}.rv-fleet-radar,.rv-attention{padding:14px}.rv-panel-title{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}.rv-panel-title>div>span{font-size:8px;font-weight:900;letter-spacing:.1em;color:var(--rv-blue)}.rv-panel-title h3{margin:2px 0 0;font-size:16px;letter-spacing:-.02em;color:#19324f}.rv-panel-title small{color:#8794a6;font-size:9px}.rv-radar-body{display:grid;grid-template-columns:190px 1fr;align-items:center;gap:18px;padding:16px 8px 5px}.rv-ring{--pct:0%;width:168px;height:168px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--rv-blue) 0 var(--pct),#e8eef5 var(--pct) 100%);position:relative}.rv-ring:after{content:"";position:absolute;inset:12px;border-radius:50%;background:#fff}.rv-ring>div{position:relative;z-index:1;display:grid;justify-items:center}.rv-ring strong{font-size:32px;line-height:1;color:#123252;letter-spacing:-.05em}.rv-ring span{margin-top:4px;font-size:8px;font-weight:900;letter-spacing:.1em;color:#6f8197}.rv-ring small{margin-top:4px;font-size:9px;color:#98a5b5}.rv-radar-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.rv-radar-stats div{padding:11px;border:1px solid #e2e8f0;border-radius:9px;background:#f9fbfd}.rv-radar-stats span{display:block;font-size:8px;color:#7e8ea2}.rv-radar-stats b{display:block;margin-top:4px;font-size:20px;color:#173451}
.rv-attention{display:grid;align-content:start;gap:7px}.rv-attention .rv-panel-title{margin-bottom:3px}.rv-attention>button{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:8px;width:100%;padding:9px 10px;border:1px solid #e3e9f0!important;border-radius:8px;background:#fff!important;color:#40536a!important;text-align:left;box-shadow:none!important;cursor:pointer}.rv-attention>button:hover{background:#f8fbff!important}.rv-attention>button i{width:7px;height:7px;border-radius:50%;background:#0b63f6}.rv-attention>button[data-tone="amber"] i{background:#d89514}.rv-attention>button[data-tone="red"] i{background:#d94843}.rv-attention>button[data-tone="neutral"] i{background:#94a3b8}.rv-attention>button span{font-size:10px}.rv-attention>button b{font-size:14px;color:#173451}.rv-attention>button em{font-style:normal;color:#9aa7b6}.rv-attention-empty{padding:14px;border:1px dashed #d6e0eb;border-radius:8px;color:#8190a3;font-size:10px}
.rv-focus-panel{padding:14px}.rv-focus-panel>.rv-panel-title{margin-bottom:10px}.rv-focus-panel>.rv-panel-title button{border:0!important;background:transparent!important;color:var(--rv-blue)!important;font-size:9px;font-weight:900;box-shadow:none!important;cursor:pointer}.rv-focus-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
@media(max-width:1180px){.rv-mission-grid{grid-template-columns:1fr}.rv-focus-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.rv-radar-body{grid-template-columns:1fr}.rv-ring{margin:auto}.rv-radar-stats{grid-template-columns:1fr}.rv-focus-grid{grid-template-columns:1fr}}

/* Operations Hub / eCarCheck-inspired visual system */
.rv-ops-workspace{gap:12px}.rv-ops-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:2px 2px 10px}.rv-eyebrow{display:block;color:#0062ff;font-size:9px;font-weight:900;letter-spacing:.12em}.rv-ops-hero h2{font-size:26px;letter-spacing:-.03em}.rv-ops-hero p{margin:4px 0 0;color:#718097}.rv-ops-kpis{display:flex;gap:8px}.rv-ops-kpis span{min-width:92px;padding:9px 12px;border:1px solid #dce5f0;border-radius:11px;background:#fff}.rv-ops-kpis b{display:block;font-size:17px;color:#102b55}.rv-ops-kpis small{display:block;margin-top:2px;color:#7d8ba0;font-size:9px;text-transform:uppercase;letter-spacing:.06em}
.rv-command-strip{display:grid;grid-template-columns:1.1fr .9fr;gap:10px}.rv-command{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:11px;padding:12px 13px;border:1px solid #dbe5f1;border-radius:12px;background:#fff;overflow:hidden}.rv-command-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#edf5ff;color:#0062ff;font-weight:900;font-size:18px}.rv-command-copy{display:grid;gap:2px;min-width:0}.rv-command-copy>b{font-size:12px;color:#132d53}.rv-command-copy span,.rv-command-copy small{color:#718097;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rv-action-main,.rv-command-input button{border:0;border-radius:8px;background:#0062ff;color:#fff;padding:9px 12px;font-weight:800;cursor:pointer}.rv-action-main:disabled,.rv-command-input button:disabled{opacity:.55;cursor:not-allowed}.rv-command-progress{position:absolute;left:0;right:0;bottom:0;height:3px;background:#eaf0f7}.rv-command-progress i{display:block;height:100%;background:#0062ff}.rv-command-input{display:flex;gap:6px}.rv-command-input input{width:104px;padding:8px 9px;border:1px solid #cfdaea;border-radius:8px;font-weight:800;letter-spacing:.05em}
.rv-query-result{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:13px;padding:11px 13px;border:1px solid #cfe2ff;border-radius:11px;background:#f5f9ff}.rv-query-result>div:first-child{display:grid}.rv-query-result>div:first-child span{font-size:8px;color:#0062ff;font-weight:900;letter-spacing:.08em}.rv-query-result>div:first-child b{font-size:18px;color:#102b55}.rv-query-signals{display:flex;gap:6px;flex-wrap:wrap}.rv-query-signals span{padding:5px 7px;border-radius:7px;background:#fff;border:1px solid #dbe5f1;font-size:10px}.rv-query-result p{margin:0;color:#66778c;font-size:10px}
.rv-ops-toolbar{display:grid;grid-template-columns:minmax(260px,1fr) 150px 160px auto auto;gap:8px;padding:10px;border:1px solid #dfe7f1;border-radius:12px;background:#fff}.rv-search-shell{display:flex;align-items:center;gap:8px;padding:0 10px;border:1px solid #d3ddec;border-radius:9px;background:#fbfcfe}.rv-search-shell span{color:#6d7d91}.rv-search-shell input{min-width:0;flex:1;border:0;outline:0;background:transparent;padding:9px 0}.rv-ops-toolbar select{min-width:0;border:1px solid #d3ddec;border-radius:9px;background:#fff;padding:9px;color:#3e5069}.rv-view-toggle{display:flex;padding:3px;border:1px solid #d3ddec;border-radius:9px;background:#f7f9fc}.rv-view-toggle button{border:0;background:transparent;border-radius:6px;padding:6px 9px;color:#6b7a8e;font-weight:800;cursor:pointer}.rv-view-toggle button.active{background:#0062ff;color:#fff}.rv-copy-btn{border:1px solid #d3ddec;border-radius:9px;background:#fff;color:#40536d;font-weight:800;padding:8px 10px;cursor:pointer}
.rv-ops-meta{display:flex;justify-content:space-between;gap:12px;padding:0 3px;color:#7a899c;font-size:10px}.rv-ops-meta b{color:#16365f}.rv-vehicle-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.rv-vehicle-badge{position:relative;display:grid;gap:10px;padding:13px;border:1px solid #dbe5f0;border-radius:13px;background:#fff;box-shadow:0 6px 18px rgba(25,55,92,.035);cursor:pointer;overflow:hidden;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}.rv-vehicle-badge:before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:#0062ff}.rv-vehicle-badge.tone-color:before{background:#e99a20}.rv-vehicle-badge.tone-incident:before{background:#d94a45}.rv-vehicle-badge:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(25,55,92,.09);border-color:#c8d8eb}.rv-badge-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.rv-badge-top>span{font-size:9px;font-weight:900;color:#66788e;letter-spacing:.08em}.rv-badge-top>b,.rv-state-chip{padding:4px 7px;border-radius:999px;font-size:8px;text-transform:uppercase;letter-spacing:.04em;background:#edf5ff;color:#1358a8}.rv-badge-top>b.tone-color,.rv-state-chip.tone-color{background:#fff3dd;color:#9a6100}.rv-badge-top>b.tone-incident,.rv-state-chip.tone-incident{background:#fff0ef;color:#b33b35}
.rv-plate-zone{display:grid;justify-items:center;padding:10px 12px;border:1px solid #d8e1eb;border-radius:10px;background:linear-gradient(180deg,#fbfcfe,#f4f7fa)}.rv-plate-zone small{font-size:8px;color:#718097;letter-spacing:.1em}.rv-plate-zone strong{font-size:24px;letter-spacing:.14em;color:#0e2a4f;line-height:1.25}.rv-plate-zone span{font-size:7px;color:#9aa6b5;letter-spacing:.11em}.rv-vehicle-copy{display:grid;gap:2px}.rv-vehicle-copy b{font-size:12px;color:#173354}.rv-vehicle-copy span{font-size:9px;color:#7c8a9c}.rv-review-date{display:flex;justify-content:space-between;align-items:end;gap:10px;padding-top:8px;border-top:1px solid #edf1f5}.rv-review-date span{font-size:9px;color:#7d8b9d}.rv-review-date b{font-size:11px;color:#1b3658}.rv-signal-row,.rv-table-signals{display:flex;gap:5px;flex-wrap:wrap}.rv-signal-row span,.rv-table-signals span{padding:4px 6px;border-radius:6px;font-size:8px;font-weight:800;border:1px solid transparent}.sig-ok{background:#edf9f3;color:#14704d;border-color:#d0ecdf!important}.sig-warn{background:#fff7e7;color:#936100;border-color:#f0dfb7!important}.sig-bad{background:#fff0ef;color:#b33b35;border-color:#f0cbc8!important}.sig-info{background:#edf5ff;color:#145ba8;border-color:#d2e4fb!important}.rv-badge-footer{display:flex;justify-content:space-between;align-items:center;gap:8px}.rv-badge-footer>span{font-size:9px;color:#7c8a9c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rv-badge-footer button{border:0;background:transparent;color:#0062ff;font-size:9px;font-weight:900;cursor:pointer}.rv-ops-table td small{display:block;margin-top:3px;color:#8190a2;font-size:9px}.rv-plate-mini{display:inline-flex;padding:5px 7px;border:1px solid #d6dfeb;border-radius:7px;background:#f7f9fc;font-weight:900;letter-spacing:.08em;color:#173354}
.rv-drawer{width:min(520px,96vw);padding:0}.rv-drawer-hero{padding:20px;background:linear-gradient(180deg,#f6faff,#fff);border-bottom:1px solid #dfe7f1!important}.rv-drawer-plate{display:inline-flex;margin:7px 0 5px;padding:7px 10px;border:1px solid #d4deea;border-radius:8px;background:#fff;font-size:18px;font-weight:900;letter-spacing:.13em;color:#102c50}.rv-drawer>.rv-state,.rv-drawer>template,.rv-drawer>.rv-diffs,.rv-drawer>.rv-source-grid,.rv-drawer>.rv-incident{margin-left:18px;margin-right:18px}.rv-drawer>.rv-state{margin-top:18px}.rv-drawer>.rv-diffs{margin-top:18px}.rv-drawer>.rv-source-grid{margin-top:0}.rv-drawer>.rv-incident{margin-bottom:18px}
.danger{color:#c2352b}.rv-state{display:grid;gap:9px;place-items:start}.error{border-color:#efb7b2}@media(max-width:1180px){.rv-vehicle-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rv-ops-toolbar{grid-template-columns:minmax(220px,1fr) 140px 150px auto}.rv-copy-btn{display:none}}@media(max-width:1100px){.rv-daily-layout{grid-template-columns:1fr}.rv-mailer{position:static}.rv-command-strip{grid-template-columns:1fr}}@media(max-width:980px){.rv-op-tools,.rv-source-grid{grid-template-columns:1fr}.rv-ops-toolbar{grid-template-columns:1fr 1fr}.rv-search-shell{grid-column:1/-1}.rv-view-toggle{justify-self:end}}@media(max-width:780px){.rym-revisados-vue{grid-template-columns:1fr}.rv-side{min-height:auto}.rv-main{padding:16px}.rv-main>header{align-items:flex-start;flex-direction:column}}

/* === STITCH EXPORT SYNC: Portal RYM Revisados === */
.rym-revisados-vue{--stitch-blue:#0062ff;--stitch-blue-hover:#004ecc;--stitch-cyan:#0ea5e9;--stitch-navy:#0a1120;--stitch-navy-2:#070d18;--stitch-bg:#f4f6fa;--stitch-card:#fff;--stitch-border:#e2e8f0;--stitch-text:#0f172a;--stitch-muted:#64748b;--stitch-green:#16a34a;--stitch-amber:#ea580c;--stitch-red:#dc2626;grid-template-columns:220px minmax(0,1fr)!important;background:var(--stitch-bg)!important;color:var(--stitch-text)!important;font-family:Inter,system-ui,sans-serif!important}
.rv-side{position:sticky;top:0;height:100vh;min-height:100vh!important;padding:0!important;background:var(--stitch-navy)!important;border-right:1px solid #1e293b!important;color:#cbd5e1;display:flex!important;flex-direction:column!important;overflow:hidden}
.rv-brand-dark{height:64px;display:flex;align-items:center;gap:10px;padding:0 14px;background:var(--stitch-navy-2);border-bottom:1px solid #1e293b}.rv-brand-mark{width:32px;height:32px;display:grid;place-items:center;border-radius:7px;background:var(--stitch-blue);color:#fff;box-shadow:0 6px 16px rgba(0,98,255,.25)}.rv-brand-mark .rym-icon{font-size:19px}.rv-brand-copy{display:grid;min-width:0}.rv-brand-copy b{font-size:13px;color:#fff}.rv-brand-copy small{font-size:8px;letter-spacing:.06em;color:#38bdf8;font-weight:800}.rv-version{margin-left:auto;padding:3px 5px;border-radius:4px;background:#172033;color:#cbd5e1;font:700 8px/1 "JetBrains Mono",monospace}.rv-station{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:7px;padding:9px 14px;border-bottom:1px solid #1e293b;background:#0d1728}.rv-station i{width:7px;height:7px;border-radius:50%;background:#06b6d4}.rv-station span{font:700 8px/1 Inter,sans-serif;letter-spacing:.06em;color:#94a3b8}.rv-station b{font:700 9px/1 "JetBrains Mono",monospace;color:#38bdf8}.rv-nav-label{padding:16px 14px 6px;font-size:8px;font-weight:800;letter-spacing:.08em;color:#64748b}.rv-nav-label-secondary{padding-top:20px}.rv-side nav{display:grid!important;gap:3px;padding:0 8px}.rv-side nav button{display:grid!important;grid-template-columns:24px 1fr auto;align-items:center;gap:6px;width:100%;padding:9px 10px!important;border-radius:6px!important;color:#94a3b8!important;background:transparent!important;text-align:left}.rv-side nav button .rym-icon{font-size:17px}.rv-side nav button em{font-style:normal;font-size:10px;font-weight:600}.rv-side nav button small{font:800 7px/1 "JetBrains Mono",monospace;letter-spacing:.07em}.rv-side nav button:hover{background:#172033!important;color:#fff!important}.rv-side nav button.active{background:var(--stitch-blue)!important;color:#fff!important;box-shadow:0 5px 14px rgba(0,98,255,.20)!important}.rv-side-shortcuts{display:grid;gap:5px;padding:0 8px}.rv-side-shortcuts button{display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:6px;padding:9px 10px;border:0;border-radius:5px;background:#111c2d;color:#cbd5e1;text-align:left}.rv-side-shortcuts .rym-icon{font-size:16px;color:#38bdf8}.rv-side-shortcuts em{font-style:normal;font-size:10px}.rv-side-shortcuts b{padding:3px 5px;border-radius:4px;background:#1e2f4a;color:#e2e8f0;font:700 9px/1 "JetBrains Mono",monospace}.rv-side-profile{margin-top:auto;display:grid;gap:2px;padding:10px 14px;border-top:1px solid #1e293b;background:#0d1728}.rv-side-profile span{font-size:10px;color:#fff;font-weight:700}.rv-side-profile b{font-size:8px;color:#38bdf8}.rv-side-profile small{font-size:8px;color:#64748b}.rv-node{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:7px;margin:8px;padding:8px 9px;border:1px solid #1e293b;border-radius:6px;background:#0b1322}.rv-node i{width:7px;height:7px;border-radius:50%;background:#16a34a}.rv-node span{font:600 8px/1 "JetBrains Mono",monospace;color:#cbd5e1}.rv-node b{font:700 8px/1 "JetBrains Mono",monospace;color:#38bdf8}.rv-back{margin:0 8px 8px!important;padding:8px 10px!important;border:1px solid #1e293b!important;border-radius:6px!important;background:#111c2d!important;color:#94a3b8!important;font-size:9px!important}
.rv-main{padding:0 18px 28px!important;min-width:0;background:var(--stitch-bg)}.rv-topbar{position:sticky;top:0;z-index:20;display:flex!important;justify-content:space-between!important;align-items:flex-start!important;gap:16px;margin:0 -18px 14px!important;padding:15px 18px 12px!important;background:rgba(255,255,255,.96);backdrop-filter:blur(10px);border-bottom:1px solid var(--stitch-border)!important}.rv-page-heading small{display:block!important;color:#0062ff!important;font:800 8px/1 Inter,sans-serif!important;letter-spacing:.08em!important}.rv-page-heading h1{margin:3px 0 2px!important;font-size:25px!important;line-height:1.1!important;letter-spacing:-.03em;color:#0f172a!important}.rv-page-heading>span{font-size:10px;color:#64748b}.rv-top-actions{display:flex;align-items:center;gap:7px}.rv-live-pill{display:flex;align-items:center;gap:5px;padding:7px 9px;border:1px solid #a7f3d0;border-radius:999px;background:#ecfdf5;color:#166534}.rv-live-pill i{width:7px;height:7px;border-radius:50%;background:#16a34a}.rv-live-pill span,.rv-live-pill b{font:700 8px/1 "JetBrains Mono",monospace}.rv-top-actions .ghost,.rv-top-actions .primary{min-height:32px;border-radius:6px!important;padding:0 10px!important;font-size:9px!important}
.rv-module-strip{display:flex;justify-content:space-between;gap:12px;align-items:center}.rv-module-strip>div:first-child{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.rv-module-strip>div:first-child>span{font-size:8px;color:#0062ff;font-weight:900}.rv-module-strip>div:first-child>b{font-size:13px;color:#172033}.rv-module-strip>div:first-child>small{padding:4px 7px;border:1px solid #bfdbfe;border-radius:999px;background:#eff6ff;color:#1d4ed8;font:700 8px/1 "JetBrains Mono",monospace}.rv-module-actions{display:flex;align-items:center;gap:6px}.rv-module-actions>span{display:inline-flex;align-items:center;gap:5px;padding:6px 8px;border:1px solid #dbe3ed;border-radius:6px;background:#fff;font-size:8px;font-weight:700}.rv-module-actions .rym-icon{font-size:14px}.rv-critical-chip{background:#fff1f2!important;border-color:#fecdd3!important;color:#be123c!important}.rv-module-actions .primary{display:inline-flex;align-items:center;gap:5px;border-radius:6px!important;padding:7px 10px!important;font-size:9px!important}.rv-module-actions .primary .rym-icon{font-size:14px}
.rv-global-control{padding:16px;border:1px solid var(--stitch-border);border-radius:8px;background:#fff}.rv-global-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-end}.rv-global-head>div:first-child{display:grid;grid-template-columns:auto auto;align-items:baseline;gap:2px 7px}.rv-global-head>div:first-child>span{font-size:8px;font-weight:900;letter-spacing:.08em;color:#0062ff}.rv-global-head>div:first-child>small{font-size:8px;color:#0ea5e9;font-weight:800}.rv-global-head strong{grid-column:1;font-size:25px;letter-spacing:-.04em;color:#0f172a}.rv-global-head em{font-style:normal;font-size:11px;color:#334155}.rv-global-meta{display:flex;gap:8px}.rv-global-meta span{display:grid;gap:2px;padding:9px 10px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;font-size:8px;color:#64748b}.rv-global-meta b{font-size:12px;color:#0f172a}.rv-global-meter{height:5px;margin:13px 0 14px;border-radius:999px;background:#e2e8f0;overflow:hidden}.rv-global-meter i{display:block;height:100%;background:linear-gradient(90deg,#16a34a 0 72%,#0ea5e9 72% 86%,#f59e0b 86% 94%,#dc2626 94%);border-radius:999px}.rv-kpi-deck{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.rv-kpi-deck article{padding:12px;border:1px solid #e2e8f0;border-top:2px solid #0062ff;border-radius:7px;background:#fbfcfe}.rv-kpi-deck article[data-tone="green"]{border-top-color:#16a34a}.rv-kpi-deck article[data-tone="amber"]{border-top-color:#f59e0b}.rv-kpi-deck article[data-tone="red"]{border-top-color:#dc2626;background:#fffafa}.rv-kpi-deck header{display:flex;justify-content:space-between;gap:6px}.rv-kpi-deck header span:first-child{font-size:8px;font-weight:900;letter-spacing:.06em}.rv-kpi-deck header .rym-icon{font-size:15px}.rv-kpi-deck article>b{display:block;margin-top:8px;font:700 22px/1 "JetBrains Mono",monospace;color:#0f172a}.rv-kpi-deck article>small{display:block;margin-top:5px;min-height:24px;font-size:9px;color:#64748b}.rv-kpi-deck article>footer{margin-top:10px;padding-top:7px;border-top:1px solid #e2e8f0;font-size:8px;color:#64748b}
.rv-dashboard-lower{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.7fr);gap:12px}.rv-focus-panel,.rv-cycle-panel,.rv-dispatch-panel,.rv-monthly-table{padding:14px;border:1px solid var(--stitch-border);border-radius:8px;background:#fff}.rv-focus-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}.rv-cycle-panel{display:grid;align-content:start;gap:9px}.rv-cycle-panel article{display:grid;grid-template-columns:1fr 90px 38px;align-items:center;gap:7px}.rv-cycle-panel article>div:first-child{display:grid}.rv-cycle-panel article>div:first-child b{font-size:9px}.rv-cycle-panel article>div:first-child span{font-size:8px;color:#64748b}.rv-cycle-bar,.rv-cycle-bigbar,.rv-mini-meter{height:5px;border-radius:999px;background:#e2e8f0;overflow:hidden}.rv-cycle-bar i,.rv-cycle-bigbar i,.rv-mini-meter i{display:block;height:100%;border-radius:999px;background:#0062ff}.rv-cycle-panel article>strong{font:700 9px/1 "JetBrains Mono",monospace;color:#0062ff}.rv-dispatch-panel .rv-table{margin-top:10px;border-radius:6px}
.rv-ops-summary{display:flex;align-items:center;justify-content:space-between;gap:12px}.rv-ops-summary>div:first-child{display:flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #e2e8f0;border-radius:7px;background:#fff;font:800 8px/1 "JetBrains Mono",monospace}.rv-ops-summary>div:first-child i{width:1px;height:14px;background:#dbe3ed}.rv-ops-summary>div:first-child span{color:#0f172a}.rv-ops-summary>div:first-child b{color:#0062ff}.rv-ops-search-row{display:grid}.rv-search-shell{height:42px!important;background:#fff!important;border-radius:7px!important}.rv-search-shell kbd{padding:3px 5px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;color:#475569;font:700 8px/1 "JetBrains Mono",monospace}.rv-quick-chips{display:flex;gap:7px;flex-wrap:wrap}.rv-quick-chips>span{display:inline-flex;align-items:center;gap:5px;padding:7px 10px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;font-size:9px;color:#334155}.rv-quick-chips>span i{width:6px;height:6px;border-radius:50%;background:#cbd5e1}.rv-quick-chips>span b{font:700 9px/1 "JetBrains Mono",monospace}.rv-quick-chips>span.active{background:#0062ff;color:#fff;border-color:#0062ff}.rv-quick-chips>span[data-tone="green"] i{background:#16a34a}.rv-quick-chips>span[data-tone="amber"] i{background:#f59e0b}.rv-quick-chips>span[data-tone="red"] i{background:#dc2626}.rv-ops-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.rv-ops-filters label{display:flex;align-items:center;gap:6px;padding:0 9px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;font-size:9px;font-weight:600;color:#475569}.rv-ops-filters select{min-width:0;flex:1;border:0;background:transparent;padding:9px 0;outline:0;color:#0f172a;font-size:9px;font-weight:700}.rv-ops-tools{display:grid;grid-template-columns:1fr 1fr;gap:8px}.rv-tool-action,.rv-tool-lookup{min-height:54px;display:grid;align-items:center;gap:9px;padding:9px 11px;border:1px solid #dbe3ed;border-radius:7px;background:#fff}.rv-tool-action{grid-template-columns:auto 1fr;text-align:left}.rv-tool-lookup{grid-template-columns:auto 1fr 90px auto}.rv-tool-action>.rym-icon,.rv-tool-lookup>.rym-icon{width:30px;height:30px;display:grid;place-items:center;border-radius:6px;background:#e8f1ff;color:#0062ff}.rv-tool-action div,.rv-tool-lookup div{display:grid}.rv-tool-action b,.rv-tool-lookup b{font-size:10px}.rv-tool-action small,.rv-tool-lookup small{font-size:8px;color:#64748b}.rv-tool-lookup input{min-width:0;padding:7px;border:1px solid #dbe3ed;border-radius:5px;font:700 9px/1 "JetBrains Mono",monospace}.rv-tool-lookup button{padding:7px 9px;border:0;border-radius:5px;background:#0062ff;color:#fff;font-size:9px;font-weight:800}.rv-vehicle-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}.rv-ops-meta{padding:7px 0!important;border-bottom:1px solid #e2e8f0}.rv-ops-meta .ghost{margin-left:auto}
.rv-monthly-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.rv-monthly-head h2{font-size:26px}.rv-monthly-head p{margin:3px 0 0;color:#64748b}.rv-monthly-total{display:grid;justify-items:end;padding:9px 11px;border:1px solid #e2e8f0;border-radius:7px;background:#fff}.rv-monthly-total b{font:700 20px/1 "JetBrains Mono",monospace;color:#0f172a}.rv-monthly-total span{font-size:8px;color:#64748b}.rv-cycle-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.rv-cycle-grid article{padding:14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff}.rv-cycle-grid header{display:flex;justify-content:space-between;gap:8px}.rv-cycle-grid header span{font-size:8px;color:#0062ff;font-weight:900}.rv-cycle-grid h3{margin:2px 0;font-size:15px}.rv-cycle-grid header>b{font:700 22px/1 "JetBrains Mono",monospace;color:#0062ff}.rv-cycle-bigbar{margin:11px 0}.rv-cycle-stats{display:flex;gap:12px;flex-wrap:wrap}.rv-cycle-stats span{font-size:9px;color:#64748b}.rv-cycle-stats b{color:#0f172a}.rv-monthly-table>.rv-panel-title{margin-bottom:10px}.rv-monthly-table td:last-child{display:flex;align-items:center;gap:7px}.rv-mini-meter{width:90px}.rv-monthly-table td:last-child>b{font-size:9px}
.rv-modal{background:rgba(7,13,24,.35)!important}.rv-drawer{width:min(470px,96vw)!important;background:#fff!important;border-left:1px solid #dbe3ed!important;box-shadow:-18px 0 42px rgba(15,23,42,.12)!important}.rv-drawer-hero{background:#fff!important;border-bottom:1px solid #e2e8f0!important}.rv-drawer-hero small{color:#0062ff!important}.rv-drawer-plate{border:2px solid #0f172a!important;border-radius:6px!important;background:#f8fafc!important;font-family:"JetBrains Mono",monospace!important;letter-spacing:.12em!important}.rv-source-grid article,.rv-incident,.rv-diffs{border-radius:7px!important;background:#f1f5f9!important}.rv-source-grid dt{font-size:9px!important}.rv-source-grid dd{font-size:10px!important}
@media(max-width:1280px){.rym-revisados-vue{grid-template-columns:200px minmax(0,1fr)!important}.rv-kpi-deck{grid-template-columns:repeat(2,minmax(0,1fr))}.rv-focus-grid,.rv-vehicle-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.rv-dashboard-lower{grid-template-columns:1fr}.rv-ops-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.rv-ops-tools{grid-template-columns:1fr}}
@media(max-width:800px){.rym-revisados-vue{grid-template-columns:1fr!important}.rv-side{position:relative;height:auto;min-height:auto!important}.rv-main{padding:0 12px 20px!important}.rv-topbar{margin:0 -12px 12px!important;flex-direction:column}.rv-top-actions{width:100%;flex-wrap:wrap}.rv-global-head,.rv-module-strip,.rv-ops-summary,.rv-monthly-head{align-items:flex-start;flex-direction:column}.rv-kpi-deck,.rv-focus-grid,.rv-vehicle-grid,.rv-cycle-grid,.rv-ops-filters{grid-template-columns:1fr!important}.rv-tool-lookup{grid-template-columns:auto 1fr}.rv-tool-lookup input,.rv-tool-lookup button{grid-column:2}.rv-global-meta{flex-wrap:wrap}}

/* STITCH API SOURCE: Vue 3 Ready shell + Production Final workspaces */
.rym-revisados-vue{--stitch-blue:#0062ff;--stitch-blue-dark:#004cca;--stitch-dark:#0a1120;--stitch-darker:#070d18;--stitch-surface:#f4f6fa;--stitch-card:#fff;--stitch-border:#e2e8f0;--stitch-text:#0f172a;--stitch-muted:#64748b;grid-template-columns:256px minmax(0,1fr)!important;background:var(--stitch-surface)!important}
.rv-side{position:sticky!important;top:0;height:100vh!important;min-height:100vh!important;padding:0!important;background:var(--stitch-dark)!important;border-right:1px solid #1e293b!important;color:#cbd5e1!important;overflow:hidden}
.rv-brand-dark{height:64px;padding:0 18px!important;background:var(--stitch-darker)!important;border-bottom:1px solid #1e293b!important}.rv-brand-copy b{color:#fff!important;font-family:"Space Grotesk",Inter,sans-serif!important}.rv-brand-copy small{color:#38bdf8!important;font-family:"JetBrains Mono",monospace!important;text-transform:uppercase}.rv-version{background:#172033!important;color:#cbd5e1!important;border:1px solid #28354a!important}
.rv-station{padding:10px 18px!important;background:#0d1728!important;border-bottom:1px solid #1e293b!important}.rv-station span{color:#94a3b8!important}.rv-station b{color:#38bdf8!important}.rv-nav-label{padding:16px 16px 6px!important;color:#64748b!important;letter-spacing:.09em!important}.rv-nav-label-secondary{padding-top:20px!important}
.rv-side nav{padding:0 12px!important;gap:4px!important}.rv-side nav button{grid-template-columns:24px 1fr auto!important;padding:10px 12px!important;color:#94a3b8!important;background:transparent!important;border-radius:8px!important}.rv-side nav button em{font-size:12px!important}.rv-side nav button:hover{background:#162238!important;color:#fff!important}.rv-side nav button.active{background:var(--stitch-blue)!important;color:#fff!important;box-shadow:0 8px 20px rgba(0,98,255,.24)!important}
.rv-side-shortcuts{padding:0 12px!important}.rv-side-shortcuts button{background:transparent!important;color:#94a3b8!important;border:0!important;border-radius:8px!important}.rv-side-shortcuts button:hover{background:#162238!important;color:#fff!important}.rv-side-shortcuts .rym-icon{color:#94a3b8!important}.rv-side-shortcuts b{background:#172033!important;color:#cbd5e1!important}
.rv-side-profile{background:#0d1728!important;border-top:1px solid #1e293b!important}.rv-side-profile span{color:#fff!important}.rv-side-profile b{color:#38bdf8!important}.rv-side-profile small{color:#64748b!important}.rv-node{background:#0b1322!important;border-color:#1e293b!important}.rv-node span{color:#cbd5e1!important}.rv-node b{color:#38bdf8!important}.rv-back{background:#111c2d!important;color:#94a3b8!important;border-color:#1e293b!important}
.rv-main{padding:64px 24px 32px!important;background:var(--stitch-surface)!important}.rv-topbar{position:fixed!important;top:0;left:256px;right:0;height:64px;z-index:40;margin:0!important;padding:0 24px!important;display:flex!important;align-items:center!important;gap:14px!important;background:rgba(255,255,255,.96)!important;border-bottom:1px solid var(--stitch-border)!important;backdrop-filter:blur(12px)}.rv-command-search{width:min(340px,34vw);height:36px;display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid var(--stitch-border);border-radius:8px;background:#f8fafc;color:#94a3b8}.rv-command-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;font-size:11px;color:var(--stitch-text)}.rv-command-search kbd{padding:3px 5px;border:1px solid var(--stitch-border);border-radius:4px;background:#fff;color:#64748b;font:700 8px/1 "JetBrains Mono",monospace}.rv-top-context{display:flex;align-items:center;gap:9px;min-width:0;color:#475569;font-size:10px}.rv-top-context span{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rv-top-context i{width:1px;height:20px;background:var(--stitch-border)}.rv-top-actions{margin-left:auto!important}.rv-top-profile{display:grid;padding-left:4px;text-align:right}.rv-top-profile span{font-size:10px;font-weight:800;color:#0f172a}.rv-top-profile b{font-size:8px;color:#0062ff;text-transform:uppercase}.rv-live-pill{background:#ecfdf5!important;border-color:#a7f3d0!important;color:#166534!important}
.rv-stack{gap:18px!important}.rv-module-strip{padding-top:18px!important}.rv-module-strip>div:first-child>b{font-size:18px!important;font-family:"Space Grotesk",Inter,sans-serif!important}.rv-module-strip>div:first-child>small{font-size:9px!important}
.rv-global-control{padding:22px!important;border-radius:12px!important;box-shadow:0 2px 10px rgba(15,23,42,.025)!important}.rv-global-head strong{font:700 30px/1 "JetBrains Mono",monospace!important}.rv-global-head em{font-size:13px!important}.rv-global-meta span{min-width:130px;padding:10px 12px!important}.rv-segmented-meter{display:flex!important;gap:2px!important;padding:2px!important;height:12px!important;background:#f1f5f9!important;border:1px solid #e2e8f0}.rv-segmented-meter i{height:100%!important;border-radius:2px!important;background:#cbd5e1!important}.rv-segmented-meter i[data-tone="green"]{background:#16a34a!important}.rv-segmented-meter i[data-tone="blue"]{background:#0ea5e9!important}.rv-segmented-meter i[data-tone="amber"]{background:#ea580c!important}.rv-segmented-meter i[data-tone="red"]{background:#dc2626!important}
.rv-kpi-deck{gap:14px!important}.rv-kpi-deck article{padding:16px!important;border-radius:10px!important}.rv-kpi-deck article>b{font-size:26px!important}.rv-kpi-deck article>small{font-size:10px!important}.rv-kpi-deck article>footer{font-size:9px!important}
.rv-panel-title h3{font-family:"Space Grotesk",Inter,sans-serif!important}.rv-dashboard-lower{gap:16px!important}.rv-focus-panel,.rv-cycle-panel,.rv-dispatch-panel,.rv-monthly-table{border-radius:12px!important}.rv-focus-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.rv-cycle-panel article{grid-template-columns:1fr 120px 42px!important}
.rv-section-title{display:flex;justify-content:space-between;gap:14px;align-items:end;padding-top:18px;padding-bottom:10px;border-bottom:1px solid var(--stitch-border)}.rv-section-title>div>span,.rv-module-pill{display:inline-flex;padding:4px 7px;border-radius:5px;background:#0062ff;color:#fff;font:800 9px/1 "JetBrains Mono",monospace;letter-spacing:.06em}.rv-section-title h2{margin:7px 0 2px;font:700 24px/1.15 "Space Grotesk",Inter,sans-serif;color:#0b1c30}.rv-section-title p{margin:0;color:#64748b;font-size:11px}.rv-section-title>small{color:#94a3b8;font:700 8px/1 "JetBrains Mono",monospace}
.rv-ops-summary{margin-top:-4px!important}.rv-search-shell{height:44px!important;border-radius:12px!important}.rv-view-toggle button{min-height:34px!important}.rv-quick-chips button{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;color:#334155;font-size:10px;font-weight:700;cursor:pointer}.rv-quick-chips button i{width:6px;height:6px;border-radius:50%;background:#cbd5e1}.rv-quick-chips button.active{background:#0062ff;color:#fff;border-color:#0062ff}.rv-quick-chips button[data-tone="green"] i{background:#16a34a}.rv-quick-chips button[data-tone="amber"] i{background:#ea580c}.rv-quick-chips button[data-tone="red"] i{background:#dc2626}.rv-ops-filters label{border-radius:8px!important}.rv-ops-tools{gap:12px!important}.rv-tool-action,.rv-tool-lookup{border-radius:10px!important;min-height:60px!important}
.rv-vehicle-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important}
.rv-monthly-head{padding-top:18px!important;border-bottom:1px solid var(--stitch-border);padding-bottom:14px}.rv-monthly-head>div:first-child{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:5px 8px}.rv-monthly-head h2{grid-column:1/-1;margin:2px 0 0!important;font:700 25px/1.15 "Space Grotesk",Inter,sans-serif}.rv-monthly-head p{grid-column:1/-1}.rv-monthly-actions{display:flex;align-items:center;gap:10px}.rv-monthly-actions .ghost{display:inline-flex;align-items:center;gap:6px}.rv-monthly-total{min-width:130px}.rv-cycle-grid{gap:14px!important}.rv-cycle-grid article{border-radius:10px!important;padding:16px!important}
.rv-modal{z-index:5000!important;background:rgba(7,13,24,.48)!important;backdrop-filter:blur(2px)}.rv-drawer{width:min(520px,96vw)!important;padding:0!important;border-left:1px solid #dbe3ed!important;box-shadow:-24px 0 60px rgba(15,23,42,.18)!important}.rv-drawer-hero{padding:18px 20px!important;background:#fff!important}.rv-drawer-id{display:flex;align-items:center;gap:9px}.rv-drawer-id h2{font-family:"Space Grotesk",Inter,sans-serif!important}.rv-drawer-status{display:inline-flex!important;padding:5px 8px;border-radius:999px;background:#dcfce7;color:#15803d!important;font-size:8px!important;font-weight:900!important}.rv-drawer-plate{font-size:22px!important}.rv-drawer>.rv-diffs,.rv-drawer>.rv-source-grid,.rv-drawer>.rv-incident{margin-left:18px!important;margin-right:18px!important}.rv-source-grid article{background:#f8fafc!important;border-radius:10px!important}.rv-source-grid h3{font-family:"Space Grotesk",Inter,sans-serif!important}
@media(max-width:1280px){.rym-revisados-vue{grid-template-columns:224px minmax(0,1fr)!important}.rv-topbar{left:224px!important}.rv-vehicle-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.rv-focus-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:900px){.rym-revisados-vue{grid-template-columns:1fr!important}.rv-side{position:relative!important;height:auto!important;min-height:auto!important}.rv-topbar{position:sticky!important;left:auto!important;height:auto!important;min-height:64px;padding:10px 12px!important;flex-wrap:wrap}.rv-main{padding:0 12px 20px!important}.rv-command-search{width:100%}.rv-top-context{display:none}.rv-vehicle-grid,.rv-focus-grid{grid-template-columns:1fr!important}.rv-section-title,.rv-monthly-head{align-items:flex-start;flex-direction:column}.rv-monthly-actions{width:100%;justify-content:space-between}}


/* Main-first consolidation: keep Stitch workflows, restore Portal RYM visual language. */
.rym-revisados-vue{
  --stitch-blue:#244AA5!important;
  --stitch-blue-dark:#1E3F92!important;
  --stitch-bg:#F4F7FB!important;
  --stitch-surface:#F4F7FB!important;
  --stitch-border:#D8E3F2!important;
  --stitch-text:#10224E!important;
  --stitch-muted:#62708C!important;
  grid-template-columns:250px minmax(0,1fr)!important;
  background:#F4F7FB!important;
}
.rv-side{
  position:sticky!important;top:0!important;height:100vh!important;min-height:100vh!important;
  padding:0!important;background:#fff!important;border-right:1px solid #D8E3F2!important;
  color:#10224E!important;overflow:auto!important;
}
.rv-brand-dark{
  height:auto!important;min-height:82px!important;padding:18px 16px!important;
  background:#fff!important;border-bottom:1px solid #E3EAF2!important;
}
.rv-brand-mark{background:#EAF4FF!important;color:#244AA5!important;box-shadow:none!important;border:1px solid #C9DCF4!important}
.rv-brand-copy b{color:#10224E!important;font-family:Inter,system-ui,sans-serif!important;font-size:16px!important}
.rv-brand-copy small{color:#62708C!important;text-transform:none!important;letter-spacing:.02em!important;font-family:Inter,system-ui,sans-serif!important}
.rv-version{background:#F4F7FB!important;color:#244AA5!important;border:1px solid #D8E3F2!important}
.rv-nav-label{padding:16px 16px 7px!important;color:#8290A4!important}
.rv-side nav{padding:0 10px!important;gap:5px!important}
.rv-side nav button{
  grid-template-columns:24px 1fr!important;padding:10px 11px!important;border-radius:10px!important;
  color:#52627A!important;background:transparent!important;border:1px solid transparent!important;
}
.rv-side nav button:hover{background:#F4F7FB!important;color:#244AA5!important}
.rv-side nav button.active{
  background:#EAF4FF!important;color:#244AA5!important;border-color:#C9DCF4!important;
  box-shadow:none!important;position:relative!important;
}
.rv-side nav button.active:before{content:"";position:absolute;left:-1px;top:8px;bottom:8px;width:3px;border-radius:3px;background:#F47C20}
.rv-side nav button em{font-size:12px!important;font-weight:750!important}
.rv-side-profile{margin-top:auto!important;background:#F8FBFF!important;border-top:1px solid #E3EAF2!important;padding:13px 16px!important}
.rv-side-profile span{color:#10224E!important}.rv-side-profile b{color:#244AA5!important}.rv-side-profile small{color:#7B899C!important}
.rv-back{margin:10px 10px 12px!important;padding:10px 11px!important;background:#F4F7FB!important;color:#244AA5!important;border:1px solid #D8E3F2!important;border-radius:10px!important}
.rv-main{padding:0 20px 28px!important;background:#F4F7FB!important}
.rv-topbar{
  position:sticky!important;top:0!important;left:auto!important;height:auto!important;min-height:76px!important;
  margin:0 -20px 18px!important;padding:14px 20px!important;align-items:center!important;
  background:rgba(255,255,255,.97)!important;border-bottom:1px solid #D8E3F2!important;
}
.rv-page-heading small{color:#244AA5!important}
.rv-page-heading h1{font:800 26px/1.1 Inter,system-ui,sans-serif!important;color:#10224E!important}
.rv-page-heading>span{font-size:11px!important;color:#62708C!important}
.rv-live-pill{background:#ECFDF3!important;border-color:#A7F3D0!important;color:#067647!important}
.rv-stack{gap:16px!important}
.rv-module-strip{padding:0!important;align-items:flex-end!important}
.rv-module-strip>div:first-child{display:grid!important;gap:3px!important}
.rv-module-strip>div:first-child>span{font-size:9px!important;color:#244AA5!important}
.rv-module-strip>div:first-child>b{font:800 20px/1.2 Inter,system-ui,sans-serif!important;color:#10224E!important}
.rv-module-strip>div:first-child>small{padding:0!important;border:0!important;background:transparent!important;color:#7A8798!important;font:600 10px/1.2 Inter,system-ui,sans-serif!important}
.rv-global-control{padding:16px!important;border-radius:16px!important;border-color:#D8E3F2!important;box-shadow:0 10px 26px rgba(10,27,77,.05)!important}
.rv-global-head-compact{align-items:center!important;margin-bottom:12px!important}
.rv-global-head-compact>div:first-child{display:flex!important;align-items:baseline!important;gap:10px!important}
.rv-global-head-compact strong{font:800 26px/1 Inter,system-ui,sans-serif!important;color:#10224E!important}
.rv-global-head-compact em{font-size:11px!important;color:#62708C!important}
.rv-kpi-deck{gap:12px!important}
.rv-kpi-deck article{padding:14px!important;border-radius:14px!important;background:#fff!important}
.rv-kpi-deck article>b{font:800 28px/1 Inter,system-ui,sans-serif!important;color:#10224E!important}
.rv-kpi-deck article>small{min-height:0!important;font-size:10px!important}
.rv-kpi-deck article>footer{display:none!important}
.rv-dashboard-lower{grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr)!important;gap:14px!important}
.rv-focus-panel,.rv-cycle-panel{border-radius:16px!important;border-color:#D8E3F2!important;box-shadow:0 8px 22px rgba(10,27,77,.04)!important}
@media(max-width:1280px){.rym-revisados-vue{grid-template-columns:220px minmax(0,1fr)!important}.rv-dashboard-lower{grid-template-columns:1fr!important}}
@media(max-width:900px){.rym-revisados-vue{grid-template-columns:1fr!important}.rv-side{position:relative!important;height:auto!important;min-height:auto!important}.rv-main{padding:0 12px 20px!important}.rv-topbar{margin:0 -12px 14px!important;padding:12px!important;flex-direction:column!important;align-items:flex-start!important}.rv-top-actions{width:100%!important;flex-wrap:wrap!important}}
</style>


<style scoped>
/* final viewport containment for Revisados */
.rym-revisados-vue,
.rv-main{
  width:100%;
  max-width:100%;
  min-width:0;
  overflow-x:hidden;
}
.rv-main>*{
  min-width:0;
  max-width:100%;
}
</style>


<style scoped>
/* ficha operativa v2 */
.rv-modal{
  background:rgba(7,20,43,.46)!important;
  backdrop-filter:blur(2px);
}
.rv-drawer-v2{
  width:min(680px,96vw)!important;
  padding:0!important;
  gap:0!important;
  background:#F5F8FC!important;
  box-shadow:-26px 0 64px rgba(8,28,65,.24)!important;
}
.rv-ficha-hero{
  position:relative;
  overflow:hidden;
  padding:22px 24px 20px;
  border:0!important;
  background:
    radial-gradient(circle at 88% 5%,rgba(96,165,250,.35),transparent 28%),
    linear-gradient(135deg,#0A2D72 0%,#0E54BF 58%,#2486E8 100%);
  color:#fff;
}
.rv-ficha-hero::after{
  content:"";
  position:absolute;
  width:170px;height:170px;
  border-radius:50%;
  right:-80px;bottom:-105px;
  border:26px solid rgba(255,255,255,.08);
}
.rv-close-v2{
  position:absolute;right:18px;top:18px;z-index:2;
  width:38px!important;height:38px!important;
  background:rgba(255,255,255,.14)!important;
  color:#fff!important;border:1px solid rgba(255,255,255,.16)!important;
  backdrop-filter:blur(8px);
}
.rv-ficha-eyebrow{display:flex;align-items:center;gap:8px;font-size:9px;font-weight:900;letter-spacing:.11em;color:#DCEBFF}
.rv-ficha-icon{width:31px;height:31px;display:grid;place-items:center;border-radius:9px;background:rgba(255,255,255,.13)}
.rv-ficha-main{display:flex;align-items:end;gap:18px;margin-top:13px}
.rv-ficha-main>div:first-child small,.rv-ficha-plate small{display:block;margin-bottom:3px;font-size:8px;font-weight:900;letter-spacing:.11em;color:#BFD8FF}
.rv-ficha-main h2{margin:0!important;font-size:34px!important;line-height:1;color:#fff}
.rv-ficha-plate{padding-left:18px;border-left:1px solid rgba(255,255,255,.24)}
.rv-ficha-plate strong{font:800 22px/1.1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;color:#fff}
.rv-ficha-subline{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:11px;color:#E6F1FF}
.rv-ficha-subline span{display:inline-flex!important;align-items:center;gap:5px;color:#E6F1FF!important;font-size:11px!important}
.rv-ficha-status-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:14px}
.rv-ficha-state,.rv-ficha-signal{display:inline-flex;align-items:center;min-height:24px;padding:5px 9px;border-radius:999px;font-size:8px;font-weight:900;letter-spacing:.02em}
.rv-ficha-state[data-tone="ok"]{background:#D8F8E7;color:#087A49}
.rv-ficha-state[data-tone="attention"]{background:#FFF0D6;color:#A65A00}
.rv-ficha-signal{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.16)}
.rv-ficha-signal[data-tone="bad"]{background:#FFE1DD;color:#AD2C24;border-color:#F7B9B3}
.rv-ficha-signal[data-tone="warn"]{background:#FFF0D2;color:#9C5B00;border-color:#F1D19A}
.rv-ficha-signal[data-tone="ok"]{background:#DDF7E9;color:#08784A;border-color:#B7E4CE}
.rv-ficha-signal[data-tone="info"]{background:#E1EEFF;color:#1557A5;border-color:#BAD4F3}

.rv-drawer-v2>.rv-state,.rv-drawer-v2>.rv-diffs-v2,.rv-drawer-v2>.rv-ficha-summary,.rv-drawer-v2>.rv-ficha-card,.rv-drawer-v2>.rv-incident-v2{
  margin-left:18px;margin-right:18px;
}
.rv-ficha-loading{margin-top:18px}
.rv-diffs-v2,.rv-ficha-summary,.rv-ficha-card,.rv-incident-v2{margin-top:14px}
.rv-diffs-v2{
  padding:14px!important;border-radius:14px!important;
  background:#FFF9EC!important;border:1px solid #EFD49B!important;
}
.rv-section-title{display:flex;align-items:center;gap:10px}
.rv-section-title>div{display:grid;gap:1px}
.rv-section-title small{font-size:8px;font-weight:900;letter-spacing:.08em;color:#7788A0}
.rv-section-title b{font-size:13px;color:#112C55}
.rv-section-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#E8F1FF;color:#1761C5;flex:0 0 34px}
.rv-section-icon.warn{background:#FFF0D3;color:#B56C00}
.rv-section-icon.owner{background:#EEE8FF;color:#6847C9}
.rv-section-icon.incident{background:#FFE9E6;color:#B43B30}
.rv-diff-list{display:grid;gap:6px;margin-top:10px}
.rv-diff-list span{display:grid;grid-template-columns:90px minmax(0,1fr) auto minmax(0,1fr);gap:7px;align-items:center;padding:8px 10px;border-radius:9px;background:#fff;border:1px solid #F0DFC0;font-size:9px;color:#5B687B}
.rv-diff-list b{color:#324A69}.rv-diff-list em{font-style:normal}.rv-diff-list i{font-style:normal;color:#B58A42}.rv-diff-list strong{color:#8D5200}

.rv-ficha-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.rv-ficha-summary article{min-width:0;display:flex;align-items:center;gap:9px;padding:12px;border:1px solid #D9E4F0;border-radius:13px;background:#fff;box-shadow:0 5px 14px rgba(15,46,88,.04)}
.rv-summary-icon{width:30px;height:30px;display:grid;place-items:center;border-radius:9px;background:#EFF5FF;color:#1761C5;flex:0 0 30px}
.rv-ficha-summary article>div{min-width:0;display:grid;gap:2px}
.rv-ficha-summary small{font-size:7px;font-weight:900;color:#8593A6}
.rv-ficha-summary b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;color:#173257}

.rv-ficha-card{
  padding:15px;border:1px solid #D7E2EE;border-radius:15px;background:#fff;
  box-shadow:0 7px 18px rgba(11,38,82,.045);
}
.rv-ficha-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}
.rv-ficha-facts article{min-width:0;padding:10px 11px;border:1px solid #E0E7F0;border-radius:10px;background:#F9FBFE}
.rv-ficha-facts article.wide{grid-column:span 2}
.rv-ficha-facts small,.rv-owner-name small,.rv-date-grid small{display:block;margin-bottom:4px;font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#8290A4}
.rv-ficha-facts b,.rv-date-grid b{display:block;font-size:10px;line-height:1.35;color:#18345D;overflow-wrap:anywhere}
.rv-ficha-facts .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9px;letter-spacing:.02em}
.rv-owner-card{background:linear-gradient(135deg,#FBFAFF,#fff)}
.rv-owner-name{margin-top:12px;padding:12px;border:1px solid #DED7F6;border-radius:11px;background:#FAF8FF}
.rv-owner-name strong{display:block;font-size:12px;line-height:1.35;color:#172F57}
.rv-date-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.rv-date-grid article{padding:10px 11px;border:1px solid #E1E7EF;border-radius:10px;background:#fff}

.rv-incident-v2{
  margin-bottom:18px;padding:15px!important;border-radius:15px!important;
  border:1px solid #D7E2EE!important;background:#fff!important;
  box-shadow:0 8px 20px rgba(14,39,76,.05);
}
.rv-incident-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.rv-incident-count{padding:6px 8px;border-radius:999px;background:#EDF2F8;color:#607086;font-size:8px;font-weight:900;white-space:nowrap}
.rv-incident-count[data-active="true"]{background:#FFE9E6;color:#AC352D}
.rv-incident-v2>p{margin:8px 0 0!important;padding-left:44px;font-size:9px!important;line-height:1.45!important}
.rv-inc-list-v2{margin-top:3px}
.rv-inc-list-v2 span{display:grid!important;gap:2px!important;padding:9px 10px!important;border:1px solid #F1C8C3;background:#FFF5F4!important}
.rv-inc-list-v2 b{font-size:9px}.rv-inc-list-v2 em{font-style:normal;font-size:8px;color:#7D5B58}
.rv-incident-form-v2{display:grid;gap:9px;padding-top:4px}
.rv-incident-form-v2 label{display:grid;gap:4px}
.rv-incident-form-v2 label>span{font-size:8px;font-weight:850;color:#65768D}
.rv-incident-form-v2 select,.rv-incident-form-v2 input,.rv-incident-form-v2 textarea{
  border:1px solid #C9D7E7!important;border-radius:10px!important;background:#FBFCFE!important;
  padding:10px 11px!important;font-size:10px!important;color:#213A5F!important;
}
.rv-incident-form-v2 select:focus,.rv-incident-form-v2 input:focus,.rv-incident-form-v2 textarea:focus{outline:none;border-color:#4A83D4!important;box-shadow:0 0 0 3px rgba(74,131,212,.11)}
.rv-save-incident{min-height:40px;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;border-radius:10px!important;background:linear-gradient(135deg,#165BC5,#267DE0)!important;border:0!important;box-shadow:0 8px 18px rgba(22,91,197,.18)}

@media(max-width:620px){
  .rv-ficha-summary{grid-template-columns:1fr}
  .rv-ficha-facts{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rv-ficha-facts article.wide{grid-column:span 2}
  .rv-ficha-main{align-items:flex-start;flex-direction:column;gap:10px}
  .rv-ficha-plate{padding-left:0;border-left:0}
}
</style>


<style scoped>
/* drawer v2 collision fixes */
.rv-drawer-v2{
  display:block!important;
  height:100vh!important;
  overflow-y:auto!important;
  overflow-x:hidden!important;
  scroll-behavior:smooth;
}
.rv-drawer-v2>.rv-ficha-hero{
  display:block!important;
  align-items:initial!important;
  justify-content:initial!important;
  gap:0!important;
  min-height:190px;
  padding:22px 24px 20px!important;
  border-bottom:0!important;
  flex:none!important;
}
.rv-ficha-hero small{
  color:inherit!important;
}
.rv-ficha-hero .rv-ficha-main small,
.rv-ficha-hero .rv-ficha-plate small{
  color:#BFD8FF!important;
}
.rv-ficha-hero .rv-ficha-main h2{
  color:#fff!important;
}
.rv-ficha-hero .rv-ficha-subline span{
  color:#E6F1FF!important;
}
.rv-ficha-hero .rv-ficha-status-row span{
  font-size:8px!important;
}
.rv-drawer-v2 .rv-section-title{
  display:flex!important;
  flex-direction:row!important;
  align-items:center!important;
  justify-content:flex-start!important;
  gap:10px!important;
  padding:0!important;
  margin:0!important;
  border:0!important;
  text-align:left!important;
}
.rv-drawer-v2 .rv-section-title>div{
  display:grid!important;
  gap:1px!important;
  min-width:0;
}
.rv-drawer-v2 .rv-section-title>div>small{
  display:block!important;
  padding:0!important;
  background:transparent!important;
  color:#7788A0!important;
  font-family:Inter,system-ui,sans-serif!important;
  font-size:8px!important;
  line-height:1.2!important;
  letter-spacing:.08em!important;
}
.rv-drawer-v2 .rv-section-title>div>b{
  display:block!important;
  color:#112C55!important;
  font-size:13px!important;
  line-height:1.25!important;
}
.rv-drawer-v2 .rv-ficha-card,
.rv-drawer-v2 .rv-ficha-summary,
.rv-drawer-v2 .rv-diffs-v2{
  position:relative;
  z-index:1;
}
.rv-drawer-v2>.rv-ficha-card:last-of-type{
  margin-bottom:20px;
}
.rv-ficha-facts article,
.rv-owner-name,
.rv-date-grid article,
.rv-ficha-summary article{
  overflow:visible!important;
}
.rv-ficha-facts b,
.rv-owner-name strong,
.rv-date-grid b,
.rv-ficha-summary b{
  white-space:normal!important;
  overflow:visible!important;
  text-overflow:clip!important;
}
@media(max-width:800px){
  .rv-drawer-v2>.rv-ficha-hero{
    min-height:180px;
  }
  .rv-drawer-v2 .rv-section-title{
    flex-direction:row!important;
    align-items:center!important;
  }
}
</style>
