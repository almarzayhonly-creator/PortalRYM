<script setup lang="ts">
import { computed } from 'vue'
import type { RevisadoEstado } from '../types/revisados.types'
const props = defineProps<{ estado: RevisadoEstado }>()
const label = computed(() => ({ vigente:'Vigente', pendiente_ciclo:'Pendiente', pendiente_cambio_color:'Cambio de color', no_aplica:'No aplica', incidencia:'Incidencia' }[props.estado]))
const tone = computed(() => ({ vigente:'success', pendiente_ciclo:'info', pendiente_cambio_color:'warning', no_aplica:'neutral', incidencia:'danger' }[props.estado]))
</script>

<template><span class="badge" :data-tone="tone"><i></i>{{ label }}</span></template>

<style scoped>
.badge{display:inline-flex;align-items:center;gap:5px;min-height:23px;padding:0 8px;border:1px solid;border-radius:999px;font-size:9px;font-weight:800;white-space:nowrap}.badge i{width:5px;height:5px;border-radius:50%;background:currentColor}
.badge[data-tone="success"]{color:#16825c;background:#eefaf5;border-color:#bfe7d5}.badge[data-tone="info"]{color:#2876b8;background:#eef7ff;border-color:#b8daf4}.badge[data-tone="warning"]{color:#b56911;background:#fff6e8;border-color:#f0d5aa}.badge[data-tone="neutral"]{color:#667085;background:#f5f7fa;border-color:#dde2e9}.badge[data-tone="danger"]{color:#c33f3f;background:#fff1f1;border-color:#efc2c2}
</style>
