<script setup lang="ts">
import { computed } from 'vue'
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
  <div class="signals"><span v-for="x in signals" :key="x.label" :data-tone="x.tone"><span class="material-symbols-outlined">{{x.icon}}</span>{{x.label}}</span></div>
  <footer v-if="!compact"><span>{{row.prioridad||'Seguimiento operativo'}}</span><button type="button" @click.stop="emit('open',row)">Ficha →</button></footer>
</article>
</template>

<style scoped>
.stitch-vehicle-card{--blue:#0062ff;min-width:0;display:grid;align-content:start;gap:10px;padding:14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;box-shadow:0 2px 8px rgba(15,23,42,.03);cursor:pointer;transition:.16s ease}.stitch-vehicle-card:hover{border-color:#93c5fd;box-shadow:0 8px 24px rgba(0,98,255,.10);transform:translateY(-1px)}.stitch-vehicle-card.tone-pending{border-left:2px solid #6366f1}.stitch-vehicle-card.tone-color{border-left:2px solid #f59e0b}.stitch-vehicle-card.tone-incident{border-left:2px solid #ef4444}.stitch-vehicle-card.tone-good{border-left:2px solid #10b981}
header{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}header>span{font:700 9px/1.35 Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#475569}header>b{display:inline-flex;align-items:center;gap:5px;padding:5px 7px;border-radius:6px;background:#e0f2fe;color:#0369a1;font:800 9px/1 Inter,sans-serif;white-space:nowrap}header>b i{width:6px;height:6px;border-radius:50%;background:currentColor}.tone-good header>b{background:#dcfce7;color:#15803d}.tone-color header>b{background:#ffedd5;color:#c2410c}.tone-incident header>b{background:#fee2e2;color:#b91c1c}.plate-line{font:700 25px/1.15 "JetBrains Mono",monospace;letter-spacing:.12em;color:#0f172a}.model{font:700 12px/1.3 Inter,sans-serif;color:#004cca;text-decoration:none}.review{display:grid;grid-template-columns:1fr auto;gap:8px;padding:10px;background:#f1f5f9;border-radius:5px}.review span{font:500 10px/1.35 Inter,sans-serif;color:#475569}.review b{font:700 10px/1.35 "JetBrains Mono",monospace;color:#0f172a;text-align:right}.signals{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto}.signals>span{display:inline-flex;align-items:center;gap:4px;padding:6px 8px;border-radius:6px;background:#e0f2fe;color:#0369a1;font:800 9px/1 Inter,sans-serif}.signals>span[data-tone="ok"]{background:#cffafe;color:#155e75}.signals>span[data-tone="warn"]{background:#fef3c7;color:#92400e}.signals>span[data-tone="bad"]{background:#fee2e2;color:#b91c1c}.signals .material-symbols-outlined{font-size:13px}footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid #eef2f7}footer>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 9px/1.2 Inter,sans-serif;color:#64748b}footer button{border:0!important;background:transparent!important;color:#0062ff!important;font:800 9px/1 Inter,sans-serif;box-shadow:none!important;cursor:pointer}.compact{padding:11px;gap:7px}.compact .plate-line{font-size:20px}.compact .review{padding:7px}.compact .signals{display:none}
</style>