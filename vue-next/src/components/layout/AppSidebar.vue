<script setup lang="ts">
import { computed, ref } from 'vue'
import ModuleIcon from '../ModuleIcon.vue'
import type { PortalProfile } from '../../types'

export interface NavItem {
  id: string
  label: string
  icon: string
  color: string
  section: 'core' | 'admin'
}

const props = defineProps<{
  profile: PortalProfile
  modules: string[]
  activeModule: string
  hasModule: (code: string) => boolean
  connectionState?: 'connected' | 'connecting' | 'error'
  latencyMs?: number | null
  stats?: Record<string, unknown>
}>()

const emit = defineEmits<{
  (e: 'navigate', moduleId: string): void
  (e: 'logout'): void
}>()

// Estado colapsable con persistencia (FASE 6 & 8)
const isCollapsed = ref(false)
try {
  isCollapsed.value = localStorage.getItem('rym_vue_sidebar_collapsed') === '1'
} catch (_) {}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
  try {
    localStorage.setItem('rym_vue_sidebar_collapsed', isCollapsed.value ? '1' : '0')
  } catch (_) {}
}

const name = computed(() => String(props.profile.nombre || props.profile.email || 'Usuario').trim())
const role = computed(() => String(props.profile.rol || '').toUpperCase())
const initials = computed(() => name.value.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase())

// Permisos canónicos de los 6 perfiles (FASE 9)
const canUsers = computed(() => role.value === 'ADMIN_TOTAL' || props.hasModule('admin.usuarios') || props.modules.includes('admin.usuarios'))
const canPanapass = computed(() => props.hasModule('portal.panapass') || ['dashboard','negativos_hoy','pagos_hoy','ranking','historial','operaciones'].some(m => props.modules.includes(m)))
const canRevisados = computed(() => props.hasModule('portal.revisados') || props.modules.includes('portal.revisados') || ['ADMIN_TOTAL','ADMIN','SUPERVISORA','GERENTE_GALERA'].includes(role.value))
const canGps = computed(() => props.hasModule('portal.gps') || props.hasModule('gps.dashboard') || ['ADMIN_TOTAL','ADMIN','SUPERVISORA','GERENTE_GALERA'].includes(role.value))
const canControl = computed(() => props.hasModule('portal.control_auto') || props.hasModule('control_auto.unidades') || ['ADMIN_TOTAL','ADMIN','SUPERVISORA'].includes(role.value))

// Estado real de conectividad (FASE 6)
const connStatus = computed<'connected' | 'connecting' | 'error'>(() => {
  if (props.connectionState) return props.connectionState
  return 'connected'
})

const connLabel = computed(() => {
  if (connStatus.value === 'error') return 'Sincronización parcial'
  if (connStatus.value === 'connecting') return 'Verificando conexión…'
  return 'Flota conectada'
})

const realLatencyText = computed<string | null>(() => {
  if (typeof props.latencyMs === 'number' && props.latencyMs > 0) {
    return `${Math.round(props.latencyMs)}ms`
  }
  return null
})

// FASE 3: Navegación pura sin badges ni contadores operativos
const navigationItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    {
      id: 'home',
      label: 'Inicio',
      icon: 'home',
      color: 'blue',
      section: 'core'
    }
  ]

  if (canPanapass.value) {
    items.push({
      id: 'panapass',
      label: 'Panapass & ENA',
      icon: 'panapass',
      color: 'sky',
      section: 'core'
    })
  }

  if (canRevisados.value) {
    items.push({
      id: 'revisados',
      label: 'Revisados',
      icon: 'revisados',
      color: 'emerald',
      section: 'core'
    })
  }

  if (canGps.value) {
    items.push({
      id: 'gps',
      label: 'GPS Satelital',
      icon: 'gps',
      color: 'cyan',
      section: 'core'
    })
  }

  if (canControl.value) {
    items.push({
      id: 'control',
      label: 'Control de Auto',
      icon: 'control',
      color: 'teal',
      section: 'core'
    })
  }

  if (canUsers.value) {
    items.push({
      id: 'users',
      label: 'Usuarios & Roles',
      icon: 'users',
      color: 'indigo',
      section: 'admin'
    })
  }

  return items
})

const coreItems = computed(() => navigationItems.value.filter(i => i.section === 'core'))
const adminItems = computed(() => navigationItems.value.filter(i => i.section === 'admin'))

function selectModule(id: string) {
  emit('navigate', id)
}
</script>

<template>
  <aside
    class="living-sidebar ocean-horizon-style"
    :class="{ 'is-collapsed': isCollapsed }"
    data-testid="modular-sidebar"
  >
    <!-- FASE 2 & 4: Fondo "Ocean Horizon Telemetry" (Azul Océano Luminoso + Petróleo + Turquesa + Red Animada) -->
    <div class="sidebar-mesh-backdrop" aria-hidden="true">
      <div class="sidebar-blob blob-ocean-top"></div>
      <div class="sidebar-blob blob-turquoise-mid"></div>
      <div class="sidebar-blob blob-emerald-bottom"></div>
      <div class="sidebar-topographic-grid"></div>
    </div>

    <!-- Red de Conectividad y Telemetría Animada (Corredores ENA + Nodos Luminosos) -->
    <svg class="sidebar-traffic-network" viewBox="0 0 260 960" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <!-- Ondas guía continuas de baja opacidad -->
      <path d="M-25 180 C65 140 125 360 215 310 S235 640 280 880" stroke="rgba(125, 211, 252, 0.14)" stroke-width="1.2"/>
      <path d="M285 240 C165 350 55 520 155 700 S45 860 -25 940" stroke="rgba(94, 234, 212, 0.14)" stroke-width="1.2"/>

      <!-- Líneas de flujo animadas cian, turquesa y esmeralda -->
      <path class="traffic-line path-1" d="M-25 180 C65 140 125 360 215 310 S235 640 280 880" stroke="url(#oceanCyanGrad)" stroke-width="2" stroke-dasharray="8 16"/>
      <path class="traffic-line path-2" d="M285 240 C165 350 55 520 155 700 S45 860 -25 940" stroke="url(#oceanTealGrad)" stroke-width="1.8" stroke-dasharray="6 14"/>
      <path class="traffic-line path-3" d="M-15 500 C95 430 170 670 265 860" stroke="url(#oceanEmeraldGrad)" stroke-width="2" stroke-dasharray="7 13"/>

      <!-- Puntos de intersección de telemetría -->
      <circle cx="152" cy="326" r="2.2" fill="#7dd3fc" fill-opacity="0.45"/>
      <circle cx="118" cy="542" r="2.5" fill="#5eead4" fill-opacity="0.55"/>
      <circle cx="192" cy="712" r="2.5" fill="#6ee7b7" fill-opacity="0.6"/>

      <!-- Nodos luminosos en movimiento continuo -->
      <circle class="moving-node node-1" r="3.2" fill="#7dd3fc">
        <animateMotion path="M-25 180 C65 140 125 360 215 310 S235 640 280 880" dur="22s" repeatCount="indefinite" />
      </circle>
      <circle class="moving-node node-2" r="3.2" fill="#5eead4">
        <animateMotion path="M285 240 C165 350 55 520 155 700 S45 860 -25 940" dur="26s" repeatCount="indefinite" />
      </circle>
      <circle class="moving-node node-3" r="3" fill="#34d399">
        <animateMotion path="M-15 500 C95 430 170 670 265 860" dur="20s" repeatCount="indefinite" />
      </circle>

      <defs>
        <linearGradient id="oceanCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.18"/>
          <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.68"/>
          <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.85"/>
        </linearGradient>
        <linearGradient id="oceanTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#99f6e4" stop-opacity="0.15"/>
          <stop offset="50%" stop-color="#2dd4bf" stop-opacity="0.65"/>
          <stop offset="100%" stop-color="#14b8a6" stop-opacity="0.85"/>
        </linearGradient>
        <linearGradient id="oceanEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a7f3d0" stop-opacity="0.2"/>
          <stop offset="55%" stop-color="#34d399" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#10b981" stop-opacity="0.88"/>
        </linearGradient>
      </defs>
    </svg>

    <!-- FASE 6: Cabecera Integrada ([Logo original] Portal RYM + Botón Colapsar) -->
    <div class="living-brand">
      <div class="living-brand-logo" title="Portal RYM">
        <img :src="'/assets/rym-logo.png'" alt="Portal RYM">
      </div>

      <div v-if="!isCollapsed" class="living-brand-meta">
        <strong>Portal RYM</strong>
      </div>

      <button
        type="button"
        class="sidebar-toggle-btn"
        :aria-label="isCollapsed ? 'Expandir menú' : 'Contraer menú'"
        :title="isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'"
        @click="toggleCollapse"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <polyline v-if="!isCollapsed" points="15 18 9 12 15 6"></polyline>
          <polyline v-else points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>

    <!-- FASE 3, 5, 7: Navegación Integrada en el Fondo (Sin tarjetas rígidas ni badges) -->
    <nav class="living-nav" aria-label="Navegación principal">
      <div v-if="!isCollapsed" class="nav-section-title">
        <span>OPERACIÓN CENTRAL</span>
      </div>

      <div class="nav-list">
        <button
          v-for="item in coreItems"
          :key="item.id"
          type="button"
          class="nav-btn"
          :class="[item.color, { active: activeModule === item.id }]"
          :data-tooltip="isCollapsed ? item.label : undefined"
          :title="isCollapsed ? item.label : undefined"
          :aria-label="item.label"
          :aria-current="activeModule === item.id ? 'page' : undefined"
          @click="selectModule(item.id)"
        >
          <span v-if="activeModule === item.id" class="nav-active-pill" aria-hidden="true"></span>

          <div class="nav-icon-container" :class="`icon-${item.color}`">
            <template v-if="item.id === 'home'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </template>
            <template v-else>
              <ModuleIcon :name="item.icon" />
            </template>
          </div>

          <div v-if="!isCollapsed" class="nav-btn-text">
            <span class="nav-label-main">{{ item.label }}</span>
          </div>
        </button>
      </div>

      <!-- Separación armónica para Administración cuando el perfil tiene permiso -->
      <template v-if="adminItems.length">
        <div v-if="!isCollapsed" class="nav-section-title nav-section-admin">
          <span>ADMINISTRACIÓN</span>
        </div>
        <div v-else class="nav-collapsed-divider" aria-hidden="true"></div>

        <div class="nav-list">
          <button
            v-for="item in adminItems"
            :key="item.id"
            type="button"
            class="nav-btn"
            :class="[item.color, { active: activeModule === item.id }]"
            :data-tooltip="isCollapsed ? item.label : undefined"
            :title="isCollapsed ? item.label : undefined"
            :aria-label="item.label"
            :aria-current="activeModule === item.id ? 'page' : undefined"
            @click="selectModule(item.id)"
          >
            <span v-if="activeModule === item.id" class="nav-active-pill" aria-hidden="true"></span>

            <div class="nav-icon-container" :class="`icon-${item.color}`">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>

            <div v-if="!isCollapsed" class="nav-btn-text">
              <span class="nav-label-main">{{ item.label }}</span>
            </div>
          </button>
        </div>
      </template>
    </nav>

    <!-- FASE 6 & 7: Dock Inferior Unificado (Telemetría de Conexión + Usuario Conectado en una sola consola cristalina) -->
    <div class="sidebar-footer-dock">
      <div
        class="footer-telemetry-row"
        :class="`status-${connStatus}`"
        :title="connLabel"
        data-testid="sidebar-connection-status"
      >
        <span class="telemetry-live-dot" :class="`dot-${connStatus}`"></span>
        <span v-if="!isCollapsed" class="telemetry-label">{{ connLabel }}</span>
        <small v-if="!isCollapsed && realLatencyText">{{ realLatencyText }}</small>
      </div>

      <div class="footer-dock-divider" aria-hidden="true"></div>

      <div class="user-profile-row" data-testid="sidebar-user-tile">
        <div class="user-avatar-circle" :title="`${name} (${role})`">
          {{ initials }}
        </div>
        <div v-if="!isCollapsed" class="user-info-text">
          <span class="user-display-name" :title="name">{{ name }}</span>
          <span class="user-role-label">{{ role }}</span>
        </div>
        <button
          type="button"
          class="user-logout-button"
          :class="{ 'icon-only': isCollapsed }"
          aria-label="Cerrar sesión"
          title="Salir de Portal RYM"
          @click="emit('logout')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          <span v-if="!isCollapsed">Salir</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Reset limpio de botones dentro del sidebar */
button {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  color: inherit !important;
  font: inherit !important;
  box-shadow: none !important;
}

/* ==========================================================================
   FASE 2 & 4 — DIRECCIÓN VISUAL "OCEAN HORIZON TELEMETRY"
   Azul Océano Luminoso (#0c2d48) -> Azul Petróleo (#0f4c75 / #0b5269) -> Turquesa Profundo (#0a5c66)
   ========================================================================== */
.living-sidebar.ocean-horizon-style {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  width: 248px !important;
  min-width: 248px !important;
  max-width: 248px !important;
  height: 100vh !important;
  max-height: 100vh !important;
  padding: 18px 14px 16px !important;
  color: #f8fafc !important;
  overflow: hidden !important;
  background: linear-gradient(168deg, #0b2545 0%, #0e3a5c 42%, #0c4a60 76%, #0b535b 100%) !important;
  border-right: 1px solid rgba(125, 211, 252, 0.22) !important;
  box-shadow:
    6px 0 32px rgba(8, 37, 69, 0.18),
    inset -1px 0 0 rgba(255, 255, 255, 0.08) !important;
  transition:
    width 0.26s cubic-bezier(0.16, 1, 0.3, 1),
    min-width 0.26s cubic-bezier(0.16, 1, 0.3, 1),
    max-width 0.26s cubic-bezier(0.16, 1, 0.3, 1),
    padding 0.26s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.living-sidebar.ocean-horizon-style.is-collapsed {
  width: 76px !important;
  min-width: 76px !important;
  max-width: 76px !important;
  padding: 18px 10px 16px !important;
  overflow: visible !important;
}

/* Auroras Oceánicas Luminosas */
.sidebar-mesh-backdrop {
  position: absolute !important;
  inset: 0 !important;
  pointer-events: none !important;
  overflow: hidden !important;
  z-index: 0 !important;
}

.sidebar-blob {
  position: absolute !important;
  border-radius: 50% !important;
  filter: blur(46px) !important;
  animation: oceanHorizonFlow 20s ease-in-out infinite alternate !important;
  will-change: transform !important;
}

.sidebar-blob.blob-ocean-top {
  width: 250px !important;
  height: 250px !important;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.52) 0%, rgba(14, 165, 233, 0.22) 55%, transparent 75%) !important;
  top: -10% !important;
  left: -20% !important;
  opacity: 0.75 !important;
}

.sidebar-blob.blob-turquoise-mid {
  width: 240px !important;
  height: 240px !important;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.45) 0%, rgba(20, 184, 166, 0.2) 55%, transparent 75%) !important;
  top: 38% !important;
  right: -25% !important;
  opacity: 0.65 !important;
  animation-duration: 24s !important;
}

.sidebar-blob.blob-emerald-bottom {
  width: 260px !important;
  height: 260px !important;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, rgba(52, 211, 153, 0.24) 55%, transparent 75%) !important;
  bottom: -6% !important;
  left: -15% !important;
  opacity: 0.72 !important;
  animation-duration: 22s !important;
}

@keyframes oceanHorizonFlow {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(14px, 12px, 0) scale(1.07); }
  100% { transform: translate3d(-10px, 20px, 0) scale(0.95); }
}

.sidebar-topographic-grid {
  position: absolute !important;
  inset: 0 !important;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.045) 1px, transparent 1px) !important;
  background-size: 30px 30px !important;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.5) 45%, rgba(0, 0, 0, 0.95) 100%) !important;
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.5) 45%, rgba(0, 0, 0, 0.95) 100%) !important;
  pointer-events: none !important;
}

/* Red de telemetría: sutil en la zona de lectura superior, protagonista en el horizonte inferior */
.sidebar-traffic-network {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none !important;
  z-index: 1 !important;
  opacity: 0.9 !important;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.22) 0%, rgba(0, 0, 0, 0.42) 40%, rgba(0, 0, 0, 0.92) 72%, rgba(0, 0, 0, 1) 100%) !important;
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.22) 0%, rgba(0, 0, 0, 0.42) 40%, rgba(0, 0, 0, 0.92) 72%, rgba(0, 0, 0, 1) 100%) !important;
}

.traffic-line {
  animation: streamRays 32s linear infinite !important;
}

.path-2 {
  animation-direction: reverse !important;
  animation-duration: 38s !important;
}

@keyframes streamRays {
  to { stroke-dashoffset: 480; }
}

.moving-node {
  filter: drop-shadow(0 0 5px currentColor);
  opacity: 0.92;
}

.living-brand,
.living-nav,
.sidebar-footer-dock {
  position: relative !important;
  z-index: 5 !important;
}

/* ==========================================================================
   FASE 6 — CABECERA ([Logo original] Portal RYM)
   ========================================================================== */
.living-brand {
  display: flex !important;
  align-items: center !important;
  gap: 11px !important;
  padding: 2px 4px 16px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14) !important;
}

.is-collapsed .living-brand {
  flex-direction: column !important;
  justify-content: center !important;
  gap: 10px !important;
  padding: 2px 0 14px !important;
}

.living-brand-logo {
  width: 40px !important;
  height: 40px !important;
  border-radius: 11px !important;
  background: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.92) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 4px !important;
  box-shadow: 0 6px 16px rgba(6, 24, 44, 0.28) !important;
  flex-shrink: 0 !important;
}

.living-brand-logo img {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
}

.living-brand-meta {
  display: flex !important;
  align-items: center !important;
  min-width: 0 !important;
}

.living-brand-meta strong {
  display: block !important;
  font-size: 16px !important;
  font-weight: 850 !important;
  color: #ffffff !important;
  letter-spacing: -0.02em !important;
  line-height: 1.2 !important;
  white-space: nowrap !important;
  text-shadow: 0 1px 3px rgba(6, 24, 44, 0.35) !important;
}

.sidebar-toggle-btn {
  margin-left: auto !important;
  width: 30px !important;
  height: 30px !important;
  border-radius: 9px !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  background: rgba(255, 255, 255, 0.08) !important;
  color: #e0f2fe !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease !important;
  flex-shrink: 0 !important;
}

.is-collapsed .sidebar-toggle-btn {
  margin-left: 0 !important;
}

.sidebar-toggle-btn svg {
  width: 15px !important;
  height: 15px !important;
  stroke: currentColor !important;
}

@media (hover: hover) {
  .sidebar-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.18) !important;
    border-color: rgba(125, 211, 252, 0.55) !important;
    color: #ffffff !important;
  }
}

/* ==========================================================================
   FASE 3, 5, 7 — NAVEGACIÓN INTEGRADA (SIN CAJAS RÍGIDAS NI BADGES)
   ========================================================================== */
.living-nav {
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  margin-top: 18px !important;
  flex: 1 !important;
}

.nav-section-title {
  padding: 0 10px 2px !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  color: rgba(186, 230, 253, 0.72) !important;
  letter-spacing: 0.11em !important;
  text-transform: uppercase !important;
}

.nav-section-admin {
  margin-top: 14px !important;
}

.nav-collapsed-divider {
  height: 1px !important;
  margin: 8px 10px !important;
  background: rgba(255, 255, 255, 0.14) !important;
}

.nav-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
}

/* Opción en estado normal: integrada limpiamente en el fondo oceánico, sin bordes de tarjeta */
.nav-btn {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  gap: 13px !important;
  min-height: 46px !important;
  padding: 8px 12px !important;
  border-radius: 13px !important;
  border: 1px solid transparent !important;
  background: transparent !important;
  color: rgba(240, 249, 255, 0.88) !important;
  cursor: pointer !important;
  transition:
    background-color 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    color 0.22s ease !important;
  text-align: left !important;
  user-select: none !important;
}

.is-collapsed .nav-btn {
  justify-content: center !important;
  padding: 9px 0 !important;
}

/* Hover fluido con velo translúcido oceánico */
@media (hover: hover) {
  .nav-btn:hover {
    background: rgba(255, 255, 255, 0.1) !important;
    border-color: rgba(186, 230, 253, 0.22) !important;
    color: #ffffff !important;
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
  }
}

/* Estado activo: superficie turquesa/cian translúcida luminosa + acento lateral */
.nav-btn.active {
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.26) 0%, rgba(45, 212, 191, 0.2) 60%, rgba(255, 255, 255, 0.08) 100%) !important;
  border-color: rgba(125, 211, 252, 0.42) !important;
  color: #ffffff !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  box-shadow:
    0 8px 20px rgba(6, 28, 52, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.24) !important;
}

.nav-btn:focus-visible {
  outline: 2px solid #7dd3fc !important;
  outline-offset: 2px !important;
}

/* Indicador lateral luminoso a la izquierda de la opción activa */
.nav-active-pill {
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  width: 3.5px !important;
  height: 22px !important;
  border-radius: 0 999px 999px 0 !important;
  background: linear-gradient(180deg, #7dd3fc 0%, #2dd4bf 100%) !important;
  box-shadow: 0 0 10px rgba(94, 234, 212, 0.75) !important;
}

/* Tooltip limpio cuando está contraído */
.is-collapsed .nav-btn[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(-4px);
  background: #0b2545;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  padding: 6px 11px;
  border-radius: 9px;
  border: 1px solid rgba(125, 211, 252, 0.4);
  box-shadow: 0 10px 24px rgba(6, 24, 44, 0.4);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.16s ease, transform 0.16s ease;
  z-index: 60;
}

@media (hover: hover) {
  .is-collapsed .nav-btn[data-tooltip]:hover::after,
  .is-collapsed .nav-btn[data-tooltip]:focus-visible::after {
    opacity: 1;
    visibility: visible;
    transform: translateY(-50%) translateX(0);
  }
}

/* Iconos con cápsula translúcida luminosa */
.nav-icon-container {
  width: 34px !important;
  height: 34px !important;
  border-radius: 10px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease !important;
}

.nav-icon-container svg {
  width: 18px !important;
  height: 18px !important;
  stroke-width: 2.1 !important;
}

.icon-blue {
  background: rgba(56, 189, 248, 0.16) !important;
  color: #bae6fd !important;
  border: 1px solid rgba(125, 211, 252, 0.26) !important;
}
.icon-sky {
  background: rgba(14, 165, 233, 0.16) !important;
  color: #7dd3fc !important;
  border: 1px solid rgba(125, 211, 252, 0.26) !important;
}
.icon-emerald {
  background: rgba(16, 185, 129, 0.16) !important;
  color: #6ee7b7 !important;
  border: 1px solid rgba(110, 231, 183, 0.26) !important;
}
.icon-cyan {
  background: rgba(6, 182, 212, 0.16) !important;
  color: #67e8f9 !important;
  border: 1px solid rgba(103, 232, 249, 0.26) !important;
}
.icon-teal {
  background: rgba(20, 184, 166, 0.16) !important;
  color: #5eead4 !important;
  border: 1px solid rgba(94, 234, 212, 0.26) !important;
}
.icon-indigo {
  background: rgba(99, 102, 241, 0.18) !important;
  color: #c7d2fe !important;
  border: 1px solid rgba(165, 180, 252, 0.28) !important;
}

@media (hover: hover) {
  .nav-btn:hover .nav-icon-container {
    transform: scale(1.06) !important;
    background: rgba(255, 255, 255, 0.18) !important;
    border-color: rgba(255, 255, 255, 0.35) !important;
    color: #ffffff !important;
  }
}

.nav-btn.active .nav-icon-container {
  background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%) !important;
  color: #ffffff !important;
  border-color: rgba(255, 255, 255, 0.55) !important;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.38) !important;
}

.nav-btn-text {
  display: flex !important;
  align-items: center !important;
  min-width: 0 !important;
  flex: 1 !important;
}

.nav-label-main {
  font-size: 13.5px !important;
  font-weight: 650 !important;
  line-height: 1.3 !important;
  color: rgba(248, 250, 252, 0.92) !important;
  letter-spacing: -0.01em !important;
  white-space: nowrap !important;
}

.nav-btn:hover .nav-label-main {
  color: #ffffff !important;
}

.nav-btn.active .nav-label-main {
  color: #ffffff !important;
  font-weight: 800 !important;
}

/* ==========================================================================
   FASE 6 & 7 — DOCK INFERIOR INTEGRADO (CONEXIÓN + USUARIO EN UN SOLO PANEL)
   ========================================================================== */
.sidebar-footer-dock {
  margin-top: auto !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 10px 11px !important;
  border-radius: 14px !important;
  background: rgba(7, 26, 46, 0.42) !important;
  border: 1px solid rgba(186, 230, 253, 0.18) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  box-shadow: 0 6px 18px rgba(5, 20, 38, 0.22) !important;
}

.is-collapsed .sidebar-footer-dock {
  padding: 8px 6px !important;
  align-items: center !important;
}

.footer-telemetry-row {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #e0f2fe !important;
}

.footer-telemetry-row.status-error {
  color: #fde68a !important;
}

.is-collapsed .footer-telemetry-row {
  justify-content: center !important;
}

.footer-telemetry-row small {
  margin-left: auto !important;
  color: #5eead4 !important;
  font-size: 10px !important;
  font-weight: 800 !important;
}

.telemetry-live-dot {
  width: 7px !important;
  height: 7px !important;
  border-radius: 50% !important;
  background: #34d399 !important;
  flex-shrink: 0 !important;
}

.telemetry-live-dot.dot-connected {
  background: #34d399 !important;
  box-shadow: 0 0 0 2.5px rgba(52, 211, 153, 0.25) !important;
  animation: softStatusPulse 2.8s infinite ease-in-out !important;
}

.telemetry-live-dot.dot-connecting {
  background: #38bdf8 !important;
  box-shadow: 0 0 0 2.5px rgba(56, 189, 248, 0.25) !important;
}

.telemetry-live-dot.dot-error {
  background: #fbbf24 !important;
  box-shadow: 0 0 0 2.5px rgba(251, 191, 36, 0.28) !important;
}

@keyframes softStatusPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

.footer-dock-divider {
  height: 1px !important;
  width: 100% !important;
  margin: 8px 0 !important;
  background: rgba(186, 230, 253, 0.14) !important;
}

.user-profile-row {
  display: flex !important;
  align-items: center !important;
  gap: 9px !important;
}

.is-collapsed .user-profile-row {
  flex-direction: column !important;
  gap: 7px !important;
}

.user-avatar-circle {
  width: 32px !important;
  height: 32px !important;
  border-radius: 9px !important;
  background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%) !important;
  color: #ffffff !important;
  font-size: 11.5px !important;
  font-weight: 850 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  box-shadow: 0 3px 8px rgba(14, 165, 233, 0.28) !important;
}

.user-info-text {
  display: flex !important;
  flex-direction: column !important;
  min-width: 0 !important;
  flex: 1 !important;
}

.user-display-name {
  font-size: 12px !important;
  font-weight: 750 !important;
  color: #ffffff !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  line-height: 1.2 !important;
}

.user-role-label {
  font-size: 9.5px !important;
  font-weight: 800 !important;
  color: #7dd3fc !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
  margin-top: 2px !important;
}

.user-logout-button {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 5px 9px !important;
  border-radius: 8px !important;
  border: 1px solid rgba(254, 202, 202, 0.28) !important;
  background: rgba(239, 68, 68, 0.16) !important;
  color: #fee2e2 !important;
  font-size: 10.5px !important;
  font-weight: 750 !important;
  cursor: pointer !important;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease !important;
  flex-shrink: 0 !important;
}

.user-logout-button.icon-only {
  padding: 6px !important;
}

.user-logout-button svg {
  width: 13px !important;
  height: 13px !important;
  stroke: currentColor !important;
}

@media (hover: hover) {
  .user-logout-button:hover {
    background: rgba(239, 68, 68, 0.32) !important;
    border-color: rgba(252, 165, 165, 0.6) !important;
    color: #ffffff !important;
  }
}

/* ==========================================================================
   RENDIMIENTO Y ACCESIBILIDAD: PREFERS-REDUCED-MOTION
   ========================================================================== */
@media (prefers-reduced-motion: reduce) {
  .sidebar-blob,
  .traffic-line,
  .telemetry-live-dot.dot-connected {
    animation: none !important;
  }
}

/* ==========================================================================
   FASE 8 — RESPONSIVE (TABLET Y MÓVIL)
   ========================================================================== */
@media (max-width: 768px) {
  .living-sidebar.ocean-horizon-style,
  .living-sidebar.ocean-horizon-style.is-collapsed {
    width: 100% !important;
    min-width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: none !important;
    padding: 10px 14px !important;
    border-right: none !important;
    border-bottom: 1px solid rgba(125, 211, 252, 0.24) !important;
    gap: 8px !important;
    overflow: hidden !important;
  }

  .living-brand,
  .is-collapsed .living-brand {
    flex-direction: row !important;
    align-items: center !important;
    justify-content: flex-start !important;
    padding: 0 0 6px !important;
    gap: 10px !important;
  }

  .living-brand-logo {
    width: 32px !important;
    height: 32px !important;
    border-radius: 8px !important;
  }

  .living-brand-meta {
    display: flex !important;
  }

  .living-brand-meta strong {
    font-size: 14.5px !important;
  }

  .sidebar-toggle-btn,
  .nav-section-title,
  .nav-collapsed-divider,
  .sidebar-footer-dock,
  .nav-active-pill {
    display: none !important;
  }

  .living-nav {
    margin-top: 0 !important;
    flex-direction: row !important;
    overflow-x: auto !important;
    gap: 6px !important;
    scrollbar-width: none !important;
  }

  .living-nav::-webkit-scrollbar {
    display: none !important;
  }

  .nav-list {
    flex-direction: row !important;
    gap: 6px !important;
  }

  .nav-btn,
  .is-collapsed .nav-btn {
    flex-shrink: 0 !important;
    min-height: 38px !important;
    padding: 6px 10px !important;
    gap: 8px !important;
  }

  .nav-icon-container {
    width: 26px !important;
    height: 26px !important;
    border-radius: 7px !important;
  }

  .nav-icon-container svg {
    width: 14px !important;
    height: 14px !important;
  }

  .nav-btn-text {
    display: flex !important;
  }

  .nav-label-main {
    font-size: 12.5px !important;
  }
}
</style>
