<script setup lang="ts">
import { computed } from 'vue'
import '../home.css'
import { canOpen } from '../dashboard'
import type { DashboardState } from '../dashboard'
import type { ModuleAction } from '../types'

const props = defineProps<{ state: DashboardState; actions: ModuleAction; hasModule: (code: string) => boolean }>()
const summary = computed(() => props.state.summary)
const profile = computed(() => props.state.session.profile)
const name = computed(() => String(profile.value.nombre || profile.value.email || 'Usuario').trim())
const first = computed(() => name.value.split(/\s+/)[0] || 'Usuario')
const initials = computed(() => name.value.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase())
const role = computed(() => String(profile.value.rol || '').toUpperCase())
const galera = computed(() => String(profile.value.galera || summary.value?.panapass?.rank?.galera || ''))
const allowedGps = computed(() => canOpen(props.state.session, 'gps', props.hasModule))
const allowedUsers = computed(() => canOpen(props.state.session, 'users', props.hasModule))
const canQuickValidator = computed(() => ['ADMIN_TOTAL', 'GERENTE_GALERA', 'ADMIN', 'SUPERVISORA'].includes(role.value))
const greeting = (() => {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Panama', hour: '2-digit', hourCycle: 'h23' }).format(new Date()))
  return hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
})()
const updated = computed(() => {
  const value = summary.value?.generated_at
  if (!value) return 'Actualizando resumen…'
  try { return new Intl.DateTimeFormat('es-PA', { timeZone: 'America/Panama', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) } catch { return value }
})
const formatMoney = (value: unknown) => `B/. ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
type CardMetric = { label: string; value: string | number }
type PortalCard = { key: string; title: string; icon: string; badge: string; description: string; metrics: CardMetric[]; action: keyof ModuleAction }
const cards = computed<PortalCard[]>(() => {
  const data = summary.value
  if (!data) return []
  const result: PortalCard[] = []
  const pan = data.panapass
  const rev = data.revisados
  const control = data.control
  if (pan) result.push({ key: 'panapass', title: 'PANAPASS', icon: '▤', badge: pan.rank ? `#${pan.rank.posicion_galera} · ${pan.rank.galera}` : 'Operativo', description: 'Cobros, negativos, pagos, historial y operación ENA.', metrics: [
    { label: 'Negativos hoy', value: pan.negativos_hoy ?? '—' }, { label: 'Pagos hoy', value: pan.pagos_hoy ?? '—' }, { label: 'Pagado mes', value: formatMoney(pan.monto_mes) },
  ], action: 'panapass' })
  if (rev) result.push({ key: 'revisados', title: 'REVISADOS', icon: '☑', badge: Number(rev.pendientes || 0) ? `${rev.pendientes} pendientes` : 'Al día', description: 'Vencimientos, operación ATTT, historial y avance del mes.', metrics: [
    { label: 'Pendientes', value: rev.pendientes ?? '—' }, { label: 'Emitidos hoy', value: `${rev.emitidos_hoy ?? 0}/${rev.limite_hoy ?? 0}` },
  ], action: 'revisados' })
  if (control) {
    const totals = props.state.controlIndicators?.totals
    result.push({ key: 'control', title: 'CONTROL DE AUTO', icon: '♧', badge: 'Revisar flota', description: 'Maestra de flota, eCarCheck, cupos, auditoría y trazabilidad.', metrics: [
      { label: 'Unidades activas', value: totals?.activas ?? control.activas ?? '—' }, { label: 'Unidades paradas', value: totals?.paradas ?? control.otros ?? '—' }, { label: 'Abono adicional', value: totals?.abono_adicional ?? '—' },
    ], action: 'control' })
  }
  if (allowedGps.value) {
    const gps = props.state.gpsIndicators?.kpis
    result.push({ key: 'gps', title: 'GPS', icon: '⌖', badge: role.value === 'ADMIN_TOTAL' ? 'ADMIN TOTAL' : 'Monitoreo', description: 'GPS1/GPS2, prioridades, ranking y ubicación según tu perfil.', metrics: [
      { label: 'Críticas', value: gps?.criticos ?? '—' }, { label: 'Alertas', value: gps?.alertas ?? '—' }, { label: 'Pendientes hoy', value: gps?.pending ?? '—' },
    ], action: 'gps' })
  }
  return result
})
function open(action?: keyof ModuleAction) { if (action) props.actions[action]?.() }
</script>

<template>
  <main class="ryn-shell rym-vue-home" data-testid="vue-next-home">
    <aside class="ryn-sidebar">
      <div class="ryn-brand"><img :src="'/assets/rym-logo.png'" alt="R&M Repuestos & Multiservicios"><span>CONTROL DE FLOTA</span></div>
      <nav aria-label="Navegación del portal">
        <small class="ryn-nav-label">GENERAL</small>
        <button class="active" data-testid="nav-home"><i aria-hidden="true">⌂</i>Inicio</button>
        <small class="ryn-nav-label">OPERACIÓN</small>
        <button v-for="card in cards.filter(item => item.key !== 'gps')" :key="card.key" @click="open(card.action)">
          <i :class="`icon-${card.key}`" aria-hidden="true">
            <svg v-if="card.key === 'panapass'" viewBox="0 0 24 24"><rect x="6" y="5" width="13" height="16" rx="2"/><path d="M9 5.5V4a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v1.5M9 10h1.5M13 10h3M9 14h1.5M13 14h3M9 18h1.5M13 18h3"/></svg>
            <svg v-else-if="card.key === 'control'" viewBox="0 0 24 24"><path d="m4 15 1.1-4.2a2 2 0 0 1 1.9-1.5h9.8a2 2 0 0 1 1.9 1.5L20 15v3H4v-3Z"/><path d="m7 9.3 1.4-3h7.2l1.4 3M4 13h16M7 18v1.5M17 18v1.5"/><circle cx="7.5" cy="15.5" r=".7"/><circle cx="16.5" cy="15.5" r=".7"/></svg>
            <span v-else>{{ card.icon }}</span>
          </i>
          {{ card.title === 'CONTROL DE AUTO' ? 'Auto' : card.title.charAt(0) + card.title.slice(1).toLowerCase() }}
        </button>
        <button v-if="allowedGps" @click="open('gps')"><i class="icon-gps" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></i>GPS</button>
        <small v-if="allowedUsers" class="ryn-nav-label admin-label">ADMINISTRACIÓN</small>
        <button v-if="allowedUsers" @click="open('users')"><i class="icon-users" aria-hidden="true">♙</i>Usuarios</button>
      </nav>
      <div class="ryn-user"><div class="ryn-user-id"><span class="ryn-user-avatar">{{ initials }}</span><div><b>{{ name }}</b><span>{{ role }}{{ galera ? ` · ${galera}` : '' }}</span></div></div><small class="ryn-online"><i></i>En línea</small><button type="button" @click="open('logout')">Cerrar sesión <span aria-hidden="true">→</span></button></div>
    </aside>
    <section class="ryn-workspace">
      <header class="ryn-topbar">
        <strong>Centro de Control RYM</strong>
        <div class="ryn-top-actions">
          <div class="ryn-updated"><span><small>Actualizado</small><strong>{{ updated }}</strong></span></div>
          <div class="ryn-top-user"><span class="ryn-top-avatar">{{ initials }}</span><span class="ryn-top-user-copy"><b>{{ name }}</b><small>{{ role }}</small></span></div>
          <button type="button" class="ryn-logout-icon" aria-label="Cerrar sesión" title="Cerrar sesión" @click="open('logout')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></svg></button>
        </div>
      </header>
      <section class="ryn-main">
        <header class="ryn-page-heading"><div><h1>¡{{ greeting }}, {{ first }}! <span aria-hidden="true">👋</span></h1><p>Así va tu operación hoy{{ galera ? ` · ${galera}` : '' }}</p></div></header>
        <section v-if="canQuickValidator" class="ryn-validator" aria-label="Validador de unidad">
          <div class="ryn-validator-heading"><span class="ryn-validator-icon" aria-hidden="true">⌕</span><div><h2>Validador de Unidad</h2><p>Busca una unidad, placa o Panapass</p></div></div>
          <div class="v101-validator-tools"><div class="v101-validator-box"><input id="v101ValidatorQ" class="v101-validator-input" placeholder="Buscar unidad, placa o Panapass" autocomplete="off"><div id="v101ValidatorList" class="v101-validator-list"></div></div><button id="v101ValidatorGo" class="v101-validator-go" type="button">Validar unidad</button></div>
        </section>
        <div v-if="state.state === 'error'" class="ryn-load-state error" role="alert"><b>No se pudo cargar el resumen.</b><span>{{ state.error }}</span><button @click="open('retry')">Reintentar</button></div>
        <div v-else-if="state.state === 'stale'" class="ryn-load-state stale" role="status">No se pudo actualizar el resumen. Se conservan los últimos datos válidos. {{ state.error }} <button @click="open('retry')">Reintentar</button></div>
        <div v-if="state.state === 'loading'" class="ryn-load-state" role="status">Cargando el resumen de tu alcance…</div>
        <section class="ryn-section-title"><div><h2>Tu operación por sistema</h2><p>Cada módulo muestra únicamente sus indicadores y acciones.</p></div></section>
        <section v-if="cards.length" class="ryn-modules">
          <article v-for="card in cards" :key="card.key" class="ryn-module" :class="card.key">
            <header><span class="ryn-module-icon">{{ card.icon }}</span><span class="ryn-badge">{{ card.badge }}</span></header>
            <h3>{{ card.title }}</h3><p>{{ card.description }}</p>
            <div class="ryn-module-metrics"><div v-for="metric in card.metrics" :key="metric.label"><span>{{ metric.label }}</span><b>{{ metric.value }}</b></div></div>
            <button class="ryn-open" @click="open(card.action)">{{ card.key === 'gps' ? 'Atender prioridades' : card.key === 'control' ? 'Ver flota' : card.key === 'revisados' ? 'Gestionar revisados' : 'Abrir Panapass' }} <span aria-hidden="true">→</span></button>
          </article>
        </section>
        <div v-else-if="state.state !== 'loading'" class="ryn-load-state">No tienes módulos habilitados para esta sesión.</div>
      </section>
    </section>
  </main>
</template>
