<script setup lang="ts">
import { computed } from 'vue'
import type { RevisadoRecord } from '../types/revisados.types'
const props=defineProps<{rows:RevisadoRecord[]}>()
const groups=computed(()=>{
  const map=new Map<string,{total:number;vigentes:number;pendientes:number;incidencias:number}>()
  for(const row of props.rows){
    const key=row.galera||'OTROS', item=map.get(key)??{total:0,vigentes:0,pendientes:0,incidencias:0}
    item.total++; if(row.vigente)item.vigentes++; if(row.requiereAtencion)item.pendientes++; if(row.tieneAlertas)item.incidencias++
    map.set(key,item)
  }
  return [...map.entries()].map(([galera,v])=>({galera,...v,cobertura:v.total?Math.round(v.vigentes*100/v.total):0})).sort((a,b)=>b.cobertura-a.cobertura||a.galera.localeCompare(b.galera))
})
</script>

<template>
<section class="panel">
  <div class="head"><div><span>RENDIMIENTO POR GALERA</span><h3>Pistas de cumplimiento operativo</h3></div><small>{{groups.length}} galeras visibles</small></div>
  <div class="lanes">
    <article v-for="g in groups" :key="g.galera">
      <div class="lane-top"><div><strong>{{g.galera}}</strong><span>{{g.total}} unidades</span></div><b>{{g.cobertura}}%</b></div>
      <div class="meter"><i :style="{width:g.cobertura+'%'}"></i></div>
      <div class="lane-bottom"><span><b>{{g.vigentes}}</b> vigentes</span><span><b>{{g.pendientes}}</b> pendientes</span><span v-if="g.incidencias" class="danger"><b>{{g.incidencias}}</b> alertas</span></div>
    </article>
  </div>
  <footer><span>Promedio visible</span><b>{{groups.length?Math.round(groups.reduce((a,g)=>a+g.cobertura,0)/groups.length):0}}%</b></footer>
</section>
</template>

<style scoped>
.panel{padding:18px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;box-shadow:0 2px 10px rgba(15,23,42,.025)}.head{display:flex;justify-content:space-between;align-items:end;padding-bottom:12px;border-bottom:1px solid #eef2f7}.head span{font-size:9px;font-weight:900;letter-spacing:.09em;color:#0062ff}.head h3{margin:3px 0 0;font:700 18px/1.2 "Space Grotesk",Inter,sans-serif;color:#0f172a}.head small{font-size:9px;color:#94a3b8}.lanes{display:grid;gap:12px;margin-top:14px}.lanes article{padding:12px 13px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc}.lane-top,.lane-bottom,footer{display:flex;align-items:center;justify-content:space-between;gap:10px}.lane-top>div{display:flex;align-items:baseline;gap:8px}.lane-top strong{font-size:11px;color:#0f172a}.lane-top span{font-size:9px;color:#64748b}.lane-top>b{font:700 12px/1 "JetBrains Mono",monospace;color:#0062ff}.meter{height:7px;margin:9px 0;border-radius:999px;background:#e2e8f0;overflow:hidden}.meter i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#0062ff,#0ea5e9)}.lane-bottom{justify-content:flex-start}.lane-bottom span{font-size:9px;color:#64748b}.lane-bottom b{color:#0f172a}.lane-bottom .danger,.lane-bottom .danger b{color:#dc2626}footer{margin-top:12px;padding-top:11px;border-top:1px solid #eef2f7;font-size:9px;color:#64748b}footer b{font:700 11px/1 "JetBrains Mono",monospace;color:#0f172a}
</style>
