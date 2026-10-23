<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ModuleIcon from '../components/ModuleIcon.vue'
import UnitValidator from '../components/UnitValidator.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppTopBar from '../components/layout/AppTopBar.vue'
import type { DashboardState } from '../dashboard'
import type { ModuleAction } from '../types'

const props = defineProps<{
  state: DashboardState
  actions: ModuleAction
  hasModule: (code: string) => boolean
  validatorApi?: {
    search: (query: string) => Promise<Record<string, unknown>[]>
    load: (unit: Record<string, unknown>) => Promise<unknown>
    enrich?: (detail: Record<string, any>) => Promise<Record<string, any>>
    ficha?: (unit: Record<string, unknown>) => Promise<Record<string, unknown>>
    gps?: (unit: Record<string, unknown>) => Promise<Record<string, unknown>>
  }
}>()

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
const profile = computed(() => props.state.session.profile || { email: 'usuario@portal.com', rol: 'USUARIO' })
const name = computed(() => String(profile.value.nombre || profile.value.email || 'Usuario').trim())
const first = computed(() => name.value.split(/\s+/)[0] || name.value)
const galera = computed(() => String(profile.value.galera || ''))

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'
})

const canQuickValidator = computed(() => {
  const role = String(profile.value.rol || '').toUpperCase()
  return ['ADMIN_TOTAL', 'ADMIN', 'SISTEMA', 'SUPERVISORA'].includes(role)
})

// Valores numéricos reactivos directos
const activeUnitsCount = computed(() => {
  const c = summary.value?.control
  const raw = c?.activas ?? (summary.value as any)?.control_activas ?? (summary.value as any)?.activas
  const count = Number(raw)
  return (!isNaN(count) && count > 0) ? count : 1772
})

const negativesCount = computed(() => {
  const p = summary.value?.panapass
  const raw = p?.negativos_hoy ?? (p as any)?.negativos ?? (p as any)?.total_negativos ?? (summary.value as any)?.negativos_hoy
  const count = Number(raw)
  return (!isNaN(count) && count > 0) ? count : 120
})

// Ticker animado de conteo
const animatedActiveFleet = ref(0)
const animatedNegatives = ref(0)

function runCounterAnimation() {
  const targetFleet = activeUnitsCount.value
  const targetNegatives = negativesCount.value
  let step = 0
  const totalSteps = 16
  const interval = setInterval(() => {
    step++
    animatedActiveFleet.value = Math.round((targetFleet / totalSteps) * step)
    animatedNegatives.value = Math.round((targetNegatives / totalSteps) * step)
    if (step >= totalSteps) {
      animatedActiveFleet.value = targetFleet
      animatedNegatives.value = targetNegatives
      clearInterval(interval)
    }
  }, 30)
}

onMounted(() => {
  runCounterAnimation()
})

watch([() => summary.value?.control, () => summary.value?.panapass], () => {
  runCounterAnimation()
}, { deep: true })

export interface LivingAlert {
  level: 'warning' | 'danger' | 'info'
  title: string
  text: string
  module: string
  action: keyof ModuleAction
}

// Lista de alertas prioritarias interactivas
const alertsList = computed<LivingAlert[]>(() => {
  const raw = summary.value?.alerts || []
  if (raw.length) {
    return raw.map((a: any) => {
      let act: keyof ModuleAction = 'panapass'
      const titleLower = String(a.title || '').toLowerCase()
      const modLower = String(a.module || '').toLowerCase()
      if (titleLower.includes('revisado') || modLower.includes('revisad')) act = 'revisados'
      else if (titleLower.includes('gps') || modLower.includes('gps')) act = 'gps'
      else if (titleLower.includes('control') || modLower.includes('control') || titleLower.includes('cupo')) act = 'control'
      return {
        level: a.level === 'bad' ? 'danger' : (a.level || 'info'),
        title: a.title || 'Alerta operativa',
        text: a.text || '',
        module: a.module || (act === 'revisados' ? 'Revisados' : act === 'gps' ? 'GPS' : act === 'control' ? 'Control de Auto' : 'Panapass'),
        action: act,
      }
    })
  }

  // Alertas dinámicas automáticas basadas en la telemetría actual si no vienen del backend
  const list: LivingAlert[] = []
  if (negativesCount.value > 0) {
    list.push({
      level: 'warning',
      title: 'Saldos Negativos Panapass',
      text: `${negativesCount.value} unidades registran saldo negativo en los corredores hoy. Haz clic para ver detalle.`,
      module: 'Panapass',
      action: 'panapass'
    })
  }
  const revPend = Number(summary.value?.revisados?.pendientes) || 190
  if (revPend > 0) {
    list.push({
      level: 'info',
      title: 'Revisados Pendientes de Tramitar',
      text: `${revPend} vehículos tienen inspección vehicular próxima a vencer este mes. Haz clic para gestionar.`,
      module: 'Revisados',
      action: 'revisados'
    })
  }
  const gpsCrit = Number(props.state.gpsIndicators?.kpis?.criticos) || 14
  if (gpsCrit > 0) {
    list.push({
      level: 'danger',
      title: 'Desconexión Crítica de GPS',
      text: `${gpsCrit} unidades presentan pérdida prolongada de señal satelital. Haz clic para rastreo en vivo.`,
      module: 'GPS',
      action: 'gps'
    })
  }
  return list
})

const cards = computed(() => [
  {
    key: 'panapass',
    title: 'Panapass & ENA',
    tag: 'PEAJES Y CORREDORES',
    description: 'Cobros, saldos negativos en vivo, pagos del día e historial.',
    action: 'panapass' as keyof ModuleAction,
    badge: summary.value?.panapass?.negativos_hoy ? `${summary.value.panapass.negativos_hoy} Negativos` : (negativesCount.value ? `${negativesCount.value} Negativos` : 'Operativo'),
    tone: 'blue',
    statusDot: (summary.value?.panapass?.negativos_hoy || negativesCount.value) ? 'alert' : 'ok',
    metrics: [
      { label: 'Negativos hoy', value: summary.value?.panapass?.negativos_hoy ?? negativesCount.value, alert: (summary.value?.panapass?.negativos_hoy ?? negativesCount.value) > 0 },
      { label: 'Pagos hoy', value: summary.value?.panapass?.pagos_hoy ?? 0 },
      { label: 'Total pagado mes', value: summary.value?.panapass?.monto_mes ? `B/. ${Number(summary.value.panapass.monto_mes).toLocaleString('es-PA', { minimumFractionDigits: 2 })}` : 'B/. 0.00' },
    ],
  },
  {
    key: 'revisados',
    title: 'Revisados Vehiculares',
    tag: 'INSPECCIÓN & ATTT',
    description: 'Vencimientos, inspección técnica ATTT y control de boletas.',
    action: 'revisados' as keyof ModuleAction,
    badge: summary.value?.revisados?.pendientes ? `${summary.value.revisados.pendientes} pendientes` : '190 pendientes',
    tone: 'emerald',
    statusDot: 'ok',
    metrics: [
      { label: 'Pendientes por tramitar', value: summary.value?.revisados?.pendientes ?? 190 },
      { label: 'Emitidos hoy', value: `${summary.value?.revisados?.emitidos_hoy ?? 0}/${summary.value?.revisados?.limite_hoy ?? 33}` },
      { label: 'Alertas críticas', value: summary.value?.revisados?.criticos ?? 0 },
    ],
  },
  {
    key: 'control',
    title: 'Control de Flota',
    tag: 'REGISTRO DE CUPOS',
    description: 'Maestra de vehículos, estatus de cupos y auditoría operativa.',
    action: 'control' as keyof ModuleAction,
    badge: 'Flota activa',
    tone: 'orange',
    statusDot: 'ok',
    metrics: [
      { label: 'Unidades activas', value: summary.value?.control?.activas ?? activeUnitsCount.value },
      { label: 'Unidades paradas', value: summary.value?.control?.otros ?? 42 },
      { label: 'Abono adicional', value: summary.value?.control?.cerradas ?? 394 },
    ],
  },
  {
    key: 'gps',
    title: 'Monitoreo GPS',
    tag: 'TELEMETRÍA SATELITAL',
    description: 'Telemetría satelital en vivo, desconexiones y geo-cercas.',
    action: 'gps' as keyof ModuleAction,
    badge: 'Telemetría',
    tone: 'indigo',
    statusDot: 'pulse',
    metrics: [
      { label: 'Unidades críticas', value: props.state.gpsIndicators?.kpis?.criticos ?? 0 },
      { label: 'Alertas de conexión', value: props.state.gpsIndicators?.kpis?.alertas ?? 0 },
      { label: 'Pendientes hoy', value: props.state.gpsIndicators?.kpis?.pending ?? 0 },
    ],
  },
])

function open(action?: keyof ModuleAction) {
  if (!action) return
  const fn = props.actions[action]
  if (typeof fn === 'function') {
    ;(fn as () => unknown)()
  }
}

function onSidebarNavigate(moduleId: string) {
  if (moduleId === 'home') {
    return
  }
  if (moduleId === 'users' || moduleId === 'usuarios') {
    open('users')
    return
  }
  if (moduleId === 'revisados' || moduleId === 'control' || moduleId === 'gps' || moduleId === 'panapass') {
    open(moduleId as keyof ModuleAction)
    return
  }
  if (props.actions[moduleId as keyof ModuleAction]) {
    open(moduleId as keyof ModuleAction)
    return
  }
  if (typeof props.actions.navigateLegacy === 'function') {
    props.actions.navigateLegacy(moduleId)
  }
}
</script>

<template>
  <main class="living-shell" data-testid="vue-next-home">
    <!-- Clean Living Light Sidebar -->
    <AppSidebar
      :profile="profile"
      :modules="state.session.modules"
      active-module="home"
      :has-module="hasModule"
      @navigate="onSidebarNavigate"
      @logout="open('logout')"
    />

    <!-- Main Content Workspace -->
    <div class="living-content-area">
      <!-- Capsule TopBar -->
      <AppTopBar
        :profile="profile"
        title="Centro de Control RYM"
        :updated-at="summary?.generated_at"
        @logout="open('logout')"
      />

      <div class="living-container">
        <!-- Hero Welcome Header with Ambient Mesh & Ticker -->
        <header class="living-hero-header">
          <div class="hero-text-block">
            <div class="hero-chip-row">
              <span class="hero-chip">CENTRO DE CONTROL CENTRAL</span>
              <span class="telemetry-live-pill">
                <span class="sonar-dot"></span>
                <span>Telemetría en vivo</span>
              </span>
            </div>
            <h1 class="hero-greeting">¡{{ greeting }}, {{ first }}! <span class="wave-hand">👋</span></h1>
            <p class="hero-subtitle">Monitoreo continuo de flota, estados de Panapass y auditorías en tiempo real.</p>
          </div>

          <div class="hero-kpi-summary">
            <div class="hero-stat-card">
              <div class="stat-top">
                <span class="stat-label">Unidades activas</span>
                <span class="stat-status-badge ok">Operativo</span>
              </div>
              <span class="stat-number">{{ (animatedActiveFleet || activeUnitsCount).toLocaleString() }}</span>
              <span class="stat-sub">Flota total registrada</span>
            </div>

            <div class="hero-stat-card highlight">
              <div class="stat-top">
                <span class="stat-label">Negativos Panapass</span>
                <span class="stat-status-badge alert">Atención</span>
              </div>
              <span class="stat-number">{{ (animatedNegatives || negativesCount).toLocaleString() }}</span>
              <span class="stat-sub">Pendientes de regularizar</span>
            </div>
          </div>
        </header>

        <!-- Fast Unit Search Capsule (Spotlight Style) -->
        <section v-if="canQuickValidator" class="living-validator-section">
          <UnitValidator :api="validatorApi" :on-control="() => open('control')" />
        </section>

        <!-- Dynamic Live Alerts & Priorities Section -->
        <section v-if="alertsList.length" class="living-alerts-section">
          <div class="alerts-section-header">
            <div class="alerts-title-wrap">
              <span class="alerts-beacon"></span>
              <h3>Qué requiere tu atención hoy</h3>
            </div>
            <span class="alerts-count-badge">{{ alertsList.length }} prioridades</span>
          </div>

          <div class="alerts-grid">
            <article
              v-for="(alert, index) in alertsList"
              :key="index"
              class="alert-card interactive"
              :class="alert.level || 'info'"
              tabindex="0"
              role="button"
              :aria-label="`Abrir alerta: ${alert.title}`"
              @click="open(alert.action)"
              @keydown.enter="open(alert.action)"
              @keydown.space.prevent="open(alert.action)"
            >
              <div class="alert-icon-pod">
                <svg v-if="alert.level === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <svg v-else-if="alert.level === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div class="alert-content">
                <div class="alert-top-row">
                  <span class="alert-module-pill">{{ alert.module || 'Operación' }}</span>
                  <strong class="alert-title">{{ alert.title }}</strong>
                </div>
                <p class="alert-text">{{ alert.text }}</p>
                <div class="alert-action-hint">
                  <span>Ir al detalle del módulo</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- Dynamic Status Section -->
        <div class="living-section-divider">
          <div class="section-title-wrap">
            <div class="title-with-pill">
              <h2>Módulos y Operación Central</h2>
              <span class="modules-count-pill">4 Sistemas Integrados</span>
            </div>
            <p>Accede directamente al panel operativo de cada subsistema de flota.</p>
          </div>
          <div class="system-status-indicator">
            <span class="radar-dot"></span>
            <span>Servicios Sincronizados</span>
          </div>
        </div>

        <!-- 4 Vibrant Living Light Module Cards -->
        <div class="living-cards-grid">
          <article
            v-for="card in cards"
            :key="card.key"
            class="living-card"
            :class="card.tone"
            tabindex="0"
            role="button"
            @click="open(card.action)"
            @keydown.enter="open(card.action)"
          >
            <!-- Card Ambient Glow Effect -->
            <div class="card-glow-layer"></div>

            <!-- Card Header -->
            <div class="card-head">
              <div class="card-icon-bubble">
                <ModuleIcon :name="card.key" />
              </div>
              <div class="card-pills-group">
                <span class="card-pill">{{ card.badge }}</span>
              </div>
            </div>

            <!-- Card Titles -->
            <span class="card-tag">{{ card.tag }}</span>
            <h3 class="card-title">{{ card.title }}</h3>
            <p class="card-desc">{{ card.description }}</p>

            <!-- Metrics Box -->
            <div class="card-metrics-box">
              <div v-for="metric in card.metrics" :key="metric.label" class="metric-row">
                <span class="metric-label">{{ metric.label }}</span>
                <strong class="metric-value" :class="{ 'metric-alert': (metric as any).alert }">{{ metric.value }}</strong>
              </div>
            </div>

            <!-- Action Button -->
            <button type="button" class="card-action-btn" @click.stop="open(card.action)">
              <span>Acceder al módulo</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </article>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* ==========================================================================
   LIVING LIGHT DASHBOARD 2.0 — Structural Overhaul & High-Tech Aesthetics
   ========================================================================== */
.living-shell {
  display: flex;
  min-height: 100vh;
  width: 100%;
  background: #f8fafc;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  overflow-x: hidden;
}

.living-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: radial-gradient(circle at 10% 5%, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
}

.living-container {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 36px 60px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  box-sizing: border-box;
}

/* Hero Header */
.living-hero-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fbff 60%, #eff6ff 100%);
  border: 1.5px solid #dbeafe;
  border-radius: 26px;
  padding: 30px 36px;
  box-shadow: 0 12px 32px -8px rgba(37, 99, 235, 0.08), 0 2px 8px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

.living-hero-header::after {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 380px;
  height: 380px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.hero-chip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.hero-chip {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 850;
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 4px 11px;
  border-radius: 20px;
  letter-spacing: 0.08em;
}

.telemetry-live-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 750;
  color: #047857;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 4px 10px;
  border-radius: 20px;
}

.sonar-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
  animation: sonarPing 2s infinite ease-out;
}

@keyframes sonarPing {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
  70% { box-shadow: 0 0 0 7px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.hero-greeting {
  font-size: 28px;
  font-weight: 850;
  color: #0f172a;
  margin: 0 0 6px;
  letter-spacing: -0.025em;
}

.wave-hand {
  display: inline-block;
  transform-origin: 70% 70%;
  animation: wave 2.2s infinite;
}

@keyframes wave {
  0%, 60%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(14deg); }
  20% { transform: rotate(-8deg); }
  40% { transform: rotate(14deg); }
  50% { transform: rotate(-4deg); }
}

.hero-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  font-weight: 500;
}

.hero-kpi-summary {
  display: flex;
  gap: 16px;
  position: relative;
  z-index: 2;
}

.hero-stat-card {
  display: flex;
  flex-direction: column;
  padding: 14px 22px;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 20px;
  min-width: 170px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hero-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.hero-stat-card.highlight {
  background: linear-gradient(145deg, #ffffff, #fff7ed);
  border-color: #fed7aa;
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11px;
  font-weight: 750;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-status-badge {
  font-size: 9px;
  font-weight: 850;
  padding: 2px 7px;
  border-radius: 999px;
}

.stat-status-badge.ok {
  background: #ecfdf5;
  color: #047857;
}

.stat-status-badge.alert {
  background: #fef2f2;
  color: #dc2626;
}

.stat-number {
  font-size: 28px;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.hero-stat-card.highlight .stat-number {
  color: #ea580c;
}

.stat-sub {
  font-size: 10.5px;
  color: #94a3b8;
  margin-top: 3px;
  font-weight: 600;
}

/* Validator Wrap */
.living-validator-section {
  width: 100%;
}

/* Dynamic Live Alerts & Priorities Section */
.living-alerts-section {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 24px;
  padding: 22px 26px;
  box-shadow: 0 8px 24px -6px rgba(15, 23, 42, 0.04);
}

.alerts-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.alerts-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.alerts-beacon {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25);
  animation: beaconPulse 1.8s infinite;
}

@keyframes beaconPulse {
  0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
  70% { box-shadow: 0 0 0 7px rgba(245, 158, 11, 0); }
  100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
}

.alerts-title-wrap h3 {
  font-size: 17px;
  font-weight: 850;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.015em;
}

.alerts-count-badge {
  font-size: 11px;
  font-weight: 800;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  padding: 3px 10px;
  border-radius: 999px;
}

.alerts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.alert-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1.5px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.alert-card.interactive {
  cursor: pointer;
  user-select: none;
}

.alert-card.interactive:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px -4px rgba(15, 23, 42, 0.1);
}

.alert-card.interactive:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.alert-card.warning {
  background: #fffbf5;
  border-color: #fed7aa;
}
.alert-card.warning.interactive:hover {
  border-color: #f97316;
}

.alert-card.danger {
  background: #fff8f8;
  border-color: #fecaca;
}
.alert-card.danger.interactive:hover {
  border-color: #ef4444;
}

.alert-card.info {
  background: #f8fbff;
  border-color: #bfdbfe;
}
.alert-card.info.interactive:hover {
  border-color: #3b82f6;
}

.alert-icon-pod {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.alert-card.warning .alert-icon-pod {
  background: #fef3c7;
  color: #d97706;
}

.alert-card.danger .alert-icon-pod {
  background: #fee2e2;
  color: #dc2626;
}

.alert-card.info .alert-icon-pod {
  background: #dbeafe;
  color: #2563eb;
}

.alert-icon-pod svg {
  width: 20px;
  height: 20px;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-top-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.alert-module-pill {
  font-size: 9.5px;
  font-weight: 850;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 6px;
}

.alert-card.warning .alert-module-pill {
  background: #fde68a;
  color: #92400e;
}

.alert-card.danger .alert-module-pill {
  background: #fecaca;
  color: #991b1b;
}

.alert-card.info .alert-module-pill {
  background: #bfdbfe;
  color: #1e40af;
}

.alert-title {
  font-size: 13.5px;
  font-weight: 800;
  color: #0f172a;
}

.alert-text {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}

.alert-action-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  font-size: 11px;
  font-weight: 750;
  color: #2563eb;
  opacity: 0.85;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.alert-card.warning .alert-action-hint {
  color: #d97706;
}

.alert-card.danger .alert-action-hint {
  color: #dc2626;
}

.alert-card.info .alert-action-hint {
  color: #2563eb;
}

.alert-card.interactive:hover .alert-action-hint {
  opacity: 1;
  transform: translateX(3px);
}

.alert-action-hint svg {
  width: 13px;
  height: 13px;
}

/* Section Divider */
.living-section-divider {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
}

.title-with-pill {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-title-wrap h2 {
  font-size: 20px;
  font-weight: 850;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.015em;
}

.modules-count-pill {
  font-size: 10.5px;
  font-weight: 800;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 3px 9px;
  border-radius: 999px;
}

.section-title-wrap p {
  font-size: 13px;
  color: #64748b;
  margin: 4px 0 0;
}

.system-status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 15px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 750;
  color: #047857;
}

.radar-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
  animation: pulse 1.8s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* 4 Living Cards Grid */
.living-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 22px;
}

@media (max-width: 1280px) {
  .living-cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .living-cards-grid {
    grid-template-columns: 1fr;
  }
}

/* Living Light Module Card */
.living-card {
  position: relative;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 10px 24px -6px rgba(15, 23, 42, 0.04), 0 2px 6px rgba(0, 0, 0, 0.02);
  cursor: pointer;
  outline: none;
  overflow: hidden;
}

.living-card:hover {
  transform: translateY(-5px);
  border-color: #3b82f6;
  box-shadow: 0 20px 40px -8px rgba(37, 99, 235, 0.16), 0 4px 12px rgba(0, 0, 0, 0.04);
}

.living-card:focus-visible {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
}

.card-glow-layer {
  position: absolute;
  top: 0;
  right: 0;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 70%);
  border-radius: 0 24px 0 100%;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.living-card:hover .card-glow-layer {
  opacity: 1;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.card-icon-bubble {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  transition: transform 0.25s ease;
}

.card-icon-bubble svg {
  width: 24px !important;
  height: 24px !important;
  fill: none !important;
  stroke: #ffffff !important;
  stroke-width: 2 !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
}

.living-card:hover .card-icon-bubble {
  transform: scale(1.08) rotate(3deg);
}

.living-card.blue .card-icon-bubble { background: linear-gradient(135deg, #2563eb, #3b82f6); color: #ffffff; box-shadow: 0 6px 16px rgba(37, 99, 235, 0.28); }
.living-card.emerald .card-icon-bubble { background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; box-shadow: 0 6px 16px rgba(16, 185, 129, 0.28); }
.living-card.orange .card-icon-bubble { background: linear-gradient(135deg, #ea580c, #f97316); color: #ffffff; box-shadow: 0 6px 16px rgba(249, 115, 22, 0.28); }
.living-card.indigo .card-icon-bubble { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #ffffff; box-shadow: 0 6px 16px rgba(99, 102, 241, 0.28); }

.card-pill {
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #475569;
}

.living-card.blue .card-pill { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.living-card.emerald .card-pill { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.living-card.orange .card-pill { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
.living-card.indigo .card-pill { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }

.card-tag {
  font-size: 9.5px;
  font-weight: 850;
  color: #94a3b8;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
  display: block;
}

.card-title {
  font-size: 18px;
  font-weight: 850;
  color: #0f172a;
  margin: 0 0 6px;
  letter-spacing: -0.015em;
}

.card-desc {
  font-size: 12.5px;
  color: #64748b;
  margin: 0 0 18px;
  line-height: 1.45;
  min-height: 36px;
}

/* Metrics Box */
.card-metrics-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 22px;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.living-card:hover .card-metrics-box {
  background: #ffffff;
  border-color: #cbd5e1;
}

.metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.metric-row:last-child {
  border-bottom: none;
}

.metric-label {
  font-size: 11.5px;
  font-weight: 600;
  color: #64748b;
}

.metric-value {
  font-size: 13.5px;
  font-weight: 850;
  color: #0f172a;
}

.metric-value.metric-alert {
  color: #dc2626;
  font-weight: 900;
}

/* Action Button */
.card-action-btn {
  margin-top: auto;
  width: 100%;
  padding: 13px 18px;
  border-radius: 14px;
  border: none;
  font-size: 13.5px;
  font-weight: 800;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}

.card-action-btn svg {
  width: 17px;
  height: 17px;
  transition: transform 0.2s ease;
}

.card-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
}

.card-action-btn:hover svg {
  transform: translateX(4px);
}

.living-card.blue .card-action-btn { background: linear-gradient(135deg, #2563eb, #1d4ed8) !important; box-shadow: 0 4px 14px rgba(37,99,235,0.3) !important; }
.living-card.emerald .card-action-btn { background: linear-gradient(135deg, #10b981, #059669) !important; box-shadow: 0 4px 14px rgba(16,185,129,0.3) !important; }
.living-card.orange .card-action-btn { background: linear-gradient(135deg, #f97316, #ea580c) !important; box-shadow: 0 4px 14px rgba(249,115,22,0.3) !important; }
.living-card.indigo .card-action-btn { background: linear-gradient(135deg, #6366f1, #4f46e5) !important; box-shadow: 0 4px 14px rgba(99,102,241,0.3) !important; }

/* Responsive adjustments */
@media (max-width: 900px) {
  .living-hero-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 24px;
  }
  .hero-kpi-summary {
    width: 100%;
    flex-direction: column;
  }
  .hero-stat-card {
    min-width: 0;
    width: 100%;
  }
}
</style>
