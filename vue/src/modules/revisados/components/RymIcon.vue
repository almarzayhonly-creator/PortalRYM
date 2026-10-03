<script setup lang="ts">
import { computed } from 'vue'

const props=withDefaults(defineProps<{name:string;size?:number}>(),{size:18})

const paths:Record<string,string[]>={
  verified_user:['M12 3l7 3v5c0 5-3.4 8.2-7 10-3.6-1.8-7-5-7-10V6l7-3z','M9 12l2 2 4-4'],
  dashboard:['M4 4h6v6H4z','M14 4h6v6h-6z','M4 14h6v6H4z','M14 14h6v6h-6z'],
  directions_car:['M5 16l1-5 2-4h8l2 4 1 5','M4 16h16v3H4z','M7 19v2','M17 19v2','M7.5 14h.01','M16.5 14h.01'],
  calendar_month:['M5 5h14v15H5z','M8 3v4','M16 3v4','M5 9h14'],
  description:['M6 3h8l4 4v14H6z','M14 3v5h5','M9 13h6','M9 17h6'],
  history:['M3 12a9 9 0 1 0 3-6.7','M3 4v5h5','M12 7v5l3 2'],
  query_stats:['M4 19V9','M10 19V5','M16 19v-7','M22 19H2'],
  gavel:['M14 5l5 5','M10 9l5 5','M4 20l9-9','M8 4l4 4'],
  confirmation_number:['M4 7h16v10H4z','M8 7v3','M8 14v3','M16 7v3','M16 14v3'],
  notifications_active:['M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5z','M10 20h4','M4 6l2-2','M20 6l-2-2'],
  sync:['M20 7h-5l2-2','M20 7l-2 2','M4 17h5l-2 2','M4 17l2-2','M6 8a7 7 0 0 1 11-2','M18 16a7 7 0 0 1-11 2'],
  verified:['M12 3l2.3 1.4 2.7-.1 1.2 2.4 2.3 1.4-.3 2.7 1.2 2.4-1.7 2.1-.3 2.7-2.5 1.1-1.7 2.1-2.7-.6-2.5 1.1-2-1.8-2.7-.6-.7-2.6-2-1.8.8-2.6-.7-2.6 2.2-1.6.8-2.6 2.7-.4L9.7 4.4z','M8.5 12l2.2 2.2 4.8-4.8'],
  schedule:['M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z','M12 7v5l3 2'],
  palette:['M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h4a4 4 0 0 0 4-4c0-3.3-4-6-9-6z','M7.5 9h.01','M10 6.5h.01','M14 6.5h.01','M16.5 9h.01'],
  search:['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z','M15.5 15.5L21 21'],
  grid_view:['M4 4h6v6H4z','M14 4h6v6h-6z','M4 14h6v6H4z','M14 14h6v6h-6z'],
  table_rows:['M4 5h16v4H4z','M4 10h16v4H4z','M4 15h16v4H4z'],
  manage_search:['M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12z','M14.5 14.5L20 20','M4 20h8'],
  circle:['M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z']
}
const d=computed(()=>paths[props.name]||paths.circle)
</script>

<template>
  <svg class="rym-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path v-for="p in d" :key="p" :d="p" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>

<style scoped>
.rym-icon{display:inline-block;flex:0 0 auto;vertical-align:middle}
</style>
