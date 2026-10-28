<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import ModuleIcon from '../components/ModuleIcon.vue'
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
      props.state.error = 'La consulta principal está tardando más de lo esperado. Puedes reintentar.'
    }, 12000)
  }
}, { immediate: true })

onUnmounted(() => window.clearTimeout(summaryTimer))

const summary = computed(() => props.state.summary)
const profile = computed(() => props.state.session.profile || { email: 'usuario@portal.com', rol: 'USUARIO' })

// Estados de confirmación de fuentes de datos (Fase 1: no inventar ceros ni tratar errores como ausencia de incidencias)
const isSummaryReady = computed(() => props.state.state === 'ready' && !!summary.value)
const isSummaryError = computed(() => props.state.state === 'error')
const isControlReady = computed(() => props.state.controlState === 'ready' && !!props.state.controlIndicators?.totals)
const isControlError = computed(() => props.state.controlState === 'error')
const isGpsReady = computed(() => props.state.gpsState === 'ready' && !!props.state.gpsIndicators?.kpis)
const isGpsError = computed(() => props.state.gpsState === 'error')

// Permisos de navegación y visibilidad de módulos
const canPanapass = computed(() => props.hasModule('portal.panapass') || ['dashboard','negativos_hoy','pagos_hoy','ranking','historial','operaciones'].some(m => props.state.session.modules.includes(m)))
const canRevisados = computed(() => props.hasModule('portal.revisados') || props.state.session.modules.includes('portal.revisados') || ['ADMIN_TOTAL','ADMIN','SUPERVISORA','GERENTE_GALERA'].includes(String(profile.value.rol || '').toUpperCase()))
const canControl = computed(() => props.hasModule('portal.control_auto') || props.hasModule('control_auto.unidades') || ['ADMIN_TOTAL','ADMIN','SUPERVISORA'].includes(String(profile.value.rol || '').toUpperCase()))
const canGps = computed(() => props.hasModule('portal.gps') || props.hasModule('gps.dashboard') || ['ADMIN_TOTAL','ADMIN','SUPERVISORA','GERENTE_GALERA'].includes(String(profile.value.rol || '').toUpperCase()))

// Estado global de incidencias de conexión
const hasDataQueryError = computed(() => {
  if (isSummaryError.value) return true
  if (canControl.value && isControlError.value) return true
  if (canGps.value && isGpsError.value) return true
  return false
})

const dataErrorSummaryText = computed(() => {
  const parts: string[] = []
  if (isSummaryError.value) parts.push('Resumen Central')
  if (canControl.value && isControlError.value) parts.push('Control de Auto')
  if (canGps.value && isGpsError.value) parts.push('Telemetría GPS')
  return parts.length
    ? `No se pudo confirmar información en vivo de: ${parts.join(', ')}. No se asumen valores en cero.`
    : ''
})

// =========================================================================
// FASE 1 & FASE 2 · AUDITORÍA DE PANAPASS (AM/PM, Pagos Ejecutados, Sin Activo y Bajas Pendientes)
// =========================================================================
const panapassScenario = computed<'AM_CUT' | 'PM_COMPLETED' | 'PM_PENDING' | 'UNCONFIRMED'>(() => {
  const audit = props.state.panapassAudit
  if (audit?.loaded && audit.scenario) return audit.scenario
  if (!isSummaryReady.value) return 'UNCONFIRMED'
  const pagos = Number(summary.value?.panapass?.pagos_hoy ?? 0)
  const neg = summary.value?.panapass?.negativos_hoy
  if (neg === null || neg === undefined) return 'UNCONFIRMED'
  return pagos > 0 ? 'PM_COMPLETED' : 'AM_CUT'
})

const panapassNegativosCorte = computed<number | null>(() => {
  const audit = props.state.panapassAudit
  if (audit?.loaded && typeof audit.negativosDetectados === 'number') {
    return audit.negativosDetectados
  }
  if (!isSummaryReady.value) return null
  const raw = summary.value?.panapass?.negativos_hoy
  if (raw === null || raw === undefined) return null
  const val = Number(raw)
  return (!isNaN(val) && val >= 0) ? val : null
})

const panapassPagosHoy = computed<number | null>(() => {
  const audit = props.state.panapassAudit
  if (!isSummaryReady.value && !audit?.loaded) return null
  if (audit?.loaded && typeof audit.pagosEjecutadosHoy === 'number') {
    return Math.max(Number(summary.value?.panapass?.pagos_hoy ?? 0), audit.pagosEjecutadosHoy)
  }
  const summaryPagos = Number(summary.value?.panapass?.pagos_hoy ?? 0)
  const auditPagos = Math.max(Number(audit?.pagosArchivadosHoy ?? 0), Number(audit?.pagosPreparadosHoy ?? 0))
  return Math.max(summaryPagos, auditPagos)
})

const panapassNegativosPendientesReales = computed<number | null>(() => {
  const audit = props.state.panapassAudit
  if (audit?.loaded) {
    if (audit.scenario === 'UNCONFIRMED') return null
    if (typeof audit.negativosPendientesReales === 'number' && audit.negativosPendientesReales >= 0) {
      return audit.negativosPendientesReales
    }
  }
  if (!isSummaryReady.value) return null
  // FASE 2: Nunca hacer 121 - 4 = 117. Si solo tenemos el resumen inicial, el corte AM no implica que todos sigan pendientes en PM.
  return 0
})

const panapassEstadoGestionLabel = computed<string>(() => {
  const audit = props.state.panapassAudit
  if (audit?.loaded && audit.estadoGestionLabel) return audit.estadoGestionLabel
  if (panapassScenario.value === 'UNCONFIRMED') return 'Pendiente de actualización'
  if (panapassScenario.value === 'PM_COMPLETED') return 'Gestión PM completada'
  if (panapassScenario.value === 'PM_PENDING') return `${panapassNegativosPendientesReales.value ?? 0} pendientes PM`
  return 'Corte AM en seguimiento'
})

const panapassUltimaConsultaLabel = computed<string>(() => {
  const raw = props.state.panapassAudit?.ultimaConsultaAt || summary.value?.generated_at
  if (!raw) return 'Sin registro reciente'
  try {
    const dt = new Date(raw)
    if (isNaN(dt.getTime())) return String(raw)
    return new Intl.DateTimeFormat('es-PA', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Panama'
    }).format(dt)
  } catch {
    return String(raw)
  }
})

// ALERTA 1: PANAPASS: Unidades operativas sin Panapass activo
const panapassSinActivo = computed<number | null>(() => {
  const audit = props.state.panapassAudit
  if (audit?.loaded && typeof audit.sinPanapassActivo === 'number' && audit.sinPanapassActivo >= 0) {
    return audit.sinPanapassActivo
  }
  if (!isSummaryReady.value) return null
  const p = summary.value?.panapass as Record<string, any> | undefined
  const c = summary.value?.control as Record<string, any> | undefined
  const s = summary.value as Record<string, any> | undefined

  const direct =
    p?.bajas?.alertas ??
    p?.bajas?.sin_panapass ??
    p?.sin_panapass ??
    s?.control_sin_panapass ??
    c?.sin_panapass

  if (direct !== null && direct !== undefined && !isNaN(Number(direct))) {
    return Math.max(0, Number(direct))
  }

  if (Array.isArray(summary.value?.alerts)) {
    for (const a of summary.value!.alerts!) {
      const txt = `${a.title || ''} ${a.text || ''}`
      const m = txt.match(/(\d+)\s+(?:unidades?\s+)?(?:activas?\s+)?sin\s+panapass/i)
      if (m) return Number(m[1])
    }
  }
  return 0
})

// ALERTA 2: PANAPASS: Bajas pendientes de gestión o confirmación (categoría independiente obligatoria)
const panapassBajasPendientes = computed<number | null>(() => {
  const audit = props.state.panapassAudit
  if (audit?.loaded && typeof audit.bajasPendientes === 'number' && audit.bajasPendientes >= 0) {
    return audit.bajasPendientes
  }
  if (!isSummaryReady.value) return null
  const p = summary.value?.panapass as Record<string, any> | undefined
  const direct = p?.bajas?.pendientes ?? p?.bajas_pendientes
  if (direct !== null && direct !== undefined && !isNaN(Number(direct))) {
    return Math.max(0, Number(direct))
  }
  if (Array.isArray(summary.value?.alerts)) {
    for (const a of summary.value!.alerts!) {
      const txt = `${a.title || ''} ${a.text || ''}`
      const m = txt.match(/(\d+)\s+bajas?\s+pendientes?/i)
      if (m) return Number(m[1])
    }
  }
  return 0
})

// =========================================================================
// FASE 3 · REVISADOS VEHICULARES (Separación estricta de estados)
// =========================================================================
const revisadosCriticos = computed<number | null>(() => {
  if (!isSummaryReady.value) return null
  const raw = summary.value?.revisados?.criticos
  if (raw === null || raw === undefined) return null
  return Math.max(0, Number(raw) || 0)
})

const revisadosPendientes = computed<number | null>(() => {
  if (!isSummaryReady.value) return null
  const raw = summary.value?.revisados?.pendientes
  if (raw === null || raw === undefined) return null
  return Math.max(0, Number(raw) || 0)
})

const revisadosProximos = computed<number | null>(() => {
  if (!isSummaryReady.value) return null
  const r = summary.value?.revisados as Record<string, any> | undefined
  const raw = r?.proximos ?? r?.por_vencer ?? r?.alerta
  if (raw === null || raw === undefined || isNaN(Number(raw))) return null
  return Math.max(0, Number(raw))
})

const revisadosEmitidosHoy = computed<number | null>(() => {
  if (!isSummaryReady.value) return null
  return Math.max(0, Number(summary.value?.revisados?.emitidos_hoy ?? 0))
})

const revisadosLimiteHoy = computed<number>(() => {
  return Math.max(1, Number(summary.value?.revisados?.limite_hoy ?? 33))
})

// =========================================================================
// CONTROL DE AUTO (Paradas y Abono Adicional confirmados por supervisoras/oficial)
// =========================================================================
const controlTotals = computed(() => {
  const c = summary.value?.control as Record<string, any> | undefined
  const t = props.state.controlIndicators?.totals

  const activas = t?.activas !== undefined && t?.activas !== null
    ? Number(t.activas)
    : (isSummaryReady.value && c?.activas !== undefined && c?.activas !== null ? Number(c.activas) : null)

  // Importante Fase 1: No confundir c.otros ni c.cerradas con paradas o abono_adicional
  const paradas = t?.paradas !== undefined && t?.paradas !== null
    ? Number(t.paradas)
    : (isSummaryReady.value && c?.paradas !== undefined && c?.paradas !== null ? Number(c.paradas) : null)

  const abonoAdicional = t?.abono_adicional !== undefined && t?.abono_adicional !== null
    ? Number(t.abono_adicional)
    : (isSummaryReady.value && c?.abono_adicional !== undefined && c?.abono_adicional !== null ? Number(c.abono_adicional) : null)

  return {
    activas: activas !== null && !isNaN(activas) ? activas : null,
    paradas: paradas !== null && !isNaN(paradas) ? paradas : null,
    abonoAdicional: abonoAdicional !== null && !isNaN(abonoAdicional) ? abonoAdicional : null,
  }
})

// =========================================================================
// MONITOREO GPS (Críticos, Alertas de conexión y Pendientes hoy)
// =========================================================================
const gpsCriticos = computed<number | null>(() => {
  if (!isGpsReady.value) return null
  const raw = props.state.gpsIndicators?.kpis?.criticos
  if (raw === null || raw === undefined) return null
  return Math.max(0, Number(raw) || 0)
})

const gpsAlertas = computed<number | null>(() => {
  if (!isGpsReady.value) return null
  const raw = props.state.gpsIndicators?.kpis?.alertas
  if (raw === null || raw === undefined) return null
  return Math.max(0, Number(raw) || 0)
})

const gpsPending = computed<number | null>(() => {
  if (!isGpsReady.value) return null
  const raw = props.state.gpsIndicators?.kpis?.pending
  if (raw === null || raw === undefined) return null
  return Math.max(0, Number(raw) || 0)
})

export interface LivingAlert {
  id: string
  level: 'warning' | 'danger' | 'info' | 'normal'
  codeTag: string
  title: string
  text: string
  module: string
  action: keyof ModuleAction
}

// =========================================================================
// FASE 1 · ALERTAS OPERATIVAS (EXCLUSIVAMENTE LAS 5 CATEGORÍAS OFICIALES)
// =========================================================================
const alertsList = computed<LivingAlert[]>(() => {
  const list: LivingAlert[] = []

  // ALERTA 1 — PANAPASS: UNIDADES SIN PANAPASS ACTIVO
  if (canPanapass.value && panapassSinActivo.value !== null && panapassSinActivo.value > 0) {
    list.push({
      id: 'panapass-sin-activo',
      level: 'warning',
      codeTag: 'PANAPASS',
      title: `${panapassSinActivo.value} sin Panapass activo`,
      text: 'Unidades operativas sin Panapass asignado',
      module: 'Panapass',
      action: 'panapassSinActivo'
    })
  }

  // ALERTA 2 — PANAPASS: BAJAS PENDIENTES (obligatoria como categoría independiente)
  if (canPanapass.value && panapassBajasPendientes.value !== null && panapassBajasPendientes.value > 0) {
    list.push({
      id: 'panapass-bajas-pendientes',
      level: 'warning',
      codeTag: 'PANAPASS',
      title: `${panapassBajasPendientes.value} bajas pendientes`,
      text: 'Solicitudes de baja pendientes de gestión',
      module: 'Panapass',
      action: 'panapassBajasPendientes'
    })
  }

  // ALERTA 3 — REVISADOS CRÍTICOS
  if (canRevisados.value && revisadosCriticos.value !== null && revisadosCriticos.value > 0) {
    list.push({
      id: 'revisados-criticos',
      level: 'danger',
      codeTag: 'REVISADOS',
      title: `${revisadosCriticos.value} revisados críticos`,
      text: 'Inspección vehicular ATTT en estado crítico',
      module: 'Revisados',
      action: 'revisadosCriticos'
    })
  }

  // ALERTA 4 — GPS CRÍTICOS
  if (canGps.value && gpsCriticos.value !== null && gpsCriticos.value > 0) {
    list.push({
      id: 'gps-criticos',
      level: 'danger',
      codeTag: 'GPS',
      title: `${gpsCriticos.value} GPS críticos`,
      text: 'Unidades activas con incidencia GPS crítica',
      module: 'GPS',
      action: 'gpsCriticos'
    })
  }

  // ALERTA 5 — CONTROL DE AUTO: UNIDADES PARADAS
  if (canControl.value && controlTotals.value.paradas !== null && controlTotals.value.paradas > 0) {
    list.push({
      id: 'control-paradas',
      level: 'warning',
      codeTag: 'CONTROL',
      title: `${controlTotals.value.paradas} unidades paradas`,
      text: 'Unidades paradas registradas en Control de Auto',
      module: 'Control de Auto',
      action: 'controlParadas'
    })
  }

  return list
})

const hasCriticalAlertsInStrip = computed(() => alertsList.value.some(a => a.level === 'danger'))

interface CardMetricRow {
  label: string
  value: string | number
  tone?: 'critical' | 'warning' | 'info' | 'ok' | 'muted'
}

// =========================================================================
// FASE 2 & FASE 3 · TARJETAS DE LOS CUATRO MÓDULOS PRINCIPALES
// =========================================================================
const cards = computed(() => {
  // --- 1. PANAPASS & ENA (FASE 2 & MÓDULO 1) ---
  const panaLoading = !isSummaryReady.value && !props.state.panapassAudit?.loaded && !isSummaryError.value
  const panaError = isSummaryError.value && !props.state.panapassAudit?.loaded
  const scenario = panapassScenario.value
  const negAm = panapassNegativosCorte.value
  const negPendientes = panapassNegativosPendientesReales.value
  const pagosHoy = panapassPagosHoy.value
  const sinPana = panapassSinActivo.value
  const bajasPend = panapassBajasPendientes.value

  // El color depende de la situación operativa actual confirmada, NO de los negativos históricos AM:
  // - Naranja (amber): pendientes reales en PM que aún requieren pago (scenario === 'PM_PENDING')
  // - Verde (emerald): gestión PM completada y confirmada (scenario === 'PM_COMPLETED')
  // - Azul/neutral (blue): corte AM en seguimiento o información pendiente de confirmación ('AM_CUT' | 'UNCONFIRMED')
  const panaTone = panaError || panaLoading
    ? 'blue'
    : scenario === 'PM_PENDING'
      ? 'amber'
      : scenario === 'PM_COMPLETED'
        ? 'emerald'
        : 'blue'

  const panaBadge = panaError
    ? 'Sin conexión'
    : panaLoading
      ? 'Verificando…'
      : scenario === 'UNCONFIRMED'
        ? 'Sin confirmar'
        : scenario === 'PM_PENDING'
          ? `${negPendientes ?? 0} pendientes PM`
          : scenario === 'PM_COMPLETED'
            ? 'Gestión completada'
            : (negAm ?? 0) > 0
              ? `Corte AM · ${negAm}`
              : 'Al día'

  const panaMetrics: CardMetricRow[] = [
    {
      label: scenario === 'UNCONFIRMED'
        ? 'Estado ENA'
        : scenario === 'AM_CUT'
          ? 'Estado gestión AM/PM'
          : 'Negativos pendientes reales',
      value: panaError
        ? 'Sin datos'
        : panaLoading
          ? 'Cargando…'
          : scenario === 'UNCONFIRMED'
            ? 'Pendiente de actualización'
            : scenario === 'AM_CUT'
              ? panapassEstadoGestionLabel.value
              : scenario === 'PM_COMPLETED'
                ? '0 (Gestión completada)'
                : (negPendientes ?? 0),
      tone: panaError || panaLoading
        ? 'muted'
        : scenario === 'PM_PENDING'
          ? 'warning'
          : scenario === 'PM_COMPLETED'
            ? 'ok'
            : 'info'
    },
    {
      label: 'Negativos detectados AM',
      value: panaError
        ? 'Sin datos'
        : panaLoading
          ? 'Cargando…'
          : negAm !== null
            ? `${negAm} (Corte AM)`
            : 'Sin confirmar',
      tone: negAm === null || panaError || panaLoading ? 'muted' : undefined
    },
    {
      label: 'Pagos realizados hoy',
      value: panaError
        ? 'Sin datos'
        : panaLoading
          ? 'Cargando…'
          : pagosHoy !== null
            ? pagosHoy
            : 'Sin confirmar',
      tone: panaError || panaLoading ? 'muted' : ((pagosHoy ?? 0) > 0 ? 'ok' : undefined)
    },
    {
      label: 'Sin Panapass activo',
      value: panaError
        ? 'Sin datos'
        : panaLoading
          ? 'Cargando…'
          : sinPana !== null
            ? sinPana
            : 'Sin confirmar',
      tone: panaError || panaLoading ? 'muted' : ((sinPana ?? 0) > 0 ? 'warning' : 'ok')
    },
    {
      label: scenario === 'UNCONFIRMED' ? 'Última consulta' : 'Bajas pendientes',
      value: panaError
        ? 'Sin datos'
        : panaLoading
          ? 'Cargando…'
          : scenario === 'UNCONFIRMED'
            ? panapassUltimaConsultaLabel.value
            : (bajasPend !== null ? bajasPend : 'Sin confirmar'),
      tone: panaError || panaLoading
        ? 'muted'
        : scenario === 'UNCONFIRMED'
          ? 'info'
          : ((bajasPend ?? 0) > 0 ? 'warning' : 'ok')
    }
  ]

  // --- 2. REVISADOS VEHICULARES (MÓDULO 2) ---
  const revLoading = !isSummaryReady.value && !isSummaryError.value
  const revError = isSummaryError.value
  const revCrit = revisadosCriticos.value ?? 0
  const revPend = revisadosPendientes.value ?? 0
  const revEmit = revisadosEmitidosHoy.value ?? 0

  // Rojo si existen críticos reales (> 0); Ámbar si existen pendientes operativos (> 0); Verde si no hay pendientes
  const revTone = revError || revLoading
    ? 'blue'
    : (revCrit > 0 ? 'red' : (revPend > 0 ? 'amber' : 'emerald'))

  const revBadge = revError
    ? 'Sin conexión'
    : revLoading
      ? 'Verificando…'
      : revCrit > 0
        ? `${revCrit} críticos`
        : revPend > 0
          ? `${revPend} pendientes`
          : 'Al día'

  const revMetrics: CardMetricRow[] = [
    {
      label: 'Pendientes por tramitar',
      value: revError ? 'Sin datos' : (revLoading ? 'Cargando…' : revPend),
      tone: revError || revLoading ? 'muted' : (revPend > 0 ? 'warning' : 'ok')
    },
    {
      label: 'Revisados críticos',
      value: revError ? 'Sin datos' : (revLoading ? 'Cargando…' : revCrit),
      tone: revError || revLoading ? 'muted' : (revCrit > 0 ? 'critical' : 'ok')
    },
    {
      label: 'Emitidos hoy',
      value: revError
        ? 'Sin datos'
        : revLoading
          ? 'Cargando…'
          : `${revEmit}/${revisadosLimiteHoy.value}`
    }
  ]

  // --- 3. CONTROL DE FLOTA (MÓDULO 3) ---
  const ctrlParadas = controlTotals.value.paradas
  const ctrlAbono = controlTotals.value.abonoAdicional
  const ctrlActivas = controlTotals.value.activas
  const ctrlHasDetail = ctrlParadas !== null && ctrlAbono !== null
  const ctrlError = isControlError.value && !ctrlHasDetail
  const ctrlLoading = !ctrlHasDetail && !ctrlError

  // Ámbar cuando existen unidades paradas (> 0); Verde cuando no hay incidencias
  const ctrlTone = ctrlError || ctrlLoading
    ? 'blue'
    : ((ctrlParadas ?? 0) > 0 ? 'amber' : 'emerald')

  const ctrlBadge = ctrlError
    ? 'Sin conexión'
    : ctrlLoading
      ? 'Sincronizando…'
      : (ctrlParadas ?? 0) > 0
        ? `${ctrlParadas} paradas`
        : 'Flota operativa'

  const ctrlMetrics: CardMetricRow[] = [
    {
      label: 'Unidades paradas',
      value: ctrlError ? 'Sin datos' : (ctrlLoading ? 'Cargando…' : (ctrlParadas ?? 0)),
      tone: ctrlError || ctrlLoading ? 'muted' : ((ctrlParadas ?? 0) > 0 ? 'warning' : 'ok')
    },
    {
      label: 'Abono adicional',
      value: ctrlError ? 'Sin datos' : (ctrlLoading ? 'Cargando…' : (ctrlAbono ?? 0)),
      tone: ctrlError || ctrlLoading ? 'muted' : ((ctrlAbono ?? 0) > 0 ? 'info' : undefined)
    },
    {
      label: 'Unidades activas',
      value: ctrlActivas !== null ? ctrlActivas : (ctrlError ? 'Sin datos' : 'Cargando…'),
      tone: ctrlActivas === null ? 'muted' : 'ok'
    }
  ]

  // --- 4. MONITOREO GPS (MÓDULO 4) ---
  const gpsLoading = !isGpsReady.value && !isGpsError.value
  const gpsErr = isGpsError.value && !isGpsReady.value
  const gCrit = gpsCriticos.value ?? 0
  const gAlert = gpsAlertas.value ?? 0
  const gPend = gpsPending.value ?? 0

  // Rojo cuando existan GPS críticos (> 0); Ámbar cuando solo existan alertas menores (> 0); Verde sin incidencias
  const gpsTone = gpsErr || gpsLoading
    ? 'blue'
    : (gCrit > 0 ? 'red' : (gAlert > 0 ? 'amber' : 'emerald'))

  const gpsBadge = gpsErr
    ? 'Sin conexión'
    : gpsLoading
      ? 'Consultando…'
      : gCrit > 0
        ? `${gCrit} críticos`
        : gAlert > 0
          ? `${gAlert} alertas`
          : 'Telemetría al día'

  const gpsMetrics: CardMetricRow[] = [
    {
      label: 'GPS críticos',
      value: gpsErr ? 'Sin datos' : (gpsLoading ? 'Cargando…' : gCrit),
      tone: gpsErr || gpsLoading ? 'muted' : (gCrit > 0 ? 'critical' : 'ok')
    },
    {
      label: 'Alertas menores de conexión',
      value: gpsErr ? 'Sin datos' : (gpsLoading ? 'Cargando…' : gAlert),
      tone: gpsErr || gpsLoading ? 'muted' : (gAlert > 0 ? 'warning' : undefined)
    },
    {
      label: 'Pendientes del día',
      value: gpsErr ? 'Sin datos' : (gpsLoading ? 'Cargando…' : gPend),
      tone: gpsErr || gpsLoading ? 'muted' : undefined
    }
  ]

  const allCards = [
    {
      key: 'panapass',
      title: 'Panapass & ENA',
      tag: 'PEAJES Y CORREDORES',
      description: 'Cobros, saldos negativos en vivo y pagos de peaje.',
      action: 'panapass' as keyof ModuleAction,
      actionLabel: 'Auditar Panapass',
      badge: panaBadge,
      tone: panaTone,
      metrics: panaMetrics,
    },
    {
      key: 'revisados',
      title: 'Revisados Vehiculares',
      tag: 'INSPECCIÓN & ATTT',
      description: 'Vencimientos, inspección técnica ATTT y control de boletas.',
      action: 'revisados' as keyof ModuleAction,
      actionLabel: 'Gestionar Revisados',
      badge: revBadge,
      tone: revTone,
      metrics: revMetrics,
    },
    {
      key: 'control',
      title: 'Control de Flota',
      tag: 'REGISTRO DE CUPOS',
      description: 'Maestra de vehículos, estatus de cupos y seguimiento operativo.',
      action: 'control' as keyof ModuleAction,
      actionLabel: 'Ver Flota Maestra',
      badge: ctrlBadge,
      tone: ctrlTone,
      metrics: ctrlMetrics,
    },
    {
      key: 'gps',
      title: 'Monitoreo GPS',
      tag: 'TELEMETRÍA SATELITAL',
      description: 'Telemetría satelital en vivo, desconexiones y geo-cercas.',
      action: 'gps' as keyof ModuleAction,
      actionLabel: 'Monitoreo Satelital',
      badge: gpsBadge,
      tone: gpsTone,
      metrics: gpsMetrics,
    },
  ]

  return allCards.filter(c => {
    if (c.key === 'panapass') return canPanapass.value
    if (c.key === 'revisados') return canRevisados.value
    if (c.key === 'control') return canControl.value
    if (c.key === 'gps') return canGps.value
    return true
  })
})

function open(action?: keyof ModuleAction) {
  if (!action) return
  const fn = props.actions[action]
  if (typeof fn === 'function') {
    ;(fn as () => unknown)()
  }
}

function onSidebarNavigate(moduleId: string) {
  if (moduleId === 'home') return
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

async function triggerLiveRefresh() {
  try {
    delete (window as any).__v117HomeSummary
    delete (window as any).__v164GpsPortalData
    delete (window as any).__v163GpsPortalCache
    delete (window as any).__v126Operational
  } catch {
    ;(window as any).__v117HomeSummary = null
  }
  const api = (window as any).__RYM_VUE_NEXT_API
  if (api?.call) {
    try {
      const fresh = await api.call('portal-home-resumen', {}, { rymForce: true })
      if (fresh?.ok && (window as any).__RYM_VUE_NEXT_HOME?.render) {
        ;(window as any).__v117HomeSummary = { data: fresh, at: Date.now() }
        ;(window as any).__RYM_VUE_NEXT_HOME.render(fresh)
      }
    } catch (e) {
      ;(window as any).__RYM_VUE_NEXT_HOME?.error?.(e)
    }
  } else if (typeof (window as any).v36PortalHome === 'function') {
    await (window as any).v36PortalHome()
  }
  if (typeof props.actions.retryIndicators === 'function') {
    props.actions.retryIndicators()
  }
}
</script>

<template>
  <main class="living-shell" data-testid="vue-next-home">
    <!-- Clean Living Sidebar (Phase 1-10 Premium Redesign) -->
    <AppSidebar
      :profile="profile"
      :modules="state.session.modules"
      active-module="home"
      :has-module="hasModule"
      :connection-state="hasDataQueryError ? 'error' : (isSummaryReady ? 'connected' : 'connecting')"
      :stats="{
        panapass: panapassNegativosPendientesReales,
        panapassScenario: panapassScenario,
        revisados: revisadosPendientes,
        revisadosCriticos: revisadosCriticos,
        gps: gpsCriticos,
        control: controlTotals.activas
      }"
      @navigate="onSidebarNavigate"
      @logout="open('logout')"
    />

    <!-- Main Content Workspace -->
    <div class="living-content-area">
      <!-- FASE 2: Cabecera Operativa Principal con Saludo Dinámico + Buscador de Unidades + Refresco -->
      <AppTopBar
        :profile="profile"
        :updated-at="summary?.generated_at"
        :validator-api="validatorApi"
        :on-control="() => open('control')"
        :on-module-navigate="(mod) => open(mod)"
        :on-refresh="triggerLiveRefresh"
        @logout="open('logout')"
      />

      <div class="living-container">
        <!-- Banner de protección ante errores de consulta (Fase 1: no inventar ceros en fallos de red) -->
        <div
          v-if="hasDataQueryError"
          class="query-warning-banner"
          role="status"
          data-testid="query-error-banner"
        >
          <div class="query-warning-text">
            <span class="query-warning-dot"></span>
            <span>{{ dataErrorSummaryText }}</span>
          </div>
          <button type="button" class="query-retry-btn" @click="triggerLiveRefresh">
            Reintentar ahora
          </button>
        </div>

        <!-- FASE 1, 2, 3, 4: Alertas Operativas Inmediatas (Las 6 categorías con incidencias reales > 0) -->
        <section
          v-if="alertsList.length"
          class="living-alerts-strip-section"
          data-testid="operational-alerts-section"
        >
          <div class="alerts-strip-header">
            <div class="alerts-title-wrap">
              <span class="alerts-beacon" :class="{ critical: hasCriticalAlertsInStrip }"></span>
              <h3>Atención Operativa Inmediata</h3>
            </div>
            <span
              class="alerts-count-badge"
              :class="{ critical: hasCriticalAlertsInStrip }"
              data-testid="alerts-priority-counter"
            >
              {{ alertsList.length }} {{ alertsList.length === 1 ? 'prioridad detectada' : 'prioridades detectadas' }}
            </span>
          </div>

          <div class="alerts-scroll-strip">
            <article
              v-for="alert in alertsList"
              :key="alert.id"
              class="alert-pill-card interactive"
              :class="alert.level || 'info'"
              :data-testid="`alert-card-${alert.id}`"
              tabindex="0"
              role="button"
              :aria-label="`Abrir alerta: ${alert.title}`"
              @click="open(alert.action)"
              @keydown.enter="open(alert.action)"
              @keydown.space.prevent="open(alert.action)"
            >
              <div class="alert-pill-badge" :class="alert.level || 'info'">
                <span class="pulse-dot-mini"></span>
                <span>{{ alert.codeTag }}</span>
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

        <!-- FASE 4: Módulos Operativos (Panapass & ENA, Revisados, Control de Flota, Monitoreo GPS) -->
        <div class="living-section-divider compact">
          <div class="section-title-wrap">
            <div class="title-with-pill">
              <h2>Módulos y Operación Central</h2>
              <span class="modules-count-pill">{{ cards.length }} {{ cards.length === 1 ? 'Sistema Activo' : 'Sistemas Integrados' }}</span>
            </div>
          </div>
          <div class="system-status-indicator">
            <span class="radar-dot" :class="{ warning: hasDataQueryError }"></span>
            <span>{{ hasDataQueryError ? 'Sincronización Parcial' : 'Servicios Sincronizados' }}</span>
          </div>
        </div>

        <div class="living-cards-grid">
          <article
            v-for="card in cards"
            :key="card.key"
            class="living-card"
            :class="card.tone"
            :data-testid="`module-card-${card.key}`"
            tabindex="0"
            role="button"
            @click="open(card.action)"
            @keydown.enter="open(card.action)"
          >
            <!-- Card Header -->
            <div class="card-head">
              <div class="card-icon-bubble">
                <ModuleIcon :name="card.key" />
              </div>
              <div class="card-pills-group">
                <span class="card-pill" :data-testid="`module-badge-${card.key}`">{{ card.badge }}</span>
              </div>
            </div>

            <!-- Card Titles -->
            <div class="card-info-top">
              <span class="card-tag">{{ card.tag }}</span>
              <h3 class="card-title">{{ card.title }}</h3>
              <p class="card-desc">{{ card.description }}</p>
            </div>

            <!-- Resumen operacional con estados visuales diferenciados (Rojo solo críticos, Ámbar pendientes) -->
            <div class="card-metrics-box">
              <div
                v-for="(metric, mIndex) in card.metrics"
                :key="mIndex"
                class="metric-row"
              >
                <span class="metric-label">{{ metric.label }}</span>
                <span
                  class="metric-value"
                  :class="metric.tone ? `metric-${metric.tone}` : ''"
                >
                  {{ typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value }}
                </span>
              </div>
            </div>

            <!-- Card Action Footer -->
            <div class="card-footer-action">
              <button
                type="button"
                class="card-action-btn"
                tabindex="-1"
                aria-hidden="true"
              >
                <span>{{ card.actionLabel }}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.living-shell {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  overflow-x: hidden;
}

.living-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #f8fafc;
}

.living-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 32px 64px;
  max-width: 1560px;
  width: 100%;
  margin: 0 auto;
}

/* Banner de advertencia cuando una fuente de datos falla (Fase 1) */
.query-warning-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  font-size: 12px;
  font-weight: 650;
}

.query-warning-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.query-warning-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d97706;
  flex-shrink: 0;
}

.query-retry-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #f59e0b;
  background: #ffffff;
  color: #b45309;
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.query-retry-btn:hover {
  background: #fef3c7;
}

/* FASE 1 & 4: Strip de Alertas Operativas (Ámbar por defecto, Rojo solo si hay críticos reales) */
.living-alerts-strip-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alerts-strip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.alerts-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.alerts-beacon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d97706;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.2);
  animation: pulseBeacon 2s infinite ease-in-out;
}

.alerts-beacon.critical {
  background: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.22);
}

@keyframes pulseBeacon {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
}

.alerts-title-wrap h3 {
  font-size: 14.5px;
  font-weight: 850;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.01em;
}

.alerts-count-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 9999px;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.alerts-count-badge.critical {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fecaca;
}

.alerts-scroll-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.alert-pill-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.alert-pill-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

/* Rojo únicamente para críticos reales */
.alert-pill-card.danger {
  border-color: #fca5a5;
  background: linear-gradient(180deg, #ffffff, #fff5f5);
}

.alert-pill-card.danger:hover {
  border-color: #ef4444;
  box-shadow: 0 6px 18px rgba(239, 68, 68, 0.12);
}

/* Ámbar para pendientes operativos */
.alert-pill-card.warning {
  border-color: #fcd34d;
  background: linear-gradient(180deg, #ffffff, #fffbeb);
}

.alert-pill-card.warning:hover {
  border-color: #f59e0b;
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.12);
}

/* Azul/neutro para indicadores informativos o convenios */
.alert-pill-card.info {
  border-color: #bfdbfe;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
}

.alert-pill-card.info:hover {
  border-color: #60a5fa;
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.1);
}

.alert-pill-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.alert-pill-badge.danger {
  background: #fee2e2;
  color: #991b1b;
}

.alert-pill-badge.warning {
  background: #fef3c7;
  color: #92400e;
}

.alert-pill-badge.info {
  background: #dbeafe;
  color: #1e40af;
}

.pulse-dot-mini {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  animation: pulseDot 1.5s infinite ease-in-out;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.alert-pill-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.alert-pill-title {
  font-size: 12.5px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.3;
  white-space: normal;
  word-break: break-word;
}

.alert-pill-text {
  font-size: 11px;
  color: #475569;
  margin: 0;
  line-height: 1.3;
  white-space: normal;
  word-break: break-word;
}

.alert-pill-action {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 750;
  color: #475569;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.alert-pill-action svg {
  width: 13px;
  height: 13px;
  transition: transform 0.2s ease;
}

.alert-pill-card:hover .alert-pill-action {
  color: #0f172a;
}

.alert-pill-card:hover .alert-pill-action svg {
  transform: translateX(3px);
}

/* Section Divider */
.living-section-divider.compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0 0;
  padding: 0 4px;
}

.title-with-pill {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-with-pill h2 {
  font-size: 15px;
  font-weight: 850;
  color: #0f172a;
  letter-spacing: -0.01em;
  margin: 0;
}

.modules-count-pill {
  font-size: 10.5px;
  font-weight: 750;
  padding: 3px 8px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.system-status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
}

.radar-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.radar-dot.warning {
  background: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);
}

/* 4 Living Module Cards */
.living-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.living-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  outline: none;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.living-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

/* FASE 4: Estados Dinámicos sobrios, sin bordes rojos innecesarios */
/* CRÍTICO REAL: Rojo */
.living-card.red {
  border-color: #fca5a5;
  background: linear-gradient(180deg, #ffffff 0%, #fff8f8 100%);
}
.living-card.red:hover {
  border-color: #ef4444;
  box-shadow: 0 12px 28px rgba(239, 68, 68, 0.12);
}
.living-card.red .card-icon-bubble {
  background: #fee2e2;
  color: #b91c1c;
}
.living-card.red .card-pill {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
.living-card.red .card-action-btn {
  background: linear-gradient(135deg, #dc2626, #b91c1c) !important;
}

/* PENDIENTE OPERATIVO: Ámbar */
.living-card.amber {
  border-color: #fde68a;
  background: linear-gradient(180deg, #ffffff 0%, #fffdf7 100%);
}
.living-card.amber:hover {
  border-color: #f59e0b;
  box-shadow: 0 12px 28px rgba(245, 158, 11, 0.11);
}
.living-card.amber .card-icon-bubble {
  background: #fef3c7;
  color: #b45309;
}
.living-card.amber .card-pill {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}
.living-card.amber .card-action-btn {
  background: linear-gradient(135deg, #d97706, #b45309) !important;
}

/* NORMAL / AL DÍA: Verde / Emerald */
.living-card.emerald {
  border-color: #a7f3d0;
  background: linear-gradient(180deg, #ffffff 0%, #f7fee7 0%, #f6fdf9 100%);
}
.living-card.emerald:hover {
  border-color: #34d399;
  box-shadow: 0 12px 28px rgba(16, 185, 129, 0.11);
}
.living-card.emerald .card-icon-bubble {
  background: #d1fae5;
  color: #047857;
}
.living-card.emerald .card-pill {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}
.living-card.emerald .card-action-btn {
  background: linear-gradient(135deg, #059669, #047857) !important;
}

/* INFORMATIVO / NEUTRO: Azul */
.living-card.blue {
  border-color: #cbd5e1;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}
.living-card.blue:hover {
  border-color: #60a5fa;
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.1);
}
.living-card.blue .card-icon-bubble {
  background: #dbeafe;
  color: #1d4ed8;
}
.living-card.blue .card-pill {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}
.living-card.blue .card-action-btn {
  background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.card-icon-bubble {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.living-card:hover .card-icon-bubble {
  transform: scale(1.05);
}

.card-pill {
  font-size: 11px;
  font-weight: 800;
  padding: 4px 9px;
  border-radius: 9999px;
  letter-spacing: 0.01em;
}

.card-info-top {
  display: flex;
  flex-direction: column;
  margin-bottom: 14px;
}

.card-tag {
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.06em;
  color: #64748b;
  margin-bottom: 3px;
}

.card-title {
  font-size: 16px;
  font-weight: 850;
  color: #0f172a;
  letter-spacing: -0.015em;
  margin: 0 0 4px;
}

.card-desc {
  font-size: 11.5px;
  color: #475569;
  margin: 0 0 12px;
  line-height: 1.4;
  min-height: 32px;
}

/* Metrics Box */
.card-metrics-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 16px;
  flex: 1;
}

.metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
}

.metric-row:last-child {
  border-bottom: none;
}

.metric-label {
  font-size: 11px;
  font-weight: 650;
  color: #475569;
}

.metric-value {
  font-size: 13px;
  font-weight: 850;
  color: #0f172a;
  text-align: right;
}

/* Colores de métricas según severidad (Fase 4) */
.metric-value.metric-critical {
  color: #dc2626;
  font-weight: 900;
}

.metric-value.metric-warning {
  color: #b45309;
  font-weight: 900;
}

.metric-value.metric-info {
  color: #1d4ed8;
  font-weight: 850;
}

.metric-value.metric-ok {
  color: #047857;
  font-weight: 850;
}

.metric-value.metric-muted {
  color: #64748b;
  font-weight: 700;
  font-size: 11.5px;
}

.card-footer-action {
  margin-top: auto;
  width: 100%;
}

.card-action-btn {
  width: 100%;
  padding: 11px 16px;
  border-radius: 12px;
  border: none;
  font-size: 12.5px;
  font-weight: 800;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-action-btn svg {
  width: 15px;
  height: 15px;
  transition: transform 0.2s ease;
}

.card-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
}

.card-action-btn:hover svg {
  transform: translateX(4px);
}

/* Responsive adjustments */
@media (max-width: 1240px) {
  .alerts-scroll-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .living-cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .living-shell {
    flex-direction: column;
  }
  .living-container {
    padding: 16px 14px 48px;
    gap: 16px;
  }
  .alerts-scroll-strip {
    grid-template-columns: 1fr;
  }
  .living-cards-grid {
    grid-template-columns: 1fr;
  }
  .living-section-divider.compact {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .query-warning-banner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

<style>
/* Ocultar barra inferior legacy cuando el nuevo dashboard está activo en móvil */
body:has([data-testid="vue-next-home"]) #v115MobileNav {
  display: none !important;
}
</style>
