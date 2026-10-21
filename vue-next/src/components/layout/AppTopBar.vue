<script setup lang="ts">
import { computed } from 'vue'
import type { PortalProfile } from '../../types'

const props = defineProps<{
  profile: PortalProfile
  title: string
  subtitle?: string
  updatedAt?: string
}>()

const emit = defineEmits<{
  (e: 'logout'): void
}>()

const name = computed(() => String(props.profile.nombre || props.profile.email || 'Usuario').trim())
const role = computed(() => String(props.profile.rol || '').toUpperCase())
const initials = computed(() => name.value.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase())

const formattedUpdated = computed(() => {
  if (!props.updatedAt) return 'Al día'
  try {
    return new Intl.DateTimeFormat('es-PA', {
      timeZone: 'America/Panama',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(props.updatedAt))
  } catch {
    return props.updatedAt
  }
})
</script>

<template>
  <header class="ryn-topbar" data-testid="modular-topbar">
    <div class="ryn-top-title">
      <strong>{{ title }}</strong>
      <span v-if="subtitle" class="ryn-top-subtitle">{{ subtitle }}</span>
    </div>

    <div class="ryn-top-actions">
      <div v-if="updatedAt" class="ryn-updated">
        <span>
          <small>Actualizado</small>
          <strong>{{ formattedUpdated }}</strong>
        </span>
      </div>

      <div class="ryn-top-user">
        <span class="ryn-top-avatar">{{ initials }}</span>
        <span class="ryn-top-user-copy">
          <b>{{ name }}</b>
          <small>{{ role }}</small>
        </span>
      </div>

      <button
        type="button"
        class="ryn-logout-icon"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        @click="emit('logout')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
        </svg>
      </button>
    </div>
  </header>
</template>
