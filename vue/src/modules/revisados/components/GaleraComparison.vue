<script setup lang="ts">
import { computed } from 'vue'
import type { RevisadoRecord } from '../types/revisados.types'

const props = defineProps<{ rows: RevisadoRecord[] }>()

const groups = computed(() => {
  const map = new Map<string, { total:number; vigentes:number; pendientes:number }>()
  for (const row of props.rows) {
    const key = row.galera || 'OTROS'
    const item = map.get(key) ?? { total:0, vigentes:0, pendientes:0 }
    item.total++
    if (row.estado === 'vigente') item.vigentes++
    else item.pendientes++
    map.set(key,item)
  }
  return [...map.entries()].map(([galera,v]) => ({
    galera,
    ...v,
    cobertura: v.total ? Math.round((v.vigentes/v.total)*100) : 0,
  })).sort((a,b)=>a.galera.localeCompare(b.galera))
})
</script>

<template>
  <section class="panel">
    <div class="head">
      <div><span>COMPARATIVA</span><h3>Estado por galera</h3></div>
      <small>{{ groups.length }} galeras visibles</small>
    </div>
    <div class="grid">
      <article v-for="g in groups" :key="g.galera">
        <div class="row"><strong>{{ g.galera }}</strong><span>{{ g.total }} uds.</span></div>
        <div class="numbers"><b>{{ g.pendientes }}</b><span>pendientes</span></div>
        <div class="track"><i :style="{width:g.cobertura+'%'}"></i></div>
        <div class="foot"><span>{{ g.vigentes }} al día</span><b>{{ g.cobertura }}%</b></div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.panel{padding:18px;border:1px solid #e2e8f0;border-radius:16px;background:#fff}.head{display:flex;justify-content:space-between;align-items:end;margin-bottom:12px}.head span{font-size:9px;font-weight:900;letter-spacing:.14em;color:#64748b}.head h3{margin:3px 0 0;font-size:19px;letter-spacing:-.03em}.head small{color:#94a3b8}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.grid article{padding:14px;border:1px solid #e8edf3;border-radius:13px;background:#fbfdff}.row,.foot{display:flex;justify-content:space-between;gap:8px}.row strong{font-size:13px}.row span,.foot span{font-size:10px;color:#94a3b8}.numbers{display:flex;align-items:end;gap:6px;margin:12px 0 8px}.numbers b{font-size:26px;letter-spacing:-.04em}.numbers span{font-size:10px;color:#64748b;padding-bottom:3px}.track{height:5px;border-radius:999px;background:#e9eef5;overflow:hidden}.track i{display:block;height:100%;border-radius:999px;background:#0062ff}.foot{margin-top:7px}.foot b{font-size:10px;color:#0f172a}
@media(max-width:900px){.grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.grid{grid-template-columns:1fr}}
</style>
