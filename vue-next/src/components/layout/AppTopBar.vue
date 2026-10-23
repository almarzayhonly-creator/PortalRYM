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
  <header class="living-topbar" data-testid="modular-topbar">
    <div class="topbar-title-block">
      <div class="topbar-tag">
        <span class="live-pulse"></span>
        <span class="tag-text">SISTEMA CENTRAL</span>
      </div>
      <h1 class="topbar-heading">{{ title }}</h1>
    </div>

    <div class="topbar-controls">
      <!-- Sync Status -->
      <div class="topbar-sync">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>
          <small>Actualización</small>
          <strong>{{ formattedUpdated }}</strong>
        </span>
      </div>

      <!-- Quick Logout -->
      <button
        type="button"
        class="topbar-logout-btn"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        @click="emit('logout')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.living-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 36px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 15;
}

.topbar-title-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.topbar-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.live-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.tag-text {
  font-size: 10px;
  font-weight: 800;
  color: #3b82f6;
  letter-spacing: 0.12em;
}

.topbar-heading {
  margin: 0;
  font-size: 20px;
  font-weight: 850;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.topbar-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.topbar-sync {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.topbar-sync svg {
  width: 16px;
  height: 16px;
  color: #3b82f6;
}

.topbar-sync span {
  display: flex;
  flex-direction: column;
  text-align: right;
}

.topbar-sync small {
  font-size: 9px;
  text-transform: uppercase;
  color: #94a3b8;
  font-weight: 700;
  line-height: 1;
}

.topbar-sync strong {
  font-size: 11px;
  font-weight: 750;
  color: #1e293b;
  margin-top: 2px;
}

.topbar-user-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 12px 5px 6px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.topbar-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  display: grid;
  place-items: center;
}

.topbar-meta {
  display: flex;
  flex-direction: column;
}

.topbar-meta strong {
  font-size: 12px;
  font-weight: 750;
  color: #0f172a;
}

.topbar-meta span {
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
}

.topbar-logout-btn {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.2s;
}

.topbar-logout-btn svg {
  width: 18px;
  height: 18px;
}

.topbar-logout-btn:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #ef4444;
  transform: translateY(-1px);
}
</style>
