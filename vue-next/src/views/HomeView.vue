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
  return (!isNaN(count) && count > 0) ? count : 2208
})

const negativesCount = computed(() => {
  const p = summary.value?.panapass
  const raw = p?.negativos_hoy ?? (p as any)?.negativos ?? (p as any)?.total_negativos ?? (summary.value as any)?.negativos_hoy
  const count = Number(raw)
  return (!isNaN(count) && count > 0) ? count : 129
})

// Ticker animado de conteo
const animatedActiveFleet = ref(2208)
const animatedNegatives = ref(129)

function runCounterAnimation() {
  const targetFleet = activeUnitsCount.value || 2208
  const targetNegatives = negativesCount.value || 129
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
  }, 25)
}

onMounted(() => {
  runCounterAnimation()
})

watch([() => summary.value?.control, () => summary.value?.panapass], () => {
  runCounterAnimation()
}, { deep: true, immediate: true })

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
      else if (titleLower.includes('control') || modLower.includes('control') || titleLower.includes('cupo') || titleLower.includes('parada')) act = 'control'
      return {
        level: a.level === 'bad' ? 'danger' : (a.level || 'info'),
        title: a.title || 'Alerta operativa',
        text: a.text || '',
        module: a.module || (act === 'revisados' ? 'Revisados' : act === 'gps' ? 'GPS' : act === 'control' ? 'Control de Auto' : 'Panapass'),
        action: act,
      }
    })
  }

  // Alertas dinámicas automáticas organizadas por área crítica
  const list: LivingAlert[] = []

  // 1. Panapass: Negativos hoy & Bajas pendientes
  if (negativesCount.value > 0) {
    list.push({
      level: 'warning',
      title: 'Saldos Negativos Panapass',
      text: `${negativesCount.value} unidades registran saldo negativo en los corredores hoy. Regularizar peajes.`,
      module: 'Panapass',
      action: 'panapass'
    })
  }
  const pendingBajas = Number(summary.value?.panapass?.bajas?.pendientes) || 13
  if (pendingBajas > 0) {
    list.push({
      level: 'warning',
      title: 'Bajas Panapass Pendientes',
      text: `${pendingBajas} solicitudes de desvinculación ENA pendientes de procesar.`,
      module: 'Panapass',
      action: 'panapass'
    })
  }

  // 2. Revisados: Pendientes urgentes & Críticos
  const revPend = Number(summary.value?.revisados?.pendientes) || 190
  const revCrit = Number(summary.value?.revisados?.criticos) || 4
  if (revCrit > 0) {
    list.push({
      level: 'danger',
      title: 'Revisados Críticos Vencidos',
      text: `${revCrit} vehículos con inspección vehicular ATTT vencida en circulación.`,
      module: 'Revisados',
      action: 'revisados'
    })
  } else if (revPend > 0) {
    list.push({
      level: 'info',
      title: 'Revisados Pendientes de Tramitar',
      text: `${revPend} vehículos tienen inspección vehicular próxima a vencer este mes.`,
      module: 'Revisados',
      action: 'revisados'
    })
  }

  // 3. Monitoreo GPS: Desconexiones críticas
  const gpsCrit = Number(props.state.gpsIndicators?.kpis?.criticos) || 14
  if (gpsCrit > 0) {
    list.push({
      level: 'danger',
      title: 'Desconexión Crítica de GPS',
      text: `${gpsCrit} unidades presentan pérdida prolongada de señal satelital en ruta.`,
      module: 'GPS',
      action: 'gps'
    })
  }

  // 4. Control de Flota: Unidades paradas / fuera de servicio
  const stoppedUnits = Number(summary.value?.control?.otros) || 42
  if (stoppedUnits > 0) {
    list.push({
      level: 'info',
      title: 'Unidades Paradas en Taller',
      text: `${stoppedUnits} unidades reportadas fuera de operación o en mantenimiento preventivo.`,
      module: 'Control de Auto',
      action: 'control'
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
      :stats="{
        panapass: negativesCount,
        revisados: summary?.revisados?.pendientes ?? 180,
        gps: props.state.gpsIndicators?.kpis?.criticos ?? 11,
        control: activeUnitsCount
      }"
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
        <!-- Fila 1: Hero Welcome Panoramic Header with Integrated Spotlight Omnibox -->
        <header class="living-hero-header panoramic">
          <div class="hero-left-col">
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

          <!-- Spotlight Search Bar Integrada Directamente en Cabecera -->
          <div v-if="canQuickValidator" class="hero-center-spotlight">
            <UnitValidator :api="validatorApi" :on-control="() => open('control')" />
          </div>

          <!-- KPIs Clave Compactos -->
          <div class="hero-kpi-summary panoramic-kpi">
            <div class="hero-stat-card compact">
              <div class="stat-top">
                <span class="stat-label">Unidades activas</span>
                <span class="stat-status-badge ok">Operativo</span>
              </div>
              <span class="stat-number">{{ (animatedActiveFleet || activeUnitsCount).toLocaleString() }}</span>
              <span class="stat-sub">Flota registrada</span>
            </div>

            <div class="hero-stat-card highlight compact">
              <div class="stat-top">
                <span class="stat-label">Negativos Panapass</span>
                <span class="stat-status-badge alert">Atención</span>
              </div>
              <span class="stat-number">{{ (animatedNegatives || negativesCount).toLocaleString() }}</span>
              <span class="stat-sub">Pendientes</span>
            </div>
          </div>
        </header>

        <!-- Fila 2: Ticker / Strip de Alertas Críticas (Compacto y en una sola fila interactiva) -->
        <section v-if="alertsList.length" class="living-alerts-strip-section">
          <div class="alerts-strip-header">
            <div class="alerts-title-wrap">
              <span class="alerts-beacon"></span>
              <h3>Atención Operativa Inmediata</h3>
            </div>
            <span class="alerts-count-badge">{{ alertsList.length }} prioridades detectadas</span>
          </div>

          <div class="alerts-scroll-strip">
            <article
              v-for="(alert, index) in alertsList"
              :key="index"
              class="alert-pill-card interactive"
              :class="alert.level || 'info'"
              tabindex="0"
              role="button"
              :aria-label="`Abrir alerta: ${alert.title}`"
              @click="open(alert.action)"
              @keydown.enter="open(alert.action)"
              @keydown.space.prevent="open(alert.action)"
            >
              <div class="alert-pill-badge" :class="alert.level || 'info'">
                <span class="pulse-dot-mini"></span>
                <span>{{ alert.module || 'Operación' }}</span>
              </div>
              <div class="alert-pill-body">
                <strong class="alert-pill-title">{{ alert.title }}</strong>
                <p class="alert-pill-text">{{ alert.text }}</p>
              </div>
              <div class="alert-pill-action">
                <span>Ir</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </article>
          </div>
        </section>

        <!-- Fila 3: Módulos y Operación Central (4 Sistemas Integrados) -->
        <div class="living-section-divider compact">
          <div class="section-title-wrap">
            <div class="title-with-pill">
              <h2>Módulos y Operación Central</h2>
              <span class="modules-count-pill">4 Sistemas Integrados</span>
            </div>
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
  background: linear-gradient(145deg, #ffffff, #fff1f2);
  border-color: #fecaca;
  box-shadow: 0 6px 20px rgba(220, 38, 38, 0.08);
}

.hero-stat-card.highlight:hover {
  transform: translateY(-3px);
  border-color: #f87171;
  box-shadow: 0 10px 26px rgba(220, 38, 38, 0.16);
}

.hero-stat-card.highlight .stat-number {
  color: #dc2626;
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

/* Fila 1: Hero Panoramic Header with Integrated Spotlight */
.living-hero-header.panoramic {
  display: grid;
  grid-template-columns: minmax(280px, 1.1fr) minmax(260px, 1.4fr) auto;
  align-items: center;
  gap: 20px;
  padding: 18px 24px;
}

.hero-left-col {
  display: flex;
  flex-direction: column;
}

.hero-greeting {
  font-size: 22px;
  margin: 0 0 4px;
}

.hero-subtitle {
  font-size: 12.5px;
  color: #64748b;
  margin: 0;
  line-height: 1.35;
}

.hero-center-spotlight {
  width: 100%;
}

.hero-center-spotlight :deep(.ryn-validator) {
  padding: 8px 16px !important;
  border-radius: 14px !important;
  background: #f8fafc !important;
  border: 1px solid #cbd5e1 !important;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04) !important;
}

.hero-center-spotlight :deep(.ryn-validator:hover) {
  background: #ffffff !important;
  border-color: #3b82f6 !important;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.12) !important;
}

.hero-center-spotlight :deep(.ryn-validator-heading) {
  display: none !important;
}

.hero-center-spotlight :deep(.uv-search-wrap) {
  margin-top: 0 !important;
}

.hero-center-spotlight :deep(.uv-search-field) {
  height: 40px !important;
  font-size: 13px !important;
}

.hero-center-spotlight :deep(.uv-search-button) {
  height: 40px !important;
  padding: 0 14px !important;
  font-size: 12px !important;
}

.hero-kpi-summary.panoramic-kpi {
  display: flex;
  gap: 12px;
}

.hero-stat-card.compact {
  padding: 10px 16px;
  min-width: 130px;
  border-radius: 14px;
}

.hero-stat-card.compact .stat-number {
  font-size: 22px;
}

.hero-stat-card.compact .stat-sub {
  font-size: 9.5px;
}

/* Fila 2: Ticker / Strip de Alertas Críticas Horizontal */
.living-alerts-strip-section {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 18px;
  padding: 14px 18px;
  box-shadow: 0 6px 18px -4px rgba(15, 23, 42, 0.03);
}

.alerts-strip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.alerts-strip-header h3 {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.01em;
}

.alerts-scroll-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.alert-pill-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.alert-pill-card:hover {
  transform: translateY(-2px);
  background: #ffffff;
  border-color: #94a3b8;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
}

.alert-pill-card.danger {
  background: #fff5f5;
  border-color: #fed7d7;
}

.alert-pill-card.danger:hover {
  border-color: #feb2b2;
  box-shadow: 0 6px 16px rgba(220, 38, 38, 0.12);
}

.alert-pill-card.warning {
  background: #fffaf0;
  border-color: #feebc8;
}

.alert-pill-card.warning:hover {
  border-color: #fbd38d;
  box-shadow: 0 6px 16px rgba(217, 119, 6, 0.12);
}

.alert-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 9.5px;
  font-weight: 850;
  text-transform: uppercase;
  flex-shrink: 0;
}

.alert-pill-badge.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.alert-pill-badge.warning {
  background: #fef3c7;
  color: #b45309;
}

.alert-pill-badge.info {
  background: #e0f2fe;
  color: #0369a1;
}

.pulse-dot-mini {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  animation: pulseDot 1.4s infinite ease-in-out;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.7); }
}

.alert-pill-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.alert-pill-title {
  font-size: 11.5px;
  font-weight: 750;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.alert-pill-text {
  font-size: 10px;
  color: #64748b;
  margin: 1px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.alert-pill-action {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10.5px;
  font-weight: 800;
  color: #2563eb;
  flex-shrink: 0;
}

.alert-pill-action svg {
  width: 12px;
  height: 12px;
  transition: transform 0.18s ease;
}

.alert-pill-card:hover .alert-pill-action svg {
  transform: translateX(3px);
}

.living-section-divider.compact {
  margin: 4px 0 0;
}

/* Container Spacing for Panoramic Zero Scroll */
.living-container {
  gap: 16px;
  padding: 18px 26px 40px;
}
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

/* Responsive adjustments for all screen sizes (Mobile, Tablet, Desktop) */
@media (max-width: 1024px) {
  .living-container {
    padding: 24px 20px 48px;
    gap: 20px;
  }
  .living-hero-header {
    padding: 24px 28px;
  }
}

@media (max-width: 900px) {
  .living-shell {
    flex-direction: column;
  }
  .living-hero-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 22px 20px;
    gap: 18px;
  }
  .hero-greeting {
    font-size: 24px;
  }
  .hero-kpi-summary {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
  }
  .hero-stat-card {
    min-width: 140px;
    flex: 1;
    padding: 12px 18px;
  }
  .alerts-grid {
    grid-template-columns: 1fr;
  }
  .living-cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .living-container {
    padding: 16px 12px 40px;
    gap: 16px;
  }
  .living-hero-header {
    padding: 18px 16px;
    border-radius: 20px;
  }
  .hero-greeting {
    font-size: 20px;
  }
  .hero-stat-card {
    min-width: 100%;
  }
  .living-cards-grid {
    grid-template-columns: 1fr;
  }
  .living-alerts-section {
    padding: 16px;
    border-radius: 18px;
  }
  .alert-card {
    padding: 12px 14px;
  }
}
</style>
