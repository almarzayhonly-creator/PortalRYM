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
  const text=filteredRows.value.map(r=>[
    rowPriority(r),s(r.unidad)||'—',s(r.empresa)||'—',rowColor(r)||'—',s(r.placa)||'—',rowCupo(r)||'—',
    rowMonth(r),s(r.galera)||'—',s(r.supervisora)||'—',rowStatus2(r),rowEcarState(r)
  ].join(' | ')).join('\n')
  try{await navigator.clipboard?.writeText(text)}catch{}
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
    'Último revisado':s(r.ultimo_revisado)||'—',
    'Estatus 2':rowStatus2(r),
    eCarCheck:rowEcarState(r),
    'Última consulta eCarCheck':rowLastQuery(r)||'—'
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
function le16(n:number){return new Uint8Array([n&255,(n>>>8)&255])}
function le32(n:number){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255])}
function joinBytes(parts:Uint8Array[]){
  const size=parts.reduce((sum,part)=>sum+part.length,0)
  const out=new Uint8Array(size)
  let offset=0
  for(const part of parts){out.set(part,offset);offset+=part.length}
  return out
}
const crcTable=(()=>{
  const table=new Uint32Array(256)
  for(let i=0;i<256;i++){
    let c=i
    for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1)
    table[i]=c>>>0
  }
  return table
})()
function crc32(data:Uint8Array){
  let crc=0xFFFFFFFF
  for(const byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8)
  return (crc^0xFFFFFFFF)>>>0
}
function dosStamp(date=new Date()){
  const year=Math.max(1980,date.getFullYear())
  return {
    time:((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|Math.floor(date.getSeconds()/2),
    date:(((year-1980)&127)<<9)|(((date.getMonth()+1)&15)<<5)|(date.getDate()&31)
  }
}
function zipStored(files:Array<{name:string;content:string}>){
  const enc=new TextEncoder()
  const localParts:Uint8Array[]=[]
  const centralParts:Uint8Array[]=[]
  const stamp=dosStamp()
  let offset=0

  for(const file of files){
    const name=enc.encode(file.name)
    const data=enc.encode(file.content)
    const crc=crc32(data)
    const local=joinBytes([
      new Uint8Array([0x50,0x4B,0x03,0x04]),
      le16(20),le16(0),le16(0),le16(stamp.time),le16(stamp.date),
      le32(crc),le32(data.length),le32(data.length),
      le16(name.length),le16(0),name,data
    ])
    localParts.push(local)

    const central=joinBytes([
      new Uint8Array([0x50,0x4B,0x01,0x02]),
      le16(20),le16(20),le16(0),le16(0),le16(stamp.time),le16(stamp.date),
      le32(crc),le32(data.length),le32(data.length),
      le16(name.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(offset),name
    ])
    centralParts.push(central)
    offset+=local.length
  }

  const central=joinBytes(centralParts)
  const end=joinBytes([
    new Uint8Array([0x50,0x4B,0x05,0x06]),
    le16(0),le16(0),le16(files.length),le16(files.length),
    le32(central.length),le32(offset),le16(0)
  ])
  return joinBytes([...localParts,central,end])
}
function xlsxColumn(index:number){
  let n=index+1
  let out=''
  while(n>0){n--;out=String.fromCharCode(65+(n%26))+out;n=Math.floor(n/26)}
  return out
}
function inlineCell(ref:string,value:unknown,style=0){
  const styleAttr=style?\` s="\${style}"\`:''
  return \`<c r="\${ref}" t="inlineStr"\${styleAttr}><is><t xml:space="preserve">\${xmlEscape(value)}</t></is></c>\`
}
function exportExcel(){
  const rows=exportRows()
  if(!rows.length)return

  try{
    const headers=[
      'Prioridad','Unidad','Empresa','Color','Placa','Cupo','Mes','Galera','Supervisora',
      'Último revisado','Estatus 2','eCarCheck','Última consulta eCarCheck'
    ]
    const lastRow=5+rows.length
    const widths=[12,10,25,13,12,12,12,16,18,18,22,14,24]

    const rowXml:string[]=[]
    rowXml.push(\`<row r="1" ht="28" customHeight="1">\${inlineCell('A1','PORTAL RYM · REVISADOS · OPERACIONES',1)}</row>\`)
    rowXml.push(\`<row r="2" ht="20" customHeight="1">\${inlineCell('A2',\`Exportado: \${localExportDate()} · Registros: \${rows.length}\`,5)}</row>\`)
    rowXml.push(\`<row r="3" ht="28" customHeight="1">\${inlineCell('A3',\`Contexto: \${exportContext()}\`,5)}</row>\`)
    rowXml.push('<row r="4" ht="8" customHeight="1"></row>')
    rowXml.push(\`<row r="5" ht="22" customHeight="1">\${headers.map((h,i)=>inlineCell(\`\${xlsxColumn(i)}5\`,h,2)).join('')}</row>\`)

    rows.forEach((row,index)=>{
      const values=headers.map(key=>String((row as Record<string,string>)[key]??''))
      const r=index+6
      const style=index%2===0?4:3
      rowXml.push(\`<row r="\${r}">\${values.map((value,i)=>inlineCell(\`\${xlsxColumn(i)}\${r}\`,value,style)).join('')}</row>\`)
    })

    const cols=widths.map((width,i)=>\`<col min="\${i+1}" max="\${i+1}" width="\${width}" customWidth="1"/>\`).join('')
    const sheet=\`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:M\${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>\${cols}</cols>
  <sheetData>\${rowXml.join('')}</sheetData>
  <mergeCells count="3"><mergeCell ref="A1:M1"/><mergeCell ref="A2:M2"/><mergeCell ref="A3:M3"/></mergeCells>
  <autoFilter ref="A5:M\${lastRow}"/>
</worksheet>\`

    const styles=\`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="16"/><name val="Calibri"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Calibri"/></font>
    <font><b/><color rgb="FF244468"/><sz val="10"/><name val="Calibri"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0C469E"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E54A3"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFD"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD8E2ED"/></left>
      <right style="thin"><color rgb="FFD8E2ED"/></right>
      <top style="thin"><color rgb="FFD8E2ED"/></top>
      <bottom style="thin"><color rgb="FFD8E2ED"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" horizontal="left"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="left" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" horizontal="left" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>\`

    const files=[
      {
        name:'[Content_Types].xml',
        content:\`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>\`
      },
      {
        name:'_rels/.rels',
        content:\`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>\`
      },
      {
        name:'xl/workbook.xml',
        content:\`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Operaciones" sheetId="1" r:id="rId1"/></sheets>
</workbook>\`
      },
      {
        name:'xl/_rels/workbook.xml.rels',
        content:\`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>\`
      },
      {name:'xl/worksheets/sheet1.xml',content:sheet},
      {name:'xl/styles.xml',content:styles}
    ]

    const bytes=zipStored(files)
    downloadBlob(
      new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),
      exportFilename('xlsx')
    )
  }catch(error){
    console.error('No se pudo generar el Excel de Revisados',error)
    window.alert('No se pudo generar el archivo Excel. Intenta nuevamente.')
  }
}
function exportPdf(){
  const rows=exportRows()
  if(!rows.length)return

  const pdf=new jsPDF({orientation:'landscape',unit:'pt',format:'a4'})
  const pageWidth=pdf.internal.pageSize.getWidth()
  const pageHeight=pdf.internal.pageSize.getHeight()
  const left=28
  const right=28
  const usable=pageWidth-left-right
  const headers=['Prioridad','Unidad','Empresa','Color','Placa','Cupo','Mes','Galera','Supervisora','Últ. revisado','Estatus 2','eCarCheck']
  const widths=[48,44,92,50,50,50,46,58,66,66,76,56]
  const totalWidth=widths.reduce((sum,w)=>sum+w,0)
  const scale=usable/totalWidth
  const scaled=widths.map(w=>w*scale)
  const rowH=25
  let y=0
  let pageNo=1

  function drawPageHeader(){
    pdf.setFillColor(12,70,158)
    pdf.roundedRect(left,24,usable,54,8,8,'F')
    pdf.setTextColor(255,255,255)
    pdf.setFont('helvetica','bold')
    pdf.setFontSize(15)
    pdf.text('Portal RYM · Revisados · Operaciones',left+16,47)
    pdf.setFont('helvetica','normal')
    pdf.setFontSize(8.5)
    pdf.text(`${rows.length} registros · ${localExportDate()}`,left+16,64)

    pdf.setTextColor(44,65,92)
    pdf.setFontSize(8)
    const context=pdf.splitTextToSize(`Contexto: ${exportContext()}`,usable-8)
    pdf.text(context,left+4,96)
    y=112+(context.length-1)*9
  }
  function drawTableHeader(){
    let x=left
    pdf.setFillColor(30,84,163)
    pdf.setTextColor(255,255,255)
    pdf.setFont('helvetica','bold')
    pdf.setFontSize(7)
    for(let i=0;i<headers.length;i++){
      const w=scaled[i]
      pdf.rect(x,y,w,rowH,'F')
      const label=pdf.splitTextToSize(headers[i],w-6).slice(0,2)
      pdf.text(label,x+3,y+10)
      x+=w
    }
    y+=rowH
  }
  function drawDataRow(values:string[],index:number){
    let x=left
    const fill=index%2===0 ? [248,250,253] : [255,255,255]
    pdf.setFillColor(fill[0],fill[1],fill[2])
    pdf.setTextColor(29,48,78)
    pdf.setFont('helvetica','normal')
    pdf.setFontSize(6.7)
    for(let i=0;i<values.length;i++){
      const w=scaled[i]
      pdf.rect(x,y,w,rowH,'F')
      pdf.setDrawColor(218,226,237)
      pdf.rect(x,y,w,rowH,'S')
      const value=pdf.splitTextToSize(String(values[i]??''),w-6).slice(0,2)
      pdf.text(value,x+3,y+9)
      x+=w
    }
    y+=rowH
  }
  function drawFooter(){
    pdf.setTextColor(110,126,148)
    pdf.setFontSize(7)
    pdf.text('Portal RYM · Exportación de la selección actual',left,pageHeight-16)
    pdf.text(`Página ${pageNo}`,pageWidth-right-34,pageHeight-16)
  }

  drawPageHeader()
  drawTableHeader()
  rows.forEach((row,index)=>{
    if(y+rowH>pageHeight-34){
      drawFooter()
      pdf.addPage('a4','landscape')
      pageNo++
      drawPageHeader()
      drawTableHeader()
    }
    drawDataRow([
      row.Prioridad,row.Unidad,row.Empresa,row.Color,row.Placa,row.Cupo,row.Mes,row.Galera,
      row.Supervisora,row['Último revisado'],row['Estatus 2'],row.eCarCheck
    ],index)
  })
  drawFooter()
  pdf.save(exportFilename('pdf'))
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
    <div class="queue-copy">
      <span>COLA DE TRABAJO TÁCTICA</span>
      <b>{{num(filteredRows.length)}} unidades visibles</b>
      <small>Ordenada por prioridad y antigüedad.</small>
    </div>
    <div class="export-actions">
      <button class="export-copy" type="button" @click="copyList"><RymIcon name="content_copy" :size="14"/> Copiar lista</button>
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

.queue-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:1px}
.queue-copy{display:grid;grid-template-columns:auto 1fr;gap:2px 6px;align-items:baseline;min-width:0}
.queue-head span{grid-column:1/-1;font-size:6px;font-weight:900;color:#174EA6;letter-spacing:.06em}.queue-head b{font-size:11px;color:#0B214E}.queue-head small{font-size:7px;color:#6A7990}.queue-head button{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;padding:7px 10px!important;border:1px solid #B8CBE4!important;border-radius:8px!important;background:#fff!important;color:#174EA6!important;font-size:8px!important;font-weight:850!important;white-space:nowrap!important}

.queue-head>.export-actions{display:flex!important;align-items:center!important;gap:7px!important;flex-wrap:nowrap!important;justify-content:flex-end!important;flex:0 0 auto!important}
.export-actions button{min-height:36px!important}
.export-excel{border-color:#A7D4B4!important;color:#17663A!important;background:#F2FBF5!important}
.export-pdf{border-color:#E9B3B3!important;color:#A32424!important;background:#FFF5F5!important}
.app-mark{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 4px;border-radius:5px;font-size:7px;font-weight:900;background:currentColor;color:#fff}
.export-excel .app-mark{background:#1F7A43;color:#fff}
.export-pdf .app-mark{background:#C93636;color:#fff}

@media(max-width:1180px){.kpi-row{grid-template-columns:repeat(3,minmax(0,1fr))}.facet-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){.command-actions{grid-template-columns:1fr}.priority-strip{grid-template-columns:1fr}.kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:680px){.facet-grid,.kpi-row{grid-template-columns:1fr}.command-head,.filter-foot{align-items:flex-start;flex-direction:column}.queue-head{align-items:center;flex-direction:row}.queue-copy{min-width:0}.queue-head>.export-actions{gap:5px!important}.export-actions button{padding:6px 8px!important;font-size:7px!important}.sync-card,.lookup-card{grid-template-columns:auto minmax(0,1fr)}.action-button,.lookup-form{grid-column:2}.lookup-form{flex-wrap:wrap}.kpi span{white-space:normal}}
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
