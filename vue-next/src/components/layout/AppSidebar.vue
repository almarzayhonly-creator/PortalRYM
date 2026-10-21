<script setup lang="ts">
import { computed } from 'vue'
import ModuleIcon from '../ModuleIcon.vue'
import type { PortalProfile } from '../../types'

export interface NavItem {
  id: string
  label: string
  icon?: string
  group: 'general' | 'operacion' | 'gestion' | 'admin'
  badge?: string
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

const LABELS: Record<string, string> = {
  home: 'Inicio',
  dashboard: 'Dashboard',
  ranking: 'Ranking',
  negativos_hoy: 'Negativos Hoy',
  pagos_hoy: 'Pagos Hoy',
  cargar_pagos: 'Cargar Pagos',
  historial: 'Historial',
  recurrentes: 'Recurrentes',
  operaciones: 'Operación AM / PM',
  reportes: 'Reportes',
  bajas_panapass: 'Bajas ENA',
  revisados: 'Revisados',
  control: 'Control de Flota',
  gps: 'GPS',
  usuarios: 'Usuarios',
}

const navigationItems = computed<NavItem[]>(() => {
  const items: NavItem[] = []
  const has = (code: string) => props.modules.includes(code) || props.hasModule(code)

  // Siempre disponible
  items.push({ id: 'home', label: 'Inicio', group: 'general' })

  // Módulos Panapass / Operación diaria
  if (has('dashboard')) items.push({ id: 'dashboard', label: LABELS.dashboard, group: 'operacion' })
  if (has('ranking')) items.push({ id: 'ranking', label: LABELS.ranking, group: 'operacion' })
  if (has('negativos_hoy')) items.push({ id: 'negativos_hoy', label: LABELS.negativos_hoy, group: 'operacion' })
  if (has('pagos_hoy')) items.push({ id: 'pagos_hoy', label: LABELS.pagos_hoy, group: 'operacion' })

  // Gestión de Pagos e Historial
  if (has('cargar_pagos')) items.push({ id: 'cargar_pagos', label: LABELS.cargar_pagos, group: 'gestion' })
  if (has('historial')) items.push({ id: 'historial', label: LABELS.historial, group: 'gestion' })
  if (has('recurrentes')) items.push({ id: 'recurrentes', label: LABELS.recurrentes, group: 'gestion' })
  if (has('operaciones')) items.push({ id: 'operaciones', label: LABELS.operaciones, group: 'gestion' })
  if (has('reportes')) items.push({ id: 'reportes', label: LABELS.reportes, group: 'gestion' })
  if (has('bajas_panapass')) items.push({ id: 'bajas_panapass', label: LABELS.bajas_panapass, group: 'gestion' })

  // Módulos de Flota y Control Legal
  if (has('portal.revisados')) items.push({ id: 'revisados', label: LABELS.revisados, group: 'gestion', icon: 'revisados' })
  if (has('portal.control_auto') || has('control_auto.unidades')) items.push({ id: 'control', label: LABELS.control, group: 'gestion', icon: 'auto' })
  if (role.value === 'ADMIN_TOTAL' || has('portal.gps')) items.push({ id: 'gps', label: LABELS.gps, group: 'gestion', icon: 'gps' })

  // Administración
  if (role.value === 'ADMIN_TOTAL' || has('admin.usuarios') || has('usuarios')) {
    items.push({ id: 'users', label: LABELS.usuarios, group: 'admin', icon: 'users' })
  }

  return items
})

const generalItems = computed(() => navigationItems.value.filter(i => i.group === 'general'))
const operacionItems = computed(() => navigationItems.value.filter(i => i.group === 'operacion'))
const gestionItems = computed(() => navigationItems.value.filter(i => i.group === 'gestion'))
const adminItems = computed(() => navigationItems.value.filter(i => i.group === 'admin'))

function selectModule(id: string) {
  emit('navigate', id)
}
</script>

<template>
  <aside class="ryn-sidebar" data-testid="modular-sidebar">
    <div class="ryn-brand">
      <img :src="'/assets/rym-logo.png'" alt="R&M Repuestos & Multiservicios" onerror="this.style.display='none'">
      <span>CONTROL DE FLOTA</span>
    </div>

    <nav aria-label="Navegación del portal">
      <small v-if="generalItems.length" class="ryn-nav-label">GENERAL</small>
      <button
        v-for="item in generalItems"
        :key="item.id"
        :class="{ active: activeModule === item.id }"
        :data-m="item.id"
        type="button"
        @click="selectModule(item.id)"
      >
        <i aria-hidden="true">⌂</i>
        <span>{{ item.label }}</span>
      </button>

      <small v-if="operacionItems.length" class="ryn-nav-label">OPERACIÓN</small>
      <button
        v-for="item in operacionItems"
        :key="item.id"
        :class="{ active: activeModule === item.id }"
        :data-m="item.id"
        type="button"
        @click="selectModule(item.id)"
      >
        <i :class="`icon-${item.id}`" aria-hidden="true">
          <ModuleIcon :name="item.icon || item.id" />
        </i>
        <span>{{ item.label }}</span>
      </button>

      <small v-if="gestionItems.length" class="ryn-nav-label">GESTIÓN Y FLOTA</small>
      <button
        v-for="item in gestionItems"
        :key="item.id"
        :class="{ active: activeModule === item.id }"
        :data-m="item.id"
        type="button"
        @click="selectModule(item.id)"
      >
        <i :class="`icon-${item.id}`" aria-hidden="true">
          <ModuleIcon :name="item.icon || item.id" />
        </i>
        <span>{{ item.label }}</span>
      </button>

      <small v-if="adminItems.length" class="ryn-nav-label admin-label">ADMINISTRACIÓN</small>
      <button
        v-for="item in adminItems"
        :key="item.id"
        :class="{ active: activeModule === item.id }"
        :data-m="item.id"
        type="button"
        @click="selectModule(item.id)"
      >
        <i :class="`icon-${item.id}`" aria-hidden="true">
          <ModuleIcon :name="item.icon || item.id" />
        </i>
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="ryn-user">
      <div class="ryn-user-id">
        <span class="ryn-user-avatar">{{ initials }}</span>
        <div>
          <b>{{ name }}</b>
          <span>{{ role }}{{ galera ? ` · ${galera}` : '' }}</span>
        </div>
      </div>
      <small class="ryn-online"><i></i>En línea</small>
      <button type="button" class="ryn-logout-btn" @click="emit('logout')">
        Cerrar sesión <span aria-hidden="true">→</span>
      </button>
    </div>
  </aside>
</template>
