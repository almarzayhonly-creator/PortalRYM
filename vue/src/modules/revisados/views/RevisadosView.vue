<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { revisadosService, type RevisadosNavItem } from '../services/revisados.service'
import type { CanonicalRevisadoRow, CanonicalRevisadosResponse, RevisadoRecord } from '../types/revisados.types'
import { useRevisados } from '../composables/useRevisados'
import GaleraComparison from '../components/GaleraComparison.vue'
import RevisadosFilterBar from '../components/RevisadosFilterBar.vue'
import RevisadosTable from '../components/RevisadosTable.vue'
import RymIcon from '../components/RymIcon.vue'
import OperationsView from '../operations/OperationsView.vue'

const data=ref<CanonicalRevisadosResponse>(), records=ref<RevisadoRecord[]>([]), loading=ref(true), error=ref(''), active=ref('dashboard')
const profile=ref({nombre:'Portal RYM',rol:'',scope_label:''}), navItems=ref<RevisadosNavItem[]>([])
const {filters,filtered,metrics,options,clearFilters}=useRevisados(records)
const rawRows=computed(()=>Array.isArray(data.value?.rows)?data.value.rows as CanonicalRevisadoRow[]:[])
const pending=computed(()=>rawRows.value.filter(r=>!r.emitido))
const emitted=computed(()=>Array.isArray((data.value?.emitidos_hoy as {rows?:CanonicalRevisadoRow[]}|undefined)?.rows)?(data.value?.emitidos_hoy as {rows:CanonicalRevisadoRow[]}).rows:[])
const emittedToday=computed(()=>data.value?.emitidos_hoy as {emitidos?:number; limite?:number; disponibles?:number; excedente?:number; rows?:CanonicalRevisadoRow[]}|undefined)
const monthly=computed(()=>Array.isArray(data.value?.monthly)?data.value.monthly as Array<Record<string,unknown>>:[])
const gallery=computed(()=>Array.isArray(data.value?.por_galera)?data.value.por_galera as Array<Record<string,unknown>>:[])
const selectedGalera=ref(''), selectedStatus=ref(''), quickFilter=ref('all')
const monthlyDetail=ref<{mes_num:number;mes_nombre:string;galera:string}|null>(null)
const monthlyOnlyPending=ref(true)
const operationsResetKey=ref(0)
const cupos=ref<Array<Record<string,unknown>>>([]), cuposLoading=ref(false), cuposError=ref('')
const fichaOpen=ref(false), fichaLoading=ref(false), fichaError=ref(''), ficha=ref<Record<string,any>|null>(null), fichaRow=ref<CanonicalRevisadoRow|null>(null)
const incidentBusy=ref(false), incidentType=ref(''), incidentCustom=ref(''), incidentNote=ref('')
const manualPlate=ref(''), manualBusy=ref(false), manualState=ref('Listo para consultar'), manualResult=ref<Record<string,any>|null>(null)
const syncBusy=ref(false), syncState=ref('Listo para actualizar'), syncPhase=ref<'idle'|'running'|'success'|'warning'|'error'>('idle'), syncProgress=ref({procesadas:0,total:0,nuevos:0,fichas_ok:0,fichas_pendientes:0,bloqueadas:0,errores:0})
const boletaBusy=ref(false), boletaState=ref('Listo para consultar'), boletaCopyState=ref(''), boletaProgress=ref({procesadas:0,total:0}), boletaCompanies=ref<Array<Record<string,any>>>([]), boletaFilter=ref('TODAS')
const boletaVehicleModels=ref<Record<string,string>>({}), boletaModelsBusy=ref(false)
const dailyRecipients=ref<Array<Record<string,any>>>([]), dailyRecipientsLoading=ref(false), dailyRecipientsError=ref(''), dailySearch=ref(''), dailySelected=ref<string[]>([]), dailyManualEmail=ref(''), dailySending=ref(false), dailySendState=ref(''), dailyPreview=ref(false)
const canOperate=computed(()=>Boolean(data.value?.profile?.can?.operations))
const isAdminTotal=computed(()=>String(profile.value.rol||'').trim().toUpperCase()==='ADMIN_TOTAL')
const dailyPendingGroups=computed(()=>{const map=new Map<string,CanonicalRevisadoRow[]>();for(const r of pending.value){const g=text(r.galera)==='—'?'OTROS':text(r.galera);if(!map.has(g))map.set(g,[]);map.get(g)!.push(r)}return [...map.entries()].map(([galera,rows])=>({galera,rows})).sort((a,b)=>b.rows.length-a.rows.length||a.galera.localeCompare(b.galera,'es'))})
const filteredDailyRecipients=computed(()=>{const q=dailySearch.value.trim().toLowerCase();if(!q)return dailyRecipients.value;return dailyRecipients.value.filter(r=>[r.nombre,r.email,r.tipo,r.galera].some(x=>String(x||'').toLowerCase().includes(q)))})
const BOLETA_COMPANY_TARGET=16
const boletaCompanyRows=computed<Array<Record<string,any>>>(()=>boletaCompanies.value.map((g:Record<string,any>):Record<string,any>=>({
  ...g,
  status:boletaCompanyStatus(g),
  restriction:boletaCompanyRestriction(g)
})).sort((a:Record<string,any>,b:Record<string,any>)=>{
  const rank=(v:string)=>v==='CON RESTRICCIÓN'?0:v==='ERROR'?1:v==='PENDIENTE'?2:3
  return rank(String(a.status))-rank(String(b.status))||String(a.empresa||'').localeCompare(String(b.empresa||''),'es')
}))
const filteredBoletaCompanies=computed(()=>boletaCompanyRows.value.filter(g=>boletaFilter.value==='TODAS'||g.status===boletaFilter.value))
const boletaPositiveCompanies=computed(()=>boletaCompanyRows.value.filter(g=>g.status==='CON RESTRICCIÓN').length)
const boletaCleanCompanies=computed(()=>boletaCompanyRows.value.filter(g=>g.status==='SIN RESTRICCIÓN').length)
const boletaErrorCompanies=computed(()=>boletaCompanyRows.value.filter(g=>g.status==='ERROR').length)
const boletaCheckedCompanies=computed(()=>boletaCompanyRows.value.filter(g=>g.status!=='PENDIENTE').length)
const BOLETA_CHECK_TARGET=BOLETA_COMPANY_TARGET*2
const boletaCompletedChecks=computed(()=>boletaCompanyRows.value.reduce((sum,g)=>sum+(Array.isArray(g.checks)?g.checks.length:0),0))
const historyFilterCount=computed(()=>filters.value.galeras.length+filters.value.supervisoras.length+filters.value.estados.length+(filters.value.search.trim()?1:0))
const cuposSummary=computed(()=>{
  const quantity=cupos.value.reduce((sum,row)=>sum+Number(row.cantidad||0),0)
  const approved=cupos.value.filter(row=>['APROBADO','COMPLETADO','PAGADO','OK'].includes(String(row.estado||'').trim().toUpperCase())).length
  return {quantity,approved,total:cupos.value.length}
})
const incidentTypes=computed(()=>Array.isArray(data.value?.incident_types)?data.value?.incident_types as Array<Record<string,any>>:[])
const incidents=computed(()=>Array.isArray(data.value?.incidents)?data.value?.incidents as Array<Record<string,any>>:[])
const fichaOpenIncidents=computed(()=>{const id=ficha.value?.unidad?.id;if(id==null)return [];return incidents.value.filter(i=>String(i.unidad_id)===String(id)&&String(i.estado)==='ABIERTA')})
function text(v:unknown){return String(v??'—')}
function num(v:unknown){return new Intl.NumberFormat('es-PA').format(Number(v)||0)}
function date(v:unknown){try{return v?new Intl.DateTimeFormat('es-PA',{dateStyle:'medium',timeZone:'America/Panama'}).format(new Date(String(v))):'—'}catch{return text(v)}}
function monthName(v:unknown){
  const n=Number(v)
  const names=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return names[n-1]||('Mes '+String(v||'—'))
}
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
function dashboardReason(r:CanonicalRevisadoRow){
  if(Boolean(r.boleta_empresa))return 'Boleta de empresa'
  if(Boolean(r.boleta_pendiente))return 'Boleta de placa'
  const pendingType=String(r.pendiente_tipo||'').trim()
  if(pendingType){
    const normalized=pendingType.replaceAll('_',' ').toLowerCase()
    if(normalized.includes('color'))return 'Cambio de color'
    return normalized.replace(/\b\w/g,m=>m.toUpperCase())
  }
  const firstAlert=r.alerts?.[0]
  if(firstAlert){
    const label=String(firstAlert.tipo||firstAlert.texto||'Alerta operativa').replaceAll('_',' ')
    return label.length>42?label.slice(0,39)+'…':label
  }
  const incident=r.incidencias_abiertas?.[0]
  if(incident)return String(incident.tipo_nombre||incident.tipo_codigo||'Incidencia').replaceAll('_',' ')
  if(r.bloqueado)return 'Bloqueo operativo'
  return 'Revisado pendiente'
}
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
function dashboardPriorityRank(r:CanonicalRevisadoRow){
  const p=String(r.prioridad||r.pendiente_tipo||'').toUpperCase()
  if(p.includes('CRIT'))return 0
  if(p.includes('URG'))return 1
  if(p.includes('ALTA'))return 2
  return 3
}
const focusRows=computed(()=>[...pending.value].sort((a,b)=>{
  const blocked=Number(Boolean(b.bloqueado))-Number(Boolean(a.bloqueado))
  return blocked||dashboardPriorityRank(a)-dashboardPriorityRank(b)
}).slice(0,3))
const dashboardGallery=computed(()=>gallery.value.map(g=>{
  const total=Number(g.total||0)
  const covered=Number(g.cubiertas||0)
  const pendingCount=Number(g.pendientes||0)
  const alerts=Number(g.alertas||0)
  const blocked=Number(g.bloqueadas||0)
  const pct=total?Math.round(covered*100/total):0
  const tone=alerts>20||pct<75?'risk':pct<90?'watch':'good'
  return {
    galera:String(g.galera||'OTROS'),
    total,covered,pending:pendingCount,alerts,blocked,pct,tone,
    statusLabel:tone==='good'?'Controlado':tone==='watch'?'En seguimiento':'Atención'
  }
}).filter(g=>g.total>0))
const cycleGlance=computed(()=>monthly.value.filter(m=>Number(m.total||m.activas||0)>0).slice(-3))
const EXECUTIVE_GALERAS=['VCOMP','VIPCO','VINDU','VCARS'] as const
const executiveGaleras=computed(()=>[...EXECUTIVE_GALERAS])
const executiveAllMonths=computed(()=>monthly.value
  .filter(m=>EXECUTIVE_GALERAS.some(g=>monthlyGaleraCell(m,g).total>0))
  .sort((a,b)=>Number(a.mes_num||0)-Number(b.mes_num||0)))
const executiveMonths=computed(()=>monthlyOnlyPending.value
  ? executiveAllMonths.value.filter(m=>EXECUTIVE_GALERAS.some(g=>monthlyGaleraCell(m,g).pending>0))
  : executiveAllMonths.value)
function monthlyGaleraCell(m:Record<string,unknown>,galera:string){
  const gs=(m.galeras&&typeof m.galeras==='object'?m.galeras:{}) as Record<string,Record<string,unknown>>
  const raw=gs[galera]||{}
  const total=Number(raw.total||0)
  const covered=Number(raw.cubiertas||0)
  const pending=Number(raw.pendientes||0)
  const pct=total?Math.round(covered*100/total):0
  const tone=!total?'neutral':pct===100?'good':pct>=85?'watch':'risk'
  return {total,covered,pending,pct,tone}
}
function monthlyGaleraTotal(galera:string){
  let total=0,covered=0,pending=0
  for(const m of executiveMonths.value){
    const cell=monthlyGaleraCell(m,galera)
    total+=cell.total
    covered+=cell.covered
    pending+=cell.pending
  }
  return {total,covered,pending,pct:total?Math.round(covered*100/total):0}
}
function monthlyMonthTotal(m:Record<string,unknown>){
  let total=0,covered=0,pending=0
  for(const g of EXECUTIVE_GALERAS){
    const cell=monthlyGaleraCell(m,g)
    total+=cell.total
    covered+=cell.covered
    pending+=cell.pending
  }
  return {total,covered,pending,pct:total?Math.round(covered*100/total):0}
}
function monthlyRangeLabel(){
  if(!executiveMonths.value.length)return 'Sin ciclos'
  return monthName(executiveMonths.value[0].mes_num)+' – '+monthName(executiveMonths.value[executiveMonths.value.length-1].mes_num)
}
function exportMonthlyCsv(){
  const headers=['MES / CICLO',...executiveGaleras.value.flatMap(g=>[g+' CUBIERTAS',g+' TOTAL',g+' %',g+' PENDIENTES']),'TOTAL MES CUBIERTAS','TOTAL MES','TOTAL MES %','TOTAL MES PENDIENTES']
  const rows=executiveMonths.value.map(m=>{
    const out:Array<string|number>=[String(m.mes_nombre||monthName(m.mes_num))]
    for(const g of executiveGaleras.value){
      const cell=monthlyGaleraCell(m,g)
      out.push(cell.covered,cell.total,cell.pct,cell.pending)
    }
    const total=monthlyMonthTotal(m)
    out.push(total.covered,total.total,total.pct,total.pending)
    return out
  })
  const quote=(v:string|number)=>'"'+String(v).replaceAll('"','""')+'"'
  const csv='\ufeff'+[headers,...rows].map(row=>row.map(quote).join(';')).join('\r\n')
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url
  a.download='avance-mensual-revisados.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
const monthlyExecutiveSummary=computed(()=>{
  let total=0,covered=0,pendingCount=0
  const byGal=new Map<string,{galera:string,total:number,covered:number,pending:number}>()
  for(const m of executiveMonths.value){
    for(const g of executiveGaleras.value){
      const cell=monthlyGaleraCell(m,g)
      total+=cell.total
      covered+=cell.covered
      pendingCount+=cell.pending
      const current=byGal.get(g)||{galera:g,total:0,covered:0,pending:0}
      current.total+=cell.total
      current.covered+=cell.covered
      current.pending+=cell.pending
      byGal.set(g,current)
    }
  }
  const rows=[...byGal.values()].map(g=>({...g,pct:g.total?Math.round(g.covered*100/g.total):0}))
  const highest=[...rows].sort((a,b)=>b.pending-a.pending||a.galera.localeCompare(b.galera))[0]
  const best=[...rows].filter(g=>g.total>0).sort((a,b)=>b.pct-a.pct||a.pending-b.pending)[0]
  return {
    total,covered,pending:pendingCount,pct:total?Math.round(covered*100/total):0,
    highest:highest||{galera:'—',pending:0,pct:0,total:0,covered:0},
    best:best||{galera:'—',pending:0,pct:0,total:0,covered:0}
  }
})
const monthlyUpdatedLabel=computed(()=>{
  const value=data.value?.generated_at||data.value?.panama_now
  if(!value)return '—'
  try{
    const parsed=new Date(String(value))
    if(Number.isNaN(parsed.getTime()))return String(value)
    return new Intl.DateTimeFormat('es-PA',{dateStyle:'short',timeStyle:'short',timeZone:'America/Panama'}).format(parsed)
  }catch{return String(value)}
})
const monthlyPendingRows=computed(()=>{
  if(!monthlyDetail.value)return []
  return rawRows.value.filter(r=>
    Number(r.mes_num||0)===monthlyDetail.value?.mes_num
    &&String(r.galera||'').trim().toUpperCase()===monthlyDetail.value?.galera.toUpperCase()
    &&Boolean(r.requiere_atencion)
  )
})
function openMonthlyCell(m:Record<string,unknown>,galera:string){
  monthlyDetail.value={mes_num:Number(m.mes_num||0),mes_nombre:String(m.mes_nombre||monthName(m.mes_num)),galera}
}
function closeMonthlyDetail(){monthlyDetail.value=null}
async function copyMonthlySummary(){
  const s=monthlyExecutiveSummary.value
  const range=executiveMonths.value.length
    ? monthName(executiveMonths.value[0].mes_num)+' – '+monthName(executiveMonths.value[executiveMonths.value.length-1].mes_num)
    :'Sin ciclos pendientes'
  const lines=[
    '*Avance mensual de revisados*',
    'Corte: '+range,
    'Cobertura acumulada: '+s.pct+'% ('+num(s.covered)+' / '+num(s.total)+')',
    'Pendientes acumulados: '+num(s.pending),
    'Mayor carga pendiente: '+s.highest.galera+' · '+num(s.highest.pending),
    'Galera mejor cubierta: '+s.best.galera+' · '+s.best.pct+'%',
    '',
    ...executiveMonths.value.map(m=>{
      const parts=executiveGaleras.value.map(g=>{
        const cell=monthlyGaleraCell(m,g)
        return g+' '+cell.covered+'/'+cell.total+' ('+cell.pct+'%)'
      })
      return '• '+String(m.mes_nombre||monthName(m.mes_num))+': '+parts.join(' · ')
    })
  ]
  try{
    await navigator.clipboard.writeText(lines.join('\n'))
  }catch{
    const area=document.createElement('textarea')
    area.value=lines.join('\n')
    area.style.position='fixed';area.style.opacity='0'
    document.body.appendChild(area);area.focus();area.select();document.execCommand('copy');area.remove()
  }
}
function printMonthlyReport(){window.print()}

const dailyCapacity=computed(()=>{
  const limit=Math.max(1,Number(emittedToday.value?.limite||33))
  const emittedCount=Number(emittedToday.value?.emitidos||emitted.value.length||0)
  return {
    emitted:emittedCount,
    limit,
    available:Number(emittedToday.value?.disponibles??Math.max(0,limit-emittedCount)),
    pct:Math.min(100,Math.round(emittedCount*100/limit))
  }
})
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
async function runSyncEcarcheck(){
  if(syncBusy.value||!confirm('¿Actualizar los últimos revisados usando eCarCheck V2?'))return
  syncBusy.value=true
  syncPhase.value='running'
  syncState.value='Solicitando listado V2…'
  syncProgress.value={procesadas:0,total:0,nuevos:0,fichas_ok:0,fichas_pendientes:0,bloqueadas:0,errores:0}
  try{
    const started=await revisadosService.iniciarSyncEcarcheck()
    if(!started?.ok||!started?.run_id)throw new Error(String(started?.error||'No se pudo iniciar la actualización'))
    for(let i=0;i<120;i++){
      const d=await revisadosService.estadoSyncEcarcheck(String(started.run_id))
      if(!d?.ok)throw new Error(String(d?.error||'No se pudo consultar el estado'))
      syncProgress.value={
        procesadas:Number(d.procesadas||0),
        total:Number(d.total||0),
        nuevos:Number(d.nuevos||0),
        fichas_ok:Number(d.fichas_ok||0),
        fichas_pendientes:Number(d.fichas_pendientes||0),
        bloqueadas:Number(d.bloqueadas||0),
        errores:Number(d.errores||0)
      }
      const estado=String(d.estado||'').toUpperCase()
      if(estado==='ESPERANDO_LISTADO')syncState.value='Conectando con el puente V2 y esperando el listado…'
      else if(estado==='ESPERANDO_RESULTADO_LISTADO')syncState.value='Recibiendo el listado oficial de eCarCheck…'
      else syncState.value=`Procesando ${syncProgress.value.procesadas} de ${syncProgress.value.total||'—'} · ${syncProgress.value.nuevos} nuevos`
      if(d.done){
        if(estado==='ERROR'){
          syncPhase.value='error'
          syncState.value=String(d.error||'La sincronización terminó con error')
        }else{
          const hasWarnings=syncProgress.value.errores>0||syncProgress.value.fichas_pendientes>0||syncProgress.value.bloqueadas>0||estado==='OK_CON_ALERTAS'
          syncPhase.value=hasWarnings?'warning':'success'
          syncState.value=hasWarnings
            ?'Sincronización completada con observaciones'
            :'Sincronización completada correctamente'
        }
        await load(true)
        return
      }
      await wait(2500)
    }
    throw new Error('La actualización continúa pendiente.')
  }catch(e){
    syncPhase.value='error'
    syncState.value=e instanceof Error?e.message:String(e)
  }finally{
    syncBusy.value=false
  }
}

function boletaCompanyStatus(g:Record<string,any>){
  const checks=Array.isArray(g.checks)?g.checks:[]
  if(!checks.length)return 'PENDIENTE'
  const clas=String(g.clasificacion||'').trim().toUpperCase()
  const hasRestriction=(clas&&clas!=='SIN BOLETAS')||checks.some((x:Record<string,any>)=>Number(x.ena||0)>0||Number(x.documento||0)>0||Number(x.placa_boleta||0)>0)
  if(hasRestriction)return 'CON RESTRICCIÓN'
  if(checks.some((x:Record<string,any>)=>Boolean(x.error_code)||['ERROR','SESION_REQUERIDA','CANCELADO'].includes(String(x.estado||'').toUpperCase())))return 'ERROR'
  return 'SIN RESTRICCIÓN'
}
function boletaCompanyRestriction(g:Record<string,any>){
  const status=boletaCompanyStatus(g)
  if(status==='SIN RESTRICCIÓN')return 'Sin restricción reportada'
  if(status==='ERROR')return 'Consulta incompleta · no se pudo validar'
  if(status==='PENDIENTE')return 'Pendiente de consulta'
  const clas=String(g.clasificacion||'').trim().toUpperCase()
  if(clas==='BOLETA EMPRESA')return 'Boleta de empresa detectada'
  if(clas==='BOLETA UNIDAD')return 'Boleta de placa detectada'
  if(clas==='INFRACCION ENA')return 'Infracción ENA detectada'
  const checks=Array.isArray(g.checks)?g.checks:[]
  const labels:string[]=[]
  if(checks.some((x:Record<string,any>)=>Number(x.documento||0)>0))labels.push('Boleta por documento')
  if(checks.some((x:Record<string,any>)=>Number(x.placa_boleta||0)>0))labels.push('Boleta por placa')
  if(checks.some((x:Record<string,any>)=>Number(x.ena||0)>0))labels.push('Infracción ENA')
  return labels.join(' · ')||'Restricción eCarCheck detectada'
}
function boletaCheckSummary(x:Record<string,any>){
  const labels:string[]=[]
  if(Number(x.documento||0)>0)labels.push('Boleta por documento')
  if(Number(x.placa_boleta||0)>0)labels.push('Boleta por placa')
  if(Number(x.ena||0)>0)labels.push('Infracción ENA')
  if(x.error_code)labels.push('Consulta incompleta')
  return labels.join(' · ')||'Sin restricción reportada'
}
function boletaTextValue(...values:any[]){
  for(const value of values){
    if(value===null||value===undefined)continue
    if(typeof value==='string'&&value.trim()&&value.trim()!=='[object Object]')return value.trim()
    if(typeof value==='number'&&Number.isFinite(value))return String(value)
  }
  return ''
}
function boletaCheckModel(x:Record<string,any>){
  const direct=[x.marca,x.modelo].map(v=>String(v||'').trim()).filter(Boolean).join(' ')
  if(direct)return direct
  const alt=boletaTextValue(x.modelo_vehiculo,x.modelo_control,x.modelo_ecarcheck,x.model)
  if(alt)return alt
  const id=String(x.unidad_id||'').trim()
  const plate=String(x.placa||'').trim().toUpperCase()
  const unit=String(x.unidad||'').trim().toUpperCase()
  const cached=boletaVehicleModels.value[id]||boletaVehicleModels.value[plate]||boletaVehicleModels.value[unit]
  if(cached)return cached
  const row=rawRows.value.find(r=>(plate&&String(r.placa||'').trim().toUpperCase()===plate)||(unit&&String(r.unidad||'').trim().toUpperCase()===unit)) as Record<string,any>|undefined
  const fromRow=row?[row.marca,row.modelo].map(v=>String(v||'').trim()).filter(Boolean).join(' '):''
  return fromRow||'Modelo no disponible'
}
async function hydrateBoletaModels(){
  if(boletaModelsBusy.value)return
  const checks=boletaCompanies.value.flatMap(g=>Array.isArray(g.checks)?g.checks:[])
  const ids=[...new Set(checks.map((x:Record<string,any>)=>String(x.unidad_id||'').trim()).filter(Boolean))]
  if(!ids.length)return
  const missing=ids.filter(id=>!boletaVehicleModels.value[id])
  if(!missing.length)return
  boletaModelsBusy.value=true
  try{
    const safe=missing.filter(id=>/^[0-9a-f-]{36}$/i.test(id))
    if(!safe.length)return
    const query='/rest/v1/unidades?select=id,unidad,placa_unica,marca,modelo&id=in.('+safe.join(',')+')'
    const rows=await revisadosService.request(query)
    if(!Array.isArray(rows))return
    const next={...boletaVehicleModels.value}
    for(const row of rows as Array<Record<string,any>>){
      const model=[row.marca,row.modelo].map(v=>String(v||'').trim()).filter(Boolean).join(' ')||'Modelo no disponible'
      const id=String(row.id||'').trim()
      const plate=String(row.placa_unica||'').trim().toUpperCase()
      const unit=String(row.unidad||'').trim().toUpperCase()
      if(id)next[id]=model
      if(plate)next[plate]=model
      if(unit)next[unit]=model
    }
    boletaVehicleModels.value=next
  }catch(e){
    console.warn('No se pudieron cargar los modelos de Boletas',e)
  }finally{
    boletaModelsBusy.value=false
  }
}
function boletaCheckResult(x:Record<string,any>){
  const nested=(x.ecarcheck&&typeof x.ecarcheck==='object'?x.ecarcheck:null)
    ||(x.resultado&&typeof x.resultado==='object'?x.resultado:null)
    ||(x.result&&typeof x.result==='object'?x.result:null)
    ||{}
  const detail=boletaTextValue(
    x.resultado_ecarcheck,
    typeof x.resultado==='string'?x.resultado:'',
    x.detalle_ecarcheck,
    x.detalle,
    x.mensaje,
    x.descripcion,
    nested.resultado_ecarcheck,
    nested.resultado,
    nested.detalle,
    nested.mensaje,
    nested.descripcion
  )
  if(detail)return detail
  if(x.error_code)return 'No se pudo validar esta placa · '+String(x.error_code)
  return boletaCheckSummary(x)
}
function boletaWhatsAppText(){
  const rows=boletaCompanyRows.value
  const restricted=rows.filter(g=>g.status==='CON RESTRICCIÓN')
  const checked=boletaCheckedCompanies.value
  const lines=[
    '*Boletas eCarCheck*',
    `Consulta de empresas: ${checked}/${BOLETA_COMPANY_TARGET}`,
    '',
    `✅ Sin restricción: ${boletaCleanCompanies.value}`,
    `⚠️ Con restricción: ${boletaPositiveCompanies.value}`
  ]
  if(boletaErrorCompanies.value)lines.push(`❗ Con error de consulta: ${boletaErrorCompanies.value}`)
  lines.push('')
  if(restricted.length){
    lines.push('*Empresas con restricción:*')
    for(const g of restricted){
      const plates=(Array.isArray(g.checks)?g.checks:[]).map((x:Record<string,any>)=>String(x.placa||'')).filter(Boolean)
      lines.push(`• ${g.empresa||'Empresa'} — ${g.restriction}${plates.length?' · '+plates.join(', '):''}`)
    }
  }else if(rows.length){
    lines.push('✅ No se detectaron restricciones en las empresas consultadas.')
  }else{
    lines.push('Aún no se ha ejecutado la consulta.')
  }
  return lines.join('\n')
}
async function copyBoletasWhatsApp(){
  const t=boletaWhatsAppText()
  try{
    await navigator.clipboard.writeText(t)
  }catch{
    const area=document.createElement('textarea')
    area.value=t
    area.style.position='fixed'
    area.style.opacity='0'
    document.body.appendChild(area)
    area.focus()
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  boletaCopyState.value='Resumen copiado para WhatsApp'
  window.setTimeout(()=>{boletaCopyState.value=''},2200)
}
async function pollBoletasV2(runId:string){
  if(boletaBusy.value)return
  boletaBusy.value=true
  localStorage.setItem('rym_v166_boletas_run',runId)
  let lastProcessed=-1
  let stalledPolls=0
  let transientErrors=0
  try{
    for(let i=0;i<180;i++){
      let d:Record<string,any>
      try{
        d=await revisadosService.estadoBoletasV2(runId)
        transientErrors=0
      }catch(e){
        transientErrors++
        boletaState.value=`Reconectando con eCarCheck… intento ${transientErrors}/3`
        if(transientErrors<=3){await wait(2500);continue}
        throw e
      }
      if(!d?.ok)throw new Error(String(d?.error||'Error consultando lote V2'))
      const processed=Number(d.procesadas||0)
      const total=Number(d.total||0)
      boletaProgress.value={procesadas:processed,total}
      boletaCompanies.value=Array.isArray(d.companies)?d.companies:[]
      void hydrateBoletaModels()
      if(processed===lastProcessed)stalledPolls++
      else{lastProcessed=processed;stalledPolls=0}
      const companiesDone=boletaCompanyRows.value.filter(g=>g.status!=='PENDIENTE').length
      const checksDone=boletaCompanyRows.value.reduce((sum,g)=>sum+(Array.isArray(g.checks)?g.checks.length:0),0)
      if(d.done){
        boletaState.value=`Consulta finalizada · ${companiesDone}/${BOLETA_COMPANY_TARGET} empresas consultadas`
        localStorage.removeItem('rym_v166_boletas_run')
        await load(true)
        return
      }
      boletaState.value=stalledPolls>=8
        ? `Esperando respuesta eCarCheck · ${companiesDone}/${BOLETA_COMPANY_TARGET} empresas · ${checksDone}/${BOLETA_CHECK_TARGET} placas`
        : `Procesando ${companiesDone} de ${BOLETA_COMPANY_TARGET} empresas…`
      await wait(2500)
    }
    throw new Error('La consulta sigue en proceso. Puedes salir y volver a Boletas; el seguimiento se reanudará automáticamente.')
  }catch(e){
    boletaState.value=e instanceof Error?e.message:String(e)
  }finally{
    boletaBusy.value=false
  }
}
async function runBoletasV2(){if(boletaBusy.value||!confirm('¿Consultar las 16 empresas usando eCarCheck V2? Se validarán 2 placas activas por empresa.'))return;boletaCopyState.value='';boletaState.value='Preparando consulta de 16 empresas…';try{const d=await revisadosService.iniciarBoletasV2();if(!d?.ok||!d?.run_id)throw new Error(String(d?.error||'No se pudo iniciar'));await pollBoletasV2(String(d.run_id))}catch(e){boletaState.value=e instanceof Error?e.message:String(e)}}
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
      <div class="rv-brand-mark rv-brand-main"><strong>RYM</strong><i></i></div>
      <div class="rv-brand-copy"><b>Revisados RYM</b><small>Control legal vehicular</small></div>
    </div>
    <div class="rv-side-profile rv-side-profile-main">
      <span>{{profile.nombre}}</span><b>{{profile.rol}}</b><small>{{profile.scope_label}}</small>
    </div>
    <div class="rv-nav-label">MÓDULO REVISADOS</div>
    <nav>
      <button v-for="item in navItems" :key="item.id" :class="{active:active===item.id}" @click="open(item.id)">
        <RymIcon :name="navIcon(item.id)" :size="17"/>
        <em>{{navLabel(item.id,item.label)}}</em>
      </button>
    </nav>
    <button class="rv-back" @click="revisadosService.back()">← Volver al Portal</button>
  </aside>
  <section class="rv-main"><header class="rv-topbar">
      <div class="rv-page-heading">
        <small>REVISADOS RYM</small>
        <h1>{{navLabel(active, active)}}</h1>
        <span>{{active==='monthly'?'Reporte ejecutivo de cobertura por ciclo y galera. Haz clic en cualquier celda para ver el detalle.':'Control legal vehicular · datos operativos en tiempo real'}}</span>
      </div>
      <div class="rv-top-actions">
        <span v-if="active==='monthly'" class="rv-top-scope">{{profile.scope_label||'Todas las galeras'}}</span>
        <button v-else class="ghost" @click="clearAllFilters">Limpiar filtros</button>
        <button class="primary" :disabled="loading" @click="load(true)">{{loading?'Actualizando…':'Actualizar vista'}}</button>
      </div>
    </header>
    <div v-if="loading" class="rv-state">Cargando datos reales de Revisados…</div><div v-else-if="error" class="rv-state error"><b>No fue posible cargar Revisados.</b><span>{{error}}</span><button class="primary" @click="load(true)">Reintentar</button></div>
    <template v-else>
      <section v-if="active==='dashboard'" class="rv-stack rv-command-dashboard">
        <section class="rv-command-surface">
          <div class="rv-command-hero">
            <div class="rv-command-copy">
              <span class="rv-command-eyebrow"><i></i> REVISADOS · CONTROL LEGAL</span>
              <h2>Estado legal de la flota.</h2>
              <p><strong>{{num(metrics.vigentes)}} de {{num(metrics.total)}}</strong> unidades están al día. <b>{{num(metrics.pendientesCiclo)}}</b> requieren gestión.</p>
              <div class="rv-command-meter">
                <i :style="{width:coveragePct+'%'}"></i>
                <span>{{coveragePct}}% cobertura</span>
              </div>
              <div class="rv-command-actions">
                <button class="primary" @click="open(hero.action)">{{hero.label}}</button>
                <button v-if="criticalCount" class="ghost" @click="open(canOperate?'operations':'history')">{{num(criticalCount)}} alertas por revisar</button>
              </div>
            </div>

            <div class="rv-command-score">
              <div class="rv-score-orbit" :style="{'--score':coveragePct+'%'}">
                <div><strong>{{coveragePct}}</strong><span>%</span><small>AL DÍA</small></div>
              </div>
              <div class="rv-score-copy">
                <span><small>FLOTA VISIBLE</small><b>{{num(metrics.total)}}</b></span>
                <span><small>VIGENTES</small><b>{{num(metrics.vigentes)}}</b></span>
                <span><small>PENDIENTES</small><b>{{num(metrics.pendientesCiclo)}}</b></span>
              </div>
            </div>
          </div>

          <div class="rv-command-ribbon">
            <button @click="open('operations')" data-tone="blue">
              <span class="rv-ribbon-icon"><RymIcon name="schedule" :size="17"/></span>
              <div><small>PENDIENTES</small><b>{{num(metrics.pendientesCiclo)}}</b><em>Gestión del ciclo</em></div>
            </button>
            <button @click="open(canOperate?'operations':'history')" data-tone="red">
              <span class="rv-ribbon-icon"><RymIcon name="gavel" :size="17"/></span>
              <div><small>ALERTAS REALES</small><b>{{num(criticalCount)}}</b><em>Impedimentos activos</em></div>
            </button>
            <button @click="open('operations')" data-tone="amber">
              <span class="rv-ribbon-icon"><RymIcon name="palette" :size="17"/></span>
              <div><small>CAMBIO DE COLOR</small><b>{{num(metrics.cambiosColor)}}</b><em>Nuevo revisado</em></div>
            </button>
            <button @click="open('daily')" data-tone="cyan">
              <span class="rv-ribbon-icon"><RymIcon name="verified" :size="17"/></span>
              <div><small>EMITIDOS HOY</small><b>{{num(dailyCapacity.emitted)}} <i>/ {{num(dailyCapacity.limit)}}</i></b><em>{{num(dailyCapacity.available)}} cupos disponibles</em></div>
              <span class="rv-ribbon-meter"><i :style="{width:dailyCapacity.pct+'%'}"></i></span>
            </button>
          </div>
        </section>

        <div class="rv-quiet-signals">
          <span v-if="taxiCount"><i data-tone="amber"></i><b>{{num(taxiCount)}}</b> revisados taxi pendientes</span>
          <span><i data-tone="slate"></i><b>{{num(kpis.sin_fotos)}}</b> unidades sin fotos</span>
          <span class="live"><i data-tone="green"></i> Datos sincronizados con fuente real</span>
        </div>

        <div class="rv-control-layout">
          <section class="rv-gallery-deck-panel">
            <header class="rv-control-heading">
              <div><span>RED OPERATIVA</span><h3>Galeras en una mirada</h3><p>Prioriza dónde intervenir sin entrar a otra pantalla.</p></div>
              <small>{{dashboardGallery.length}} galeras</small>
            </header>

            <div class="rv-gallery-deck">
              <article v-for="g in dashboardGallery" :key="g.galera" class="rv-gallery-card" :data-tone="g.tone">
                <header>
                  <div><span>{{g.statusLabel}}</span><h4>{{g.galera}}</h4><small>{{num(g.total)}} unidades</small></div>
                  <strong>{{g.pct}}<i>%</i></strong>
                </header>
                <div class="rv-gallery-meter"><i :style="{width:g.pct+'%'}"></i></div>
                <footer>
                  <span><small>AL DÍA</small><b>{{num(g.covered)}}</b></span>
                  <span><small>PENDIENTES</small><b>{{num(g.pending)}}</b></span>
                  <span class="alert"><small>ALERTAS</small><b>{{num(g.alerts)}}</b></span>
                </footer>
              </article>
            </div>
          </section>

          <aside class="rv-decision-column">
            <section class="rv-decision-panel">
              <header class="rv-control-heading compact">
                <div><span>ATENDER AHORA</span><h3>Decisiones inmediatas</h3></div>
                <button @click="open('operations')">Ver cola →</button>
              </header>
              <div class="rv-decision-list">
                <button v-for="(r,index) in focusRows" :key="String(r.unidad_id||r.placa||r.unidad)" @click="openFicha(r)">
                  <span class="rv-decision-number">0{{index+1}}</span>
                  <div>
                    <b>{{r.unidad||'—'}} <i>·</i> {{r.placa||'—'}}</b>
                    <small>{{r.galera||'—'}} · {{r.supervisora||'Sin supervisora'}}</small>
                    <strong>{{dashboardReason(r)}}</strong>
                  </div>
                  <em :data-tone="vehicleStateTone(r)">{{String(r.prioridad||'ACTUAL')}}</em>
                </button>
              </div>
            </section>

            <section class="rv-today-panel">
              <div class="rv-today-orbit" :style="{'--today':dailyCapacity.pct+'%'}">
                <div><b>{{dailyCapacity.emitted}}</b><span>/{{dailyCapacity.limit}}</span></div>
              </div>
              <div class="rv-today-copy">
                <span>CAPACIDAD DIARIA</span>
                <h3>{{num(dailyCapacity.available)}} cupos libres hoy</h3>
                <p>{{dailyCapacity.pct}}% del límite utilizado.</p>
              </div>
              <button @click="open('daily')">Ver emitidos →</button>
            </section>

            <section class="rv-cycle-pulse">
              <header class="rv-control-heading compact">
                <div><span>PULSO DE CICLO</span><h3>Últimos meses</h3></div>
                <button @click="open('monthly')">Abrir →</button>
              </header>
              <article v-for="m in cycleGlance" :key="String(m.mes_num)">
                <div><b>{{m.mes_nombre||monthName(m.mes_num)}}</b><small>{{num(m.pendientes)}} pendientes</small></div>
                <div class="rv-pulse-meter"><i :style="{width:(Number(m.total||m.activas)?Math.round(Number(m.cubiertas||0)*100/Number(m.total||m.activas)):0)+'%'}"></i></div>
                <strong>{{Number(m.total||m.activas)?Math.round(Number(m.cubiertas||0)*100/Number(m.total||m.activas)):0}}%</strong>
              </article>
            </section>
          </aside>
        </div>
      </section>
      <OperationsView
        v-else-if="active==='operations'"
        :rows="pending"
        :total-fleet="rawRows.length"
        :up-to-date="metrics.vigentes"
        :sync-busy="syncBusy"
        :sync-state="syncState"
        :sync-phase="syncPhase"
        :sync-progress="syncProgress"
        :emitted-rows="emitted"
        :emitted-limit="Number(emittedToday?.limite||33)"
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
      <section v-else-if="active==='monthly'" class="rv-stack rv-workspace-tab rv-monthly-stitch">
        <header class="rv-stitch-report-hero">
          <div class="rv-stitch-report-copy">
            <div class="rv-stitch-report-status">
              <span>REVISADOS RYM · REPORTE EJECUTIVO</span>
              <em><i></i> Sincronizado eCarCheck</em>
            </div>
            <small>Actualizado: {{monthlyUpdatedLabel}}</small>
            <h2>Avance mensual por galera</h2>
            <p>Matriz ejecutiva consolidada de cobertura por ciclo operativo y galera vehicular. Haz clic en cualquier celda para auditar pendientes.</p>
          </div>
          <div class="rv-stitch-report-actions">
            <div class="rv-stitch-context-pills">
              <span><RymIcon name="calendar_month" :size="15"/>{{monthlyRangeLabel()}}</span>
              <span><RymIcon name="home" :size="15"/>{{profile.scope_label||'Todas las galeras'}}</span>
            </div>
            <div class="rv-stitch-action-row">
              <button class="ghost" type="button" @click="copyMonthlySummary"><RymIcon name="content_copy" :size="15"/>Copiar resumen</button>
              <button class="primary" type="button" @click="printMonthlyReport"><RymIcon name="print" :size="15"/>Imprimir / PDF</button>
            </div>
          </div>
        </header>

        <section class="rv-stitch-kpis">
          <article>
            <header><small>COBERTURA<br>ACUMULADA</small><span data-tone="blue">Período activo</span></header>
            <div class="rv-stitch-kpi-value"><strong>{{monthlyExecutiveSummary.pct}}%</strong><p>{{num(monthlyExecutiveSummary.covered)}} de {{num(monthlyExecutiveSummary.total)}} ciclos<br>cubiertos</p></div>
            <div class="rv-stitch-kpi-meter"><i :style="{width:monthlyExecutiveSummary.pct+'%'}"></i></div>
          </article>
          <article>
            <header><small>PENDIENTES<br>ACUMULADOS</small><span data-tone="amber">Atención</span></header>
            <div class="rv-stitch-kpi-value"><strong class="danger">{{num(monthlyExecutiveSummary.pending)}}</strong><p>Suma de ciclos<br>mostrados</p></div>
            <div class="rv-stitch-kpi-foot"><RymIcon name="info" :size="14"/>Acumulado bruto no deduplicado</div>
          </article>
          <article>
            <header><small>MAYOR CARGA<br>PENDIENTE</small><span data-tone="red">Foco crítico</span></header>
            <div class="rv-stitch-kpi-value"><strong>{{monthlyExecutiveSummary.highest.galera}}</strong><p class="danger">{{num(monthlyExecutiveSummary.highest.pending)}} pendientes</p></div>
            <div class="rv-stitch-kpi-meter danger"><i :style="{width:monthlyExecutiveSummary.highest.pct+'%'}"></i><b>{{monthlyExecutiveSummary.highest.pct}}%</b></div>
          </article>
          <article>
            <header><small>GALERA MEJOR<br>CUBIERTA</small><span data-tone="green">Líder cobertura</span></header>
            <div class="rv-stitch-kpi-value"><strong>{{monthlyExecutiveSummary.best.galera}}</strong><p class="good">{{monthlyExecutiveSummary.best.pct}}%<br>acumulado</p></div>
            <div class="rv-stitch-kpi-meter good"><i :style="{width:monthlyExecutiveSummary.best.pct+'%'}"></i><b>{{num(monthlyExecutiveSummary.best.pending)}} pend.</b></div>
          </article>
        </section>

        <section class="rv-stitch-matrix">
          <header class="rv-stitch-matrix-toolbar">
            <div class="rv-stitch-matrix-title">
              <h3>Matriz ejecutiva de cobertura</h3>
              <div class="rv-stitch-legend">
                <span data-tone="good"><i></i>100% completo</span>
                <span data-tone="watch"><i></i>85% – 99% (Moderado)</span>
                <span data-tone="risk"><i></i>&lt; 85% (Crítico / Foco)</span>
              </div>
            </div>
            <div class="rv-stitch-matrix-controls">
              <label><input v-model="monthlyOnlyPending" type="checkbox"><span>Solo meses con<br>pendientes</span></label>
              <button type="button" @click="exportMonthlyCsv"><RymIcon name="download" :size="15"/>Exportar</button>
            </div>
          </header>

          <div v-if="executiveMonths.length" class="rv-stitch-table-scroll">
            <table class="rv-stitch-table">
              <thead>
                <tr>
                  <th>MES / CICLO</th>
                  <th v-for="g in executiveGaleras" :key="g" :class="{focus:g===monthlyExecutiveSummary.highest.galera}">
                    <span>{{g}}</span>
                    <em v-if="g===monthlyExecutiveSummary.highest.galera">FOCO</em>
                  </th>
                  <th>TOTAL MES</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in executiveMonths" :key="String(m.mes_num)">
                  <th>{{m.mes_nombre||monthName(m.mes_num)}}</th>
                  <td v-for="g in executiveGaleras" :key="String(m.mes_num)+'-'+g" :class="{focus:g===monthlyExecutiveSummary.highest.galera}">
                    <button class="rv-stitch-cell" :data-tone="monthlyGaleraCell(m,g).tone" type="button" @click="openMonthlyCell(m,g)">
                      <div>
                        <strong>{{monthlyGaleraCell(m,g).covered}} / {{monthlyGaleraCell(m,g).total}}</strong>
                        <b>{{monthlyGaleraCell(m,g).pct}}%</b>
                        <RymIcon v-if="monthlyGaleraCell(m,g).pending===0&&monthlyGaleraCell(m,g).total>0" name="check_circle" :size="17"/>
                        <RymIcon v-else-if="monthlyGaleraCell(m,g).pending>0" name="more_horiz" :size="17"/>
                      </div>
                      <span v-if="monthlyGaleraCell(m,g).total===0">Sin unidades</span>
                      <span v-else-if="monthlyGaleraCell(m,g).pending===0" class="complete">✓ Completo</span>
                      <span v-else>{{monthlyGaleraCell(m,g).pending}} pendiente{{monthlyGaleraCell(m,g).pending===1?'':'s'}}</span>
                    </button>
                  </td>
                  <td class="rv-stitch-month-total">
                    <strong>{{monthlyMonthTotal(m).covered}} / {{monthlyMonthTotal(m).total}}</strong>
                    <b>{{monthlyMonthTotal(m).pct}}%</b>
                    <span>· {{monthlyMonthTotal(m).pending}} pend.</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th>TOTAL ACUMULADO</th>
                  <td v-for="g in executiveGaleras" :key="'total-'+g" :class="{focus:g===monthlyExecutiveSummary.highest.galera}">
                    <div>
                      <strong>{{num(monthlyGaleraTotal(g).covered)}} / {{num(monthlyGaleraTotal(g).total)}}</strong>
                      <b>{{monthlyGaleraTotal(g).pct}}%</b>
                      <span>{{num(monthlyGaleraTotal(g).pending)}} pendientes</span>
                    </div>
                  </td>
                  <td>
                    <div>
                      <strong>{{num(monthlyExecutiveSummary.covered)}} / {{num(monthlyExecutiveSummary.total)}}</strong>
                      <b>{{monthlyExecutiveSummary.pct}}%</b>
                      <span>{{num(monthlyExecutiveSummary.pending)}} pendientes</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div v-if="executiveMonths.length" class="rv-stitch-method-note">
            <div><RymIcon name="info" :size="17"/><p><b>Lectura metodológica:</b> los pendientes del TOTAL son acumulados por ciclo. Una misma unidad puede aparecer pendiente en más de un mes; no representan vehículos únicos.</p></div>
            <button type="button" @click="open('operations')">Ir a Gestión de Operaciones <RymIcon name="arrow_forward" :size="15"/></button>
          </div>

          <div v-else class="rv-monthly-complete-state">
            <RymIcon name="verified" :size="28"/>
            <b>Todos los ciclos están completos</b>
            <span>Desactiva “Solo meses con pendientes” para revisar también los ciclos cerrados.</span>
          </div>
        </section>

        <div v-if="monthlyDetail" class="rv-monthly-modal" @click.self="closeMonthlyDetail">
          <section>
            <header>
              <div>
                <span>DETALLE DEL CICLO</span>
                <h3>{{monthlyDetail.mes_nombre}} · {{monthlyDetail.galera}}</h3>
                <p>{{monthlyPendingRows.length}} unidad{{monthlyPendingRows.length===1?'':'es'}} pendiente{{monthlyPendingRows.length===1?'':'s'}}.</p>
              </div>
              <button type="button" aria-label="Cerrar" @click="closeMonthlyDetail">×</button>
            </header>
            <div v-if="monthlyPendingRows.length" class="rv-monthly-pending-list">
              <button v-for="r in monthlyPendingRows" :key="String(r.unidad_id||r.placa||r.unidad)" type="button" @click="openFicha(r)">
                <div><b>{{r.unidad||'—'}}</b><span>{{r.placa||'—'}}</span></div>
                <small>{{r.supervisora||'Sin supervisora'}} · {{dashboardReason(r)}}</small>
                <RymIcon name="chevron_right" :size="17"/>
              </button>
            </div>
            <div v-else class="rv-monthly-modal-empty">
              <RymIcon name="verified" :size="24"/>
              <b>Sin pendientes</b>
              <span>Esta celda está completamente cubierta.</span>
            </div>
          </section>
        </div>
      </section>

      <section v-else-if="active==='daily'" class="rv-stack rv-workspace-tab rv-daily-v2">
        <header class="rv-tab-hero rv-tab-hero-daily">
          <div>
            <span>REPORTE DIARIO</span>
            <h2>Estado operativo de hoy</h2>
            <p>Emitidos, pendientes y distribución por galera en una sola lectura.</p>
          </div>
          <div class="rv-daily-pulse-v2">
            <article><small>EMITIDOS HOY</small><b>{{num(emitted.length)}}</b><em>de {{num(emittedToday?.limite||33)}} cupos</em></article>
            <article><small>PENDIENTES</small><b>{{num(pending.length)}}</b><em>en tu alcance</em></article>
            <article><small>MAYOR CARGA</small><b>{{dailyPendingGroups[0]?.galera||'—'}}</b><em>{{dailyPendingGroups[0]?num(dailyPendingGroups[0].rows.length)+' pendientes':'Sin pendientes'}}</em></article>
          </div>
        </header>

        <div class="rv-daily-layout rv-daily-layout-v2">
          <div class="rv-stack">
            <section class="rv-data-panel">
              <header class="rv-data-panel-head">
                <div><span>EMITIDOS</span><h3>Revisados emitidos hoy</h3><p>Últimos registros disponibles dentro de tu alcance.</p></div>
                <small>{{emitted.length}} registros</small>
              </header>
              <div v-if="emitted.length" class="rv-emitted-grid">
                <article v-for="r in emitted" :key="String(r.unidad_id||r.placa)">
                  <div><b>{{r.unidad||'—'}}</b><span>{{r.placa||'—'}}</span></div>
                  <small>{{r.galera||'—'}} · {{r.empresa||'—'}}</small>
                  <em>{{date(r.ultimo_revisado)}}</em>
                </article>
              </div>
              <div v-else class="rv-empty-state"><RymIcon name="verified" :size="22"/><b>Sin emisiones registradas hoy</b><span>Los nuevos revisados aparecerán aquí automáticamente.</span></div>
            </section>

            <section class="rv-data-panel">
              <header class="rv-data-panel-head">
                <div><span>PENDIENTES</span><h3>Carga por galera</h3><p>Resumen corto para identificar dónde se concentra el trabajo.</p></div>
              </header>
              <div class="rv-pending-galera-grid">
                <article v-for="g in dailyPendingGroups" :key="g.galera">
                  <header><b>{{g.galera}}</b><strong>{{num(g.rows.length)}}</strong></header>
                  <p>{{g.rows.slice(0,6).map(r=>r.unidad||r.placa).join(' · ')}}<span v-if="g.rows.length>6"> · +{{g.rows.length-6}}</span></p>
                </article>
              </div>
            </section>
          </div>

          <aside v-if="isAdminTotal" class="rv-mailer rv-mailer-v2">
            <header>
              <div><span>ENVÍO OPERATIVO</span><h3>Compartir reporte diario</h3><p>Selecciona destinatarios autorizados o agrega un correo puntual.</p></div>
              <button class="rv-ws-button" @click="copyDailyWhatsApp">WhatsApp</button>
            </header>
            <div class="rv-mail-from"><span>Remitente</span><b>panapassrym@gmail.com</b></div>
            <input v-model="dailySearch" class="rv-mail-search" placeholder="Buscar destinatario, correo, rol o galera">
            <div class="rv-mail-actions"><button class="ghost" @click="selectVisibleDaily">Seleccionar visibles</button><button class="ghost" @click="clearDailySelected">Limpiar</button></div>
            <div v-if="dailyRecipientsLoading" class="rv-note">Cargando destinatarios…</div>
            <div v-else-if="dailyRecipientsError" class="rv-note danger">{{dailyRecipientsError}}</div>
            <div v-else class="rv-recipient-list"><label v-for="r in filteredDailyRecipients" :key="String(r.email)"><input type="checkbox" :checked="dailySelected.includes(String(r.email||'').toLowerCase())" @change="toggleDailyEmail(String(r.email||''))"><span><b>{{r.nombre||r.email}}</b><small>{{r.email}}<template v-if="r.tipo"> · {{r.tipo}}</template><template v-if="r.galera"> · {{r.galera}}</template></small></span></label></div>
            <div class="rv-mail-manual"><input v-model="dailyManualEmail" type="email" placeholder="Agregar correo manual" @keydown.enter="addManualDailyEmail"><button class="ghost" @click="addManualDailyEmail">Agregar</button></div>
            <div class="rv-mail-selected"><b>{{dailySelected.length}}</b> destinatario(s) seleccionado(s)</div>
            <div class="rv-mail-actions"><button class="ghost" @click="dailyPreview=!dailyPreview">{{dailyPreview?'Ocultar vista previa':'Vista previa'}}</button><button class="primary" :disabled="dailySending||!dailySelected.length" @click="sendDailyReport">{{dailySending?'Enviando…':'Enviar reporte'}}</button></div>
            <div v-if="dailySendState" class="rv-note">{{dailySendState}}</div>
            <div v-if="dailyPreview" class="rv-mail-preview"><b>Vista previa operativa</b><span>{{num(emitted.length)}} emitidos hoy · {{num(pending.length)}} pendientes</span><span v-for="g in dailyPendingGroups" :key="g.galera">{{g.galera}} · {{num(g.rows.length)}} pendientes</span></div>
          </aside>
        </div>
      </section>

      <section v-else-if="active==='history'" class="rv-stack rv-workspace-tab rv-history-v2">
        <header class="rv-tab-hero rv-tab-hero-light">
          <div><span>HISTORIAL</span><h2>Buscar y validar revisados</h2><p>Consulta el registro por unidad, placa, galera, supervisora o estado.</p></div>
          <div class="rv-history-status">
            <article><small>RESULTADOS</small><b>{{num(filtered.length)}}</b></article>
            <article><small>FILTROS ACTIVOS</small><b>{{historyFilterCount}}</b></article>
            <article><small>COBERTURA</small><b>{{metrics.total?Math.round(metrics.vigentes*100/metrics.total):0}}%</b></article>
          </div>
        </header>
        <section class="rv-filter-shell">
          <RevisadosFilterBar v-model="filters" :galeras="options.galeras" :supervisoras="options.supervisoras"/>
        </section>
        <section class="rv-data-panel">
          <header class="rv-data-panel-head">
            <div><span>RESULTADOS</span><h3>Historial filtrado</h3><p>{{historyFilterCount?'Mostrando únicamente los registros que coinciden con tus filtros.':'Mostrando todos los registros visibles.'}}</p></div>
            <button v-if="historyFilterCount" class="ghost" @click="clearFilters">Limpiar filtros</button>
          </header>
          <RevisadosTable :rows="filtered"/>
        </section>
      </section>

      <section v-else-if="active==='stats'" class="rv-stack rv-workspace-tab rv-stats-v2">
        <header class="rv-tab-hero rv-tab-hero-stats">
          <div><span>ESTADÍSTICAS</span><h2>Lectura ejecutiva de cobertura</h2><p>Estado del padrón visible y distribución de los principales riesgos operativos.</p></div>
          <div class="rv-stats-score" :style="{'--coverage':String(metrics.total?Math.round(metrics.vigentes*100/metrics.total):0)}"><strong>{{metrics.total?Math.round(metrics.vigentes*100/metrics.total):0}}%</strong><span>cobertura actual</span></div>
        </header>
        <section class="rv-stats-deck">
          <article data-tone="green"><span><RymIcon name="verified" :size="19"/></span><div><small>AL DÍA</small><b>{{num(metrics.vigentes)}}</b><em>unidades vigentes</em></div></article>
          <article data-tone="blue"><span><RymIcon name="schedule" :size="19"/></span><div><small>PENDIENTES</small><b>{{num(metrics.pendientesCiclo)}}</b><em>requieren gestión</em></div></article>
          <article data-tone="red"><span><RymIcon name="gavel" :size="19"/></span><div><small>ALERTAS REALES</small><b>{{num(metrics.incidencias)}}</b><em>impedimentos activos</em></div></article>
          <article data-tone="amber"><span><RymIcon name="palette" :size="19"/></span><div><small>CAMBIO DE COLOR</small><b>{{num(metrics.cambiosColor)}}</b><em>nuevo revisado</em></div></article>
        </section>
        <section class="rv-data-panel">
          <header class="rv-data-panel-head"><div><span>COMPARATIVO</span><h3>Estado por galera</h3><p>La misma fuente canónica, presentada para comparación rápida.</p></div></header>
          <GaleraComparison :rows="filtered"/>
        </section>
      </section>

      <section v-else-if="active==='boletas'" class="rv-stack rv-boletas-focus">
        <section class="rv-boletas-command">
          <div class="rv-boletas-command-copy">
            <span>CONSULTA ECARCHECK V2</span>
            <h2>Boletas</h2>
            <p>Consulta 2 placas activas por empresa para detectar restricciones eCarCheck.</p>
            <div class="rv-boletas-state">
              <i :data-active="boletaBusy"></i>
              <span>{{boletaState}}</span>
              <b v-if="boletaBusy">Procesando {{boletaCheckedCompanies}} / {{BOLETA_COMPANY_TARGET}} empresas · {{boletaCompletedChecks}} / {{BOLETA_CHECK_TARGET}} consultas</b>
              <b v-else-if="boletaCompanies.length">Empresas consultadas: {{boletaCheckedCompanies}} / {{BOLETA_COMPANY_TARGET}}</b>
            </div>
          </div>

          <div class="rv-boletas-actions">
            <button class="rv-ws-main" type="button" :disabled="!boletaCompanies.length" @click="copyBoletasWhatsApp">
              <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.02 3.2A12.76 12.76 0 0 0 5.1 22.55L3.2 28.8l6.43-1.84a12.8 12.8 0 1 0 6.39-23.76Zm0 2.55a10.24 10.24 0 0 1 8.86 15.36 10.21 10.21 0 0 1-13.66 3.8l-.47-.28-3.81 1.09 1.12-3.71-.3-.48A10.22 10.22 0 0 1 16.02 5.75Zm-5.68 4.28c-.24 0-.62.09-.95.45-.33.36-1.25 1.22-1.25 2.98 0 1.75 1.28 3.45 1.46 3.69.18.24 2.51 3.83 6.08 5.37.85.37 1.51.58 2.03.74.85.27 1.63.23 2.24.14.68-.1 2.1-.86 2.4-1.69.3-.82.3-1.53.21-1.68-.09-.15-.33-.24-.7-.42-.36-.18-2.1-1.04-2.43-1.16-.32-.12-.56-.18-.8.18-.23.36-.91 1.16-1.12 1.4-.2.24-.41.27-.77.09-.36-.18-1.52-.56-2.89-1.79-1.07-.95-1.79-2.13-2-2.49-.21-.36-.02-.56.16-.74.16-.16.36-.41.54-.62.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.62-.09-.18-.8-1.93-1.1-2.64-.28-.69-.58-.6-.8-.61h-.66Z"/></svg>
              Copiar WS
            </button>
            <button class="primary rv-consult-companies" type="button" :disabled="boletaBusy" @click="runBoletasV2">
              <RymIcon name="sync" :size="18"/>
              {{boletaBusy?'Consultando…':'Consultar 16 empresas'}}
            </button>
          </div>

          <div v-if="boletaBusy||boletaCompanies.length" class="rv-boletas-progress">
            <i :style="{width:Math.min(100,Math.round(boletaCheckedCompanies*100/BOLETA_COMPANY_TARGET))+'%'}"></i>
          </div>
        </section>

        <div v-if="boletaCopyState" class="rv-copy-toast">{{boletaCopyState}}</div>

        <section class="rv-boletas-summary-focus">
          <article>
            <span class="rv-company-summary-icon blue"><RymIcon name="business" :size="20"/></span>
            <div><small>CONSULTADAS</small><b>{{num(boletaCheckedCompanies)}} <i>/ {{BOLETA_COMPANY_TARGET}}</i></b><em>empresas con resultado</em></div>
          </article>
          <article data-tone="bad">
            <span class="rv-company-summary-icon red"><RymIcon name="warning" :size="20"/></span>
            <div><small>CON RESTRICCIÓN</small><b>{{num(boletaPositiveCompanies)}}</b><em>requieren atención</em></div>
          </article>
          <article data-tone="good">
            <span class="rv-company-summary-icon green"><RymIcon name="verified" :size="20"/></span>
            <div><small>SIN RESTRICCIÓN</small><b>{{num(boletaCleanCompanies)}}</b><em>sin novedades</em></div>
          </article>
        </section>

        <section class="rv-company-results">
          <header class="rv-company-results-head">
            <div>
              <span>RESULTADO POR EMPRESA</span>
              <h3>{{boletaCompanies.length?'Empresas consultadas':'Aún no se ha ejecutado la consulta'}}</h3>
              <p>{{boletaCompanies.length?'Primero aparecen las empresas con restricción. Cada fila muestra las placas, modelos y el resultado general; ábrela para ver el resultado de cada placa.':'Presiona “Consultar 16 empresas” para validar dos placas activas por empresa.'}}</p>
            </div>
            <div v-if="boletaCompanies.length" class="rv-company-segments">
              <button :class="{active:boletaFilter==='TODAS'}" @click="boletaFilter='TODAS'">Todas {{boletaCompanies.length}}</button>
              <button :class="{active:boletaFilter==='CON RESTRICCIÓN'}" @click="boletaFilter='CON RESTRICCIÓN'">Con restricción {{boletaPositiveCompanies}}</button>
              <button :class="{active:boletaFilter==='SIN RESTRICCIÓN'}" @click="boletaFilter='SIN RESTRICCIÓN'">Sin restricción {{boletaCleanCompanies}}</button>
            </div>
          </header>

          <div v-if="boletaCompanies.length" class="rv-company-table-head" aria-hidden="true">
            <span>Empresa</span><span>Galera</span><span>Placas consultadas</span><span>Modelos</span><span>Resultado eCarCheck</span><span>Estado</span><span></span>
          </div>

          <div v-if="boletaCompanies.length" class="rv-company-list">
            <details v-for="g in filteredBoletaCompanies" :key="String(g.empresa_id||g.empresa)+'|'+String(g.galera)" class="rv-company-row" :data-status="g.status">
              <summary>
                <div class="rv-company-name">
                  <span class="rv-company-dot"></span>
                  <div><b>{{g.empresa||'Empresa sin nombre'}}</b><small>{{(g.checks||[]).length}} de 2 placas recibidas</small></div>
                </div>
                <span class="rv-company-galera">{{g.galera||'Sin galera'}}</span>
                <div class="rv-company-plates"><span v-for="(check,idx) in (g.checks||[])" :key="'plate-'+String(check.placa||idx)">{{check.placa||'—'}}</span></div>
                <div class="rv-company-models"><span v-for="(check,idx) in (g.checks||[])" :key="'model-'+String(check.placa||idx)">{{boletaCheckModel(check)}}</span></div>
                <span class="rv-company-restriction">{{g.restriction}}</span>
                <span class="rv-company-status">{{g.status==='ERROR'?'CONSULTA INCOMPLETA':g.status}}</span>
                <RymIcon class="rv-company-expand" name="expand_more" :size="20"/>
              </summary>

              <div class="rv-company-detail">
                <article v-for="(check,idx) in (g.checks||[])" :key="String(check.placa||idx)">
                  <div class="rv-company-detail-identity">
                    <small>PLACA {{Number(idx)+1}}</small>
                    <strong>{{check.placa||'—'}}</strong>
                    <span v-if="check.unidad">Unidad {{check.unidad}}</span>
                  </div>
                  <div class="rv-company-detail-model"><small>MODELO</small><b>{{boletaCheckModel(check)}}</b></div>
                  <div class="rv-company-detail-result"><small>RESULTADO ECARCHECK</small><b>{{boletaCheckResult(check)}}</b></div>
                </article>
              </div>
            </details>
          </div>

          <div v-else class="rv-company-empty">
            <span><RymIcon name="business" :size="26"/></span>
            <b>Lista preparada para 16 empresas</b>
            <p>La consulta validará dos placas activas por empresa y mostrará claramente placa, modelo y resultado eCarCheck.</p>
          </div>
        </section>
      </section>

      <section v-else-if="active==='cupos'" class="rv-stack rv-workspace-tab rv-cupos-v2">
        <header class="rv-tab-hero rv-tab-hero-cupos">
          <div><span>CUPOS</span><h2>Compras y disponibilidad operativa</h2><p>Historial de compras registrado en la fuente canónica.</p></div>
          <div class="rv-cupos-summary">
            <article><small>COMPRAS VISIBLES</small><b>{{num(cuposSummary.total)}}</b></article>
            <article><small>CUPOS REGISTRADOS</small><b>{{num(cuposSummary.quantity)}}</b></article>
            <article><small>COMPLETADAS</small><b>{{num(cuposSummary.approved)}}</b></article>
          </div>
        </header>
        <div v-if="cuposLoading" class="rv-state">Cargando compras de cupos…</div>
        <div v-else-if="cuposError" class="rv-state error"><b>No fue posible cargar Cupos.</b><span>{{cuposError}}</span></div>
        <section v-else class="rv-data-panel">
          <header class="rv-data-panel-head"><div><span>HISTORIAL DE COMPRAS</span><h3>Movimientos de cupos</h3><p>{{num(cupos.length)}} compras visibles, ordenadas desde la fuente canónica.</p></div></header>
          <div class="rv-table rv-table-readable"><table><thead><tr><th>Fecha</th><th>ID</th><th>Tipo</th><th>Cantidad</th><th>Monto</th><th>Estado</th><th>Taller</th><th>Método</th></tr></thead><tbody><tr v-for="c in cupos" :key="String(c.id_pago)"><td>{{date(c.fecha_compra_local)}}</td><td><b>{{c.id_pago||'—'}}</b></td><td>{{c.tipo_comprado||'—'}}</td><td>{{num(c.cantidad)}}</td><td>{{c.monto||'—'}}</td><td><span class="rv-result-badge" data-tone="ok">{{c.estado||'—'}}</span></td><td>{{c.taller||'—'}}</td><td>{{c.metodo||'—'}}</td></tr></tbody></table></div>
        </section>
      </section>
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

<style scoped>
/* Dashboard Mission Control v3 — main parity + Stitch hierarchy */
.rv-mission-dashboard{gap:14px!important}
.rv-mission-hero{
  position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(360px,.65fr);gap:24px;align-items:center;
  min-height:188px;padding:24px 26px;border-radius:20px;
  background:
    radial-gradient(circle at 92% 15%,rgba(79,157,255,.32),transparent 30%),
    radial-gradient(circle at 62% 120%,rgba(31,203,166,.14),transparent 35%),
    linear-gradient(135deg,#071A45 0%,#0B3E91 52%,#146FD1 100%);
  box-shadow:0 18px 42px rgba(10,45,105,.18);color:#fff
}
.rv-mission-hero:after{content:"";position:absolute;right:-58px;top:-82px;width:230px;height:230px;border:34px solid rgba(255,255,255,.07);border-radius:50%}
.rv-mission-copy{position:relative;z-index:1;display:grid;justify-items:start;gap:8px}
.rv-mission-eyebrow{display:flex;align-items:center;gap:7px;font-size:8px;font-weight:900;letter-spacing:.11em;color:#BFD9FF}
.rv-mission-eyebrow i{width:7px;height:7px;border-radius:50%;background:#4DE4A8;box-shadow:0 0 0 5px rgba(77,228,168,.1)}
.rv-mission-copy h2{margin:0;font:800 28px/1.05 Inter,system-ui,sans-serif;color:#fff;letter-spacing:-.035em}
.rv-mission-copy p{margin:0;max-width:660px;font-size:11px;line-height:1.45;color:#D5E5FA}.rv-mission-copy p b{color:#fff}
.rv-mission-actions{display:flex;gap:8px;margin-top:4px}.rv-mission-actions .primary,.rv-mission-actions .ghost{min-height:34px!important;border-radius:9px!important;padding:0 12px!important;font-size:8px!important;font-weight:900!important}
.rv-mission-actions .primary{background:#fff!important;color:#0B4AA0!important;border-color:#fff!important}.rv-mission-actions .ghost{background:rgba(255,255,255,.08)!important;color:#fff!important;border-color:rgba(255,255,255,.24)!important}

.rv-health-cluster{position:relative;z-index:1;display:grid;grid-template-columns:126px 1fr;gap:16px;align-items:center;padding:14px;border:1px solid rgba(255,255,255,.15);border-radius:17px;background:rgba(255,255,255,.08);backdrop-filter:blur(12px)}
.rv-health-ring{--health:0%;width:112px;height:112px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#0A367C 57%,transparent 58%),conic-gradient(#55DDA8 var(--health),rgba(255,255,255,.17) 0);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
.rv-health-ring>div{display:grid;justify-items:center}.rv-health-ring strong{font:800 28px/1 Inter,system-ui,sans-serif}.rv-health-ring span{margin-top:3px;font-size:8px;color:#BFD4F4}
.rv-health-facts{display:grid;gap:7px}.rv-health-facts span{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:7px 9px;border-bottom:1px solid rgba(255,255,255,.1)}.rv-health-facts span:last-child{border-bottom:0}
.rv-health-facts small{font-size:6.5px;font-weight:900;letter-spacing:.08em;color:#B9CFF0}.rv-health-facts b{font:800 15px/1 Inter,system-ui,sans-serif;color:#fff}

.rv-signal-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
.rv-signal-card{min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:12px 13px;border:1px solid #D9E4F0;border-radius:14px;background:#fff;text-align:left;box-shadow:0 7px 18px rgba(13,43,88,.045);cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}
.rv-signal-card:hover{transform:translateY(-1px);box-shadow:0 11px 24px rgba(13,43,88,.08)}
.rv-signal-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;background:#EDF4FF;color:#1E65C8}
.rv-signal-card>div{min-width:0;display:grid;gap:2px}.rv-signal-card small{font-size:6.5px;font-weight:900;letter-spacing:.06em;color:#798BA3}.rv-signal-card b{font:800 22px/1 Inter,system-ui,sans-serif;color:#122D59}.rv-signal-card b i{font:700 9px/1 Inter,system-ui,sans-serif;color:#7D8DA1;font-style:normal}.rv-signal-card em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:7.5px;font-style:normal;color:#6D7E95}
.rv-signal-card[data-tone="red"] .rv-signal-icon{background:#FFF0EE;color:#C53A31}.rv-signal-card[data-tone="red"]{border-color:#F3D1CD}
.rv-signal-card[data-tone="amber"] .rv-signal-icon{background:#FFF5DF;color:#B46A00}.rv-signal-card[data-tone="amber"]{border-color:#F2DFC0}
.rv-signal-card[data-tone="cyan"] .rv-signal-icon{background:#EAF9FF;color:#087FAB}.rv-signal-card[data-tone="cyan"]{border-color:#CDE7F2}
.rv-signal-mini-meter{grid-column:3;width:36px;height:5px;border-radius:999px;background:#E4EEF7;overflow:hidden}.rv-signal-mini-meter i{display:block;height:100%;background:#0E8DB7;border-radius:999px}

.rv-secondary-signals{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:1px 2px}
.rv-secondary-signals span{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border:1px solid #DCE5EF;border-radius:999px;background:#FAFCFE;color:#657790;font-size:7.5px}.rv-secondary-signals b{color:#173765}
.rv-secondary-signals i{width:7px;height:7px;border-radius:50%;background:#A7B4C5}.rv-secondary-signals i[data-tone="amber"]{background:#F4A524}.rv-secondary-signals i[data-tone="green"]{background:#21B875}
.rv-secondary-live{margin-left:auto!important;background:#F3FBF7!important;border-color:#CBEBDD!important;color:#39745B!important}

.rv-mission-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(330px,.55fr);gap:12px;align-items:start}
.rv-network-panel,.rv-now-panel,.rv-cycle-glance{padding:14px;border:1px solid #D8E3EF;border-radius:16px;background:#fff;box-shadow:0 8px 22px rgba(12,42,84,.045)}
.rv-mission-panel-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:1px solid #E6EDF5}.rv-mission-panel-head>div{display:grid;gap:2px}.rv-mission-panel-head span{font-size:6.5px;font-weight:900;letter-spacing:.09em;color:#2568C3}.rv-mission-panel-head h3{margin:0;font:800 14px/1.2 Inter,system-ui,sans-serif;color:#112F5C}.rv-mission-panel-head p{margin:0;font-size:7.5px;color:#7889A0}.rv-mission-panel-head>small{font-size:7px;color:#8493A7}.rv-mission-panel-head button{border:0;background:transparent;color:#1F63BD;font-size:7.5px;font-weight:850;cursor:pointer}

.rv-gallery-matrix{display:grid;gap:7px;margin-top:10px}.rv-gallery-row{display:grid;grid-template-columns:120px minmax(160px,1fr) minmax(235px,auto);gap:12px;align-items:center;padding:9px 10px;border:1px solid #E2EAF3;border-radius:11px;background:#FBFCFE}
.rv-gallery-name{display:grid;gap:2px}.rv-gallery-name b{font-size:9px;color:#173967}.rv-gallery-name span{font-size:6.5px;color:#8494A9}
.rv-gallery-progress{display:grid;grid-template-columns:minmax(100px,1fr) 64px;align-items:center;gap:8px}.rv-gallery-progress>div{height:7px;border-radius:999px;background:#E4EDF7;overflow:hidden}.rv-gallery-progress i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#2568D1,#3E89E8)}.rv-gallery-progress>span{font-size:7px;color:#6C7F98}.rv-gallery-progress>span b{font-size:9px;color:#173C72}
.rv-gallery-counts{display:flex;align-items:center;justify-content:flex-end;gap:5px;flex-wrap:wrap}.rv-gallery-counts span{padding:5px 7px;border-radius:999px;background:#F0F5FA;color:#687C95;font-size:6.5px;white-space:nowrap}.rv-gallery-counts span b{color:#24476F}.rv-gallery-counts span[data-tone="amber"]{background:#FFF5E4;color:#9E6309}.rv-gallery-counts span[data-tone="amber"] b{color:#9E6309}.rv-gallery-counts span[data-tone="red"]{background:#FFF0EF;color:#B33A33}.rv-gallery-counts span[data-tone="red"] b{color:#B33A33}

.rv-mission-side{display:grid;gap:12px}.rv-mission-panel-head.compact{align-items:center}.rv-now-list{display:grid;gap:7px;margin-top:9px}.rv-now-list>button{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px;border:1px solid #E1E9F2;border-radius:10px;background:#FAFCFF;text-align:left;cursor:pointer}.rv-now-list>button:hover{border-color:#B8D1EE;background:#F5F9FF}
.rv-now-rank{width:28px;height:28px;display:grid;place-items:center;border-radius:9px;background:#EAF2FF;color:#2769BE;font-size:9px;font-weight:900}.rv-now-rank[data-tone="incident"]{background:#FFE9E6;color:#B43B30}.rv-now-rank[data-tone="color"]{background:#FFF3DA;color:#A96A04}
.rv-now-list>button>div{min-width:0;display:grid;gap:2px}.rv-now-list b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px;color:#183A67}.rv-now-list b i{font-style:normal;color:#9AA7B7}.rv-now-list small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:6.5px;color:#8190A4}.rv-now-list em{max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:6.5px;font-style:normal;color:#A05C04}

.rv-cycle-glance{display:grid;gap:7px}.rv-cycle-glance>article{display:grid;grid-template-columns:82px minmax(80px,1fr) 34px;align-items:center;gap:8px;padding-top:4px}.rv-cycle-glance>article>div:first-child{display:grid;gap:1px}.rv-cycle-glance>article b{font-size:8px;color:#193A67}.rv-cycle-glance>article small{font-size:6px;color:#8795A8}.rv-cycle-glance-bar{height:6px;border-radius:999px;background:#E4EDF7;overflow:hidden}.rv-cycle-glance-bar i{display:block;height:100%;border-radius:999px;background:#2A71D5}.rv-cycle-glance>article>strong{font-size:8px;color:#2867BA}

@media(max-width:1280px){
  .rv-mission-hero{grid-template-columns:1fr}.rv-health-cluster{grid-template-columns:112px 1fr}
  .rv-signal-board{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rv-mission-grid{grid-template-columns:1fr}
}
@media(max-width:760px){
  .rv-mission-hero{padding:18px}.rv-health-cluster{grid-template-columns:1fr}.rv-health-ring{margin:auto}
  .rv-signal-board{grid-template-columns:1fr}.rv-secondary-live{margin-left:0!important}
  .rv-gallery-row{grid-template-columns:1fr}.rv-gallery-counts{justify-content:flex-start}.rv-gallery-progress{grid-template-columns:1fr 60px}
}
</style>

<style scoped>
/* Dashboard Command Deck v4 */
.rv-command-dashboard{gap:12px!important}
.rv-command-surface{overflow:hidden;border:1px solid #0E3C85;border-radius:20px;background:#0B2E69;box-shadow:0 18px 38px rgba(13,45,101,.16)}
.rv-command-hero{
  position:relative;display:grid;grid-template-columns:minmax(0,1.4fr) minmax(360px,.6fr);gap:22px;align-items:center;
  min-height:166px;padding:22px 24px;
  background:
    radial-gradient(circle at 90% 12%,rgba(81,162,255,.32),transparent 30%),
    linear-gradient(135deg,#071B45 0%,#0A438F 58%,#1574D6 100%);
}
.rv-command-hero:after{content:"";position:absolute;right:-74px;bottom:-120px;width:260px;height:260px;border:35px solid rgba(255,255,255,.06);border-radius:50%}
.rv-command-copy{position:relative;z-index:1;display:grid;justify-items:start;gap:7px}.rv-command-eyebrow{display:flex;align-items:center;gap:7px;font-size:7px;font-weight:900;letter-spacing:.11em;color:#BFD9FF}.rv-command-eyebrow i{width:7px;height:7px;border-radius:50%;background:#4AE1A4;box-shadow:0 0 0 5px rgba(74,225,164,.12)}
.rv-command-copy h2{margin:0;font:800 27px/1.05 Inter,system-ui,sans-serif;color:#fff;letter-spacing:-.035em}.rv-command-copy p{margin:0;font-size:10px;color:#D4E4F8}.rv-command-copy p strong{color:#fff}.rv-command-copy p b{color:#8EE8C0}
.rv-command-meter{position:relative;width:min(560px,100%);height:8px;margin-top:5px;border-radius:999px;background:rgba(255,255,255,.15);overflow:hidden}.rv-command-meter>i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#47DDA2,#77E7BD)}.rv-command-meter>span{position:absolute;right:7px;top:50%;transform:translateY(-50%);font-size:5px;font-weight:900;color:#fff;letter-spacing:.04em}
.rv-command-actions{display:flex;gap:7px;margin-top:3px}.rv-command-actions .primary,.rv-command-actions .ghost{min-height:32px!important;padding:0 11px!important;border-radius:9px!important;font-size:7.5px!important;font-weight:900!important}.rv-command-actions .primary{background:#fff!important;color:#0D4B9B!important;border-color:#fff!important}.rv-command-actions .ghost{background:rgba(255,255,255,.08)!important;color:#fff!important;border-color:rgba(255,255,255,.22)!important}
.rv-command-score{position:relative;z-index:1;display:grid;grid-template-columns:112px 1fr;gap:14px;align-items:center;padding:12px 13px;border:1px solid rgba(255,255,255,.15);border-radius:16px;background:rgba(255,255,255,.08);backdrop-filter:blur(12px)}
.rv-score-orbit{--score:0%;width:104px;height:104px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#0B438E 56%,transparent 57%),conic-gradient(#55DDA8 var(--score),rgba(255,255,255,.18) 0)}.rv-score-orbit>div{display:grid;grid-template-columns:auto auto;align-items:end;justify-content:center}.rv-score-orbit strong{font:800 28px/1 Inter,system-ui,sans-serif;color:#fff}.rv-score-orbit span{font:800 10px/1 Inter;color:#fff;margin-bottom:3px}.rv-score-orbit small{grid-column:1/-1;margin-top:3px;text-align:center;font-size:6px;font-weight:900;color:#BED4F3}
.rv-score-copy{display:grid;gap:5px}.rv-score-copy span{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:5px 3px;border-bottom:1px solid rgba(255,255,255,.1)}.rv-score-copy span:last-child{border-bottom:0}.rv-score-copy small{font-size:6px;font-weight:900;letter-spacing:.08em;color:#BED0EB}.rv-score-copy b{font:800 14px/1 Inter;color:#fff}

.rv-command-ribbon{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:#fff}
.rv-command-ribbon>button{position:relative;min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;padding:11px 13px;border:0;border-right:1px solid #E2EAF3;background:#fff;text-align:left;cursor:pointer}.rv-command-ribbon>button:last-child{border-right:0}.rv-command-ribbon>button:hover{background:#F8FBFF}
.rv-ribbon-icon{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:#EEF5FF;color:#2264BF}.rv-command-ribbon button[data-tone="red"] .rv-ribbon-icon{background:#FFF0EE;color:#C64036}.rv-command-ribbon button[data-tone="amber"] .rv-ribbon-icon{background:#FFF5DE;color:#B76D00}.rv-command-ribbon button[data-tone="cyan"] .rv-ribbon-icon{background:#EAF9FF;color:#087DA8}
.rv-command-ribbon button>div{min-width:0;display:grid;gap:1px}.rv-command-ribbon small{font-size:6px;font-weight:900;letter-spacing:.06em;color:#8190A5}.rv-command-ribbon b{font:800 18px/1 Inter;color:#15345F}.rv-command-ribbon b i{font:700 8px/1 Inter;color:#8594A7;font-style:normal}.rv-command-ribbon em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:6.5px;font-style:normal;color:#77879B}
.rv-ribbon-meter{width:34px;height:5px;border-radius:999px;background:#E4EDF7;overflow:hidden}.rv-ribbon-meter i{display:block;height:100%;background:#0B88B4;border-radius:999px}

.rv-quiet-signals{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:0 2px}.rv-quiet-signals span{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid #DDE6F0;border-radius:999px;background:#FBFCFE;color:#6A7C94;font-size:6.8px}.rv-quiet-signals b{color:#1E426F}.rv-quiet-signals i{width:6px;height:6px;border-radius:50%;background:#A9B6C6}.rv-quiet-signals i[data-tone="amber"]{background:#F0A524}.rv-quiet-signals i[data-tone="green"]{background:#1FB777}.rv-quiet-signals .live{margin-left:auto;background:#F3FBF7;border-color:#CDEBDD;color:#447961}

.rv-control-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(330px,.55fr);gap:12px;align-items:start}.rv-gallery-deck-panel,.rv-decision-panel,.rv-today-panel,.rv-cycle-pulse{border:1px solid #D8E3EF;border-radius:16px;background:#fff;box-shadow:0 8px 22px rgba(14,43,83,.045)}
.rv-gallery-deck-panel{padding:14px}.rv-control-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:1px solid #E5EDF5}.rv-control-heading>div{display:grid;gap:2px}.rv-control-heading span{font-size:6px;font-weight:900;letter-spacing:.09em;color:#2668C2}.rv-control-heading h3{margin:0;font:800 14px/1.2 Inter;color:#15325C}.rv-control-heading p{margin:0;font-size:7px;color:#7B8BA0}.rv-control-heading>small{font-size:6.5px;color:#8594A7}.rv-control-heading button{border:0;background:transparent;color:#2362B6;font-size:7px;font-weight:850;cursor:pointer}
.rv-gallery-deck{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.rv-gallery-card{min-width:0;padding:11px;border:1px solid #E0E8F1;border-radius:12px;background:linear-gradient(180deg,#fff,#FAFCFF)}.rv-gallery-card[data-tone="risk"]{border-color:#F1D4D0;background:linear-gradient(180deg,#FFF,#FFF8F7)}.rv-gallery-card[data-tone="watch"]{border-color:#EFDFC3;background:linear-gradient(180deg,#FFF,#FFFCF5)}
.rv-gallery-card header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.rv-gallery-card header>div{display:grid;gap:1px}.rv-gallery-card header span{font-size:5.5px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#2A8A68}.rv-gallery-card[data-tone="watch"] header span{color:#A66B08}.rv-gallery-card[data-tone="risk"] header span{color:#B23D35}.rv-gallery-card h4{margin:0;font:800 12px/1.1 Inter;color:#15365F}.rv-gallery-card header small{font-size:6px;color:#8796A9}.rv-gallery-card header>strong{font:800 24px/1 Inter;color:#153A6A}.rv-gallery-card header>strong i{font-size:8px;font-style:normal;color:#7F8FA4}
.rv-gallery-meter{height:6px;margin:9px 0;border-radius:999px;background:#E4EDF6;overflow:hidden}.rv-gallery-meter i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#286BC7,#3C8BE6)}.rv-gallery-card[data-tone="risk"] .rv-gallery-meter i{background:linear-gradient(90deg,#D85B52,#F08B70)}.rv-gallery-card[data-tone="watch"] .rv-gallery-meter i{background:linear-gradient(90deg,#E4A22D,#F2C151)}
.rv-gallery-card footer{display:flex;gap:5px;flex-wrap:wrap}.rv-gallery-card footer span{padding:4px 6px;border-radius:999px;background:#EEF4F9;color:#667991;font-size:5.8px}.rv-gallery-card footer span b{color:#23486F}.rv-gallery-card footer .alert{background:#FFF0EF;color:#B23B34}.rv-gallery-card footer .alert b{color:#B23B34}

.rv-decision-column{display:grid;gap:10px}.rv-decision-panel{padding:14px}.rv-control-heading.compact{align-items:center}.rv-decision-list{display:grid;gap:7px;margin-top:9px}.rv-decision-list>button{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px;border:1px solid #E1E9F2;border-radius:10px;background:#FBFCFE;text-align:left;cursor:pointer}.rv-decision-list>button:hover{border-color:#BBD2EE;background:#F6F9FE}.rv-decision-number{font:800 9px/1 Inter;color:#7390B5}.rv-decision-list>button>div{min-width:0;display:grid;gap:2px}.rv-decision-list b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px;color:#173B68}.rv-decision-list b i{font-style:normal;color:#9BA8B8}.rv-decision-list small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:6px;color:#8190A4}.rv-decision-list em{max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:4px 6px;border-radius:999px;background:#FFF3DD;color:#9D6409;font-size:5.8px;font-style:normal}.rv-decision-list em[data-tone="incident"]{background:#FFF0EE;color:#B53E36}

.rv-today-panel{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px 13px;background:linear-gradient(135deg,#F6FBFF,#FFFFFF)}.rv-today-orbit{--today:0%;width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#fff 58%,transparent 59%),conic-gradient(#18A0CE var(--today),#DDEAF3 0)}.rv-today-orbit>div{display:flex;align-items:baseline;gap:1px}.rv-today-orbit b{font:800 14px/1 Inter;color:#0F5484}.rv-today-orbit span{font-size:6px;color:#7E8FA2}.rv-today-copy{display:grid;gap:1px}.rv-today-copy>span{font-size:5.5px;font-weight:900;letter-spacing:.08em;color:#2783A7}.rv-today-copy h3{margin:0;font:800 10px/1.2 Inter;color:#183D67}.rv-today-copy p{margin:0;font-size:6px;color:#8290A3}.rv-today-panel>button{border:0;background:transparent;color:#2163B4;font-size:6.5px;font-weight:850;cursor:pointer}

.rv-cycle-pulse{padding:13px}.rv-cycle-pulse>article{display:grid;grid-template-columns:76px minmax(70px,1fr) 32px;align-items:center;gap:7px;margin-top:8px}.rv-cycle-pulse>article>div:first-child{display:grid;gap:1px}.rv-cycle-pulse b{font-size:7px;color:#1D3D68}.rv-cycle-pulse small{font-size:5.5px;color:#8997A9}.rv-pulse-meter{height:5px;border-radius:999px;background:#E4EDF6;overflow:hidden}.rv-pulse-meter i{display:block;height:100%;border-radius:999px;background:#2A70D2}.rv-cycle-pulse>article>strong{font-size:7px;color:#2866B7}

@media(max-width:1280px){
  .rv-command-hero{grid-template-columns:1fr}.rv-command-ribbon{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rv-control-layout{grid-template-columns:1fr}.rv-gallery-deck{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media(max-width:820px){
  .rv-command-hero{padding:18px}.rv-command-score{grid-template-columns:1fr}.rv-score-orbit{margin:auto}
  .rv-command-ribbon{grid-template-columns:1fr}.rv-command-ribbon>button{border-right:0;border-bottom:1px solid #E2EAF3}
  .rv-gallery-deck{grid-template-columns:1fr}.rv-quiet-signals .live{margin-left:0}
}
</style>

<style scoped>
/* Dashboard readability pass v5 */
.rv-command-eyebrow{font-size:9px!important}
.rv-command-copy h2{font-size:30px!important}
.rv-command-copy p{font-size:12px!important;line-height:1.45!important}
.rv-command-meter{height:10px!important}
.rv-command-meter>span{font-size:7px!important;right:9px!important}
.rv-command-actions .primary,.rv-command-actions .ghost{
  min-height:36px!important;
  padding:0 14px!important;
  font-size:9px!important;
}
.rv-command-score{padding:15px!important}
.rv-score-orbit{width:112px!important;height:112px!important}
.rv-score-orbit strong{font-size:32px!important}
.rv-score-orbit span{font-size:11px!important}
.rv-score-orbit small{font-size:8px!important}
.rv-score-copy small{font-size:8px!important;color:#D2E2F8!important}
.rv-score-copy b{font-size:17px!important}
.rv-score-copy span{padding:7px 4px!important}

.rv-command-ribbon>button{padding:14px 15px!important;gap:10px!important}
.rv-ribbon-icon{width:38px!important;height:38px!important}
.rv-command-ribbon small{font-size:8px!important;color:#667A95!important}
.rv-command-ribbon b{font-size:22px!important}
.rv-command-ribbon b i{font-size:10px!important}
.rv-command-ribbon em{font-size:8.5px!important;color:#5E718B!important}
.rv-ribbon-meter{width:44px!important;height:6px!important}

.rv-quiet-signals{gap:9px!important}
.rv-quiet-signals span{padding:7px 10px!important;font-size:8.5px!important}
.rv-quiet-signals i{width:8px!important;height:8px!important}

.rv-gallery-deck-panel,.rv-decision-panel,.rv-today-panel,.rv-cycle-pulse{border-color:#CFDCEB!important}
.rv-control-heading{padding-bottom:12px!important}
.rv-control-heading span{font-size:8px!important;color:#1E5EAF!important}
.rv-control-heading h3{font-size:17px!important}
.rv-control-heading p{font-size:9px!important;line-height:1.35!important}
.rv-control-heading>small,.rv-control-heading button{font-size:8.5px!important}

.rv-gallery-deck{gap:10px!important}
.rv-gallery-card{padding:14px!important;border-radius:14px!important}
.rv-gallery-card header span{font-size:7.5px!important}
.rv-gallery-card h4{font-size:15px!important}
.rv-gallery-card header small{font-size:8px!important;color:#6E8097!important}
.rv-gallery-card header>strong{font-size:28px!important}
.rv-gallery-card header>strong i{font-size:10px!important}
.rv-gallery-meter{height:8px!important;margin:11px 0!important}
.rv-gallery-card footer{
  display:grid!important;
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
  gap:6px!important;
}
.rv-gallery-card footer span{
  display:grid!important;
  gap:2px!important;
  padding:7px 8px!important;
  border-radius:9px!important;
  text-align:center!important;
  background:#EEF4F9!important;
  color:#667991!important;
}
.rv-gallery-card footer span small{
  font-size:6.5px!important;
  font-weight:900!important;
  letter-spacing:.04em!important;
  color:#73849A!important;
}
.rv-gallery-card footer span b{
  font-size:11px!important;
  color:#23486F!important;
}
.rv-gallery-card footer .alert{background:#FFF0EF!important}
.rv-gallery-card footer .alert small,.rv-gallery-card footer .alert b{color:#B23B34!important}

.rv-decision-panel{padding:16px!important}
.rv-decision-list{gap:9px!important;margin-top:11px!important}
.rv-decision-list>button{
  grid-template-columns:30px minmax(0,1fr) auto!important;
  gap:10px!important;
  padding:11px!important;
  border-radius:12px!important;
}
.rv-decision-number{font-size:10px!important}
.rv-decision-list>button>div{gap:3px!important}
.rv-decision-list b{font-size:10px!important}
.rv-decision-list small{font-size:8px!important;color:#708199!important}
.rv-decision-list strong{
  display:block;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-size:8px;
  font-weight:800;
  color:#A25D08;
}
.rv-decision-list em{
  max-width:105px!important;
  padding:5px 8px!important;
  font-size:7px!important;
  font-weight:900!important;
}
.rv-decision-list em[data-tone="incident"]{background:#FFF0EE!important;color:#B53E36!important}

.rv-today-panel{padding:14px 15px!important}
.rv-today-orbit{width:58px!important;height:58px!important}
.rv-today-orbit b{font-size:17px!important}
.rv-today-orbit span{font-size:8px!important}
.rv-today-copy>span{font-size:7px!important}
.rv-today-copy h3{font-size:12px!important}
.rv-today-copy p{font-size:8px!important}
.rv-today-panel>button{font-size:8px!important}

.rv-cycle-pulse{padding:15px!important}
.rv-cycle-pulse>article{
  grid-template-columns:92px minmax(80px,1fr) 38px!important;
  gap:9px!important;
  margin-top:10px!important;
}
.rv-cycle-pulse b{font-size:9px!important}
.rv-cycle-pulse small{font-size:7px!important}
.rv-pulse-meter{height:7px!important}
.rv-cycle-pulse>article>strong{font-size:9px!important}

@media(max-width:1280px){
  .rv-gallery-deck{grid-template-columns:repeat(2,minmax(0,1fr))!important}
}
@media(max-width:820px){
  .rv-gallery-deck{grid-template-columns:1fr!important}
}
</style>

<style scoped>
/* Secondary tabs visual system v1 — parity with main, Stitch-inspired */
.rv-workspace-tab{gap:14px!important}
.rv-tab-hero{
  display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:18px;align-items:center;
  padding:19px 21px;border:1px solid #D5E1EF;border-radius:18px;background:#fff;
  box-shadow:0 10px 26px rgba(14,43,83,.05)
}
.rv-tab-hero>div:first-child{display:grid;gap:3px}.rv-tab-hero>div:first-child>span{font-size:8px;font-weight:900;letter-spacing:.09em;color:#2565BC}.rv-tab-hero h2{margin:0;font:800 23px/1.12 Inter,system-ui,sans-serif;color:#12315E}.rv-tab-hero p{margin:0;font-size:10px;line-height:1.4;color:#71839A}
.rv-tab-hero-metrics,.rv-daily-pulse-v2,.rv-boleta-summary,.rv-cupos-summary{display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:8px}.rv-tab-hero-metrics{grid-template-columns:repeat(2,minmax(135px,1fr))}
.rv-tab-hero-metrics article,.rv-daily-pulse-v2 article,.rv-boleta-summary article,.rv-cupos-summary article{display:grid;gap:2px;padding:10px 12px;border:1px solid #E0E8F2;border-radius:11px;background:#F9FBFE}.rv-tab-hero-metrics small,.rv-daily-pulse-v2 small,.rv-boleta-summary small,.rv-cupos-summary small{font-size:7px;font-weight:900;color:#778AA2;letter-spacing:.05em}.rv-tab-hero-metrics b,.rv-daily-pulse-v2 b,.rv-boleta-summary b,.rv-cupos-summary b{font:800 19px/1 Inter;color:#173967}.rv-tab-hero-metrics em,.rv-daily-pulse-v2 em{font-size:7px;font-style:normal;color:#7C8CA0}
.rv-tab-action{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:0 13px;border:1px solid #BFD2EA;border-radius:10px;background:#F7FAFE;color:#1C5BAA;font-size:8.5px;font-weight:900;cursor:pointer}

.rv-tab-hero-monthly{background:linear-gradient(135deg,#F8FBFF,#FFFFFF)}
.rv-tab-hero-daily{background:linear-gradient(135deg,#F5FAFF,#FFFFFF)}
.rv-tab-hero-stats{background:linear-gradient(135deg,#102F67,#176EC6);border-color:#174F9A;color:#fff}.rv-tab-hero-stats>div:first-child>span,.rv-tab-hero-stats h2,.rv-tab-hero-stats p{color:#fff!important}.rv-tab-hero-stats p{opacity:.8}
.rv-tab-hero-boletas{background:linear-gradient(135deg,#FFF9F1,#FFFFFF)}
.rv-tab-hero-cupos{background:linear-gradient(135deg,#F6FBFF,#FFFFFF)}
.rv-tab-hero-light{grid-template-columns:minmax(0,1fr) auto;background:linear-gradient(135deg,#F8FBFF,#FFFFFF)}

.rv-cycle-deck{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.rv-cycle-deck article{padding:14px;border:1px solid #D9E4F0;border-radius:14px;background:#fff;box-shadow:0 7px 18px rgba(14,43,83,.04)}.rv-cycle-deck article header{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.rv-cycle-deck header>div{display:grid;gap:2px}.rv-cycle-deck header span{font-size:7px;font-weight:900;color:#72849B}.rv-cycle-deck h3{margin:0;font-size:15px;color:#16365F}.rv-cycle-deck header>strong{font:800 25px/1 Inter;color:#1E5FAF}.rv-cycle-v2-meter{height:8px;margin:12px 0;border-radius:999px;background:#E4EDF7;overflow:hidden}.rv-cycle-v2-meter i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#2568CE,#4B91E8)}.rv-cycle-deck footer{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.rv-cycle-deck footer span{display:grid;gap:2px;padding:7px;border-radius:9px;background:#F5F8FC}.rv-cycle-deck footer small{font-size:6.5px;font-weight:900;color:#788AA0}.rv-cycle-deck footer b{font-size:11px;color:#17375F}

.rv-data-panel{padding:15px;border:1px solid #D7E2EE;border-radius:16px;background:#fff;box-shadow:0 8px 22px rgba(14,43,83,.045)}.rv-data-panel-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;padding-bottom:11px;border-bottom:1px solid #E6EDF5}.rv-data-panel-head>div{display:grid;gap:2px}.rv-data-panel-head span{font-size:7px;font-weight:900;letter-spacing:.08em;color:#2866B8}.rv-data-panel-head h3{margin:0;font:800 15px/1.2 Inter;color:#15345F}.rv-data-panel-head p{margin:0;font-size:8.5px;color:#77889E}.rv-data-panel-head>small{font-size:8px;color:#7E8EA3}
.rv-table-readable{margin-top:10px;border:1px solid #E0E8F1;border-radius:12px;overflow:auto}.rv-table-readable table{font-size:9px!important}.rv-table-readable th{padding:10px!important;font-size:7.5px!important;color:#61758E!important;background:#F3F7FB!important}.rv-table-readable td{padding:10px!important;color:#263F61!important;vertical-align:middle!important}.rv-table-readable tbody tr:hover{background:#FAFCFF}.rv-table-pill,.rv-result-badge{display:inline-flex;align-items:center;justify-content:center;padding:5px 8px;border-radius:999px;background:#EEF5FB;color:#2E5E91;font-size:7.5px;font-weight:900}.rv-table-pill[data-tone="warn"],.rv-result-badge[data-tone="bad"]{background:#FFF0E9;color:#B24C31}.rv-table-pill[data-tone="ok"],.rv-result-badge[data-tone="ok"]{background:#EAF9F1;color:#19704B}
.rv-coverage-cell{display:grid;grid-template-columns:minmax(100px,1fr) 38px;gap:8px;align-items:center}.rv-coverage-cell>div{height:7px;border-radius:999px;background:#E5EDF6;overflow:hidden}.rv-coverage-cell i{display:block;height:100%;background:#2D73D2;border-radius:999px}.rv-coverage-cell b{font-size:9px;color:#1D579F}

.rv-daily-layout-v2{grid-template-columns:minmax(0,1.2fr) minmax(340px,.8fr)!important;gap:14px!important}.rv-emitted-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:11px}.rv-emitted-grid article{display:grid;grid-template-columns:1fr auto;gap:4px 10px;padding:10px 11px;border:1px solid #E0E9F2;border-radius:11px;background:#FAFCFF}.rv-emitted-grid article>div{display:flex;align-items:baseline;gap:6px}.rv-emitted-grid b{font-size:10px;color:#163A69}.rv-emitted-grid article>div span{font-size:8px;color:#58728F}.rv-emitted-grid small{font-size:7.5px;color:#7689A0}.rv-emitted-grid em{grid-row:1/3;grid-column:2;font-size:7px;font-style:normal;color:#70839A}
.rv-pending-galera-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:11px}.rv-pending-galera-grid article{padding:10px 11px;border:1px solid #E2EAF2;border-radius:11px;background:#FBFCFE}.rv-pending-galera-grid header{display:flex;justify-content:space-between;align-items:center}.rv-pending-galera-grid b{font-size:10px;color:#173B67}.rv-pending-galera-grid strong{font:800 18px/1 Inter;color:#B16B08}.rv-pending-galera-grid p{margin:6px 0 0;font-size:7.5px;line-height:1.4;color:#72849B}
.rv-mailer-v2{padding:15px!important;border-radius:16px!important;border-color:#D7E2EE!important;box-shadow:0 8px 22px rgba(14,43,83,.05)!important}.rv-mailer-v2>header{display:flex;align-items:flex-start!important;justify-content:space-between;gap:10px}.rv-mailer-v2>header>div{display:grid;gap:2px}.rv-mailer-v2>header span{font-size:7px;font-weight:900;color:#2564B5}.rv-mailer-v2>header h3{margin:0;font-size:15px}.rv-mailer-v2>header p{margin:0;font-size:8px;color:#75869B}.rv-ws-button{padding:8px 10px;border:1px solid #A9E2C2;border-radius:9px;background:#F0FFF6;color:#15834E;font-size:8px;font-weight:900;cursor:pointer}

.rv-history-status{display:grid;grid-template-columns:repeat(3,minmax(110px,1fr));gap:8px}.rv-history-status article{display:grid;gap:2px;padding:10px 12px;border:1px solid #E0E8F1;border-radius:10px;background:#fff}.rv-history-status small{font-size:7px;font-weight:900;color:#7B8BA0}.rv-history-status b{font:800 18px/1 Inter;color:#173A66}.rv-filter-shell{padding:13px;border:1px solid #D8E3EE;border-radius:15px;background:#fff}

.rv-stats-score{width:116px;height:116px;border-radius:50%;display:grid;place-items:center;align-content:center;background:radial-gradient(circle,rgba(12,61,131,.94) 56%,transparent 57%),conic-gradient(#58E0A9 calc(var(--coverage,80)*1%),rgba(255,255,255,.16) 0);border:1px solid rgba(255,255,255,.14)}.rv-stats-score strong{font:800 28px/1 Inter;color:#fff}.rv-stats-score span{font-size:7px;color:#C6D9F4}.rv-stats-deck{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.rv-stats-deck article{display:flex;align-items:center;gap:10px;padding:13px;border:1px solid #DCE5EF;border-radius:13px;background:#fff}.rv-stats-deck article>span{width:36px;height:36px;display:grid;place-items:center;border-radius:10px;background:#EDF4FF;color:#2666BC}.rv-stats-deck article>div{display:grid;gap:1px}.rv-stats-deck small{font-size:7px;font-weight:900;color:#75879E}.rv-stats-deck b{font:800 21px/1 Inter;color:#173967}.rv-stats-deck em{font-size:7px;font-style:normal;color:#7A899C}.rv-stats-deck article[data-tone="green"]>span{background:#E9F9F1;color:#20805A}.rv-stats-deck article[data-tone="red"]>span{background:#FFF0EE;color:#C0463D}.rv-stats-deck article[data-tone="amber"]>span{background:#FFF5E3;color:#B67108}

.rv-sync-tool-v2{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 15px;border:1px solid #D8E3EF;border-radius:15px;background:#fff}.rv-sync-tool-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:#EDF4FF;color:#2868BB}.rv-sync-tool-v2>div:nth-child(2){display:grid;gap:2px}.rv-sync-tool-v2 span{font-size:7px;font-weight:900;color:#2A67B7}.rv-sync-tool-v2 h3{margin:0;font-size:14px;color:#173760}.rv-sync-tool-v2 p{margin:0;font-size:8px;color:#74869C}.rv-sync-tool-v2 em{font-size:7px;font-style:normal;color:#7A8BA0}.rv-sync-tool-progress{position:absolute;left:0;right:0;bottom:0;height:5px;background:#E7EEF6;overflow:hidden;border-radius:0 0 15px 15px}.rv-sync-tool-progress i{display:block;height:100%;background:#2C74D4}.rv-segment-actions{display:flex;gap:5px}.rv-segment-actions button{padding:6px 9px;border:1px solid #D8E3EE;border-radius:999px;background:#fff;color:#61758D;font-size:7.5px;font-weight:800;cursor:pointer}.rv-segment-actions button.active{background:#1D62BA;color:#fff;border-color:#1D62BA}.rv-alert-text{font-size:8px;line-height:1.4;color:#5D6F86}

.rv-empty-state{display:grid;justify-items:center;gap:4px;padding:24px;color:#75869B;text-align:center}.rv-empty-state b{font-size:11px;color:#33506F}.rv-empty-state span{font-size:8px}

@media(max-width:1180px){
  .rv-tab-hero{grid-template-columns:1fr}.rv-tab-hero-metrics,.rv-daily-pulse-v2,.rv-boleta-summary,.rv-cupos-summary{grid-template-columns:repeat(3,minmax(0,1fr))}
  .rv-daily-layout-v2{grid-template-columns:1fr!important}.rv-cycle-deck{grid-template-columns:repeat(2,minmax(0,1fr))}.rv-stats-deck{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:760px){
  .rv-cycle-deck,.rv-emitted-grid,.rv-pending-galera-grid,.rv-stats-deck{grid-template-columns:1fr}.rv-tab-hero-metrics,.rv-daily-pulse-v2,.rv-boleta-summary,.rv-cupos-summary,.rv-history-status{grid-template-columns:1fr}
}
</style>

<style scoped>
/* refinement pass v2 */
.rv-monthly-v2 .rv-cycle-deck{align-items:stretch}
.rv-monthly-v2 .rv-cycle-deck article{min-height:150px}
.rv-monthly-v2 .rv-data-panel{margin-top:2px}

.rv-mailer-v2 .rv-recipient-list{
  max-height:360px!important;
  display:grid!important;
  gap:7px!important;
  padding-right:4px!important;
}
.rv-mailer-v2 .rv-recipient-list label{
  display:grid!important;
  grid-template-columns:22px minmax(0,1fr)!important;
  align-items:center!important;
  gap:10px!important;
  padding:10px 11px!important;
  border:1px solid #E0E8F1!important;
  border-radius:10px!important;
  background:#FBFCFE!important;
}
.rv-mailer-v2 .rv-recipient-list input{width:16px!important;height:16px!important;margin:0!important}
.rv-mailer-v2 .rv-recipient-list label>span{display:grid!important;gap:2px!important;min-width:0!important}
.rv-mailer-v2 .rv-recipient-list b{font-size:10px!important;color:#15365F!important}
.rv-mailer-v2 .rv-recipient-list small{font-size:8px!important;line-height:1.35!important;color:#708199!important}
.rv-mailer-v2 .rv-mail-search,
.rv-mailer-v2 .rv-mail-manual input{
  min-height:40px!important;
  font-size:10px!important;
}
.rv-mailer-v2 .rv-mail-actions button,
.rv-mailer-v2 .rv-mail-manual button{
  min-height:34px!important;
  font-size:8.5px!important;
}
.rv-mailer-v2 .rv-mail-selected{font-size:9px!important}
.rv-mailer-v2 .rv-mail-selected b{font-size:11px!important}

.rv-boletas-v2 .rv-alert-text{font-size:9px!important}
.rv-restriction-list{display:flex;gap:5px;flex-wrap:wrap}
.rv-restriction-list span{
  display:inline-flex;align-items:center;
  padding:5px 8px;border-radius:999px;
  background:#FFF5DF;color:#9B6207;
  font-size:7.5px;font-weight:900;
}
.rv-restriction-list span[data-tone="bad"]{background:#FFF0EE;color:#B53D35}
.rv-restriction-list span[data-tone="warn"]{background:#FFF5DF;color:#9B6207}

.rv-boletas-v2 .rv-table-readable td:nth-child(5){min-width:260px}
.rv-boletas-v2 .rv-table-readable td,
.rv-boletas-v2 .rv-table-readable th{font-size:9px!important}

.rv-history-v2 .rv-data-panel{padding:13px!important}
.rv-history-v2 .rv-filter-shell{padding:12px!important}

.rv-stats-v2 .rv-data-panel{padding:13px!important}
</style>

<style scoped>
/* Boletas focused workflow v3 */
.rv-boletas-focus{gap:12px!important}
.rv-boletas-command{
  position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:22px;align-items:center;
  padding:24px 26px 27px;border:1px solid #C9DAEE;border-radius:18px;
  background:radial-gradient(circle at 92% 10%,rgba(49,133,225,.12),transparent 30%),linear-gradient(135deg,#F7FBFF,#FFFFFF);
  box-shadow:0 9px 24px rgba(15,47,90,.055)
}
.rv-boletas-command-copy{display:grid;gap:6px}.rv-boletas-command-copy>span{font-size:11px;font-weight:900;letter-spacing:.09em;color:#2464B8}.rv-boletas-command-copy h2{margin:0;font:800 30px/1.12 Inter,system-ui,sans-serif;color:#12335E}.rv-boletas-command-copy p{margin:0;font-size:14px;line-height:1.45;color:#5E7188}
.rv-boletas-state{display:flex;align-items:center;gap:9px;margin-top:10px;flex-wrap:wrap;color:#62758C;font-size:12px;line-height:1.35}.rv-boletas-state i{width:9px;height:9px;border-radius:50%;background:#9FB0C3}.rv-boletas-state i[data-active="true"]{background:#2C78D6;box-shadow:0 0 0 5px rgba(44,120,214,.1)}.rv-boletas-state b{color:#315A8C;font-size:11px}
.rv-boletas-actions{display:flex;gap:10px;align-items:center}.rv-consult-companies,.rv-ws-main{min-height:44px!important;padding:0 16px!important;border-radius:11px!important;font-size:12px!important;font-weight:900!important}.rv-consult-companies{display:inline-flex!important;align-items:center!important;gap:8px!important}.rv-ws-main{display:inline-flex;align-items:center;gap:8px;border:1px solid #A5DEC0;background:#F1FFF7;color:#117B49;cursor:pointer}.rv-ws-main svg{width:19px;height:19px;color:#22B967}.rv-ws-main:disabled{opacity:.45;cursor:not-allowed}
.rv-boletas-progress{position:absolute;left:0;right:0;bottom:0;height:6px;background:#E4EDF7;overflow:hidden}.rv-boletas-progress i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#2366C1,#38A1ED);transition:width .3s ease}.rv-copy-toast{justify-self:end;padding:8px 12px;border:1px solid #BCE6D0;border-radius:999px;background:#F0FFF7;color:#14794B;font-size:11px;font-weight:850}
.rv-boletas-summary-focus{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.rv-boletas-summary-focus article{display:flex;align-items:center;gap:13px;padding:15px 16px;border:1px solid #D8E3EE;border-radius:14px;background:#fff;box-shadow:0 6px 16px rgba(13,43,82,.035)}.rv-company-summary-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;flex:0 0 42px}.rv-company-summary-icon.blue{background:#EAF3FF;color:#2367BE}.rv-company-summary-icon.red{background:#FFF0EE;color:#BE453C}.rv-company-summary-icon.green{background:#EAF9F1;color:#23815A}.rv-boletas-summary-focus article>div{display:grid;gap:3px}.rv-boletas-summary-focus small{font-size:10px;font-weight:900;letter-spacing:.06em;color:#687B93}.rv-boletas-summary-focus b{font:800 28px/1 Inter;color:#153A68}.rv-boletas-summary-focus b i{font:700 12px/1 Inter;color:#8292A6;font-style:normal}.rv-boletas-summary-focus em{font-size:11px;font-style:normal;color:#6E8096}.rv-boletas-summary-focus article[data-tone="bad"]{border-color:#F0D2CF}.rv-boletas-summary-focus article[data-tone="good"]{border-color:#CFE8DC}
.rv-company-results{padding:18px;border:1px solid #D7E2ED;border-radius:16px;background:#fff;box-shadow:0 8px 22px rgba(13,42,82,.04)}.rv-company-results-head{display:flex;align-items:end;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:1px solid #E5EDF5}.rv-company-results-head>div:first-child{display:grid;gap:4px}.rv-company-results-head span{font-size:10px;font-weight:900;letter-spacing:.08em;color:#2564B4}.rv-company-results-head h3{margin:0;font:800 20px/1.2 Inter;color:#15355F}.rv-company-results-head p{margin:0;max-width:780px;font-size:13px;color:#61758E;line-height:1.5}.rv-company-segments{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.rv-company-segments button{min-height:34px;padding:0 11px;border:1px solid #D7E2ED;border-radius:999px;background:#fff;color:#516780;font-size:11px;font-weight:850;cursor:pointer}.rv-company-segments button.active{background:#1C60B6!important;border-color:#1C60B6!important;color:#fff!important}
.rv-company-table-head{display:grid;grid-template-columns:minmax(200px,1.25fr) 90px minmax(150px,.9fr) minmax(180px,1fr) minmax(210px,1.15fr) auto 24px;gap:12px;align-items:center;padding:12px 14px 8px;color:#718298}.rv-company-table-head span{font-size:10px!important;font-weight:900!important;letter-spacing:.045em!important;color:#718298!important;text-transform:uppercase}.rv-company-list{display:grid;gap:9px;margin-top:4px}.rv-company-row{border:1px solid #DFE7F0;border-radius:13px;background:#FBFCFE;overflow:hidden}.rv-company-row[data-status="CON RESTRICCIÓN"]{border-color:#EFC9C5;background:#FFF9F8}.rv-company-row[data-status="ERROR"]{border-color:#E9D2A9;background:#FFF9EE}.rv-company-row summary{list-style:none;display:grid;grid-template-columns:minmax(200px,1.25fr) 90px minmax(150px,.9fr) minmax(180px,1fr) minmax(210px,1.15fr) auto 24px;gap:12px;align-items:center;padding:14px;cursor:pointer}.rv-company-row summary::-webkit-details-marker{display:none}.rv-company-row[open] .rv-company-expand{transform:rotate(180deg)}.rv-company-expand{transition:transform .18s ease;color:#58708C}
.rv-company-name{min-width:0;display:flex;align-items:center;gap:10px}.rv-company-dot{width:10px;height:10px;border-radius:50%;background:#31B779;box-shadow:0 0 0 5px rgba(49,183,121,.09);flex:0 0 10px}.rv-company-row[data-status="CON RESTRICCIÓN"] .rv-company-dot{background:#D84B42;box-shadow:0 0 0 5px rgba(216,75,66,.09)}.rv-company-row[data-status="ERROR"] .rv-company-dot{background:#E4A228;box-shadow:0 0 0 5px rgba(228,162,40,.1)}.rv-company-name>div{min-width:0;display:grid;gap:3px}.rv-company-name b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;color:#173B68}.rv-company-name small{font-size:11px;color:#6C7F96}.rv-company-galera{font-size:12px;color:#506781;font-weight:800}.rv-company-plates,.rv-company-models{display:flex;gap:6px;flex-wrap:wrap}.rv-company-plates span{padding:5px 7px;border:1px solid #CFDBE8;border-radius:7px;background:#F4F8FC;color:#173B68;font:850 12px/1 "JetBrains Mono",monospace;letter-spacing:.035em}.rv-company-models span{padding:5px 7px;border-radius:7px;background:#EDF4FC;color:#345A82;font-size:11px;font-weight:750;line-height:1.25}.rv-company-restriction{font-size:12px!important;font-weight:800!important;letter-spacing:0!important;color:#405B79!important;line-height:1.35;overflow-wrap:anywhere}.rv-company-status{padding:6px 9px;border-radius:999px;background:#EAF9F1;color:#1D7B54!important;font-size:9px!important;font-weight:900!important;letter-spacing:.03em!important;white-space:nowrap}.rv-company-row[data-status="CON RESTRICCIÓN"] .rv-company-status{background:#FFF0EE;color:#B63F37!important}.rv-company-row[data-status="ERROR"] .rv-company-status{background:#FFF2D8;color:#A56905!important}
.rv-company-detail{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:12px 14px 14px;border-top:1px solid #E3EBF3;background:#fff}.rv-company-detail article{display:grid;grid-template-columns:minmax(120px,.55fr) minmax(150px,.8fr) minmax(0,1.5fr);gap:14px;align-items:start;padding:13px;border:1px solid #DDE6EF;border-radius:11px;background:#F8FAFD}.rv-company-detail article>div{display:grid;gap:4px}.rv-company-detail small{font-size:9px;font-weight:900;letter-spacing:.05em;color:#71849A}.rv-company-detail-identity strong{font:900 17px/1.2 "JetBrains Mono",monospace;letter-spacing:.05em;color:#153A68}.rv-company-detail-identity span{font-size:10px;color:#78899D}.rv-company-detail-model b{font-size:13px;line-height:1.35;color:#234463}.rv-company-detail-result b{font-size:12px;line-height:1.45;color:#243E5B;overflow-wrap:anywhere}.rv-company-row[data-status="CON RESTRICCIÓN"] .rv-company-detail-result b{color:#9D3933}.rv-company-empty{display:grid;justify-items:center;gap:7px;padding:42px 18px;text-align:center;color:#647990}.rv-company-empty>span{width:52px;height:52px;display:grid;place-items:center;border-radius:14px;background:#EDF4FC;color:#2B68B5}.rv-company-empty b{font-size:15px;color:#244463}.rv-company-empty p{max-width:620px;margin:0;font-size:12px;line-height:1.5}
@media(max-width:1260px){.rv-company-table-head{display:none}.rv-company-row summary{grid-template-columns:minmax(220px,1.2fr) 100px minmax(170px,1fr) minmax(210px,1.15fr) auto 24px}.rv-company-models{grid-column:1/4;padding-left:20px}}
@media(max-width:900px){.rv-boletas-command{grid-template-columns:1fr}.rv-boletas-actions{justify-content:flex-start;flex-wrap:wrap}.rv-boletas-summary-focus{grid-template-columns:1fr}.rv-company-results-head{align-items:flex-start;flex-direction:column}.rv-company-row summary{grid-template-columns:1fr auto;gap:9px}.rv-company-galera,.rv-company-plates,.rv-company-models,.rv-company-restriction{grid-column:1}.rv-company-status{grid-column:2;grid-row:1}.rv-company-expand{grid-column:2;grid-row:2}.rv-company-models{padding-left:0}.rv-company-detail{grid-template-columns:1fr}.rv-company-detail article{grid-template-columns:1fr}.rv-boletas-command-copy h2{font-size:26px}}

</style>


<style scoped>
/* Avance mensual · executive matrix parity */
.rv-monthly-exec{gap:12px}
.rv-monthly-exec-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:start;padding:20px 22px;border:1px solid #d4dfeb;border-radius:17px;background:linear-gradient(135deg,#fff,#f7fbff);box-shadow:0 7px 22px rgba(23,53,89,.04)}
.rv-monthly-exec-title>span{display:block;font-size:9px;font-weight:900;letter-spacing:.09em;color:#2769c5}.rv-monthly-exec-title h2{margin:4px 0 3px;font-size:25px;letter-spacing:-.025em;color:#12345c}.rv-monthly-exec-title p{margin:0;max-width:830px;color:#667b94;font-size:12px;line-height:1.45}
.rv-monthly-exec-actions{display:flex;gap:8px}.rv-monthly-exec-actions button{display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:0 12px;font-size:10px}
.rv-monthly-exec-meta{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}.rv-monthly-exec-meta span{display:inline-flex;align-items:center;gap:7px;padding:6px 9px;border:1px solid #d7e3ef;border-radius:999px;background:#f4f8fd;color:#58708c;font-size:9px}.rv-monthly-exec-meta b{color:#234f82;font-size:8px;text-transform:uppercase;letter-spacing:.04em}
.rv-monthly-exec-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.rv-monthly-exec-kpis article{position:relative;display:grid;gap:3px;padding:16px 15px;border:1px solid #d7e2ed;border-radius:14px;background:#fff;overflow:hidden}.rv-monthly-exec-kpis .rv-kpi-accent{position:absolute!important;top:0!important;left:15px!important;width:30px!important;height:3px!important;min-width:0!important;max-width:30px!important;border-radius:0 0 99px 99px!important;background:#3479d6!important}.rv-monthly-exec-kpis .rv-kpi-accent.red{background:#e0564d!important}.rv-monthly-exec-kpis small{margin-top:3px;color:#607895;font-size:8px;font-weight:900;letter-spacing:.06em}.rv-monthly-exec-kpis strong{font-size:25px;line-height:1.05;color:#153b68;letter-spacing:-.03em}.rv-monthly-exec-kpis strong.danger{color:#d24940}.rv-monthly-exec-kpis span{color:#7a8da4;font-size:9px}
.rv-monthly-matrix-panel{overflow:hidden;border:1px solid #d5e0eb;border-radius:15px;background:#fff;box-shadow:0 6px 20px rgba(20,49,82,.035)}
.rv-monthly-matrix-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;border-bottom:1px solid #e3ebf3}.rv-monthly-matrix-head h3{margin:0;font-size:17px;color:#15385f}.rv-monthly-matrix-head p{margin:3px 0 0;color:#72849a;font-size:10px}.rv-monthly-legend{display:flex;gap:7px;flex-wrap:wrap}.rv-monthly-legend span{display:inline-flex;align-items:center;gap:5px;padding:5px 7px;border:1px solid #dbe4ee;border-radius:999px;font-size:8px;font-weight:800;color:#50677e;background:#fff}.rv-monthly-legend i{width:7px;height:7px;border-radius:50%}.rv-monthly-legend span[data-tone="good"]{border-color:#bfe3cf;background:#f2fbf6;color:#23734f}.rv-monthly-legend span[data-tone="good"] i{background:#30a76f}.rv-monthly-legend span[data-tone="watch"]{border-color:#edd399;background:#fffaf0;color:#9a6500}.rv-monthly-legend span[data-tone="watch"] i{background:#d49a23}.rv-monthly-legend span[data-tone="risk"]{border-color:#efc1bd;background:#fff5f4;color:#aa3d36}.rv-monthly-legend span[data-tone="risk"] i{background:#d85850}
.rv-monthly-matrix-scroll{overflow:auto}.rv-monthly-matrix{width:100%;min-width:980px;border-collapse:separate;border-spacing:0}.rv-monthly-matrix th,.rv-monthly-matrix td{border-right:1px solid #dbe5ef;border-bottom:1px solid #dbe5ef}.rv-monthly-matrix th:last-child,.rv-monthly-matrix td:last-child{border-right:0}.rv-monthly-matrix tbody tr:last-child th,.rv-monthly-matrix tbody tr:last-child td{border-bottom:0}.rv-monthly-matrix thead th{padding:10px 9px!important;background:#eef4fb!important;background-image:none!important;color:#315b8b!important;font-size:9px!important;font-weight:900!important;text-align:center!important;letter-spacing:.04em!important}.rv-monthly-matrix thead th:first-child{text-align:left!important}.rv-monthly-matrix tbody>tr>th{width:110px!important;padding:12px 10px!important;background:#f7f9fc!important;background-image:none!important;color:#1d4e80!important;font-size:11px!important;text-align:left!important}
.rv-monthly-matrix td{padding:7px!important;background:#fbfcfe!important;background-image:none!important}.rv-monthly-cell{position:relative;width:100%;min-height:82px;display:grid;align-content:start;gap:2px;padding:10px 31px 9px 10px;border:1px solid #dfe7ef;border-radius:11px;text-align:left;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}.rv-monthly-cell:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(22,52,87,.08)}.rv-monthly-cell[data-tone="good"]{background:#f1faf5!important;border-color:#b9dfca!important}.rv-monthly-cell[data-tone="watch"]{background:#fff9ec!important;border-color:#ebcf8d!important}.rv-monthly-cell[data-tone="risk"]{background:#fff3f1!important;border-color:#edbcb7!important}.rv-monthly-cell[data-tone="neutral"]{background:#f6f8fb!important;border-color:#dfe6ee!important}.rv-monthly-cell-main{display:flex;align-items:baseline;gap:7px}.rv-monthly-cell-main strong{font-size:17px;color:#123a66}.rv-monthly-cell-main b{font-size:8px;color:#416b99}.rv-monthly-cell>small{font-size:7px;color:#7d8da0}.rv-monthly-cell>span{margin-top:5px;font-size:8px;font-weight:850;color:#a05f00}.rv-monthly-cell>span.complete{color:#23734f}.rv-monthly-cell>.rym-icon{position:absolute;right:9px;top:50%;transform:translateY(-50%);color:#2673d7}
.rv-monthly-complete-state{display:grid;justify-items:center;gap:5px;padding:42px 18px;color:#668097}.rv-monthly-complete-state .rym-icon{color:#2c9b69}.rv-monthly-complete-state b{color:#244b72;font-size:14px}.rv-monthly-complete-state span{font-size:10px}
.rv-monthly-modal{position:fixed;inset:0;z-index:2600;display:grid;place-items:center;padding:24px;background:rgba(10,27,49,.38)}.rv-monthly-modal>section{width:min(720px,94vw);max-height:82vh;overflow:auto;border-radius:16px;background:#fff;box-shadow:0 24px 70px rgba(8,26,49,.25)}.rv-monthly-modal>section>header{display:flex;justify-content:space-between;gap:14px;padding:17px 18px;border-bottom:1px solid #e1e9f1}.rv-monthly-modal header span{font-size:8px;font-weight:900;letter-spacing:.08em;color:#2868bb}.rv-monthly-modal header h3{margin:3px 0 2px;color:#163b63;font-size:20px}.rv-monthly-modal header p{margin:0;color:#74879c;font-size:10px}.rv-monthly-modal header button{width:34px;height:34px;border:0;border-radius:9px;background:#f0f4f8;color:#4e657e;font-size:21px;cursor:pointer}.rv-monthly-pending-list{display:grid;gap:7px;padding:12px}.rv-monthly-pending-list button{display:grid;grid-template-columns:150px 1fr auto;align-items:center;gap:12px;padding:11px;border:1px solid #dce5ee;border-radius:10px;background:#fafcfe;text-align:left;cursor:pointer}.rv-monthly-pending-list button:hover{border-color:#bfd4ec;background:#f5f9fe}.rv-monthly-pending-list button>div{display:flex;align-items:baseline;gap:8px}.rv-monthly-pending-list b{font-size:13px;color:#153c67}.rv-monthly-pending-list span{font-size:10px;color:#59738f}.rv-monthly-pending-list small{font-size:10px;color:#6d8096}.rv-monthly-modal-empty{display:grid;justify-items:center;gap:5px;padding:34px;color:#6c8298}.rv-monthly-modal-empty .rym-icon{color:#2b9c68}.rv-monthly-modal-empty b{color:#244a72}
@media(max-width:1180px){.rv-monthly-exec-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.rv-monthly-exec-hero{grid-template-columns:1fr}.rv-monthly-exec-actions{justify-content:flex-start}}
@media(max-width:720px){.rv-monthly-exec-kpis{grid-template-columns:1fr}.rv-monthly-matrix-head{align-items:flex-start;flex-direction:column}.rv-monthly-pending-list button{grid-template-columns:1fr auto}.rv-monthly-pending-list button>small{grid-column:1/-1}}
@media print{
  .rv-monthly-exec-actions,.rv-monthly-modal,.rv-main>header,.rv-side{display:none!important}
  .rym-revisados-vue{display:block!important;background:#fff!important}
  .rv-main{padding:0!important}
  .rv-monthly-exec{gap:8px}
  .rv-monthly-exec-hero,.rv-monthly-exec-kpis article,.rv-monthly-matrix-panel{box-shadow:none!important}
  .rv-monthly-matrix{min-width:0!important}
  .rv-monthly-cell{min-height:65px}
}
</style>


<style scoped>
/* Main parity + Stitch refinement pass */
.rym-revisados-vue{
  grid-template-columns:228px minmax(0,1fr)!important;
  background:#f5f7fa!important
}
.rv-side{
  padding:16px 10px!important;
  background:#fff!important;
  border-right:1px solid #dce5ef!important
}
.rv-brand-dark{
  display:flex!important;align-items:center!important;gap:10px!important;
  padding:2px 6px 14px!important;margin:0 0 12px!important;
  border-bottom:1px solid #e5ebf2!important;background:transparent!important
}
.rv-brand-main{
  position:relative!important;width:42px!important;height:42px!important;min-width:42px!important;
  display:grid!important;place-items:center!important;border-radius:12px!important;
  background:linear-gradient(145deg,#f8fbff,#eaf3ff)!important;border:1px solid #bed4ec!important;
  color:#123e70!important;box-shadow:0 3px 10px rgba(23,62,105,.06)!important
}
.rv-brand-main strong{font-size:11px!important;letter-spacing:-.03em!important}
.rv-brand-main i{position:absolute!important;right:5px!important;top:5px!important;width:8px!important;height:8px!important;border-radius:50%!important;background:#f6a61b!important;border:2px solid #fff!important}
.rv-brand-copy{display:grid!important;gap:2px!important}.rv-brand-copy b{font-size:15px!important;color:#163b66!important}.rv-brand-copy small{font-size:9px!important;color:#71839a!important;text-transform:uppercase!important;letter-spacing:.035em!important}
.rv-side-profile-main{
  order:0!important;display:grid!important;gap:3px!important;
  margin:0 4px 16px!important;padding:11px 12px!important;border:1px solid #dce6f0!important;
  border-radius:12px!important;background:#f8fbff!important
}
.rv-side-profile-main span{font-size:11px!important;font-weight:800!important;color:#334b67!important}.rv-side-profile-main b{justify-self:start!important;padding:3px 7px!important;border-radius:999px!important;background:#eaf2fc!important;color:#41658e!important;font-size:8px!important;letter-spacing:.035em!important}.rv-side-profile-main small{font-size:9px!important;color:#8392a5!important}
.rv-nav-label{padding:0 7px 7px!important;font-size:8px!important;color:#71829a!important;letter-spacing:.1em!important}
.rv-side nav{gap:3px!important}.rv-side nav button{position:relative!important;min-height:40px!important;padding:9px 10px!important;border-radius:9px!important;background:transparent!important;color:#405772!important;border:1px solid transparent!important;box-shadow:none!important}.rv-side nav button em{font-size:11px!important;font-style:normal!important}.rv-side nav button.active{background:#eaf3ff!important;color:#1856a0!important;border-color:#c9dcf2!important;box-shadow:none!important}.rv-side nav button.active:before{content:""!important;position:absolute!important;left:-5px!important;top:8px!important;bottom:8px!important;width:3px!important;border-radius:0 4px 4px 0!important;background:#2c78dc!important}
.rv-back{margin:16px 4px 0!important;padding:9px 11px!important;border:1px solid #d6e1ec!important;border-radius:9px!important;background:#f8fbff!important;color:#2e5f98!important;font-size:10px!important}
.rv-main{padding:20px 22px 28px!important}.rv-main>header{margin-bottom:16px!important;padding:0 2px 13px!important;border-bottom:1px solid #dfe7ef!important}.rv-page-heading small{font-size:8px!important;letter-spacing:.09em!important;color:#255da1!important}.rv-page-heading h1{margin:3px 0!important;font-size:24px!important;color:#12345e!important;letter-spacing:-.025em!important}.rv-page-heading span{font-size:10px!important;color:#667b93!important}.rv-top-actions{display:flex!important;align-items:center!important;gap:8px!important}.rv-top-scope{padding:8px 11px!important;border:1px solid #d5e2ef!important;border-radius:999px!important;background:#f7fbff!important;color:#3f638c!important;font-size:9px!important;font-weight:800!important}
.rv-top-actions .primary,.rv-top-actions .ghost{min-height:36px!important;padding:0 12px!important;font-size:9px!important;border-radius:8px!important}

.rv-monthly-exec{gap:11px!important}.rv-monthly-exec-hero{padding:17px 19px!important;border-radius:15px!important;box-shadow:0 6px 18px rgba(10,39,72,.035)!important}.rv-monthly-exec-title h2{font-size:23px!important}.rv-monthly-exec-title p{font-size:10.5px!important}.rv-monthly-exec-meta span{padding:5px 8px!important;border-radius:8px!important}
.rv-monthly-exec-kpis{gap:10px!important}.rv-monthly-exec-kpis article{padding:14px 14px 13px!important;border-radius:13px!important;box-shadow:0 4px 14px rgba(10,39,72,.025)!important}.rv-monthly-exec-kpis .rv-kpi-accent{display:block!important;position:absolute!important;top:0!important;left:14px!important;width:28px!important;height:3px!important;min-width:28px!important;max-width:28px!important;padding:0!important;margin:0!important;border-radius:0 0 99px 99px!important}.rv-monthly-exec-kpis strong.danger{background:transparent!important;background-image:none!important;color:#d24940!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important}
.rv-monthly-matrix-panel{border-radius:15px!important;box-shadow:0 7px 22px rgba(10,39,72,.04)!important}.rv-monthly-matrix-head{padding:13px 15px!important;background:#fbfdff!important}.rv-monthly-matrix-head h3{font-size:16px!important}
.rv-monthly-matrix{min-width:920px!important}.rv-monthly-matrix thead th{position:sticky!important;top:0!important;z-index:3!important;background:#edf4fb!important;color:#315d8d!important}.rv-monthly-matrix thead th:first-child{left:0!important;z-index:4!important}.rv-monthly-matrix thead th.focus{background:#e3effc!important;color:#174f8d!important}.rv-monthly-matrix thead th>span{font-size:9px!important;font-weight:900!important}.rv-monthly-matrix thead th>em{display:inline-block!important;margin-left:5px!important;padding:2px 5px!important;border-radius:999px!important;background:#d7e8fb!important;color:#245d99!important;font-size:6.5px!important;font-style:normal!important;letter-spacing:.05em!important}
.rv-monthly-matrix tbody>tr>th,.rv-monthly-matrix tfoot>tr>th{position:sticky!important;left:0!important;z-index:2!important;background:#f8fbff!important;color:#244f7d!important}
.rv-monthly-cell{min-height:76px!important;padding:9px 29px 8px 9px!important}.rv-monthly-cell-main strong{font-size:15px!important}.rv-monthly-cell-main b{font-size:7px!important}.rv-monthly-cell>span{font-size:7.5px!important}
.rv-monthly-matrix tfoot td,.rv-monthly-matrix tfoot th{background:#f9fbfe!important;padding:8px!important;border-top:1px solid #d5e2ee!important}.rv-monthly-total{display:grid!important;gap:2px!important;padding:8px!important;border:1px solid #dbe6f1!important;border-radius:9px!important;background:#fff!important;text-align:left!important}.rv-monthly-total[data-focus="true"]{border-color:#bad3ee!important;background:#f2f7fd!important}.rv-monthly-total b{font-size:9px!important;color:#425f7d!important}.rv-monthly-total strong{font-size:10px!important;color:#1d5e9f!important}.rv-monthly-total span{font-size:7.5px!important;color:#7b8da2!important}
.rv-monthly-reading-note{display:flex!important;align-items:flex-start!important;gap:8px!important;padding:10px 14px!important;border-top:1px solid #f0dfb6!important;background:#fffdf7!important;color:#6b5a3b!important}.rv-monthly-reading-note .rym-icon{flex:0 0 auto!important;margin-top:1px!important;color:#bd8525!important}.rv-monthly-reading-note p{margin:0!important;font-size:9px!important;line-height:1.45!important}
@media(max-width:1000px){.rym-revisados-vue{grid-template-columns:210px minmax(0,1fr)!important}.rv-main{padding:18px!important}}
</style>


<style scoped>
/* Avance mensual · Stitch approved direction */
.rv-monthly-stitch{gap:14px!important}
.rv-stitch-report-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:22px;align-items:start;padding:4px 0 3px!important;background:transparent!important;border:0!important;box-shadow:none!important}
.rv-stitch-report-copy{display:grid;gap:3px}.rv-stitch-report-status{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.rv-stitch-report-status>span{font-size:8px;font-weight:900;letter-spacing:.08em;color:#2c63aa}.rv-stitch-report-status>em{display:inline-flex;align-items:center;gap:5px;color:#667b91;font-size:9px;font-style:normal}.rv-stitch-report-status>em i{width:6px;height:6px;border-radius:50%;background:#29a86f}.rv-stitch-report-copy>small{font-size:9px;color:#71839a}.rv-stitch-report-copy h2{margin:5px 0 1px!important;font-size:27px!important;letter-spacing:-.03em!important;color:#101010!important}.rv-stitch-report-copy p{margin:0;max-width:760px;font-size:12px;line-height:1.45;color:#4e5866}
.rv-stitch-report-actions{display:grid;gap:7px;justify-items:end}.rv-stitch-context-pills,.rv-stitch-action-row{display:flex;gap:7px;align-items:center}.rv-stitch-context-pills span{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid #d8dfeb;border-radius:4px;background:#f8f9fc;color:#2f3e53;font-size:10px;font-weight:750}.rv-stitch-action-row button{display:inline-flex;align-items:center;gap:7px;min-height:36px;padding:0 12px!important;border-radius:4px!important;font-size:10px!important}

.rv-stitch-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.rv-stitch-kpis article{display:grid;align-content:start;gap:11px;min-height:145px;padding:16px;border:1px solid #e0e4eb;border-radius:8px;background:#fff;box-shadow:0 3px 12px rgba(31,42,55,.035)}.rv-stitch-kpis article header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.rv-stitch-kpis article header small{font-size:9px;line-height:1.25;font-weight:900;letter-spacing:.05em;color:#697386}.rv-stitch-kpis article header span{padding:4px 8px;border-radius:8px;font-size:9px;font-weight:850;line-height:1.1}.rv-stitch-kpis article header span[data-tone="blue"]{background:#eaf2ff;color:#2f5eab}.rv-stitch-kpis article header span[data-tone="amber"]{background:#fff3dc;color:#a36404}.rv-stitch-kpis article header span[data-tone="red"]{background:#ffe9e8;color:#bc2d2a}.rv-stitch-kpis article header span[data-tone="green"]{background:#e7f8ef;color:#16794f}
.rv-stitch-kpi-value{display:flex;align-items:flex-end;gap:10px;min-height:45px}.rv-stitch-kpi-value strong{font-size:29px;line-height:1;color:#0b0d12;letter-spacing:-.035em}.rv-stitch-kpi-value strong.danger{color:#ea4b45!important;background:transparent!important}.rv-stitch-kpi-value p{margin:0 0 1px;font-size:10px;line-height:1.3;color:#4f5866}.rv-stitch-kpi-value p.danger{color:#d43630;font-weight:800}.rv-stitch-kpi-value p.good{color:#13805a;font-weight:800}
.rv-stitch-kpi-meter{position:relative;height:7px;border-radius:999px;background:#eceef3;overflow:visible;margin-top:auto}.rv-stitch-kpi-meter>i{display:block;height:100%;border-radius:999px;background:#1358bd}.rv-stitch-kpi-meter.danger>i{background:#e84a47}.rv-stitch-kpi-meter.good>i{background:#1aa36d}.rv-stitch-kpi-meter>b{position:absolute;right:0;top:12px;font-size:9px;color:#697386}.rv-stitch-kpi-foot{display:flex;align-items:center;gap:6px;margin-top:auto;color:#8b6a43;font-size:9px}

.rv-stitch-matrix{overflow:hidden;border:1px solid #e0e4eb;border-radius:8px;background:#fff;box-shadow:0 4px 16px rgba(31,42,55,.035)}.rv-stitch-matrix-toolbar{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:14px 15px;border-bottom:1px solid #e4e7ec}.rv-stitch-matrix-title{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.rv-stitch-matrix-title h3{margin:0;padding-right:12px;border-right:1px solid #dfe3ea;font-size:16px;color:#111318}.rv-stitch-legend{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.rv-stitch-legend span{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border-radius:999px;font-size:8px;font-weight:850}.rv-stitch-legend i{width:7px;height:7px;border-radius:50%}.rv-stitch-legend span[data-tone="good"]{background:#e9fbf1;color:#08734a}.rv-stitch-legend span[data-tone="good"] i{background:#1dbb7c}.rv-stitch-legend span[data-tone="watch"]{background:#fff5dc;color:#a76505}.rv-stitch-legend span[data-tone="watch"] i{background:#f0a91c}.rv-stitch-legend span[data-tone="risk"]{background:#ffeceb;color:#ae332d}.rv-stitch-legend span[data-tone="risk"] i{background:#e6524b}
.rv-stitch-matrix-controls{display:flex;gap:10px;align-items:center}.rv-stitch-matrix-controls label{display:flex;align-items:center;gap:7px;color:#354153;font-size:9px;line-height:1.2;cursor:pointer}.rv-stitch-matrix-controls input{accent-color:#1d56b7}.rv-stitch-matrix-controls button{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid #dfe3ea;border-radius:3px;background:#fafafe;color:#1d2632;font-size:9px;font-weight:750;cursor:pointer}
.rv-stitch-table-scroll{overflow:auto}.rv-stitch-table{width:100%;min-width:1030px;border-collapse:collapse;table-layout:fixed}.rv-stitch-table th,.rv-stitch-table td{border-right:1px solid #e2e5eb;border-bottom:1px solid #e5e7eb}.rv-stitch-table th:last-child,.rv-stitch-table td:last-child{border-right:0}.rv-stitch-table thead th{height:36px;padding:0 12px;background:#f1f1f8;color:#687184;font-size:8px;font-weight:900;letter-spacing:.035em;text-align:left}.rv-stitch-table thead th:first-child{width:130px}.rv-stitch-table thead th:last-child{width:140px}.rv-stitch-table thead th.focus{background:#e9eefc;color:#163d84}.rv-stitch-table thead th em{display:inline-block;margin-left:4px;padding:2px 4px;border-radius:2px;background:#104bad;color:#fff;font-size:7px;font-style:normal;letter-spacing:.04em}
.rv-stitch-table tbody>tr>th{padding:0 15px;background:#fff;color:#111318;font-size:12px;font-weight:800;text-align:left}.rv-stitch-table tbody td{padding:9px 12px;background:#fff}.rv-stitch-table tbody td.focus{background:#fbfcff}
.rv-stitch-cell{width:100%;min-height:78px;display:grid;align-content:center;gap:6px;padding:10px 11px!important;border:0!important;border-radius:4px!important;text-align:left!important;box-shadow:none!important;cursor:pointer}.rv-stitch-cell[data-tone="good"]{background:#edf9f2!important}.rv-stitch-cell[data-tone="watch"]{background:#fff9e7!important}.rv-stitch-cell[data-tone="risk"]{background:#fff0ef!important}.rv-stitch-cell[data-tone="neutral"]{background:#f6f7f9!important}.rv-stitch-cell>div{display:flex;align-items:center;gap:6px}.rv-stitch-cell strong{font-size:14px;color:#0f1115}.rv-stitch-cell b{font-size:8px;color:#154881}.rv-stitch-cell .rym-icon{margin-left:auto;color:#29a975}.rv-stitch-cell[data-tone="watch"] .rym-icon{color:#e39a10}.rv-stitch-cell[data-tone="risk"] .rym-icon{color:#d84a43}.rv-stitch-cell>span{font-size:8px;font-weight:800;color:#9a5d00}.rv-stitch-cell>span.complete{color:#148056}
.rv-stitch-month-total{padding:10px 12px!important;background:#fbfbfd!important;text-align:left}.rv-stitch-month-total strong{display:block;font-size:12px;color:#111318}.rv-stitch-month-total b{font-size:8px;color:#174b92}.rv-stitch-month-total span{font-size:8px;color:#5c6879}
.rv-stitch-table tfoot th,.rv-stitch-table tfoot td{padding:10px 12px!important;background:#182d4d!important;color:#fff!important;border-color:#314562!important}.rv-stitch-table tfoot th{font-size:9px;letter-spacing:.04em;text-align:left}.rv-stitch-table tfoot td>div{display:grid;gap:2px}.rv-stitch-table tfoot strong{font-size:11px;color:#fff}.rv-stitch-table tfoot b{font-size:9px;color:#c9dcff}.rv-stitch-table tfoot span{font-size:8px;color:#c3ccda}.rv-stitch-table tfoot td.focus{background:#123d78!important}
.rv-stitch-method-note{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 15px;background:#fffdf6;border-top:1px solid #f0e0b8}.rv-stitch-method-note>div{display:flex;align-items:flex-start;gap:7px;color:#6c5b39}.rv-stitch-method-note p{margin:0;font-size:9px;line-height:1.45}.rv-stitch-method-note button{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;border:0;background:transparent;color:#234f89;font-size:9px;font-weight:850;cursor:pointer}
@media(max-width:1180px){.rv-stitch-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.rv-stitch-report-hero{grid-template-columns:1fr}.rv-stitch-report-actions{justify-items:start}.rv-stitch-matrix-toolbar{align-items:flex-start;flex-direction:column}.rv-stitch-matrix-controls{align-self:stretch;justify-content:space-between}}
@media(max-width:720px){.rv-stitch-kpis{grid-template-columns:1fr}.rv-stitch-context-pills,.rv-stitch-action-row{flex-wrap:wrap}.rv-stitch-method-note{align-items:flex-start;flex-direction:column}}
@media print{.rv-stitch-matrix-controls,.rv-stitch-method-note button,.rv-stitch-report-actions{display:none!important}.rv-stitch-kpis article,.rv-stitch-matrix{box-shadow:none!important}.rv-stitch-table{min-width:0!important}}
</style>


<style scoped>
/* Stitch monthly visual isolation: prevent legacy table/status CSS from leaking in */
.rv-monthly-stitch .rv-stitch-table thead th{
  height:36px!important;
  padding:0 12px!important;
  background:#f1f1f8!important;
  background-image:none!important;
  color:#687184!important;
  font-size:8px!important;
  font-weight:900!important;
  letter-spacing:.035em!important;
  text-align:left!important;
  text-shadow:none!important;
  box-shadow:none!important
}
.rv-monthly-stitch .rv-stitch-table thead th.focus{
  background:#e9eefc!important;
  background-image:none!important;
  color:#163d84!important
}
.rv-monthly-stitch .rv-stitch-table thead th em{
  background:#104bad!important;
  color:#fff!important
}
.rv-monthly-stitch .rv-stitch-table tbody>tr>th{
  padding:0 15px!important;
  background:#fff!important;
  background-image:none!important;
  color:#111318!important;
  font-size:12px!important;
  font-weight:800!important;
  text-align:left!important;
  text-shadow:none!important;
  box-shadow:none!important
}
.rv-monthly-stitch .rv-stitch-table tbody td{
  background:#fff!important;
  background-image:none!important
}
.rv-monthly-stitch .rv-stitch-table tbody td.focus{
  background:#fbfcff!important;
  background-image:none!important
}
.rv-monthly-stitch .rv-stitch-kpi-value p.danger{
  display:block!important;
  margin:0 0 1px!important;
  padding:0!important;
  border:0!important;
  border-radius:0!important;
  background:transparent!important;
  background-image:none!important;
  box-shadow:none!important;
  color:#d43630!important;
  font-size:10px!important;
  line-height:1.3!important;
  font-weight:800!important;
  white-space:normal!important
}
.rv-monthly-stitch .rv-stitch-kpi-value p.good{
  display:block!important;
  margin:0 0 1px!important;
  padding:0!important;
  border:0!important;
  border-radius:0!important;
  background:transparent!important;
  background-image:none!important;
  box-shadow:none!important;
  color:#13805a!important;
  font-size:10px!important;
  line-height:1.3!important;
  font-weight:800!important
}
.rv-monthly-stitch .rv-stitch-kpi-value strong.danger{
  padding:0!important;
  border:0!important;
  border-radius:0!important;
  background:transparent!important;
  background-image:none!important;
  box-shadow:none!important;
  color:#ea4b45!important
}
.rv-monthly-stitch .rv-stitch-kpi-value{
  min-width:0!important
}
.rv-monthly-stitch .rv-stitch-kpi-value>p{
  min-width:0!important;
  max-width:120px!important
}
/* Keep Stitch's intended dark accumulated-total footer, isolated from body/header */
.rv-monthly-stitch .rv-stitch-table tfoot th,
.rv-monthly-stitch .rv-stitch-table tfoot td{
  background:#0b1f4d!important;
  background-image:none!important;
  color:#fff!important;
  border-color:#29406f!important
}
.rv-monthly-stitch .rv-stitch-table tfoot td.focus{
  background:#103d7d!important
}
</style>


<style scoped>
/* Sandbox typography system · Stitch Next-Gen
   Display: Space Grotesk · UI: Inter · Technical data: JetBrains Mono */
.rym-revisados-vue{
  --rym-font-display:"Space Grotesk",Inter,system-ui,sans-serif;
  --rym-font-ui:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --rym-font-data:"JetBrains Mono","SFMono-Regular",Consolas,monospace;
  font-family:var(--rym-font-ui)!important;
  font-optical-sizing:auto;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility
}

/* UI copy stays neutral and highly readable */
.rym-revisados-vue :deep(button),
.rym-revisados-vue :deep(input),
.rym-revisados-vue :deep(select),
.rym-revisados-vue :deep(textarea),
.rym-revisados-vue :deep(label),
.rym-revisados-vue :deep(p),
.rym-revisados-vue :deep(td),
.rym-revisados-vue :deep(th){
  font-family:var(--rym-font-ui)!important
}

/* Space Grotesk: hierarchy, product identity and executive metrics */
.rym-revisados-vue :deep(h1),
.rym-revisados-vue :deep(h2),
.rym-revisados-vue :deep(h3),
.rym-revisados-vue :deep(h4),
.rym-revisados-vue .rv-brand-copy>b,
.rym-revisados-vue :deep(.rv-command-copy h2),
.rym-revisados-vue :deep(.rv-panel-title h3),
.rym-revisados-vue :deep(.rv-control-heading h3),
.rym-revisados-vue :deep(.rv-tab-hero h2),
.rym-revisados-vue :deep(.rv-data-panel-head h3),
.rym-revisados-vue :deep(.rv-section-title b),
.rym-revisados-vue :deep(.rv-stitch-report-copy h2),
.rym-revisados-vue :deep(.rv-stitch-matrix-title h3),
.rym-revisados-vue :deep(.rv-stitch-kpi-value strong),
.rym-revisados-vue :deep(.rv-gallery-card h4),
.rym-revisados-vue :deep(.rv-company-results-head h3),
.rym-revisados-vue :deep(.rv-boletas-command-copy h2){
  font-family:var(--rym-font-display)!important;
  letter-spacing:-.025em
}

/* Executive figures: Space Grotesk, not generic bold Inter */
.rym-revisados-vue :deep(.rv-score-orbit strong),
.rym-revisados-vue :deep(.rv-ribbon-copy b),
.rym-revisados-vue :deep(.rv-stats-score strong),
.rym-revisados-vue :deep(.rv-boletas-summary-focus b),
.rym-revisados-vue :deep(.rv-stitch-kpis strong),
.rym-revisados-vue :deep(.rv-history-status b),
.rym-revisados-vue :deep(.rv-daily-pulse-v2 b),
.rym-revisados-vue :deep(.rv-cupos-summary b){
  font-family:var(--rym-font-display)!important;
  font-variant-numeric:tabular-nums
}

/* Technical / operational data */
.rym-revisados-vue :deep(.mono),
.rym-revisados-vue :deep(.plate),
.rym-revisados-vue :deep(.rv-drawer-plate),
.rym-revisados-vue :deep(.rv-company-plates span),
.rym-revisados-vue :deep(.rv-company-detail-identity strong),
.rym-revisados-vue :deep(.rv-stitch-cell strong),
.rym-revisados-vue :deep(.rv-stitch-month-total strong),
.rym-revisados-vue :deep(.rv-stitch-table tfoot strong),
.rym-revisados-vue :deep(.rv-stitch-table tfoot b),
.rym-revisados-vue :deep(.rv-monthly-total strong),
.rym-revisados-vue :deep(.rv-monthly-cell-main strong),
.rym-revisados-vue :deep(.rv-version),
.rym-revisados-vue :deep(kbd){
  font-family:var(--rym-font-data)!important;
  font-variant-numeric:tabular-nums;
  letter-spacing:-.01em
}

/* Monthly ratios and percentages read like operational data */
.rym-revisados-vue :deep(.rv-stitch-cell b),
.rym-revisados-vue :deep(.rv-stitch-month-total b),
.rym-revisados-vue :deep(.rv-stitch-month-total span),
.rym-revisados-vue :deep(.rv-stitch-table tfoot span){
  font-family:var(--rym-font-data)!important;
  font-variant-numeric:tabular-nums
}

/* Labels/badges stay Inter, with modern compact tracking */
.rym-revisados-vue :deep(small),
.rym-revisados-vue :deep(em),
.rym-revisados-vue :deep(.rv-nav-label),
.rym-revisados-vue :deep(.rv-company-status),
.rym-revisados-vue :deep(.rv-stitch-kpis article header span),
.rym-revisados-vue :deep(.rv-stitch-legend span),
.rym-revisados-vue :deep(.rv-top-scope){
  font-family:var(--rym-font-ui)!important
}

/* Slightly stronger display treatment without changing layout */
.rym-revisados-vue .rv-page-heading h1{
  font-family:var(--rym-font-display)!important;
  font-weight:700!important;
  letter-spacing:-.035em!important
}
.rym-revisados-vue :deep(.rv-stitch-report-copy h2){
  font-weight:700!important;
  letter-spacing:-.035em!important
}
.rym-revisados-vue :deep(.rv-stitch-kpi-value strong){
  font-weight:700!important;
  letter-spacing:-.035em!important
}
</style>
