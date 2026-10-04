<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import RymIcon from '../components/RymIcon.vue'

const props=defineProps<{
  open:boolean
  plate:string
  payload:Record<string,any>|null
}>()

const emit=defineEmits<{ close:[]; retry:[] }>()

const result=computed(()=>props.payload?.result || {})
const vehicle=computed(()=>result.value?.vehiculo || {})
const tickets=computed(()=>result.value?.boletas || {})
const block=computed(()=>result.value?.bloqueo || {})
const errors=computed(()=>Array.isArray(block.value?.errors) ? block.value.errors : [])
const owner=computed(()=>{
  const candidates=[result.value?.titular,result.value?.propietario,vehicle.value?.titular,vehicle.value?.propietario]
  return candidates.find((value:any)=>value && typeof value==='object' && !Array.isArray(value)) || {}
})

function count(path:any){ return Number(path?.cantidad ?? path?.total ?? 0) || 0 }
function available(path:any){ return path?.disponible !== false }
function text(v:unknown,fallback='—'){
  const s=String(v ?? '').trim()
  return s || fallback
}
function first(...values:unknown[]){
  for(const value of values){
    const s=String(value ?? '').trim()
    if(s && s!=='—' && s.toLowerCase()!=='null' && s.toLowerCase()!=='undefined') return s
  }
  return ''
}
function money(v:unknown){
  const n=Number(v)
  if(!Number.isFinite(n)) return first(v)
  return new Intl.NumberFormat('es-PA',{style:'currency',currency:'PAB'}).format(n)
}
function compactItem(item:any){
  if(item==null) return ''
  if(typeof item!=='object') return first(item)
  const parts=[
    first(item.tipo,item.clase,item.concepto,item.descripcion,item.detalle),
    first(item.numero,item.nroBoleta,item.boleta,item.id),
    item.monto!=null ? money(item.monto) : '',
    first(item.fecha,item.fechaBoleta,item.estado)
  ].filter(Boolean)
  return [...new Set(parts)].join(' · ')
}
function detailItems(source:any){
  const candidates=[source?.items,source?.boletas,source?.infracciones,source?.resultados,source?.data,source?.detalle]
  const list=candidates.find(Array.isArray)
  return Array.isArray(list) ? list.map(compactItem).filter(Boolean).slice(0,8) : []
}
function dateText(v:unknown){
  if(!v) return '—'
  try{
    return new Intl.DateTimeFormat('es-PA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(String(v)))
  }catch{
    return text(v)
  }
}
function onKey(e:KeyboardEvent){
  if(props.open && e.key==='Escape') emit('close')
}
watch(()=>props.open,(open)=>{
  if(typeof document==='undefined') return
  document.body.style.overflow=open?'hidden':''
})
onMounted(()=>window.addEventListener('keydown',onKey))
onBeforeUnmount(()=>{
  window.removeEventListener('keydown',onKey)
  if(typeof document!=='undefined') document.body.style.overflow=''
})

const vehicleFacts=computed(()=>[
  {label:'Placa',value:first(vehicle.value?.nroPlaca,vehicle.value?.placa,result.value?.placa,props.plate)},
  {label:'Marca',value:first(vehicle.value?.marca,vehicle.value?.marcaVehiculo,vehicle.value?.fabricante)},
  {label:'Modelo',value:first(vehicle.value?.modelo,vehicle.value?.modeloVehiculo,vehicle.value?.linea)},
  {label:'Año',value:first(vehicle.value?.anio,vehicle.value?.año,vehicle.value?.year)},
  {label:'Color',value:first(vehicle.value?.colorVehiculo,vehicle.value?.color)},
  {label:'Tipo',value:first(vehicle.value?.tipoVehiculo,vehicle.value?.tipo,vehicle.value?.clase)},
  {label:'Chasis / VIN',value:first(vehicle.value?.chasis,vehicle.value?.vin,vehicle.value?.nroChasis)},
  {label:'Motor',value:first(vehicle.value?.motor,vehicle.value?.nroMotor)},
  {label:'Último revisado',value:first(vehicle.value?.fechaRevisado,vehicle.value?.revisado,vehicle.value?.ultimoRevisado)},
].filter(item=>item.value))

const ownerFacts=computed(()=>[
  {label:'Nombre / razón social',value:first(
    owner.value?.nombre,owner.value?.nombreCompleto,owner.value?.razonSocial,
    vehicle.value?.nombrePropietario,typeof vehicle.value?.propietario==='string'?vehicle.value.propietario:''
  )},
  {label:'Documento',value:first(
    owner.value?.documento,owner.value?.cedula,owner.value?.ruc,owner.value?.nroDocumento,
    vehicle.value?.documentoPropietario,vehicle.value?.cedulaPropietario,vehicle.value?.rucPropietario
  )},
  {label:'Tipo de documento',value:first(owner.value?.tipoDocumento,owner.value?.tipo_documento,vehicle.value?.tipoDocumentoPropietario)},
  {label:'Condición',value:first(owner.value?.condicion,owner.value?.tipoPersona,owner.value?.tipo_persona)},
].filter(item=>item.value))

const ticketSummary=computed(()=>[
  {
    key:'ena',label:'ENA / empresa',
    value:count(tickets.value?.infraccionesEna),available:available(tickets.value?.infraccionesEna),
    message:first(tickets.value?.infraccionesEna?.mensaje),details:detailItems(tickets.value?.infraccionesEna)
  },
  {
    key:'documento',label:'Documento del titular',
    value:count(tickets.value?.boletasPorDocumento),available:available(tickets.value?.boletasPorDocumento),
    message:first(tickets.value?.boletasPorDocumento?.mensaje),details:detailItems(tickets.value?.boletasPorDocumento)
  },
  {
    key:'placa',label:'Placa',
    value:count(tickets.value?.boletasPorPlaca),available:available(tickets.value?.boletasPorPlaca),
    message:first(tickets.value?.boletasPorPlaca?.mensaje),details:detailItems(tickets.value?.boletasPorPlaca)
  },
])
const ticketTotal=computed(()=>ticketSummary.value.reduce((sum,item)=>sum+(item.available?item.value:0),0))
const serviceMessages=computed(()=>{
  const out:Array<{label:string,message:string,tone:string}>=[]
  for(const item of ticketSummary.value){
    if(!item.available) out.push({label:item.label,message:item.message||'Este servicio no estuvo disponible en la consulta.',tone:'warning'})
  }
  for(const err of errors.value){
    out.push({
      label:first(err?.title,'Alerta eCarCheck'),
      message:first(err?.detail,err?.message,'No fue posible validar este dato.'),
      tone:'danger'
    })
  }
  return out
})

const semanticStatusLabel=computed(()=>{
  const status=Number(result.value?.status||0)
  const detail=text(result.value?.detalle,'').toUpperCase()
  const type=text(result.value?.tipo_resultado,'').toUpperCase()
  if(status>=500 || detail.includes('INTERMITEN') || detail.includes('NO ESTÁ DISPONIBLE') || detail.includes('SATURADO')) return 'Servicio ATTT no disponible'
  if(ticketTotal.value>0) return `${ticketTotal.value} boleta${ticketTotal.value===1?'':'s'} detectada${ticketTotal.value===1?'':'s'}`
  if(type.includes('BLOQUEADO')) return 'Restricción reportada por eCarCheck'
  if(type.includes('OK') || type.includes('FICHA') || status===200) return 'Sin boletas detectadas en la consulta'
  return 'Resultado recibido'
})

const statusTone=computed(()=>{
  const status=Number(result.value?.status||0)
  const type=text(result.value?.tipo_resultado,'').toUpperCase()
  if(status>=500 || errors.value.length) return 'danger'
  if(type.includes('BLOQUE')) return 'warning'
  if(type.includes('OK') || status===200) return 'success'
  return 'neutral'
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ecar-modal">
      <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
        <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="ecar-modal-title">
          <header class="modal-header">
            <div class="modal-title-wrap">
              <span class="modal-icon"><RymIcon name="verified_user" :size="22"/></span>
              <div>
                <small>ECARCHECK V2 · CONSULTA VEHICULAR</small>
                <h2 id="ecar-modal-title">{{ text(vehicle?.nroPlaca || result?.placa || plate,'Placa consultada') }}</h2>
                <p>{{ first(vehicle?.nombrePropietario,typeof vehicle?.propietario==='string'?vehicle.propietario:'','Información oficial recibida de eCarCheck') }}</p>
              </div>
            </div>
            <button class="modal-close" type="button" aria-label="Cerrar" @click="emit('close')">
              <RymIcon name="close" :size="20"/>
            </button>
          </header>

          <div class="modal-body">
            <section class="status-banner" :data-tone="statusTone">
              <div>
                <small>ESTADO GENERAL</small>
                <b>{{ semanticStatusLabel }}</b>
              </div>
              <span>Consulta {{ dateText(result?.consultado_en || tickets?.consultadoEn) }}</span>
            </section>

            <section class="info-section">
              <div class="section-heading">
                <span class="section-icon"><RymIcon name="directions_car" :size="18"/></span>
                <div><small>VEHÍCULO</small><b>Información del auto</b></div>
              </div>
              <div class="facts-grid vehicle-facts">
                <article v-for="item in vehicleFacts" :key="item.label">
                  <small>{{item.label}}</small>
                  <b>{{item.value}}</b>
                </article>
              </div>
            </section>

            <section class="info-section">
              <div class="section-heading">
                <span class="section-icon"><RymIcon name="person" :size="18"/></span>
                <div><small>TITULAR REGISTRAL</small><b>Información del titular</b></div>
              </div>
              <div v-if="ownerFacts.length" class="facts-grid owner-facts">
                <article v-for="item in ownerFacts" :key="item.label">
                  <small>{{item.label}}</small>
                  <b>{{item.value}}</b>
                </article>
              </div>
              <p v-else class="empty-note">eCarCheck no devolvió datos adicionales del titular en esta consulta.</p>
            </section>

            <section class="tickets-section">
              <div class="section-heading">
                <span class="section-icon ticket-icon"><RymIcon name="receipt_long" :size="18"/></span>
                <div><small>BOLETAS Y RESTRICCIONES</small><b>Qué se encontró y dónde</b></div>
                <span class="ticket-total" :data-alert="ticketTotal>0">{{ticketTotal}} total</span>
              </div>

              <div class="ticket-grid">
                <article
                  v-for="item in ticketSummary"
                  :key="item.key"
                  class="ticket-card"
                  :data-state="!item.available?'unavailable':item.value>0?'alert':'clear'"
                >
                  <header>
                    <div>
                      <small>TIPO</small>
                      <b>{{item.label}}</b>
                    </div>
                    <strong>{{item.available ? item.value : '—'}}</strong>
                  </header>
                  <span class="ticket-state">
                    {{!item.available ? 'Servicio no disponible' : item.value>0 ? (item.value===1?'1 boleta detectada':item.value+' boletas detectadas') : 'Sin boletas'}}
                  </span>
                  <p v-if="item.message">{{item.message}}</p>
                  <ul v-if="item.details.length">
                    <li v-for="(detail,index) in item.details" :key="index">{{detail}}</li>
                  </ul>
                </article>
              </div>
            </section>

            <section v-if="serviceMessages.length" class="alerts-section">
              <div class="section-title">
                <RymIcon name="notification_important" :size="17"/>
                <b>Datos que no pudieron validarse</b>
              </div>
              <div class="alerts-list">
                <article v-for="(item,index) in serviceMessages" :key="index" :data-tone="item.tone">
                  <b>{{item.label}}</b>
                  <p>{{item.message}}</p>
                </article>
              </div>
            </section>
          </div>

          <footer class="modal-footer">
            <span>Vehículo, titular y boletas mostrados según la respuesta recibida de eCarCheck.</span>
            <div class="modal-actions">
              <button class="footer-close" type="button" @click="emit('close')">Cerrar</button>
              <button class="footer-retry" type="button" @click="emit('retry')"><RymIcon name="refresh" :size="16"/> Reintentar consulta</button>
            </div>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop{
  position:fixed;inset:0;z-index:9999;display:grid;place-items:center;
  padding:24px;background:rgba(5,18,46,.58);backdrop-filter:blur(5px);
}
.modal-card{
  width:min(860px,96vw);max-height:min(820px,92vh);overflow:hidden;
  display:grid;grid-template-rows:auto minmax(0,1fr) auto;
  border:1px solid #B8CAE2;border-radius:20px;background:#fff;
  box-shadow:0 30px 80px rgba(5,20,52,.28);
}
.modal-header{
  display:flex;align-items:flex-start;justify-content:space-between;gap:16px;
  padding:18px 20px;border-bottom:1px solid #D8E2EE;
  background:linear-gradient(135deg,#EEF5FF 0%,#FFFFFF 68%);
}
.modal-title-wrap{display:flex;align-items:center;gap:12px}
.modal-icon{
  width:44px;height:44px;display:grid;place-items:center;border-radius:13px;
  background:linear-gradient(135deg,#174EA6,#3A72D5);color:#fff;box-shadow:0 8px 20px rgba(23,78,166,.2);
}
.modal-title-wrap>div{display:grid;gap:3px}
.modal-title-wrap small{font-size:9px;font-weight:900;letter-spacing:.06em;color:#174EA6}
.modal-title-wrap h2{margin:0;font-size:24px;line-height:1;color:#0B214E}
.modal-title-wrap p{margin:0;font-size:11px;color:#60718A}
.modal-close{
  width:36px;height:36px;display:grid!important;place-items:center!important;
  border:1px solid #C7D5E6!important;border-radius:10px!important;background:#fff!important;color:#304765!important;cursor:pointer!important;
}
.modal-body{overflow:auto;padding:18px 20px;display:grid;gap:14px;background:#F7F9FC}
.status-banner{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:12px 14px;border:1px solid #C8D7E8;border-radius:12px;background:#fff;
}
.status-banner>div{display:grid;gap:2px}.status-banner small{font-size:8px;color:#6A7B92;font-weight:900}.status-banner b{font-size:14px;color:#0B214E}.status-banner>span{font-size:10px;color:#67788F}
.status-banner[data-tone="success"]{background:#EFFAF4;border-color:#A9DFC4}.status-banner[data-tone="success"] b{color:#0C7B4E}
.status-banner[data-tone="warning"]{background:#FFF7E8;border-color:#F2C982}.status-banner[data-tone="warning"] b{color:#9A5B00}
.status-banner[data-tone="danger"]{background:#FFF1F0;border-color:#F0B0AB}.status-banner[data-tone="danger"] b{color:#B52B23}

.info-section,.tickets-section{
  padding:15px;border:1px solid #D0DCE9;border-radius:14px;background:#fff;
  box-shadow:0 5px 16px rgba(18,46,92,.04);
}
.section-heading{display:flex;align-items:center;gap:10px;margin-bottom:11px}
.section-heading>div{display:grid;gap:1px;min-width:0}
.section-heading small{font-size:8px;font-weight:900;letter-spacing:.06em;color:#71829A}
.section-heading b{font-size:13px;color:#102A55}
.section-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#EAF2FF;color:#1763D3;flex:0 0 34px}
.ticket-icon{background:#FFF3E5;color:#C66A00}
.facts-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
.facts-grid article{min-width:0;padding:11px 12px;border:1px solid #D7E1EC;border-radius:11px;background:#F9FBFE}
.facts-grid small{display:block;margin-bottom:4px;font-size:7px;font-weight:900;text-transform:uppercase;color:#78889D}
.facts-grid b{display:block;font-size:11px;line-height:1.35;color:#142D53;overflow-wrap:anywhere}
.owner-facts{grid-template-columns:repeat(3,minmax(0,1fr))}
.owner-facts article:first-child{grid-column:span 2;background:linear-gradient(135deg,#F1F6FF,#fff)}
.empty-note{margin:0;padding:10px 12px;border:1px dashed #CBD8E7;border-radius:10px;background:#FAFCFF;font-size:10px;color:#697B92}
.ticket-total{margin-left:auto;padding:6px 9px;border-radius:999px;background:#ECF8F2;color:#08794C;font-size:9px;font-weight:900;white-space:nowrap}
.ticket-total[data-alert="true"]{background:#FFF0EE;color:#B93229}
.ticket-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.ticket-card{min-width:0;padding:13px;border:1px solid #CFE0F2;border-radius:13px;background:linear-gradient(135deg,#F4F9FF,#fff)}
.ticket-card[data-state="alert"]{border-color:#F1AAA2;background:linear-gradient(135deg,#FFF0EE,#fff);box-shadow:inset 4px 0 0 #DD4037}
.ticket-card[data-state="clear"]{border-color:#B9E2CF;background:linear-gradient(135deg,#EFFAF5,#fff);box-shadow:inset 4px 0 0 #15A06A}
.ticket-card[data-state="unavailable"]{border-color:#F0CE91;background:#FFF9EE;box-shadow:inset 4px 0 0 #E39A1D}
.ticket-card header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.ticket-card header>div{display:grid;gap:2px;min-width:0}
.ticket-card header small{font-size:7px;font-weight:900;color:#7A899E}
.ticket-card header b{font-size:11px;color:#16325B}
.ticket-card strong{font-size:27px;line-height:1;color:#112C58}
.ticket-card[data-state="alert"] strong{color:#BC342B}
.ticket-card[data-state="clear"] strong{color:#0B8657}
.ticket-state{display:block;margin-top:7px;font-size:9px;font-weight:850;color:#53677F}
.ticket-card p{margin:6px 0 0;font-size:9px;line-height:1.45;color:#61738A}
.ticket-card ul{margin:8px 0 0;padding:8px 0 0 16px;border-top:1px solid rgba(108,132,163,.18)}
.ticket-card li{margin:3px 0;font-size:8px;line-height:1.4;color:#435873}

.vehicle-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.vehicle-grid article,.summary-grid article{
  min-width:0;padding:12px;border:1px solid #D1DDEA;border-radius:12px;background:#fff;
}
.vehicle-grid small,.summary-grid small{display:block;margin-bottom:5px;font-size:8px;font-weight:900;text-transform:uppercase;color:#708198}
.vehicle-grid b{display:block;font-size:12px;line-height:1.35;color:#13294C;overflow-wrap:anywhere}
.summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.summary-grid article{border-left:4px solid #2C67C7}.summary-grid article.unavailable{border-left-color:#F0A11C;background:#FFF9EE}
.summary-grid b{display:block;font-size:26px;line-height:1;color:#0B214E}.summary-grid span{display:block;margin-top:5px;font-size:9px;color:#6A7A90}
.section-title{display:flex;align-items:center;gap:7px;color:#174EA6}.section-title b{font-size:11px}
.detail-card,.alerts-section{padding:14px;border:1px solid #D0DCE9;border-radius:12px;background:#fff}
.detail-card p{margin:9px 0 0;font-size:11px;line-height:1.55;color:#344A68;white-space:pre-wrap}
.alerts-list{display:grid;gap:8px;margin-top:10px}
.alerts-list article{padding:10px 11px;border:1px solid #D8E2ED;border-left:4px solid #8AA0BA;border-radius:9px;background:#FAFCFE}
.alerts-list article[data-tone="warning"]{border-left-color:#F0A11C;background:#FFF9EE}
.alerts-list article[data-tone="danger"]{border-left-color:#E24A4A;background:#FFF3F2}
.alerts-list b{font-size:10px;color:#13294C}.alerts-list p{margin:4px 0 0;font-size:10px;line-height:1.45;color:#5B6D85}
.meta-strip{display:flex;flex-wrap:wrap;gap:8px}
.meta-strip>span{min-width:120px;padding:9px 10px;border:1px solid #D4DFEA;border-radius:9px;background:#fff;display:grid;gap:2px}
.meta-strip small{font-size:7px;font-weight:900;color:#7A899D;text-transform:uppercase}.meta-strip b{font-size:10px;color:#203654}

.modal-footer{
  display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 20px;
  border-top:1px solid #D8E2EE;background:#fff;
}
.modal-footer span{font-size:9px;color:#6A7B91}
.modal-footer button{
  min-width:92px;padding:9px 14px!important;border:1px solid #174EA6!important;border-radius:9px!important;
  background:linear-gradient(135deg,#174EA6,#2F63D8)!important;color:#fff!important;font-size:10px!important;font-weight:900!important;cursor:pointer!important;
}

.ecar-modal-enter-active,.ecar-modal-leave-active{transition:opacity .18s ease}
.ecar-modal-enter-active .modal-card,.ecar-modal-leave-active .modal-card{transition:transform .18s ease,opacity .18s ease}
.ecar-modal-enter-from,.ecar-modal-leave-to{opacity:0}
.ecar-modal-enter-from .modal-card{transform:translateY(8px) scale(.985);opacity:0}
.ecar-modal-leave-to .modal-card{transform:translateY(5px) scale(.99);opacity:0}

@media(max-width:760px){
  .modal-backdrop{padding:10px}
  .modal-card{width:100%;max-height:96vh;border-radius:15px}
  .facts-grid,.owner-facts{grid-template-columns:repeat(2,minmax(0,1fr))}
  .owner-facts article:first-child{grid-column:span 2}
  .ticket-grid{grid-template-columns:1fr}
  .status-banner,.modal-footer{align-items:flex-start;flex-direction:column}
}
</style>

<style scoped>
/* approved innovative modal skin */
.modal-backdrop{
  background:rgba(5,21,55,.66);
  backdrop-filter:blur(7px) saturate(120%);
}
.modal-card{
  width:min(900px,96vw);
  border-radius:24px;
  border:1px solid #8DB5F4;
  box-shadow:0 36px 90px rgba(5,20,52,.36);
}
.modal-header{
  padding:20px 22px;
  border-bottom:0;
  background:
    radial-gradient(circle at 82% 35%,rgba(124,183,255,.34),transparent 27%),
    linear-gradient(135deg,#0B3D96 0%,#0D63D8 58%,#2E7CE6 100%);
}
.modal-icon{
  width:48px;height:48px;border-radius:14px;
  background:linear-gradient(145deg,#1468E6,#2357C6);
}
.modal-title-wrap small{font-size:10px;color:#D4E5FF}
.modal-title-wrap h2{font-size:30px;color:#fff}
.modal-title-wrap p{font-size:12px;color:#DFEAFA}
.modal-close{
  width:40px;height:40px;border:0!important;
  background:rgba(255,255,255,.12)!important;
  color:#fff!important;
}
.modal-body{
  padding:20px 22px;
  gap:16px;
  background:
    radial-gradient(circle at 86% 8%,rgba(134,190,255,.18),transparent 22%),
    #F8FAFE;
}
.status-banner{
  border-radius:14px;
  padding:14px 16px;
  box-shadow:0 5px 14px rgba(16,40,80,.04);
}
.vehicle-grid article,.summary-grid article{
  border-radius:14px;
  padding:14px;
  box-shadow:0 5px 16px rgba(18,46,92,.05);
}
.summary-grid article:nth-child(1){background:linear-gradient(135deg,#F0F6FF,#fff);border-left-color:#2872E5}
.summary-grid article:nth-child(2){background:linear-gradient(135deg,#F5F2FF,#fff);border-left-color:#7154E9}
.summary-grid article:nth-child(3){background:linear-gradient(135deg,#ECFAF5,#fff);border-left-color:#18A66E}
.summary-grid b{font-size:30px}
.detail-card,.alerts-section{
  border-radius:14px;
  padding:16px;
}
.alerts-list article{
  border-radius:11px;
  padding:12px;
}
.modal-footer{
  padding:15px 22px;
}
.modal-actions{display:flex;align-items:center;gap:10px}
.footer-close{
  min-width:100px;
  padding:10px 14px!important;
  border:1px solid #8FB0DA!important;
  border-radius:10px!important;
  background:#fff!important;
  color:#173A71!important;
  font-size:10px!important;
  font-weight:900!important;
}
.footer-retry{
  min-width:170px;
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:7px!important;
  padding:10px 15px!important;
  border:1px solid #1764DB!important;
  border-radius:10px!important;
  background:linear-gradient(135deg,#0E61DC,#2E78F0)!important;
  color:#fff!important;
  font-size:10px!important;
  font-weight:900!important;
  box-shadow:0 8px 18px rgba(18,97,220,.22)!important;
}
</style>


<style scoped>
/* modal overflow hardening */
.modal-backdrop{
  overflow:auto;
  overscroll-behavior:contain;
  align-items:start;
}
.modal-card{
  max-width:calc(100vw - 32px);
  max-height:calc(100dvh - 32px);
  margin:auto;
  min-width:0;
}
.modal-header,
.modal-footer,
.modal-body,
.modal-title-wrap,
.modal-title-wrap>div,
.status-banner,
.vehicle-grid,
.summary-grid,
.detail-card,
.alerts-section,
.meta-strip{
  min-width:0;
  max-width:100%;
}
.modal-title-wrap{
  flex:1;
}
.modal-title-wrap>div{
  overflow:hidden;
}
.modal-title-wrap h2,
.modal-title-wrap p,
.vehicle-grid b,
.detail-card p,
.alerts-list p,
.meta-strip b{
  overflow-wrap:anywhere;
  word-break:break-word;
}
.modal-title-wrap h2,
.modal-title-wrap p{
  white-space:normal;
}
.modal-body{
  min-height:0;
  scrollbar-gutter:stable;
}
.vehicle-grid,
.summary-grid{
  align-items:stretch;
}
.meta-strip>span{
  flex:1 1 150px;
  min-width:0;
}
.modal-footer>span{
  min-width:0;
  flex:1 1 auto;
}
.modal-actions{
  flex:0 0 auto;
  flex-wrap:wrap;
  justify-content:flex-end;
}
.footer-close,
.footer-retry{
  max-width:100%;
}
@media(max-width:760px){
  .modal-backdrop{
    padding:8px;
    align-items:start;
  }
  .modal-card{
    max-width:calc(100vw - 16px);
    max-height:calc(100dvh - 16px);
    margin:0 auto;
    border-radius:16px;
  }
  .modal-header{
    padding:16px;
  }
  .modal-title-wrap{
    align-items:flex-start;
  }
  .modal-title-wrap h2{
    font-size:24px;
    line-height:1.05;
  }
  .modal-title-wrap p{
    font-size:11px;
  }
  .modal-body{
    padding:14px;
  }
  .facts-grid,.owner-facts{
    grid-template-columns:1fr 1fr;
  }
  .owner-facts article:first-child{grid-column:span 2}
  .ticket-grid{grid-template-columns:1fr}
  .status-banner{
    align-items:flex-start;
  }
  .modal-footer{
    width:100%;
    padding:12px 14px;
  }
  .modal-actions{
    width:100%;
  }
  .footer-close,
  .footer-retry{
    flex:1 1 160px;
    min-width:0;
  }
}
@media(max-width:520px){
  .facts-grid,.owner-facts{
    grid-template-columns:1fr;
  }
  .owner-facts article:first-child{grid-column:auto}

  .modal-title-wrap{
    gap:10px;
  }
  .modal-icon{
    width:42px;
    height:42px;
    flex:0 0 42px;
  }
  .modal-close{
    flex:0 0 38px;
  }
  .summary-grid{
    grid-template-columns:1fr;
  }
  .modal-actions{
    display:grid;
    grid-template-columns:1fr;
  }
  .footer-close,
  .footer-retry{
    width:100%;
  }
}
</style>
