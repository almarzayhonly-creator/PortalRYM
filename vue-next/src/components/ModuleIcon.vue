<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width: 100%; height: 100%; max-width: 24px; max-height: 24px; display: block;">
    <template v-if="name === 'panapass'">
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 8h6M9 11.5h1M12 11.5h3M9 15h1M12 15h3M9 18h1M12 18h3" />
    </template>
    <template v-else-if="name === 'revisados'">
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="m8 9 1.5 1.5L12 8M14 9.5h2M8 15l1.5 1.5L12 14M14 15.5h2" />
    </template>
    <template v-else-if="name === 'control'">
      <path d="m4 15 1.1-4.2a2 2 0 0 1 1.9-1.5h9.8a2 2 0 0 1 1.9 1.5L20 15v3H4v-3Z" />
      <path d="m7 9.3 1.4-3h7.2l1.4 3M4 13h16M7 18v1.5M17 18v1.5" />
      <circle cx="7.5" cy="15.5" r=".7" fill="currentColor" />
      <circle cx="16.5" cy="15.5" r=".7" fill="currentColor" />
    </template>
    <template v-else>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8" />
    </template>
  </svg>
</template>
