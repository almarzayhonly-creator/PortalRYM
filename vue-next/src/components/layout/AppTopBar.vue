<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PortalProfile } from '../../types'
import UnitValidator from '../UnitValidator.vue'
import type { Api } from '../../validatorDetails'

const props = defineProps<{
  profile: PortalProfile
  updatedAt?: string
  validatorApi?: Api
  onControl?: () => unknown
  onModuleNavigate?: (moduleId: 'panapass' | 'revisados' | 'control' | 'gps') => void
  onRefresh?: () => Promise<void> | void
}>()

const emit = defineEmits<{
  (e: 'logout'): void
  (e: 'refresh'): void
}>()

const name = computed(() => String(props.profile.nombre || props.profile.email || 'Usuario').trim())
const first = computed(() => name.value.split(/\s+/)[0] || name.value)

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'
})

const canQuickValidator = computed(() => {
  const role = String(props.profile.rol || '').toUpperCase()
  return ['ADMIN_TOTAL', 'ADMIN', 'GERENTE_GALERA', 'SISTEMA', 'SUPERVISORA'].includes(role)
})

const isRefreshing = ref(false)

async function handleRefresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  emit('refresh')
  if (props.onRefresh) {
    try {
      await props.onRefresh()
    } catch (e) {
      console.error(e)
    }
  }
  setTimeout(() => {
    isRefreshing.value = false
  }, 900)
}

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
    <!-- Izquierda: Saludo Operativo Dinámico (¡Buenas tardes, Yhonly! 👋) -->
    <div class="topbar-greeting-col">
      <h1 class="topbar-greeting-text">
        ¡{{ greeting }}, {{ first }}! <span class="greeting-wave" aria-hidden="true">👋</span>
      </h1>
      <span class="topbar-telemetry-tag">
        <span class="telemetry-beacon"></span>
        <span>Flota en vivo · Panamá</span>
      </span>
    </div>

    <!-- Centro / Derecha: Buscador Operativo de Unidades con Botón Buscar unidad → -->
    <div v-if="canQuickValidator" class="topbar-validator-slot">
      <UnitValidator
        :api="validatorApi"
        :profile="profile"
        :on-control="onControl"
        :on-module-navigate="onModuleNavigate"
      />
    </div>

    <!-- Extremo Derecho: Actualización y Botón Salir -->
    <div class="topbar-controls">
      <!-- Sync Status -->
      <div class="topbar-sync" title="Última actualización de telemetría">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>
          <small>Actualización</small>
          <strong>{{ formattedUpdated }}</strong>
        </span>
      </div>

      <!-- Live Refresh Button -->
      <button
        type="button"
        class="topbar-refresh-btn"
        :class="{ 'is-spinning': isRefreshing }"
        aria-label="Refrescar telemetría"
        title="Refrescar telemetría y KPIs"
        @click="handleRefresh"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
        </svg>
      </button>

      <!-- Quick Logout -->
      <button
        type="button"
        class="topbar-logout-btn"
        aria-label="Cerrar sesión"
        title="Cerrar sesión segura"
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
  gap: 20px;
  padding: 12px 28px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 40;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
}

/* Izquierda: Saludo Operativo */
.topbar-greeting-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.topbar-greeting-text {
  font-size: 20px;
  font-weight: 850;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.greeting-wave {
  display: inline-block;
  transform-origin: 70% 70%;
  animation: waveWave 2.4s ease-in-out infinite;
}

@keyframes waveWave {
  0%, 100% { transform: rotate(0deg); }
  20%, 60% { transform: rotate(14deg); }
  40%, 80% { transform: rotate(-8deg); }
}

.topbar-telemetry-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.01em;
}

.telemetry-beacon {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
  animation: beaconPulse 2s infinite ease-in-out;
}

@keyframes beaconPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
}

/* Centro / Derecha: Buscador */
.topbar-validator-slot {
  flex: 1;
  max-width: 580px;
  min-width: 280px;
}

/* Controles Derecha */
.topbar-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.topbar-sync {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  color: #475569;
}

.topbar-sync svg {
  width: 14px;
  height: 14px;
  color: #2563eb;
  flex-shrink: 0;
}

.topbar-sync span {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.topbar-sync small {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.04em;
}

.topbar-sync strong {
  font-size: 11.5px;
  font-weight: 800;
  color: #1e293b;
}

.topbar-refresh-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 38px !important;
  height: 38px !important;
  padding: 0 !important;
  border-radius: 12px !important;
  border: 1.5px solid #dbeafe !important;
  background: #eff6ff !important;
  color: #2563eb !important;
  cursor: pointer !important;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.08) !important;
}

.topbar-refresh-btn svg {
  width: 18px !important;
  height: 18px !important;
  stroke: #2563eb !important;
  color: #2563eb !important;
  transition: transform 0.4s ease !important;
}

.topbar-refresh-btn:hover {
  background: #2563eb !important;
  border-color: #2563eb !important;
  color: #ffffff !important;
  transform: translateY(-2px) scale(1.04) !important;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25) !important;
}

.topbar-refresh-btn:hover svg {
  stroke: #ffffff !important;
  color: #ffffff !important;
}

.topbar-refresh-btn.is-spinning svg {
  animation: spinRefresh 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite !important;
}

@keyframes spinRefresh {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.topbar-logout-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 38px !important;
  height: 38px !important;
  padding: 0 !important;
  border-radius: 12px !important;
  border: 1.5px solid #fee2e2 !important;
  background: #fef2f2 !important;
  color: #ef4444 !important;
  cursor: pointer !important;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.08) !important;
}

.topbar-logout-btn svg {
  width: 18px !important;
  height: 18px !important;
  stroke: #ef4444 !important;
  color: #ef4444 !important;
  transition: transform 0.2s ease !important;
}

.topbar-logout-btn:hover {
  background: #ef4444 !important;
  border-color: #ef4444 !important;
  color: #ffffff !important;
  transform: translateY(-2px) scale(1.04) !important;
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.25) !important;
}

.topbar-logout-btn:hover svg {
  stroke: #ffffff !important;
  color: #ffffff !important;
  transform: translateX(2px) !important;
}

@media (max-width: 1024px) {
  .living-topbar {
    padding: 12px 18px;
    gap: 14px;
  }
  .topbar-validator-slot {
    max-width: 400px;
  }
}

@media (max-width: 820px) {
  .living-topbar {
    flex-wrap: wrap;
    padding: 12px 16px;
    gap: 12px;
  }
  .topbar-greeting-col {
    order: 1;
  }
  .topbar-controls {
    order: 2;
    margin-left: auto;
  }
  .topbar-validator-slot {
    order: 3;
    width: 100%;
    max-width: 100%;
    min-width: 100%;
  }
}

@media (max-width: 640px) {
  .topbar-sync {
    display: none;
  }
}
</style>
