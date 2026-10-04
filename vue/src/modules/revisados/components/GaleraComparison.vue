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
  <div class="head"><div><span>ESTADO POR GALERA</span><h3>Tu avance</h3></div><small>{{groups.length}} galeras visibles</small></div>
  <div class="lanes">
    <article v-for="g in groups" :key="g.galera">
      <div class="lane-top"><div><strong>{{g.galera}}</strong><span>{{g.total}} unidades</span></div><b>{{g.cobertura}}%</b></div>
      <div class="meter"><i :style="{width:g.cobertura+'%'}"></i></div>
      <div class="lane-bottom"><span><b>{{g.vigentes}}</b> vigentes</span><span><b>{{g.pendientes}}</b> pendientes</span><span v-if="g.incidencias" class="danger"><b>{{g.incidencias}}</b> alertas</span></div>
    </article>
  </div>
  <footer><span>Cobertura promedio</span><b>{{groups.length?Math.round(groups.reduce((a,g)=>a+g.cobertura,0)/groups.length):0}}%</b></footer>
</section>
</template>

<style scoped>
.panel{padding:16px;border:1px solid #D8E3F2;border-radius:8px;background:#fff;box-shadow:0 1px 2px rgba(10,27,77,.03)}.head{display:flex;justify-content:space-between;align-items:end;padding-bottom:12px;border-bottom:1px solid #D8E3F2}.head span{font-size:10px;font-weight:800;letter-spacing:.06em;color:#244AA5}.head h3{margin:3px 0 0;font:600 18px/1.25 Inter,system-ui,sans-serif;color:#0A1B4D}.head small{font-size:11px;color:#62708C}.lanes{display:grid;gap:8px;margin-top:12px}.lanes article{padding:10px 12px;border:1px solid #D8E3F2;border-radius:6px;background:#fff}.lane-top,.lane-bottom,footer{display:flex;align-items:center;justify-content:space-between;gap:10px}.lane-top>div{display:flex;align-items:baseline;gap:8px}.lane-top strong{font-size:12px;color:#0A1B4D}.lane-top span{font-size:11px;color:#62708C}.lane-top>b{font:700 13px/1 Inter,system-ui,sans-serif;color:#244AA5;font-variant-numeric:tabular-nums}.meter{height:6px;margin:8px 0;border-radius:999px;background:#D8E3F2;overflow:hidden}.meter i{display:block;height:100%;border-radius:999px;background:#244AA5}.lane-bottom{justify-content:flex-start}.lane-bottom span{font-size:11px;color:#62708C}.lane-bottom b{color:#0A1B4D}.lane-bottom .danger,.lane-bottom .danger b{color:#DC2626}footer{margin-top:12px;padding-top:11px;border-top:1px solid #D8E3F2;font-size:11px;color:#62708C}footer b{font:700 12px/1 Inter,system-ui,sans-serif;color:#0A1B4D;font-variant-numeric:tabular-nums}
</style>
