<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import jsPDF from 'jspdf'
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
  syncPhase:'idle'|'running'|'success'|'warning'|'error'
  syncProgress:{procesadas:number;total:number;nuevos:number;fichas_ok:number;fichas_pendientes:number;bloqueadas:number;errores:number}
  emittedRows:CanonicalRevisadoRow[]
  emittedLimit:number
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
const syncPercent=computed(()=>{
  const total=Math.max(0,Number(props.syncProgress?.total||0))
  const done=Math.max(0,Number(props.syncProgress?.procesadas||0))
  if(!total)return props.syncBusy?8:(props.syncPhase==='success'||props.syncPhase==='warning'?100:0)
  return Math.max(0,Math.min(100,Math.round(done*100/total)))
})
const syncHasResult=computed(()=>props.syncPhase==='success'||props.syncPhase==='warning'||props.syncPhase==='error')
const syncNoChanges=computed(()=>!props.syncBusy&&props.syncPhase==='success'&&Number(props.syncProgress?.total||0)===0&&Number(props.syncProgress?.nuevos||0)===0)
const emittedCount=computed(()=>props.emittedRows.length)
const emittedPct=computed(()=>Math.min(100,Math.round((emittedCount.value/Math.max(1,props.emittedLimit||33))*100)))
const emittedRemaining=computed(()=>Math.max(0,(props.emittedLimit||33)-emittedCount.value))
const emittedPreview=computed(()=>props.emittedRows.slice(0,3))

function s(v:unknown){return String(v??'').trim()}
function n(v:unknown){return s(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
function num(v:unknown){return new Intl.NumberFormat('es-PA').format(Number(v)||0)}
function rowPriority(r:CanonicalRevisadoRow){return s(r.prioridad||r['priority']||r['prioridad_operativa'])||'Sin prioridad'}
function rowMonth(r:CanonicalRevisadoRow){return s(r['mes_nombre']||r['mes']||r['mes_revisado']||r['mes_asignado']||r['ciclo_mes'])||'Sin mes'}
function rowStatus2(r:CanonicalRevisadoRow){return s(r['status2']||r['estatus2']||r.estado)||'Sin Estatus 2'}
function rowCupo(r:CanonicalRevisadoRow){return s(r['cupo_ecarcheck']||r['cupo_control']||r['cupo']||r['placa_comercial'])}
function rowColor(r:CanonicalRevisadoRow){return s(r['color_ecarcheck']||r['color_control']||r['color'])}
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
watch(()=>props.manualBusy,(busy)=>{
  if(busy) resultModalOpen.value=false
})
watch(()=>props.manualResult,(value)=>{
  if(value) resultModalOpen.value=true
})
function retryLookup(){
  resultModalOpen.value=false
  emit('lookup')
}

async function copyList(){
  const rows=filteredRows.value
  if(!rows.length)return

  const unique=(values:string[])=>[...new Set(values.filter(Boolean))]
  const galeraLabel=unique(rows.map(r=>s(r.galera)||'Sin galera')).join(', ')
  const monthLabel=unique(rows.map(rowMonth)).join(', ')
  const okCount=rows.filter(r=>rowEcarState(r)==='OK').length
  const alertCount=rows.filter(r=>rowEcarState(r)==='ALERTA').length
  const pendingCount=rows.filter(r=>rowEcarState(r)==='PENDIENTE').length
  const errorCount=rows.filter(r=>rowEcarState(r)==='ERROR').length

  const groups=new Map<string,CanonicalRevisadoRow[]>()
  for(const row of rows){
    const supervisor=s(row.supervisora)||'Sin supervisora'
    if(!groups.has(supervisor))groups.set(supervisor,[])
    groups.get(supervisor)!.push(row)
  }

  const lines:string[]=[
    '*Portal RYM · Revisados*',
    `*${galeraLabel || 'Todas las galeras'}* · ${monthLabel || 'Todos los meses'}`,
    `*Unidades:* ${rows.length} · *eCarCheck OK:* ${okCount}${alertCount? ` · *Alertas:* ${alertCount}`:''}${pendingCount? ` · *Pendientes:* ${pendingCount}`:''}${errorCount? ` · *Errores:* ${errorCount}`:''}`,
    ''
  ]

  for(const [supervisor,items] of [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es'))){
    lines.push(`*${supervisor}* · ${items.length}`)
    for(const row of items){
      const unit=s(row.unidad)||'—'
      const plate=s(row.placa)||'—'
      const company=s(row.empresa)||'—'
      const color=rowColor(row)||'—'
      const status=rowStatus2(row)
      const ecar=rowEcarState(row)
      const issue=ecar==='OK' && n(status)==='ACTIVO' ? '' : ` · ${status}/${ecar}`
      lines.push(`• ${unit} · ${plate} · ${color} · ${company}${issue}`)
    }
    lines.push('')
  }

  const text=lines.join('\n').trim()

  try{
    await navigator.clipboard.writeText(text)
  }catch{
    const area=document.createElement('textarea')
    area.value=text
    area.style.position='fixed'
    area.style.opacity='0'
    document.body.appendChild(area)
    area.focus()
    area.select()
    document.execCommand('copy')
    area.remove()
  }
}

function formatPanamaDateOnly(v:unknown){
  const raw=s(v)
  if(!raw)return '—'
  const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if(iso)return `${iso[3]}/${iso[2]}/${iso[1]}`
  const date=new Date(raw)
  if(Number.isNaN(date.getTime()))return raw
  return new Intl.DateTimeFormat('es-PA',{
    day:'2-digit',month:'2-digit',year:'numeric',timeZone:'America/Panama'
  }).format(date)
}
function formatPanamaDateTime(v:unknown){
  const raw=s(v)
  if(!raw)return '—'
  const date=new Date(raw)
  if(Number.isNaN(date.getTime()))return raw
  return new Intl.DateTimeFormat('es-PA',{
    day:'2-digit',month:'2-digit',year:'numeric',
    hour:'numeric',minute:'2-digit',hour12:true,
    timeZone:'America/Panama'
  }).format(date)
}
function exportRows(){
  return filteredRows.value.map(r=>({
    Prioridad:rowPriority(r),
    Unidad:s(r.unidad)||'—',
    Empresa:s(r.empresa)||'—',
    Color:rowColor(r)||'—',
    Placa:s(r.placa)||'—',
    Cupo:rowCupo(r)||'—',
    Mes:rowMonth(r),
    Galera:s(r.galera)||'—',
    Supervisora:s(r.supervisora)||'—',
    'Último revisado':formatPanamaDateOnly(r.ultimo_revisado),
    'Estatus 2':rowStatus2(r),
    eCarCheck:rowEcarState(r),
    'Última consulta eCarCheck':formatPanamaDateTime(rowLastQuery(r))
  }))
}
function exportContext(){
  const parts:string[]=[]
  if(search.value.trim())parts.push(`Búsqueda: ${search.value.trim()}`)
  if(galeras.value.length)parts.push(`Galera: ${galeras.value.join(', ')}`)
  if(statuses2.value.length)parts.push(`Estatus 2: ${statuses2.value.join(', ')}`)
  if(priorities.value.length)parts.push(`Prioridad: ${priorities.value.join(', ')}`)
  if(months.value.length)parts.push(`Mes: ${months.value.join(', ')}`)
  if(supervisoras.value.length)parts.push(`Supervisora: ${supervisoras.value.join(', ')}`)
  if(ecarStates.value.length)parts.push(`eCarCheck: ${ecarStates.value.join(', ')}`)
  return parts.length?parts.join(' · '):'Sin filtros adicionales'
}
function exportFilename(ext:string){
  const now=new Date()
  const stamp=[
    now.getFullYear(),
    String(now.getMonth()+1).padStart(2,'0'),
    String(now.getDate()).padStart(2,'0')
  ].join('-')
  return `revisados_operaciones_${stamp}.${ext}`
}
function localExportDate(){
  return new Intl.DateTimeFormat('es-PA',{
    dateStyle:'medium',
    timeStyle:'short',
    timeZone:'America/Panama'
  }).format(new Date())
}
function downloadBlob(blob:Blob,filename:string){
  const url=URL.createObjectURL(blob)
  const link=document.createElement('a')
  link.href=url
  link.download=filename
  link.style.display='none'
  document.body.appendChild(link)
  link.click()
  window.setTimeout(()=>{
    link.remove()
    URL.revokeObjectURL(url)
  },1500)
}
function xmlEscape(v:unknown){
  return String(v??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&apos;")
}
function excelXmlCell(value:unknown,style='Cell'){
  return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`
}
function exportExcel(){
  const rows=exportRows()
  if(!rows.length)return

  try{
    const headers=[
      'Prioridad','Unidad','Empresa','Color','Placa','Cupo','Mes','Galera','Supervisora',
      'Último revisado','Estatus 2','eCarCheck','Última consulta eCarCheck'
    ]
    const widths=[78,66,170,90,84,88,90,105,120,104,138,96,158]

    const titleRow=`<Row ss:Height="28"><Cell ss:MergeAcross="12" ss:StyleID="Title"><Data ss:Type="String">PORTAL RYM · REVISADOS · OPERACIONES</Data></Cell></Row>`
    const metaRow=`<Row ss:Height="20"><Cell ss:MergeAcross="12" ss:StyleID="Meta"><Data ss:Type="String">${xmlEscape(`Exportado: ${localExportDate()} · Registros: ${rows.length}`)}</Data></Cell></Row>`
    const contextRow=`<Row ss:Height="28"><Cell ss:MergeAcross="12" ss:StyleID="Meta"><Data ss:Type="String">${xmlEscape(`Contexto: ${exportContext()}`)}</Data></Cell></Row>`
    const headerRow=`<Row ss:Height="23">${headers.map(h=>excelXmlCell(h,'Header')).join('')}</Row>`

    const dataRows=rows.map((row,index)=>{
      const values=headers.map(key=>String((row as Record<string,string>)[key]??''))
      return `<Row ss:AutoFitHeight="1">${values.map((value,columnIndex)=>{
        const isDate=columnIndex===9||columnIndex===12
        const style=isDate
          ? (index%2===0?'AltDate':'DateCell')
          : (index%2===0?'Alt':'Cell')
        return excelXmlCell(value,style)
      }).join('')}</Row>`
    }).join('')

    const columns=widths.map(width=>`<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`).join('')

    const workbook=`<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
 xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Top"/>
   <Font ss:FontName="Calibri" ss:Size="10"/>
  </Style>
  <Style ss:ID="Title">
   <Alignment ss:Vertical="Center" ss:Horizontal="Left"/>
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0C469E" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Meta">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#244468"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Vertical="Center" ss:Horizontal="Left" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E54A3" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
   </Borders>
  </Style>
  <Style ss:ID="Cell">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
   </Borders>
  </Style>
  <Style ss:ID="Alt">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Interior ss:Color="#F8FAFD" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
   </Borders>
  </Style>
  <Style ss:ID="DateCell">
   <Alignment ss:Vertical="Center" ss:Horizontal="Left" ss:WrapText="0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
   </Borders>
  </Style>
  <Style ss:ID="AltDate">
   <Alignment ss:Vertical="Center" ss:Horizontal="Left" ss:WrapText="0"/>
   <Interior ss:Color="#F8FAFD" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E2ED"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Operaciones">
  <Table ss:ExpandedColumnCount="13" ss:ExpandedRowCount="${rows.length+5}" x:FullColumns="1" x:FullRows="1">
   ${columns}
   ${titleRow}
   ${metaRow}
   ${contextRow}
   <Row ss:Height="8"></Row>
   ${headerRow}
   ${dataRows}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>5</SplitHorizontal>
   <TopRowBottomPane>5</TopRowBottomPane>
   <ActivePane>2</ActivePane>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`

    const href='data:application/vnd.ms-excel;charset=utf-8,'+encodeURIComponent(workbook)
    const link=document.createElement('a')
    link.href=href
    link.download=exportFilename('xls')
    link.style.display='none'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }catch(error){
    console.error('No se pudo generar el Excel de Revisados',error)
    window.alert('No se pudo generar el archivo Excel: '+String((error as Error)?.message||error))
  }
}
function exportPdf(){
  const rows=exportRows()
  if(!rows.length)return

  try{
    const pdf=new jsPDF({orientation:'landscape',unit:'pt',format:'a4'})
    const pageWidth=pdf.internal.pageSize.getWidth()
    const pageHeight=pdf.internal.pageSize.getHeight()
    const left=28
    const right=28
    const bottom=28
    const usable=pageWidth-left-right

    const headers=[
      'Prioridad','Unidad','Empresa','Color','Placa','Cupo','Mes','Galera',
      'Supervisora','Último revisado','Estatus 2','eCarCheck'
    ]
    const baseWidths=[56,48,104,58,58,58,54,68,78,76,86,88]
    const totalWidth=baseWidths.reduce((sum,w)=>sum+w,0)
    const scale=usable/totalWidth
    const widths=baseWidths.map(w=>w*scale)

    let y=0
    let pageNo=1

    function linesFor(value:unknown,width:number,maxLines=3){
      const text=String(value??'').replace(/\s+/g,' ').trim()
      if(!text)return ['—']
      return pdf.splitTextToSize(text,Math.max(12,width-10)).slice(0,maxLines)
    }
    function rowHeight(values:string[]){
      let maxLines=1
      for(let i=0;i<values.length;i++){
        const lines=linesFor(values[i],widths[i],i===11?3:2)
        maxLines=Math.max(maxLines,lines.length)
      }
      return Math.max(24,10+maxLines*8)
    }
    function drawPageHeader(){
      pdf.setFillColor(12,70,158)
      pdf.setDrawColor(12,70,158)
      pdf.roundedRect(left,22,usable,54,8,8,'FD')

      pdf.setTextColor(255,255,255)
      pdf.setFont('helvetica','bold')
      pdf.setFontSize(15)
      pdf.text('Portal RYM · Revisados · Operaciones',left+16,45)

      pdf.setFont('helvetica','normal')
      pdf.setFontSize(8.5)
      pdf.text(`${rows.length} registros · ${localExportDate()}`,left+16,62)

      pdf.setTextColor(55,76,104)
      pdf.setFontSize(8)
      const context=pdf.splitTextToSize(`Contexto: ${exportContext()}`,usable-8)
      pdf.text(context,left+4,94)
      y=108+(context.length-1)*9
    }
    function drawTableHeader(){
      let x=left
      const headerH=28
      pdf.setFont('helvetica','bold')
      pdf.setFontSize(7)
      for(let i=0;i<headers.length;i++){
        const w=widths[i]
        pdf.setFillColor(30,84,163)
        pdf.setDrawColor(255,255,255)
        pdf.rect(x,y,w,headerH,'FD')

        pdf.setTextColor(255,255,255)
        const label=linesFor(headers[i],w,2)
        const textY=y+10+(label.length===1?4:0)
        pdf.text(label,x+5,textY)
        x+=w
      }
      y+=headerH
    }
    function drawDataRow(values:string[],index:number){
      const h=rowHeight(values)
      let x=left
      const fill=index%2===0 ? [248,250,253] : [255,255,255]

      pdf.setFont('helvetica','normal')
      pdf.setFontSize(7)

      for(let i=0;i<values.length;i++){
        const w=widths[i]

        pdf.setFillColor(fill[0],fill[1],fill[2])
        pdf.setDrawColor(216,226,238)
        pdf.rect(x,y,w,h,'FD')

        pdf.setTextColor(29,48,78)
        const lines=linesFor(values[i],w,i===11?3:2)
        const textY=y+(h-(lines.length*8))/2+7
        pdf.text(lines,x+5,textY)

        x+=w
      }
      y+=h
    }
    function drawFooter(){
      pdf.setTextColor(110,126,148)
      pdf.setFont('helvetica','normal')
      pdf.setFontSize(7)
      pdf.text('Portal RYM · Exportación de la selección actual',left,pageHeight-14)
      pdf.text(`Página ${pageNo}`,pageWidth-right-36,pageHeight-14)
    }
    function newPage(){
      drawFooter()
      pdf.addPage('a4','landscape')
      pageNo++
      drawPageHeader()
      drawTableHeader()
    }

    drawPageHeader()
    drawTableHeader()

    rows.forEach((row,index)=>{
      const ecarQuery=String(row['Última consulta eCarCheck']??'').trim()
      const ecarValue=ecarQuery&&ecarQuery!=='—'
        ? `${row.eCarCheck}\n${ecarQuery}`
        : String(row.eCarCheck??'—')

      const values=[
        String(row.Prioridad??'—'),
        String(row.Unidad??'—'),
        String(row.Empresa??'—'),
        String(row.Color??'—'),
        String(row.Placa??'—'),
        String(row.Cupo??'—'),
        String(row.Mes??'—'),
        String(row.Galera??'—'),
        String(row.Supervisora??'—'),
        String(row['Último revisado']??'—'),
        String(row['Estatus 2']??'—'),
        ecarValue
      ]

      const needed=rowHeight(values)
      if(y+needed>pageHeight-bottom-18)newPage()
      drawDataRow(values,index)
    })

    drawFooter()
    pdf.save(exportFilename('pdf'))
  }catch(error){
    console.error('No se pudo generar el PDF de Revisados',error)
    window.alert('No se pudo generar el archivo PDF: '+String((error as Error)?.message||error))
  }
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
      <div class="sync-card-shell" :data-phase="syncPhase">
        <button class="sync-card" type="button" :disabled="syncBusy" @click="emit('sync')">
          <span class="action-icon" :class="{spinning:syncBusy}"><RymIcon name="sync" :size="20"/></span>
          <span class="action-copy">
            <small>SINCRONIZACIÓN EN LOTE</small>
            <b>{{syncBusy?'Actualizando eCarCheck…':syncHasResult?'Última sincronización eCarCheck':'Sincronización en lote eCarCheck'}}</b>
            <em>{{syncState}}</em>
          </span>
          <span class="action-button">{{syncBusy?'Procesando':syncHasResult?'Sincronizar otra vez':'Sincronizar lote'}} <RymIcon name="arrow_forward" :size="14"/></span>
        </button>

        <div v-if="syncBusy||syncHasResult" class="sync-progress-panel" :data-phase="syncPhase">
          <template v-if="syncNoChanges">
            <div class="sync-quiet-result">
              <span class="sync-check"><RymIcon name="check_circle" :size="18"/></span>
              <div><small>TODO AL DÍA</small><b>Sin cambios nuevos en eCarCheck</b><em>La base ya está sincronizada.</em></div>
            </div>
          </template>
          <template v-else>
            <div class="sync-progress-head">
              <div>
                <small>{{syncBusy?'PROGRESO EN TIEMPO REAL':syncPhase==='success'?'RESULTADO COMPLETADO':syncPhase==='warning'?'COMPLETADO CON OBSERVACIONES':'RESULTADO DE SINCRONIZACIÓN'}}</small>
                <b>{{syncBusy ? (syncProgress.procesadas+' de '+(syncProgress.total||'—')+' procesadas') : syncState}}</b>
              </div>
              <strong>{{syncPercent}}%</strong>
            </div>
            <div class="sync-progress-track"><i :style="{width:syncPercent+'%'}"></i></div>
            <div class="sync-progress-stats">
              <span><small>NUEVOS</small><b>{{syncProgress.nuevos}}</b></span>
              <span><small>FICHAS OK</small><b>{{syncProgress.fichas_ok}}</b></span>
              <span><small>PENDIENTES</small><b>{{syncProgress.fichas_pendientes}}</b></span>
              <span><small>BLOQUEADAS</small><b>{{syncProgress.bloqueadas}}</b></span>
              <span><small>ERRORES</small><b>{{syncProgress.errores}}</b></span>
            </div>
          </template>
        </div>
      </div>

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

  <section class="daily-pulse">
    <div class="daily-orbit" :style="{'--pulse':emittedPct+'%'}">
      <div><b>{{emittedCount}}</b><span>/ {{emittedLimit}}</span></div>
      <small>{{emittedPct}}% del día</small>
    </div>
    <div class="daily-pulse-copy">
      <span>RITMO DEL DÍA</span>
      <h3>Emitidos hoy</h3>
      <p><b>{{emittedRemaining}}</b> cupos disponibles · límite operativo {{emittedLimit}}</p>
      <div class="daily-line"><i :style="{width:emittedPct+'%'}"></i></div>
    </div>
    <div class="daily-recent" v-if="emittedPreview.length">
      <span v-for="r in emittedPreview" :key="String(r.ultimo_revisado_id||r.unidad_id||r.placa)">
        <b>{{r.unidad||'—'}} · {{r.placa||'—'}}</b>
        <small>{{r.galera||'—'}} · {{formatPanamaDateTime(r.ultimo_revisado)}}</small>
      </span>
    </div>
    <div v-else class="daily-recent empty">
      <b>Sin emisiones registradas hoy</b>
      <small>El primer revisado aparecerá aquí automáticamente.</small>
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
    <div class="queue-copy">
      <span>COLA DE TRABAJO TÁCTICA</span>
      <b>{{num(filteredRows.length)}} unidades visibles</b>
      <small>Ordenada por prioridad y antigüedad.</small>
    </div>
    <div class="export-actions">
      <button class="export-copy ws-copy" type="button" aria-label="Copiar resumen para WhatsApp" @click="copyList">
        <svg class="ws-logo" viewBox="0 0 32 32" aria-hidden="true">
          <path fill="currentColor" d="M16.02 3.2A12.76 12.76 0 0 0 5.1 22.55L3.2 28.8l6.43-1.84a12.8 12.8 0 1 0 6.39-23.76Zm0 2.55a10.24 10.24 0 0 1 8.86 15.36 10.21 10.21 0 0 1-13.66 3.8l-.47-.28-3.81 1.09 1.12-3.71-.3-.48A10.22 10.22 0 0 1 16.02 5.75Zm-5.68 4.28c-.24 0-.62.09-.95.45-.33.36-1.25 1.22-1.25 2.98 0 1.75 1.28 3.45 1.46 3.69.18.24 2.51 3.83 6.08 5.37.85.37 1.51.58 2.03.74.85.27 1.63.23 2.24.14.68-.1 2.1-.86 2.4-1.69.3-.82.3-1.53.21-1.68-.09-.15-.33-.24-.7-.42-.36-.18-2.1-1.04-2.43-1.16-.32-.12-.56-.18-.8.18-.23.36-.91 1.16-1.12 1.4-.2.24-.41.27-.77.09-.36-.18-1.52-.56-2.89-1.79-1.07-.95-1.79-2.13-2-2.49-.21-.36-.02-.56.16-.74.16-.16.36-.41.54-.62.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.62-.09-.18-.8-1.93-1.1-2.64-.28-.69-.58-.6-.8-.61h-.66Z"/>
        </svg>
        WhatsApp
      </button>
      <button class="export-excel" type="button" @click="exportExcel"><span class="app-mark">X</span> Excel</button>
      <button class="export-pdf" type="button" @click="exportPdf"><span class="app-mark">PDF</span> PDF</button>
    </div>
  </div>

  <OperationsTable :rows="filteredRows" @open="emit('open',$event)"/>

  <EcarCheckResultModal
    :open="resultModalOpen"
    :plate="manualPlate"
    :payload="manualResult"
    @close="resultModalOpen=false"
    @retry="retryLookup"
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
.sync-card-shell{min-width:0;border:1px solid rgba(174,204,255,.25);border-radius:11px;background:linear-gradient(135deg,#164DAF,#2D68D4);overflow:hidden}
.sync-card-shell .sync-card{width:100%;border:0!important;border-radius:0!important;box-shadow:none!important}
.sync-card{background:transparent;color:#fff;text-align:left;cursor:pointer}
.sync-card-shell[data-phase="success"]{background:linear-gradient(135deg,#0E6A52,#15936F)}
.sync-card-shell[data-phase="warning"]{background:linear-gradient(135deg,#8A5A00,#C88300)}
.sync-card-shell[data-phase="error"]{background:linear-gradient(135deg,#8B2530,#C4414E)}
.action-icon.spinning svg{animation:sync-spin 1.1s linear infinite}
@keyframes sync-spin{to{transform:rotate(360deg)}}
.sync-progress-panel{padding:0 11px 11px;border-top:1px solid rgba(255,255,255,.14)}
.sync-progress-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:9px 0 7px}
.sync-progress-head>div{display:grid;gap:2px}
.sync-progress-head small{font-size:6px;font-weight:900;letter-spacing:.08em;color:#C7D8F7}
.sync-progress-head b{font-size:8px;color:#fff}
.sync-progress-head strong{font-size:15px;color:#fff}
.sync-progress-track{height:7px;border-radius:999px;background:rgba(255,255,255,.18);overflow:hidden}
.sync-progress-track i{display:block;height:100%;border-radius:999px;background:#fff;box-shadow:0 0 14px rgba(255,255,255,.36);transition:width .35s ease}
.sync-progress-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:9px}
.sync-progress-stats span{display:grid;gap:2px;padding:7px 8px;border:1px solid rgba(255,255,255,.14);border-radius:8px;background:rgba(255,255,255,.08);text-align:center}
.sync-progress-stats small{font-size:5.5px;font-weight:900;color:#C8DAF7}
.sync-progress-stats b{font-size:11px;color:#fff}
.sync-quiet-result{display:flex;align-items:center;gap:10px;padding-top:10px}
.sync-check{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:rgba(255,255,255,.16);color:#fff}
.sync-quiet-result>div{display:grid;gap:2px}.sync-quiet-result small{font-size:6px;font-weight:900;letter-spacing:.08em;color:#CDEFE1}.sync-quiet-result b{font-size:10px;color:#fff}.sync-quiet-result em{font-size:7px;font-style:normal;color:#D8F6EA}

.daily-pulse{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(270px,1.2fr);gap:14px;align-items:center;padding:13px 15px;border:1px solid #BDD2EC;border-radius:14px;background:linear-gradient(135deg,#F7FBFF 0%,#FFFFFF 55%,#F5FAFF 100%);box-shadow:0 8px 22px rgba(18,58,110,.06)}
.daily-orbit{--pulse:0%;width:72px;height:72px;border-radius:50%;display:grid;place-items:center;align-content:center;background:radial-gradient(circle at center,#fff 57%,transparent 58%),conic-gradient(#2878E0 var(--pulse),#DCE8F6 0);box-shadow:inset 0 0 0 1px #E5EDF7}
.daily-orbit div{display:flex;align-items:baseline;gap:2px}.daily-orbit b{font-size:20px;color:#0A2F6C}.daily-orbit span{font-size:9px;font-weight:850;color:#6B7E98}.daily-orbit small{font-size:6px;color:#8292A8}
.daily-pulse-copy{display:grid;gap:3px}.daily-pulse-copy>span{font-size:6px;font-weight:900;letter-spacing:.1em;color:#2B6EC8}.daily-pulse-copy h3{margin:0;font-size:14px;color:#0B2A5B}.daily-pulse-copy p{margin:0;font-size:8px;color:#697C95}.daily-pulse-copy p b{color:#0E5BAF}
.daily-line{height:6px;margin-top:5px;border-radius:999px;background:#E4EDF8;overflow:hidden}.daily-line i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#2E7BE4,#54A3FF)}
.daily-recent{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.daily-recent span{min-width:0;display:grid;gap:2px;padding:9px 10px;border:1px solid #D7E4F3;border-radius:10px;background:#fff}.daily-recent b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px;color:#183A69}.daily-recent small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:6.5px;color:#75869C}
.daily-recent.empty{grid-template-columns:1fr;padding:10px 12px;border:1px dashed #C9D8EA;border-radius:10px;background:#FAFCFF}.daily-recent.empty b{font-size:8px}.daily-recent.empty small{font-size:7px}
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

.queue-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:1px}
.queue-copy{display:grid;grid-template-columns:auto 1fr;gap:2px 6px;align-items:baseline;min-width:0}
.queue-head span{grid-column:1/-1;font-size:6px;font-weight:900;color:#174EA6;letter-spacing:.06em}.queue-head b{font-size:11px;color:#0B214E}.queue-head small{font-size:7px;color:#6A7990}.queue-head button{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;padding:7px 10px!important;border:1px solid #B8CBE4!important;border-radius:8px!important;background:#fff!important;color:#174EA6!important;font-size:8px!important;font-weight:850!important;white-space:nowrap!important}

.queue-head>.export-actions{display:flex!important;align-items:center!important;gap:7px!important;flex-wrap:nowrap!important;justify-content:flex-end!important;flex:0 0 auto!important}
.export-actions button{min-height:36px!important}
.ws-copy{border-color:#9DDFC0!important;color:#128C5E!important;background:#F2FFF8!important}
.ws-copy:hover{background:#E9FFF2!important;border-color:#25D366!important}
.ws-logo{width:17px;height:17px;display:block;flex:0 0 17px;color:#25D366}
.export-excel{border-color:#A7D4B4!important;color:#17663A!important;background:#F2FBF5!important}
.export-pdf{border-color:#E9B3B3!important;color:#A32424!important;background:#FFF5F5!important}
.app-mark{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 4px;border-radius:5px;font-size:7px;font-weight:900;background:currentColor;color:#fff}
.export-excel .app-mark{background:#1F7A43;color:#fff}
.export-pdf .app-mark{background:#C93636;color:#fff}

@media(max-width:1180px){.kpi-row{grid-template-columns:repeat(3,minmax(0,1fr))}.facet-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){.command-actions{grid-template-columns:1fr}.priority-strip{grid-template-columns:1fr}.kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:680px){.sync-progress-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.sync-progress-stats span:last-child{grid-column:1/-1}.facet-grid,.kpi-row{grid-template-columns:1fr}.command-head,.filter-foot{align-items:flex-start;flex-direction:column}.queue-head{align-items:center;flex-direction:row}.queue-copy{min-width:0}.queue-head>.export-actions{gap:5px!important}.export-actions button{padding:6px 8px!important;font-size:7px!important}.sync-card,.lookup-card{grid-template-columns:auto minmax(0,1fr)}.action-button,.lookup-form{grid-column:2}.lookup-form{flex-wrap:wrap}.kpi span{white-space:normal}}
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

<style scoped>
/* approved premium operations skin */
.operations-stitch{
  background:
    radial-gradient(circle at 82% 0%, rgba(103,167,255,.10), transparent 26%),
    linear-gradient(180deg,#F3F7FC 0%,#F7FAFD 100%);
  padding:14px;
  border-radius:18px;
}
.ecar-command{
  border-radius:18px;
  border-color:#0F3E91;
  background:
    radial-gradient(circle at 76% 35%, rgba(103,167,255,.23), transparent 24%),
    linear-gradient(135deg,#0A2D72 0%,#0D4AB6 55%,#0F65D8 100%);
  box-shadow:0 18px 40px rgba(8,36,92,.18);
}
.command-head{padding:16px 18px 10px}
.command-head h2{font-size:20px}
.command-head p{font-size:11px;color:#D5E4FB}
.command-actions{gap:10px;padding:0 12px 12px}
.sync-card,.lookup-card{
  min-height:88px;
  border-radius:14px;
  border-color:rgba(190,216,255,.34);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.12);
}
.sync-card{
  background:linear-gradient(135deg,#123D8B,#1B55BC 100%);
}
.lookup-card{
  background:linear-gradient(135deg,#2E66C9,#3F7CDE 100%);
}
.action-icon{width:42px;height:42px;border-radius:12px}
.action-copy small{font-size:8px}
.action-copy b{font-size:13px}
.action-copy em{font-size:10px;color:#E4EDFB}
.action-button{
  font-size:10px;
  border-radius:10px;
  padding:9px 12px;
}
.lookup-form input{
  width:136px;
  font-size:10px;
  border-radius:9px;
  padding:10px 11px;
}
.lookup-form button{
  min-width:100px;
  font-size:10px!important;
  padding:10px 12px!important;
  border-radius:9px!important;
}
.filters-panel{
  border-radius:16px;
  border-color:#CBD8E8;
  box-shadow:0 10px 26px rgba(12,39,82,.06);
  padding:14px;
}
.search-row{
  height:44px;
  border-radius:11px;
  background:#FAFCFF;
}
.search-row input{font-size:11px}
.facet-grid{gap:10px}
.filter-foot{padding-top:5px}
.chips button{
  background:#EAF2FF!important;
  border-color:#B8CEE9!important;
  color:#174EA6!important;
}
.kpi-row{gap:10px}
.kpi{
  min-height:92px;
  border-radius:14px;
  padding:14px;
  box-shadow:0 8px 20px rgba(14,41,82,.06);
}
.kpi b{font-size:25px}
.kpi small{font-size:8px}
.kpi span{font-size:9px}
.priority-strip{
  border-radius:13px;
  padding:11px 13px;
  box-shadow:0 7px 18px rgba(14,41,82,.04);
}
.queue-head{padding:4px 2px}
</style>


<style scoped>
/* overflow hardening + reliable responsive layout */
.operations-stitch{
  min-width:0;
  width:100%;
  max-width:100%;
  overflow:hidden;
}
.ecar-command,
.filters-panel,
.priority-strip,
.queue-head,
.kpi-row{
  min-width:0;
  max-width:100%;
}
.command-actions,
.command-actions>*,
.action-copy,
.lookup-form{
  min-width:0;
}
.lookup-form{
  flex-wrap:wrap;
  justify-content:flex-end;
}
.lookup-form input{
  max-width:100%;
}
.priority-visual{
  min-width:0;
}
@media(max-width:1180px){
  .command-actions{grid-template-columns:1fr}
  .facet-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .kpi-row{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media(max-width:760px){
  .operations-stitch{padding:8px}
  .facet-grid{grid-template-columns:1fr}
  .kpi-row{grid-template-columns:1fr 1fr}
  .priority-strip{grid-template-columns:1fr}
  .sync-card,.lookup-card{grid-template-columns:auto minmax(0,1fr)}
  .sync-card .action-button{grid-column:1/-1;justify-self:stretch;justify-content:center}
  .lookup-form{grid-column:1/-1;width:100%;justify-content:stretch}
  .lookup-form input{flex:1;min-width:0;width:auto}
  .lookup-form button{flex:0 0 auto}
}
@media(max-width:520px){
  .kpi-row{grid-template-columns:1fr}
  .sync-meta{display:none}
  .command-head{display:block}
  .lookup-form{display:grid;grid-template-columns:minmax(0,1fr) auto}
}
</style>

<style scoped>
@media(max-width:980px){.daily-pulse{grid-template-columns:auto 1fr}.daily-recent{grid-column:1/-1}}
</style>
