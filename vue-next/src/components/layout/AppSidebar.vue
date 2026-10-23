<script setup lang="ts">
import { computed } from 'vue'
import ModuleIcon from '../ModuleIcon.vue'
import type { PortalProfile } from '../../types'

export interface NavItem {
  id: string
  label: string
  icon: string
  badge?: string
  description?: string
  color: string
}

const props = defineProps<{
  profile: PortalProfile
  modules: string[]
  activeModule: string
  hasModule: (code: string) => boolean
}>()

const emit = defineEmits<{
  (e: 'navigate', moduleId: string): void
  (e: 'logout'): void
}>()

const name = computed(() => String(props.profile.nombre || props.profile.email || 'Usuario').trim())
const role = computed(() => String(props.profile.rol || '').toUpperCase())
const galera = computed(() => String(props.profile.galera || ''))
const initials = computed(() => name.value.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase())

// Los 6 módulos principales exactos del Centro de Control RYM
const navigationItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    {
      id: 'home',
      label: 'Inicio',
      icon: 'home',
      description: 'Centro de control',
      color: 'blue'
    },
    {
      id: 'panapass',
      label: 'Panapass & ENA',
      icon: 'panapass',
      description: 'Cobros, saldos y peajes',
      badge: 'Peajes',
      color: 'sky'
    },
    {
      id: 'revisados',
      label: 'Revisados',
      icon: 'revisados',
      description: 'Inspección técnica ATTT',
      badge: 'ATTT',
      color: 'emerald'
    },
    {
      id: 'gps',
      label: 'GPS Satelital',
      icon: 'gps',
      description: 'Telemetría y rastreo 24/7',
      badge: 'En vivo',
      color: 'indigo'
    },
    {
      id: 'control',
      label: 'Control de Auto',
      icon: 'control',
      description: 'Maestra y estatus de flota',
      badge: 'Flota',
      color: 'orange'
    },
    {
      id: 'users',
      label: 'Usuarios & Roles',
      icon: 'users',
      description: 'Permisos y accesos',
      badge: 'Admin',
      color: 'purple'
    }
  ]

  return items
})

function selectModule(id: string) {
  emit('navigate', id)
}
</script>

<template>
  <aside class="living-sidebar" data-testid="modular-sidebar">
    <!-- Brand Hub Header -->
    <div class="living-brand">
      <div class="living-brand-logo">
        <img :src="'/assets/rym-logo.png'" alt="Portal RYM">
      </div>
      <div class="living-brand-meta">
        <strong>Portal RYM</strong>
        <span class="brand-tag">Gestión Central</span>
      </div>
    </div>

    <!-- Clean Focused Nav List -->
    <nav class="living-nav" aria-label="Navegación principal">
      <div class="nav-section-title">
        <span>SISTEMAS PRINCIPALES</span>
      </div>

      <div class="nav-list">
        <button
          v-for="item in navigationItems"
          :key="item.id"
          type="button"
          class="nav-btn"
          :class="[item.color, { active: activeModule === item.id }]"
          @click="selectModule(item.id)"
        >
          <div class="nav-icon-container">
            <template v-if="item.id === 'home'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </template>
            <template v-else-if="item.id === 'users'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </template>
            <template v-else>
              <ModuleIcon :name="item.icon" />
            </template>
          </div>

          <div class="nav-btn-text">
            <div class="nav-label-row">
              <span class="nav-label-main">{{ item.label }}</span>
              <span v-if="item.badge" class="nav-item-badge">{{ item.badge }}</span>
            </div>
            <span class="nav-label-desc">{{ item.description }}</span>
          </div>

          <span v-if="activeModule === item.id" class="nav-active-pill" aria-hidden="true"></span>
        </button>
      </div>
    </nav>

    <!-- Support Telemetry Badge -->
    <div class="sidebar-system-card">
      <div class="system-status-indicator">
        <span class="pulse-core"></span>
        <div class="status-texts">
          <strong>Flota Conectada</strong>
          <small>Sincronización activa</small>
        </div>
      </div>
    </div>

    <!-- User Profile Bottom -->
    <div class="living-user-panel">
      <div class="user-row">
        <span class="user-avatar">{{ initials }}</span>
        <div class="user-info">
          <span class="user-name" :title="name">{{ name }}</span>
          <span class="user-role">{{ role }}{{ galera ? ` · ${galera}` : '' }}</span>
        </div>
      </div>
      <div class="user-status-row">
        <span class="status-indicator">
          <i class="status-dot"></i> Sesión segura
        </span>
        <button type="button" class="btn-logout-small" title="Cerrar sesión" @click="emit('logout')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          <span>Salir</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* ==========================================================================
   LIVING LIGHT SIDEBAR — Pure, Clean & Harmonious SaaS Navigation Hub
   ========================================================================== */
.living-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  width: 270px;
  min-width: 270px;
  background: #ffffff !important;
  border-right: 1.5px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  padding: 22px 16px 18px;
  box-shadow: 4px 0 24px rgba(15, 23, 42, 0.03);
  z-index: 30;
  box-sizing: border-box;
  font-family: inherit;
}

/* Brand Header */
.living-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px 18px;
  border-bottom: 1.5px solid #f1f5f9;
  margin-bottom: 18px;
}

.living-brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
  flex-shrink: 0;
  padding: 4px;
  box-sizing: border-box;
}

.living-brand-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.living-brand-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.living-brand-meta strong {
  font-size: 16px;
  font-weight: 850;
  color: #0f172a;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.brand-tag {
  font-size: 10.5px;
  font-weight: 750;
  color: #2563eb;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Navigation List */
.living-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.living-nav::-webkit-scrollbar {
  width: 4px;
}
.living-nav::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 4px;
}

.nav-section-title {
  padding: 0 10px 4px;
}

.nav-section-title span {
  font-size: 10px;
  font-weight: 850;
  color: #94a3b8;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1.5px solid transparent;
  background: transparent !important;
  color: #334155 !important;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: left;
  outline: none;
  box-shadow: none !important;
}

.nav-icon-container {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: #f1f5f9;
  color: #64748b;
  flex-shrink: 0;
  transition: all 0.22s ease;
}

.nav-icon-container svg {
  width: 18px !important;
  height: 18px !important;
  display: block;
}

/* ==========================================================================
   Harmonious Hover & Active Colors per Module
   ========================================================================== */

/* Blue / Inicio */
.nav-btn.blue:hover {
  background: #eff6ff !important;
  border-color: #bfdbfe !important;
  color: #1d4ed8 !important;
  transform: translateX(4px);
}
.nav-btn.blue:hover .nav-icon-container {
  background: #dbeafe;
  color: #1d4ed8;
}
.nav-btn.blue.active {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
  border-color: #bfdbfe !important;
  color: #1d4ed8 !important;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.12) !important;
}
.nav-btn.blue.active .nav-icon-container {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
}

/* Sky / Panapass */
.nav-btn.sky:hover {
  background: #f0f9ff !important;
  border-color: #bae6fd !important;
  color: #0284c7 !important;
  transform: translateX(4px);
}
.nav-btn.sky:hover .nav-icon-container {
  background: #e0f2fe;
  color: #0284c7;
}
.nav-btn.sky.active {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%) !important;
  border-color: #bae6fd !important;
  color: #0369a1 !important;
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.12) !important;
}
.nav-btn.sky.active .nav-icon-container {
  background: #0284c7;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(2, 132, 199, 0.3);
}

/* Emerald / Revisados */
.nav-btn.emerald:hover {
  background: #ecfdf5 !important;
  border-color: #a7f3d0 !important;
  color: #047857 !important;
  transform: translateX(4px);
}
.nav-btn.emerald:hover .nav-icon-container {
  background: #d1fae5;
  color: #047857;
}
.nav-btn.emerald.active {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%) !important;
  border-color: #a7f3d0 !important;
  color: #065f46 !important;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.12) !important;
}
.nav-btn.emerald.active .nav-icon-container {
  background: #059669;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
}

/* Indigo / GPS */
.nav-btn.indigo:hover {
  background: #eef2ff !important;
  border-color: #c7d2fe !important;
  color: #4338ca !important;
  transform: translateX(4px);
}
.nav-btn.indigo:hover .nav-icon-container {
  background: #e0e7ff;
  color: #4338ca;
}
.nav-btn.indigo.active {
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%) !important;
  border-color: #c7d2fe !important;
  color: #3730a3 !important;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.12) !important;
}
.nav-btn.indigo.active .nav-icon-container {
  background: #4f46e5;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
}

/* Orange / Control de Auto */
.nav-btn.orange:hover {
  background: #fff7ed !important;
  border-color: #fed7aa !important;
  color: #c2410c !important;
  transform: translateX(4px);
}
.nav-btn.orange:hover .nav-icon-container {
  background: #ffedd5;
  color: #c2410c;
}
.nav-btn.orange.active {
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%) !important;
  border-color: #fed7aa !important;
  color: #9a3412 !important;
  box-shadow: 0 4px 14px rgba(234, 88, 12, 0.12) !important;
}
.nav-btn.orange.active .nav-icon-container {
  background: #ea580c;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(234, 88, 12, 0.3);
}

/* Purple / Usuarios */
.nav-btn.purple:hover {
  background: #faf5ff !important;
  border-color: #e9d5ff !important;
  color: #7e22ce !important;
  transform: translateX(4px);
}
.nav-btn.purple:hover .nav-icon-container {
  background: #f3e8ff;
  color: #7e22ce;
}
.nav-btn.purple.active {
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%) !important;
  border-color: #e9d5ff !important;
  color: #6b21a8 !important;
  box-shadow: 0 4px 14px rgba(168, 85, 247, 0.12) !important;
}
.nav-btn.purple.active .nav-icon-container {
  background: #9333ea;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(168, 85, 247, 0.3);
}

.nav-btn.active .nav-icon-container svg {
  stroke: #ffffff !important;
}

.nav-btn-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.nav-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.nav-label-main {
  font-size: 13.5px;
  font-weight: 750;
  color: inherit;
  line-height: 1.25;
}

.nav-item-badge {
  font-size: 8.5px;
  font-weight: 850;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.nav-btn.sky .nav-item-badge { background: #e0f2fe; color: #0284c7; }
.nav-btn.emerald .nav-item-badge { background: #d1fae5; color: #059669; }
.nav-btn.indigo .nav-item-badge { background: #e0e7ff; color: #4338ca; }
.nav-btn.orange .nav-item-badge { background: #ffedd5; color: #ea580c; }
.nav-btn.purple .nav-item-badge { background: #fae8ff; color: #9333ea; }

.nav-btn.active .nav-label-main {
  font-weight: 850;
}

.nav-label-desc {
  font-size: 10.5px;
  font-weight: 500;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.nav-btn.active .nav-label-desc {
  opacity: 0.9;
}

.nav-active-pill {
  width: 4px;
  height: 20px;
  border-radius: 4px;
  background: currentColor;
}

/* System Heartbeat Card */
.sidebar-system-card {
  margin: 12px 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.system-status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pulse-core {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
  animation: sidebarSonar 2.2s infinite ease-out;
  flex-shrink: 0;
}

@keyframes sidebarSonar {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
  70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.status-texts {
  display: flex;
  flex-direction: column;
}

.status-texts strong {
  font-size: 11.5px;
  font-weight: 750;
  color: #0f172a;
  line-height: 1.2;
}

.status-texts small {
  font-size: 10px;
  color: #059669;
  font-weight: 600;
}

/* User Footer Card */
.living-user-panel {
  padding: 12px;
  border-radius: 16px;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
}

.user-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 850;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-size: 12.5px;
  font-weight: 800;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 10px;
  font-weight: 650;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 650;
  color: #64748b;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.btn-logout-small {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  cursor: pointer;
  padding: 4px 9px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 750;
  transition: all 0.18s;
}

.btn-logout-small svg {
  width: 13px;
  height: 13px;
}

.btn-logout-small:hover {
  background: #fee2e2;
  color: #b91c1c;
  transform: translateY(-1px);
}
</style>
