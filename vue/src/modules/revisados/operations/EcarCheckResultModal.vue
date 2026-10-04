<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import RymIcon from '../components/RymIcon.vue'

const props=defineProps<{
  open:boolean
  plate:string
  payload:Record<string,any>|null
}>()

const emit=defineEmits<{ close:[] }>()

const result=computed(()=>props.payload?.result || {})
const vehicle=computed(()=>result.value?.vehiculo || {})
const tickets=computed(()=>result.value?.boletas || {})
const block=computed(()=>result.value?.bloqueo || {})
const errors=computed(()=>Array.isArray(block.value?.errors) ? block.value.errors : [])

function count(path:any){ return Number(path?.cantidad ?? 0) || 0 }
function available(path:any){ return path?.disponible !== false }
function text(v:unknown,fallback='—'){
  const s=String(v ?? '').trim()
  return s || fallback
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

const summary=computed(()=>[
  {label:'ENA',value:count(tickets.value?.infraccionesEna),available:available(tickets.value?.infraccionesEna)},
  {label:'Documento',value:count(tickets.value?.boletasPorDocumento),available:available(tickets.value?.boletasPorDocumento)},
  {label:'Placa',value:count(tickets.value?.boletasPorPlaca),available:available(tickets.value?.boletasPorPlaca)},
])

const serviceMessages=computed(()=>{
  const out:Array<{label:string,message:string,tone:string}>=[]
  const defs=[
    ['ENA',tickets.value?.infraccionesEna],
    ['Documento',tickets.value?.boletasPorDocumento],
    ['Placa',tickets.value?.boletasPorPlaca],
  ]
  for(const [label,value] of defs as Array<[string,any]>){
    const msg=text(value?.mensaje,'')
    if(msg) out.push({label,message:msg,tone:value?.disponible===false?'warning':'neutral'})
  }
  for(const err of errors.value){
    out.push({
      label:text(err?.title,'Error eCarCheck'),
      message:text(err?.detail || err?.message,''),
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
  if(type.includes('BLOQUEADO')) return 'Bloqueo reportado por eCarCheck'
  if(type.includes('OK') || type.includes('FICHA') || status===200) return 'Consulta completada'
  return text(result.value?.tipo_resultado || 'Resultado recibido')
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
                <small>ECARCHECK V2 · RESULTADO DE CONSULTA</small>
                <h2 id="ecar-modal-title">{{ text(vehicle?.nroPlaca || result?.placa || plate,'Placa consultada') }}</h2>
                <p>{{ text(vehicle?.nombrePropietario || vehicle?.propietario || 'Resultado oficial de la consulta') }}</p>
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

            <section class="vehicle-grid">
              <article>
                <small>Placa</small>
                <b>{{ text(vehicle?.nroPlaca || result?.placa || plate) }}</b>
              </article>
              <article>
                <small>Propietario</small>
                <b>{{ text(vehicle?.nombrePropietario || vehicle?.propietario) }}</b>
              </article>
              <article>
                <small>Color</small>
                <b>{{ text(vehicle?.colorVehiculo || vehicle?.color) }}</b>
              </article>
              <article>
                <small>Último revisado</small>
                <b>{{ text(vehicle?.fechaRevisado || vehicle?.revisado) }}</b>
              </article>
            </section>

            <section class="summary-grid">
              <article v-for="item in summary" :key="item.label" :class="{unavailable:!item.available}">
                <small>{{item.label}}</small>
                <b>{{item.available ? item.value : '—'}}</b>
                <span>{{item.available ? 'disponible' : 'servicio no disponible'}}</span>
              </article>
            </section>

            <section v-if="text(result?.detalle,'')" class="detail-card">
              <div class="section-title">
                <RymIcon name="description" :size="17"/>
                <b>Detalle de la consulta</b>
              </div>
              <p>{{result.detalle}}</p>
            </section>

            <section v-if="serviceMessages.length" class="alerts-section">
              <div class="section-title">
                <RymIcon name="notification_important" :size="17"/>
                <b>Hallazgos y servicios</b>
              </div>
              <div class="alerts-list">
                <article v-for="(item,index) in serviceMessages" :key="index" :data-tone="item.tone">
                  <b>{{item.label}}</b>
                  <p>{{item.message}}</p>
                </article>
              </div>
            </section>

            <section class="meta-strip">
              <span><small>HTTP</small><b>{{ text(result?.status) }}</b></span>
              <span><small>Bridge</small><b>{{ text(result?.bridge_version) }}</b></span>
              <span><small>Resultado técnico</small><b>{{ text(result?.tipo_resultado) }}</b></span>
            </section>
          </div>

          <footer class="modal-footer">
            <span>La información mostrada corresponde al resultado recibido por eCarCheck.</span>
            <button type="button" @click="emit('close')">Cerrar</button>
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
  .vehicle-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .summary-grid{grid-template-columns:1fr}
  .status-banner,.modal-footer{align-items:flex-start;flex-direction:column}
}
</style>
