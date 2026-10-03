<script setup lang="ts">
import { computed } from 'vue'
import type { CanonicalRevisadoRow } from '../types/revisados.types'

const props=withDefaults(defineProps<{row:CanonicalRevisadoRow;compact?:boolean}>(),{compact:false})
const emit=defineEmits<{open:[row:CanonicalRevisadoRow]}>()

function s(v:unknown){return String(v??'').trim()}
function norm(v:unknown){return s(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
function fmt(v:unknown){if(!v)return'—';try{return new Intl.DateTimeFormat('es-PA',{timeZone:'America/Panama',day:'2-digit',month:'short',year:'numeric'}).format(new Date(String(v)))}catch{return s(v)||'—'}}

const tone=computed(()=>{
  if(props.row.bloqueado)return'incident'
  const p=norm(props.row.pendiente_tipo||props.row.status2)
  if(p.includes('COLOR'))return'color'
  if(props.row.emitido)return'good'
  return'pending'
})
const label=computed(()=>{
  if(props.row.bloqueado)return'Incidencia'
  const p=s(props.row.pendiente_tipo||props.row.status2)
  if(p)return p
  return props.row.emitido?'Vigente':'Pendiente'
})
const model=computed(()=>[s(props.row.marca),s(props.row.modelo)].filter(Boolean).join(' ')||s(props.row.empresa)||'Vehículo RYM')
const signals=computed(()=>{
  const out:{label:string;tone:string}[]=[]
  if(props.row.boleta_empresa)out.push({label:'Boleta empresa',tone:'bad'})
  else if(props.row.boleta_pendiente)out.push({label:'Boleta placa',tone:'bad'})
  else out.push({label:'Sin boleta',tone:'ok'})
  const diff=Boolean(props.row.ficha_ecarcheck_at&&props.row.color_control&&props.row.color_ecarcheck&&norm(props.row.color_control)!==norm(props.row.color_ecarcheck))
  out.push({label:diff?'Color difiere':'Color OK',tone:diff?'warn':'ok'})
  const cupo=norm(props.row.cupo_ecarcheck||props.row.cupo_control)
  const sin=!cupo||['NO APLICA','N/A','NA','SIN CUPO'].includes(cupo)
  out.push({label:sin?'Sin cupo':'Cupo OK',tone:sin?'warn':'info'})
  return out
})
</script>

<template>
<article class="vehicle-badge" :class="['tone-'+tone,{compact}]" @click="emit('open',row)">
  <div class="accent"></div>
  <header>
    <span>{{ row.galera || 'SIN GALERA' }}</span>
    <b :class="'tone-'+tone">{{ label }}</b>
  </header>
  <div class="plate">
    <small>UNIDAD {{ row.unidad || '—' }}</small>
    <strong>{{ row.placa || row.unidad || '—' }}</strong>
    <span>PANAMÁ · RYM</span>
  </div>
  <div class="identity">
    <b>{{ model }}</b>
    <span>{{ row.supervisora || 'Sin supervisora' }}</span>
  </div>
  <div class="review">
    <span>Último revisado</span>
    <b>{{ fmt(row.ultimo_revisado) }}</b>
  </div>
  <div class="signals">
    <span v-for="item in signals" :key="item.label" :class="'sig-'+item.tone">{{ item.label }}</span>
  </div>
  <footer>
    <span>{{ row.prioridad || row.status2 || 'Seguimiento operativo' }}</span>
    <button type="button" @click.stop="emit('open',row)">Ficha →</button>
  </footer>
</article>
</template>

<style scoped>
.vehicle-badge{--blue:#0b63f6;--navy:#102a46;position:relative;display:grid;gap:10px;padding:13px 13px 12px 16px;border:1px solid #dce5ef;border-radius:12px;background:#fff;box-shadow:0 6px 18px rgba(26,55,88,.035);cursor:pointer;overflow:hidden;transition:.16s ease}.vehicle-badge:hover{transform:translateY(-2px);border-color:#c7d8eb;box-shadow:0 12px 26px rgba(26,55,88,.085)}.accent{position:absolute;inset:0 auto 0 0;width:3px;background:var(--blue)}.tone-color .accent{background:#d89514}.tone-incident .accent{background:#d94843}.tone-good .accent{background:#18a66b}
header,footer,.review{display:flex;align-items:center;justify-content:space-between;gap:8px}header>span{font-size:8px;font-weight:900;letter-spacing:.09em;color:#6d7d91}header>b{max-width:58%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:4px 7px;border-radius:999px;background:#eef5ff;color:#175fae;font-size:8px;text-transform:uppercase}.tone-color header>b{background:#fff7e8;color:#9b650d}.tone-incident header>b{background:#fff1f0;color:#b33e38}.tone-good header>b{background:#edf9f3;color:#187a58}
.plate{display:grid;justify-items:center;padding:9px 11px;border:1px solid #d8e2ec;border-radius:9px;background:#f8fafc}.plate small{font-size:7px;letter-spacing:.09em;color:#8492a5}.plate strong{font-size:22px;line-height:1.25;letter-spacing:.13em;color:var(--navy)}.plate span{font-size:7px;letter-spacing:.1em;color:#a0abba}.identity{display:grid;gap:2px}.identity b{font-size:11px;color:#173554}.identity span,.review span{font-size:9px;color:#7c8b9f}.review{padding-top:8px;border-top:1px solid #edf1f5}.review b{font-size:10px;color:#1b3859}.signals{display:flex;gap:5px;flex-wrap:wrap}.signals span{padding:4px 6px;border-radius:6px;border:1px solid transparent;font-size:8px;font-weight:800}.sig-ok{background:#edf9f3;color:#14704d;border-color:#d0ecdf!important}.sig-warn{background:#fff7e8;color:#936100;border-color:#f0dfb7!important}.sig-bad{background:#fff1f0;color:#b33b35;border-color:#f0cbc8!important}.sig-info{background:#edf5ff;color:#145ba8;border-color:#d2e4fb!important}footer>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#7a899d;font-size:8px}footer button{border:0!important;background:transparent!important;color:var(--blue)!important;font-size:9px;font-weight:900;cursor:pointer;box-shadow:none!important}
.compact{gap:7px;padding:10px 10px 9px 13px}.compact .plate{padding:6px 8px}.compact .plate strong{font-size:18px}.compact .signals{display:none}.compact footer{display:none}.compact .review{padding-top:6px}
</style>
