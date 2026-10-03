<script setup lang="ts">
import { computed } from 'vue'
import type { RevisadoRecord } from '../types/revisados.types'
const props=defineProps<{ rows:RevisadoRecord[] }>()
const groups=computed(()=>{
  const map=new Map<string,{total:number;vigentes:number;pendientes:number;incidencias:number}>()
  for(const row of props.rows){
    const key=row.galera||'OTROS', item=map.get(key)??{total:0,vigentes:0,pendientes:0,incidencias:0}
    item.total++
    if(row.vigente)item.vigentes++;if(row.requiereAtencion)item.pendientes++;if(row.tieneAlertas)item.incidencias++
    map.set(key,item)
  }
  return [...map.entries()].map(([galera,v])=>({galera,...v,cobertura:v.total?Math.round((v.vigentes/v.total)*100):0})).sort((a,b)=>a.galera.localeCompare(b.galera))
})
</script>

<template>
  <section class="panel">
    <div class="head">
      <div><span>COMPARATIVA POR GALERA</span><h3>Estado operativo</h3></div>
      <small>{{ groups.length }} visibles</small>
    </div>
    <div class="grid">
      <article v-for="g in groups" :key="g.galera">
        <div class="top"><strong>{{ g.galera }}</strong><span>{{ g.total }} unidades</span></div>
        <div class="stats">
          <div><b>{{ g.pendientes }}</b><span>pendientes</span></div>
          <div><b>{{ g.vigentes }}</b><span>al día</span></div>
          <div v-if="g.incidencias"><b class="red">{{ g.incidencias }}</b><span>alertas</span></div>
        </div>
        <div class="meter"><i :style="{width:g.cobertura+'%'}"></i></div>
        <div class="bottom"><span>Cobertura</span><b>{{ g.cobertura }}%</b></div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.panel{padding:16px;border:1px solid #e0e5ec;border-radius:13px;background:#fff;box-shadow:0 2px 10px rgba(16,24,40,.02)}.head{display:flex;justify-content:space-between;align-items:end;margin-bottom:11px}.head span{font-size:9px;font-weight:900;letter-spacing:.09em;color:#c15d17}.head h3{margin:2px 0 0;font-size:17px;letter-spacing:-.025em;color:#1a2940}.head small{font-size:9px;color:#98a3b3}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.grid article{padding:12px 13px;border:1px solid #e7ebf1;border-radius:10px;background:#fbfcfe}.top,.bottom{display:flex;justify-content:space-between;gap:8px}.top strong{font-size:11px;color:#24334a}.top span,.bottom span{font-size:8px;color:#98a3b3}.stats{display:flex;gap:13px;margin:10px 0 8px}.stats div{display:grid;gap:1px}.stats b{font-size:17px;letter-spacing:-.04em;color:#25344a}.stats span{font-size:8px;color:#98a3b3}.stats .red{color:#dc2626}.meter{height:4px;border-radius:999px;background:#e9edf3;overflow:hidden}.meter i{display:block;height:100%;border-radius:999px;background:#0062ff}.bottom{margin-top:6px}.bottom b{font-size:9px;color:#42516a}
@media(max-width:1000px){.grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.grid{grid-template-columns:1fr}}
</style>
