<script setup lang="ts">
import { computed } from 'vue'
import type { RevisadoEstado } from '../types/revisados.types'

const props = defineProps<{ estado: RevisadoEstado }>()

const label = computed(() => ({
  vigente: 'Vigente',
  pendiente_ciclo: 'Pendiente',
  pendiente_cambio_color: 'Cambio de color',
  no_aplica: 'No aplica',
  incidencia: 'Incidencia',
}[props.estado]))

const tone = computed(() => ({
  vigente: 'success',
  pendiente_ciclo: 'warning',
  pendiente_cambio_color: 'warning-strong',
  no_aplica: 'neutral',
  incidencia: 'danger',
}[props.estado]))
</script>

<template>
  <span class="badge" :data-tone="tone">{{ label }}</span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.badge[data-tone="success"] { color: #176b3a; background: #eefbf3; border-color: #bde8cc; }
.badge[data-tone="warning"] { color: #885b00; background: #fff8e6; border-color: #f1d28a; }
.badge[data-tone="warning-strong"] { color: #7a4200; background: #fff2dc; border-color: #edbd72; }
.badge[data-tone="neutral"] { color: #586174; background: #f5f7fa; border-color: #dde2e9; }
.badge[data-tone="danger"] { color: #9f2d2d; background: #fff0f0; border-color: #efb7b7; }
</style>
