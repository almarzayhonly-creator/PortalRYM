<script setup lang="ts">
import { computed } from 'vue'
import RymIcon from './RymIcon.vue'
import type { CanonicalRevisadoRow } from '../types/revisados.types'

const props=withDefaults(defineProps<{row:CanonicalRevisadoRow;compact?:boolean}>(),{compact:false})
const emit=defineEmits<{open:[row:CanonicalRevisadoRow]}>()
function s(v:unknown){return String(v??'').trim()}
function norm(v:unknown){return s(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
function fmt(v:unknown){if(!v)return'—';try{return new Intl.DateTimeFormat('es-PA',{timeZone:'America/Panama',day:'2-digit',month:'short',year:'numeric'}).format(new Date(String(v))).toUpperCase()}catch{return s(v)||'—'}}
const tone=computed(()=>props.row.bloqueado?'incident':norm(props.row.pendiente_tipo||props.row.status2).includes('COLOR')?'color':props.row.emitido?'good':'pending')
const label=computed(()=>props.row.bloqueado?'INCIDENCIA':s(props.row.pendiente_tipo||props.row.status2)|| (props.row.emitido?'VIGENTE':'PENDIENTE'))
const model=computed(()=>[s(props.row.marca),s(props.row.modelo)].filter(Boolean).join(' ')||s(props.row.empresa)||'Vehículo RYM')
const signals=computed(()=>{
  const out:{label:string;tone:string;icon:string}[]=[]
  if(props.row.boleta_empresa)out.push({label:'BOLETA EMPRESA',tone:'bad',icon:'gavel'})
  else if(props.row.boleta_pendiente)out.push({label:'BOLETA PLACA',tone:'bad',icon:'gavel'})
  else out.push({label:'SIN BOLETAS',tone:'ok',icon:'verified'})
  const diff=Boolean(props.row.ficha_ecarcheck_at&&props.row.color_control&&props.row.color_ecarcheck&&norm(props.row.color_control)!==norm(props.row.color_ecarcheck))
  out.push({label:diff?'DISCREPANCIA':'COLOR OK',tone:diff?'warn':'ok',icon:'palette'})
  const cupo=norm(props.row.cupo_ecarcheck||props.row.cupo_control)
  const sin=!cupo||['NO APLICA','N/A','NA','SIN CUPO'].includes(cupo)
  out.push({label:sin?'SIN CUPO':'CUPO OK',tone:sin?'warn':'info',icon:'confirmation_number'})
  return out
})
</script>

<template>
<article class="stitch-vehicle-card" :class="['tone-'+tone,{compact}]" @click="emit('open',row)">
  <header><span>{{row.galera||'SIN GALERA'}} · {{row.supervisora||'SIN SUPERVISORA'}}</span><b :class="'tone-'+tone"><i></i>{{label}}</b></header>
  <div class="plate-line">{{row.placa||row.unidad||'—'}}</div>
  <a class="model" href="#" @click.prevent.stop="emit('open',row)">{{model}}</a>
  <div class="review"><span>Último Revisado</span><b>{{fmt(row.ultimo_revisado)}}</b></div>
  <div class="signals"><span v-for="x in signals" :key="x.label" :data-tone="x.tone"><RymIcon :name="x.icon" :size="13"/>{{x.label}}</span></div>
  <footer v-if="!compact"><span>{{row.prioridad||'Seguimiento operativo'}}</span><button type="button" @click.stop="emit('open',row)">Ficha →</button></footer>
</article>
</template>

<style scoped>
.stitch-vehicle-card{--primary:#004cca;--electric:#0062ff;min-width:0;display:flex;flex-direction:column;gap:12px;padding:18px;border:0;border-radius:12px;background:#fff;box-shadow:0 2px 12px rgba(11,28,48,.045);cursor:pointer;transition:.16s ease}.stitch-vehicle-card:hover{box-shadow:0 5px 22px rgba(11,28,48,.09);transform:translateY(-1px)}
header{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}header>span{font:700 10px/1.35 "Space Grotesk",Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#424656}header>b{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;background:#dbe1ff;color:#003ea8;font:700 10px/1 "Space Grotesk",Inter,sans-serif;white-space:nowrap}header>b i{width:7px;height:7px;border-radius:50%;background:currentColor}.tone-good header>b{background:#b6ebff;color:#004e60}.tone-color header>b{background:#ffedd5;color:#c2410c}.tone-incident header>b{background:#ffdad6;color:#93000a}.plate-line{font:700 28px/1.05 "JetBrains Mono",monospace;letter-spacing:.12em;color:#0b1c30}.model{margin-top:-7px;font:700 13px/1.3 "Space Grotesk",Inter,sans-serif;color:var(--primary);text-decoration:none}.review{display:grid;grid-template-columns:1fr auto;gap:8px;padding:10px 12px;background:#eff4ff;border-radius:8px}.review span{font:500 11px/1.35 Inter,sans-serif;color:#424656}.review b{font:700 11px/1.35 "JetBrains Mono",monospace;color:#0b1c30;text-align:right}.signals{display:flex;gap:7px;flex-wrap:wrap;margin-top:auto}.signals>span{display:inline-flex;align-items:center;gap:4px;padding:6px 8px;border-radius:6px;background:#dbe1ff;color:#00174b;font:800 9px/1 "Space Grotesk",Inter,sans-serif}.signals>span[data-tone="ok"]{background:#b6ebff;color:#004e60}.signals>span[data-tone="warn"]{background:#ffedd5;color:#9a3412}.signals>span[data-tone="bad"]{background:#ffdad6;color:#93000a}.signals .rym-icon{width:13px;height:13px}footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:9px;border-top:1px solid #eff4ff}footer>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 9px/1.2 Inter,sans-serif;color:#64748b}footer button{border:0!important;background:transparent!important;color:var(--electric)!important;font:800 10px/1 "Space Grotesk",Inter,sans-serif;box-shadow:none!important;cursor:pointer}.compact{padding:14px;gap:8px}.compact .plate-line{font-size:22px}.compact .review{padding:8px 10px}.compact .signals{display:none}
</style>