<script setup lang="ts">
import { computed } from 'vue'
import RevisadosView from './modules/revisados/views/RevisadosView.vue'
import PanapassDashboardView from './modules/panapass/dashboard/PanapassDashboardView.vue'

const moduleName=computed(()=>document.documentElement.dataset.rymVueModule||'revisados')
</script>

<template>
  <PanapassDashboardView v-if="moduleName==='panapass-dashboard'" />
  <RevisadosView v-else />
</template>
