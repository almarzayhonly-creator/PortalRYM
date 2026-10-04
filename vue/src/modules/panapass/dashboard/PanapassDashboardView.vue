<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type Summary=Record<string,unknown>
const loading=ref(true), error=ref(''), summary=ref<Summary>({})
const parentWindow=computed(()=>window.parent===window?window:window.parent)
function number(value:unknown){return new Intl.NumberFormat('es-PA').format(Number(value)||0)}
async function load(){
  loading.value=true;error.value=''
  try{
    const context=(parentWindow.value as Window & {RYM_CONTEXT?:{create?:(name:string)=>{api?:{call?:(name:string)=>Promise<unknown>}}}}).RYM_CONTEXT?.create?.('panapass-vue-dashboard')
    const result=await context?.api?.call?.('dashboard_resumen')
    summary.value=(Array.isArray(result)?result[0]:result) as Summary||{}
  }catch(e){error.value=e instanceof Error?e.message:'No fue posible cargar Dashboard'}
  finally{loading.value=false}
}
onMounted(load)
</script>

<template>
  <main class="panapass-dashboard-vue">
    <header><small>PANAPASS</small><h1>Dashboard</h1><p>Resumen operativo según tu alcance autorizado.</p><button @click="load" :disabled="loading">{{loading?'Actualizando…':'Actualizar'}}</button></header>
    <p v-if="error" class="error">{{error}}</p>
    <section v-else class="kpis">
      <article><span>Unidades</span><b>{{number(summary.unidades||summary.total_unidades)}}</b></article>
      <article><span>Negativos</span><b>{{number(summary.negativos||summary.unidades_negativas)}}</b></article>
      <article><span>Pagado este mes</span><b>{{number(summary.monto_pagos_mes)}}</b></article>
    </section>
  </main>
</template>

<style scoped>
.panapass-dashboard-vue{min-height:100vh;padding:28px;background:#f4f7fb;color:#0a1b4d;font-family:Inter,system-ui,sans-serif}.panapass-dashboard-vue header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid #d8e3f2;padding-bottom:16px}.panapass-dashboard-vue small{font-weight:900;color:#244aa5;letter-spacing:.08em}.panapass-dashboard-vue h1{margin:0;font-size:28px}.panapass-dashboard-vue p{width:100%;margin:0;color:#62708c}.panapass-dashboard-vue button{margin-left:auto;border:0;border-radius:8px;padding:10px 14px;background:#244aa5;color:#fff;font-weight:800}.kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}.kpis article{padding:16px;border:1px solid #d8e3f2;border-radius:8px;background:#fff}.kpis span{display:block;font-size:12px;color:#62708c}.kpis b{display:block;margin-top:6px;font-size:28px}.error{color:#b42318}@media(max-width:700px){.kpis{grid-template-columns:1fr}}
</style>
