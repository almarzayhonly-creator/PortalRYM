<script setup lang="ts">
import { computed } from 'vue'
import type { RevisadoRecord } from '../types/revisados.types'
const props=defineProps<{ rows:RevisadoRecord[] }>()
const groups=computed(()=>{
  const map=new Map<string,{total:number;vigentes:number;pendientes:number;incidencias:number}>()
  for(const row of props.rows){
    const key=row.galera||'OTROS', item=map.get(key)??{total:0,vigentes:0,pendientes:0,incidencias:0}
    item.total++
    if(row.estado==='vigente')item.vigentes++;else item.pendientes++
    if(row.estado==='incidencia')item.incidencias++
    map.set(key,item)
  }
  return [...map.entries()].map(([galera,v])=>({galera,...v,cobertura:v.total?Math.round((v.vigentes/v.total)*100):0})).sort((a,b)=>a.galera.localeCompare(b.galera))
})
</script>

<template>
  <section class="panel">
    <div class="head"><div><span>COMPARATIVA</span><h3>Estado por galera</h3></div><small>{{ groups.length }} visibles</small></div>
    <div class="grid">
      <article v-for="g in groups" :key="g.galera">
        <div class="top"><strong>{{ g.galera }}</strong><span>{{ g.total }} uds.</span></div>
        <div class="stats"><div><b>{{ g.pendientes }}</b><span>pend.</span></div><div><b>{{ g.vigentes }}</b><span>al día</span></div><div v-if="g.incidencias"><b class="red">{{ g.incidencias }}</b><span>incid.</span></div></div>
        <div class="meter"><i :style="{width:g.cobertura+'%'}"></i></div>
        <div class="bottom"><span>Cobertura</span><b>{{ g.cobertura }}%</b></div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.panel{padding:16px;border:1px solid #e2e8f0;border-radius:15px;background:#fff}.head{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}.head span{font-size:9px;font-weight:900;letter-spacing:.14em;color:#64748b}.head h3{margin:2px 0 0;font-size:18px;letter-spacing:-.03em}.head small{font-size:9px;color:#94a3b8}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.grid article{padding:12px;border:1px solid #e8edf3;border-radius:11px;background:#fbfdff}.top,.bottom{display:flex;justify-content:space-between;gap:8px}.top strong{font-size:12px}.top span,.bottom span{font-size:9px;color:#94a3b8}.stats{display:flex;gap:14px;margin:10px 0 8px}.stats div{display:flex;align-items:baseline;gap:3px}.stats b{font-size:18px;letter-spacing:-.04em}.stats span{font-size:8px;color:#94a3b8}.stats .red{color:#dc2626}.meter{height:4px;border-radius:999px;background:#e9eef5;overflow:hidden}.meter i{display:block;height:100%;border-radius:999px;background:#0062ff}.bottom{margin-top:6px}.bottom b{font-size:9px}
@media(max-width:900px){.grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.grid{grid-template-columns:1fr}}
</style>
