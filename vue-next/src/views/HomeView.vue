<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import '../home.css'
import { canOpen } from '../dashboard'
import type { DashboardState } from '../dashboard'
import type { ModuleAction } from '../types'

const props = defineProps<{ state: DashboardState; actions: ModuleAction; hasModule: (code: string) => boolean }>()
let summaryTimer: number | undefined
watch(() => props.state.state, value => {
  window.clearTimeout(summaryTimer)
  summaryTimer = undefined
  if (value === 'loading') {
    summaryTimer = window.setTimeout(() => {
      if (props.state.state !== 'loading') return
      props.state.state = 'error'
      props.state.error = 'La consulta está tardando más de lo esperado. Puedes reintentar.'
    }, 12000)
  }
}, { immediate: true })
onUnmounted(() => window.clearTimeout(summaryTimer))
const summary = computed(() => props.state.summary)
const profile = computed(() => props.state.session.profile)
const name = computed(() => String(profile.value.nombre || profile.value.email || 'Usuario').trim())
const first = computed(() => name.value.split(/\s+/)[0] || 'Usuario')
const initials = computed(() => name.value.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase())
const role = computed(() => String(profile.value.rol || '').toUpperCase())
const galera = computed(() => String(profile.value.galera || summary.value?.panapass?.rank?.galera || ''))
const startupModules = new Set(props.state.session.modules)
const startupSession = { profile: { ...props.state.session.profile }, modules: [...startupModules] }
const hasGrant = (...codes: string[]) => codes.some(code => startupModules.has(code) || props.hasModule(code))
const allowedGps = computed(() => canOpen(startupSession, 'gps', props.hasModule))
const allowedUsers = computed(() => canOpen(startupSession, 'users', props.hasModule))
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
  if (!data) {
    const badge = props.state.state === 'loading' ? 'Cargando' : 'Sin datos'
    const result: PortalCard[] = []
    if (hasGrant('portal.panapass', 'dashboard', 'negativos_hoy', 'pagos_hoy', 'ranking')) result.push({ key: 'panapass', title: 'PANAPASS', icon: '▤', badge, description: 'Cobros, negativos, pagos, historial y operación ENA.', metrics: [{ label: 'Negativos hoy', value: '…' }, { label: 'Pagos hoy', value: '…' }, { label: 'Pagado mes', value: '…' }], action: 'panapass' })
    if (hasGrant('portal.revisados')) result.push({ key: 'revisados', title: 'REVISADOS', icon: '☑', badge, description: 'Vencimientos, operación ATTT, historial y avance del mes.', metrics: [{ label: 'Pendientes', value: '…' }, { label: 'Emitidos hoy', value: '…' }], action: 'revisados' })
    if (hasGrant('portal.control_auto', 'control_auto.unidades')) result.push({ key: 'control', title: 'CONTROL DE AUTO', icon: '♧', badge, description: 'Maestra de flota, eCarCheck, cupos, auditoría y trazabilidad.', metrics: [{ label: 'Unidades activas', value: '…' }, { label: 'Unidades paradas', value: '…' }, { label: 'Abono adicional', value: '…' }], action: 'control' })
    if (allowedGps.value) result.push({ key: 'gps', title: 'GPS', icon: '⌖', badge, description: 'GPS1/GPS2, prioridades, ranking y ubicación según tu perfil.', metrics: [{ label: 'Críticas', value: '…' }, { label: 'Alertas', value: '…' }, { label: 'Pendientes hoy', value: '…' }], action: 'gps' })
    return result
  }
  const result: PortalCard[] = []
  const pan = data.panapass
  const rev = data.revisados
  const control = data.control
  if (hasGrant('portal.panapass', 'dashboard', 'negativos_hoy', 'pagos_hoy', 'ranking')) result.push({ key: 'panapass', title: 'PANAPASS', icon: '▤', badge: pan?.rank ? `#${pan.rank.posicion_galera} · ${pan.rank.galera}` : pan ? 'Operativo' : props.state.state === 'loading' ? 'Cargando' : 'Sin datos', description: 'Cobros, negativos, pagos, historial y operación ENA.', metrics: [
    { label: 'Negativos hoy', value: pan?.negativos_hoy ?? '—' }, { label: 'Pagos hoy', value: pan?.pagos_hoy ?? '—' }, { label: 'Pagado mes', value: pan ? formatMoney(pan.monto_mes) : '—' },
  ], action: 'panapass' })
  if (hasGrant('portal.revisados')) result.push({ key: 'revisados', title: 'REVISADOS', icon: '☑', badge: rev ? Number(rev.pendientes || 0) ? `${rev.pendientes} pendientes` : 'Al día' : props.state.state === 'loading' ? 'Cargando' : 'Sin datos', description: 'Vencimientos, operación ATTT, historial y avance del mes.', metrics: [
    { label: 'Pendientes', value: rev?.pendientes ?? '—' }, { label: 'Emitidos hoy', value: rev ? `${rev.emitidos_hoy ?? 0}/${rev.limite_hoy ?? 0}` : '—' },
  ], action: 'revisados' })
  if (hasGrant('portal.control_auto', 'control_auto.unidades')) {
    const totals = props.state.controlIndicators?.totals
    result.push({ key: 'control', title: 'CONTROL DE AUTO', icon: '♧', badge: control ? 'Revisar flota' : props.state.state === 'loading' ? 'Cargando' : 'Sin datos', description: 'Maestra de flota, eCarCheck, cupos, auditoría y trazabilidad.', metrics: [
      { label: 'Unidades activas', value: totals?.activas ?? control?.activas ?? '—' }, { label: 'Unidades paradas', value: totals?.paradas ?? control?.otros ?? '—' }, { label: 'Abono adicional', value: totals?.abono_adicional ?? '—' },
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
type Priority = { key: string; tone: 'critical' | 'warning' | 'good'; value: string; title: string; detail: string; action: keyof ModuleAction; actionLabel: string }
const priorities = computed<Priority[]>(() => {
  const data = summary.value
  if (!data) return []
  const result: Priority[] = []
  const pan = data.panapass
  const rev = data.revisados
  const control = data.control
  const makePriority = (key: string, tone: Priority['tone'], rawTitle: string, detail: string, action: keyof ModuleAction): Priority => {
    const match = rawTitle.match(/^(\d[\d,.]*)\s+(.+)$/)
    const actionLabel = action === 'revisados' ? 'Ir a Revisados' : action === 'panapass' ? 'Ir a Panapass' : action === 'control' ? 'Ver flota' : 'Abrir GPS'
    return { key, tone, value: match?.[1] || '', title: match?.[2] || rawTitle, detail, action, actionLabel }
  }
  if (Number(rev?.criticos) > 0) result.push(makePriority('rev-critical', 'critical', `${rev!.criticos} revisados críticos`, `${rev!.pendientes || 0} pendientes dentro de tu alcance`, 'revisados'))
  if (Number(pan?.bajas?.pendientes) > 0) result.push(makePriority('ena-pending', 'warning', `${pan!.bajas!.pendientes} bajas ENA pendientes`, `${pan!.bajas!.procesadas || 0} procesadas · ${pan!.bajas!.devoluciones || 0} devoluciones`, 'panapass'))
  for (const [index, alert] of (data.alerts || []).entries()) {
    const rawTitle = alert.title || 'Atención requerida'
    const normalizedTitle = rawTitle.toLocaleLowerCase().replace(/^\d[\d,.]*\s+/, '').trim()
    if (result.some(item => item.title.toLocaleLowerCase() === normalizedTitle)) continue
    const module = String(alert.module || '').toLowerCase()
    const action: keyof ModuleAction = module.includes('gps') ? 'gps' : module.includes('revis') ? 'revisados' : module.includes('control') || module.includes('auto') ? 'control' : 'panapass'
    const level = String(alert.level || '').toLowerCase()
    const text = `${rawTitle} ${alert.text || ''}`.toLocaleLowerCase()
    const isMissingPanapass = text.includes('sin panapass') || text.includes('panapass asignado')
    const tone = isMissingPanapass ? 'warning' : ['bad', 'critical', 'critico', 'crítica'].includes(level) ? 'critical' : 'warning'
    result.push(makePriority(`system-alert-${index}`, tone, rawTitle, alert.text || alert.module || 'Revisar alerta', action))
  }
  if (!result.length && control) result.push(makePriority('all-clear', 'good', 'Operación sin prioridades críticas', `${control.activas || 0} unidades activas dentro de tu alcance`, 'control'))
  return result.slice(0, 3)
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
          <div class="ryn-validator-heading"><span class="ryn-validator-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2M8.5 10.8h4.6M10.8 8.5v4.6"/></svg></span><div><span class="ryn-validator-kicker">BÚSQUEDA RÁPIDA</span><h2>Validador de unidad</h2><p>Unidad, placa o Panapass</p></div></div>
          <div class="v101-validator-tools"><div class="v101-validator-box"><input id="v101ValidatorQ" class="v101-validator-input" placeholder="Escribe un número de unidad, placa o Panapass" autocomplete="off"><div id="v101ValidatorList" class="v101-validator-list"></div></div><button id="v101ValidatorGo" class="v101-validator-go" type="button">Buscar unidad <span aria-hidden="true">→</span></button></div>
        </section>
        <div v-if="state.state === 'error'" class="ryn-load-state error" role="alert"><b>No se pudo cargar el resumen.</b><span>{{ state.error }}</span><button @click="open('retry')">Reintentar</button></div>
        <div v-else-if="state.state === 'stale'" class="ryn-load-state stale" role="status">No se pudo actualizar el resumen. Se conservan los últimos datos válidos. {{ state.error }} <button @click="open('retry')">Reintentar</button></div>
        <div v-if="state.state === 'loading'" class="ryn-load-state" role="status">Cargando el resumen de tu alcance…</div>
        <section v-if="priorities.length" class="ryn-priorities" aria-labelledby="ryn-priorities-title">
          <header class="ryn-priorities-heading"><div><span class="ryn-kicker">CENTRO DE ATENCIÓN</span><h2 id="ryn-priorities-title">Atención prioritaria</h2><p>Excepciones que requieren una acción en tu operación.</p></div><span class="ryn-priority-count">{{ priorities.every(item => item.tone === 'good') ? 'Todo en orden' : `${priorities.filter(item => item.tone !== 'good').length} ${priorities.filter(item => item.tone !== 'good').length === 1 ? 'alerta' : 'alertas'}` }}</span></header>
          <div class="ryn-priority-grid">
            <button v-for="item in priorities" :key="item.key" type="button" class="ryn-priority-card" :class="item.tone" @click="open(item.action)">
              <span v-if="item.value" class="ryn-priority-value">{{ item.value }}</span><span v-else class="ryn-priority-mark" aria-hidden="true">{{ item.tone === 'good' ? '✓' : '!' }}</span><span class="ryn-priority-copy"><span class="ryn-priority-level">{{ item.tone === 'critical' ? 'CRÍTICO' : item.tone === 'good' ? 'AL DÍA' : 'ATENCIÓN' }}</span><b>{{ item.title }}</b><small>{{ item.detail }}</small></span><span class="ryn-priority-action">{{ item.actionLabel }} <b aria-hidden="true">→</b></span>
            </button>
          </div>
        </section>
        <section class="ryn-section-title"><div><h2>Tu operación por sistema</h2><p>Cada módulo muestra únicamente sus indicadores y acciones.</p></div></section>
        <section v-if="cards.length" class="ryn-modules">
          <article v-for="card in cards" :key="card.key" class="ryn-module" :class="[card.key, { 'is-loading': state.state === 'loading' }]">
            <header><span class="ryn-module-icon">{{ card.icon }}</span><span class="ryn-badge">{{ card.badge }}</span></header>
            <h3>{{ card.title }}</h3><p>{{ card.description }}</p>
            <div class="ryn-module-metrics"><div v-for="metric in card.metrics" :key="metric.label"><span>{{ metric.label }}</span><b>{{ metric.value }}</b></div></div>
            <button class="ryn-open" @click="open(card.action)">{{ card.key === 'gps' ? 'Atender prioridades' : card.key === 'control' ? 'Ver flota' : card.key === 'revisados' ? 'Gestionar revisados' : 'Abrir Panapass' }} <span aria-hidden="true">→</span></button>
          </article>
        </section>
        <div v-else-if="state.state !== 'loading' && state.state !== 'error'" class="ryn-load-state">No tienes módulos habilitados para esta sesión.</div>
      </section>
    </section>
  </main>
</template>
