<script setup lang="ts">
import { computed } from 'vue'
import type { RevisadoRecord } from '../types/revisados.types'

const props=defineProps<{rows:RevisadoRecord[]}>()

const groups=computed(()=>{
  const map=new Map<string,{total:number;vigentes:number;pendientes:number;incidencias:number}>()
  for(const row of props.rows){
    const key=row.galera||'OTROS'
    const item=map.get(key)??{total:0,vigentes:0,pendientes:0,incidencias:0}
    item.total++
    if(row.vigente)item.vigentes++
    if(row.requiereAtencion)item.pendientes++
    if(row.tieneAlertas)item.incidencias++
    map.set(key,item)
  }
  return [...map.entries()]
    .map(([galera,v])=>{
      const cobertura=v.total?Math.round(v.vigentes*100/v.total):0
      const tone=v.incidencias>20||cobertura<75?'risk':cobertura<90?'watch':'good'
      return {galera,...v,cobertura,tone}
    })
    .sort((a,b)=>a.cobertura-b.cobertura||b.incidencias-a.incidencias||a.galera.localeCompare(b.galera))
})

const average=computed(()=>groups.value.length?Math.round(groups.value.reduce((a,g)=>a+g.cobertura,0)/groups.value.length):0)
</script>

<template>
<section class="comparison">
  <header class="comparison-head">
    <div>
      <span>RED OPERATIVA</span>
      <h3>Comparativo por galera</h3>
      <p>Las galeras con menor cobertura aparecen primero.</p>
    </div>
    <div class="average">
      <small>PROMEDIO</small>
      <b>{{average}}%</b>
    </div>
  </header>

  <div class="grid">
    <article v-for="g in groups" :key="g.galera" :data-tone="g.tone">
      <header>
        <div>
          <span>{{g.tone==='good'?'CONTROLADO':g.tone==='watch'?'SEGUIMIENTO':'ATENCIÓN'}}</span>
          <h4>{{g.galera}}</h4>
          <small>{{g.total}} unidades</small>
        </div>
        <strong>{{g.cobertura}}<i>%</i></strong>
      </header>

      <div class="meter"><i :style="{width:g.cobertura+'%'}"></i></div>

      <footer>
        <span><small>AL DÍA</small><b>{{g.vigentes}}</b></span>
        <span><small>PENDIENTES</small><b>{{g.pendientes}}</b></span>
        <span class="alert"><small>ALERTAS</small><b>{{g.incidencias}}</b></span>
      </footer>
    </article>
  </div>
</section>
</template>

<style scoped>
.comparison{padding:16px;border:1px solid #D7E2EE;border-radius:15px;background:#fff}
.comparison-head{display:flex;align-items:end;justify-content:space-between;gap:14px;padding-bottom:12px;border-bottom:1px solid #E5EDF5}
.comparison-head>div:first-child{display:grid;gap:2px}.comparison-head span{font-size:8px;font-weight:900;letter-spacing:.08em;color:#2565B7}.comparison-head h3{margin:0;font:800 16px/1.2 Inter,system-ui,sans-serif;color:#16355F}.comparison-head p{margin:0;font-size:9px;color:#75879E}
.average{display:grid;justify-items:end;gap:1px}.average small{font-size:7px;font-weight:900;color:#7A8BA0}.average b{font:800 22px/1 Inter;color:#1C5AA5}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:12px}
article{padding:13px;border:1px solid #DEE7F0;border-radius:13px;background:linear-gradient(180deg,#fff,#FAFCFE)}
article[data-tone="watch"]{border-color:#EDDDBF;background:linear-gradient(180deg,#fff,#FFFCF5)}
article[data-tone="risk"]{border-color:#EFCFCB;background:linear-gradient(180deg,#fff,#FFF8F7)}
article header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
article header>div{display:grid;gap:1px}article header span{font-size:7px;font-weight:900;letter-spacing:.07em;color:#22805F}article[data-tone="watch"] header span{color:#A46908}article[data-tone="risk"] header span{color:#B43D35}
h4{margin:0;font:800 14px/1.15 Inter;color:#15365F}header small{font-size:8px;color:#788AA0}header strong{font:800 27px/1 Inter;color:#173B69}header strong i{font-size:10px;font-style:normal;color:#7E90A6}
.meter{height:8px;margin:11px 0;border-radius:999px;background:#E3ECF6;overflow:hidden}.meter i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#2A70D0,#4A91E8)}article[data-tone="watch"] .meter i{background:linear-gradient(90deg,#E3A12D,#F0C250)}article[data-tone="risk"] .meter i{background:linear-gradient(90deg,#D65B52,#EE8970)}
footer{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}footer span{display:grid;justify-items:center;gap:2px;padding:7px;border-radius:9px;background:#EEF4F9}footer small{font-size:6.5px;font-weight:900;color:#74869C}footer b{font-size:11px;color:#23496F}.alert{background:#FFF0EF!important}.alert small,.alert b{color:#B33C35!important}
@media(max-width:1100px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.grid{grid-template-columns:1fr}}
</style>
