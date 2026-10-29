import { createApp, nextTick, reactive } from 'vue'
import type { Component } from 'vue'
import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import ValidatorAppView from './views/ValidatorAppView.vue'
import { acceptHomeSummary, acceptIndicator, canOpen, createDashboardState, failHomeSummary, failIndicator } from './dashboard'
import type { DashboardState } from './dashboard'
import type { ExecutiveIndicators, HomeSummary, ModuleAction, PanapassAuditIndicators, PortalProfile } from './types'
import type { PanapassSnapshot } from './panapass'
import { navigateToLegacyView } from './navigation'
import './style.css'
import './home.css'
import './tailwind.css'

declare global {
  interface Window {
    __RYM_VUE_NEXT_API?: {
      context: () => { profile: PortalProfile | null; modules: string[] }
      hasModule: (code: string) => boolean
      call: <T = Record<string, unknown>>(name: string, body?: Record<string, unknown>) => Promise<T>
      rpc?: <T = unknown>(name: string, body?: Record<string, unknown>) => Promise<T>
      viewContext?: () => { today: string | null; isAdmin: boolean }
    }
    rymHasModule?: (code: string) => boolean
    v70OpenPanapass?: () => unknown
    v60OpenRevisados?: () => unknown
    v70OpenControl?: () => unknown
    v113OpenGps?: () => unknown
    v70OpenUsers?: () => unknown
    v36PortalHome?: () => unknown
    clearSession?: () => unknown
    loginView?: () => unknown
    login?: (event: SubmitEvent) => Promise<void>
    __RYM_VUE_NEXT_HOME_MAIN?: { searchValidator?: (query: string) => Promise<Record<string, unknown>[]>; loadValidator?: (unit: Record<string, unknown>) => Promise<any>; enrichValidator?: (detail: Record<string, any>) => Promise<any>; fichaValidator?: (unit: Record<string, unknown>) => Promise<Record<string, unknown>>; refreshIndicators?: (role: string, scope: { control: boolean; gps: boolean }) => unknown; setActiveModule?: (moduleId: string) => void }
    __RYM_VUE_NEXT_LOGIN?: { render: (error?: string) => void; dispose: () => void }
    __RYM_VUE_NEXT_PANAPASS_MAIN?: { read?: (force?: boolean) => Promise<PanapassSnapshot> }
    searchValidator99?: (query: string, render?: boolean) => Promise<Record<string, unknown>[]>
    loadValidatorDetail99?: (unit: Record<string, unknown>, options?: { deferChecks?: boolean }) => Promise<any>
    __RYM_VUE_NEXT_GPS_PRIORITY?: () => unknown
    shell?: () => unknown
    render?: () => Promise<unknown>
  }
}

let app: ReturnType<typeof createApp> | null = null
let loginApp: ReturnType<typeof createApp> | null = null
let loginProps: { error: string; onSubmit: (event: SubmitEvent) => Promise<void> | void } | null = null
let state: DashboardState | null = null
let methods: ModuleAction = {}
let controlIndicatorsRequested = false
let gpsIndicatorsRequested = false
let panapassAuditRequested = false
let panapassApp: ReturnType<typeof createApp> | null = null
let panapassObserver: MutationObserver | null = null
let panapassSequence = 0
let panapassStylesPromise: Promise<void> | null = null
let validatorApp: ReturnType<typeof createApp> | null = null
let validatorProps: { api: { search: (query: string) => Promise<Record<string, unknown>[]>; load: (unit: Record<string, unknown>) => Promise<unknown>; gps?: (unit: Record<string, unknown>) => Promise<Record<string, unknown>> }; access: 'allowed' | 'denied' } | null = null
let workspaceApp: ReturnType<typeof createApp> | null = null

function profileOf(summary: HomeSummary): PortalProfile { return summary.profile || {} }
function routeTo(action?: () => unknown): unknown { return action?.() }
export function renderLogin(error = ''): void {
  const root = document.querySelector<HTMLElement>('#app')
  if (!root) return
  if (!loginApp) {
    root.innerHTML = '<div id="rym-vue-next-login"></div>'
    loginProps = reactive({ error, onSubmit: (event: SubmitEvent) => window.login?.(event) })
    loginApp = createApp(LoginView, loginProps)
    loginApp.mount('#rym-vue-next-login')
  } else if (loginProps) loginProps.error = error
}
export function disposeLogin(): void {
  loginApp?.unmount()
  loginApp = null
  loginProps = null
}
function loadPanapassStyles(): Promise<void> {
  if (!panapassStylesPromise) {
    panapassStylesPromise = new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `${import.meta.env.BASE_URL}panapass.css`
      link.dataset.rymPanapassStyles = '1'
      link.onload = () => resolve()
      link.onerror = () => {
        link.remove()
        panapassStylesPromise = null
        reject(new Error('No se pudieron cargar los estilos de Panapass.'))
      }
      document.head.append(link)
    })
  }
  return panapassStylesPromise
}
function waitForClick(selector: string, timeoutMs = 4500): Promise<boolean> {
  return new Promise(resolve => {
    const start = Date.now()
    const check = () => {
      const el = document.querySelector<HTMLElement>(selector)
      if (el) {
        el.click()
        resolve(true)
        return
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(false)
        return
      }
      window.setTimeout(check, 60)
    }
    check()
  })
}

function waitForSelectValue(selector: string, value: string, timeoutMs = 4500): Promise<boolean> {
  return new Promise(resolve => {
    const start = Date.now()
    const check = () => {
      const sel = document.querySelector<HTMLSelectElement>(selector)
      if (sel && Array.from(sel.options).some(o => o.value === value)) {
        sel.value = value
        sel.dispatchEvent(new Event('change', { bubbles: true }))
        resolve(true)
        return
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(false)
        return
      }
      window.setTimeout(check, 60)
    }
    check()
  })
}

function currentActions(): ModuleAction {
  const navDisposers = {
    disposeHome,
    disposePanapass,
    disposeValidatorApp,
    disposeWorkspace: () => {
      workspaceApp?.unmount()
      workspaceApp = null
    }
  }
  return {
    panapass: () => openPanapass(),
    panapassSinActivo: async () => {
      await navigateToLegacyView('bajas_panapass', navDisposers, state?.session.profile)
      await waitForClick('[data-v99bt="alerts"], [data-v96bt="alerts"]')
    },
    panapassBajasPendientes: async () => {
      await navigateToLegacyView('bajas_panapass', navDisposers, state?.session.profile)
      await waitForClick('[data-v99bt="pending"], [data-v96bt="pending"]')
    },
    revisados: () => openOperationalModule('revisados'),
    revisadosCriticos: async () => {
      if (typeof window.v60OpenRevisados !== 'function') {
        await openOperationalModule('revisados')
        return
      }
      disposeHome()
      disposePanapass()
      disposeValidatorApp()
      workspaceApp?.unmount()
      workspaceApp = null
      await window.v60OpenRevisados()
      await waitForClick('[data-v66-tab="operations"]')
      await waitForClick('.v66-priority[data-pri="CRITICA"]')
    },
    control: () => openOperationalModule('control'),
    controlParadas: async () => {
      const win = window as any
      if (typeof win.v75ControlUnits === 'function') {
        disposeHome()
        disposePanapass()
        disposeValidatorApp()
        workspaceApp?.unmount()
        workspaceApp = null
        await win.v75ControlUnits()
        await waitForSelectValue('#v154CtlState', 'PARADO')
        return
      }
      if (typeof window.v70OpenControl === 'function') {
        disposeHome()
        disposePanapass()
        disposeValidatorApp()
        workspaceApp?.unmount()
        workspaceApp = null
        await window.v70OpenControl()
        await waitForClick('[data-v75-control="unidades"]')
        await waitForSelectValue('#v154CtlState', 'PARADO')
        return
      }
      await openOperationalModule('control')
    },
    gps: () => openOperationalModule('gps'),
    gpsCriticos: async () => {
      if (typeof window.v113OpenGps !== 'function') {
        await openOperationalModule('gps')
        return
      }
      disposeHome()
      disposePanapass()
      disposeValidatorApp()
      workspaceApp?.unmount()
      workspaceApp = null
      await window.v113OpenGps()
      await waitForClick('.v157-kpi[data-focus="CRITICO"], .v154-gps-kpi[data-v154-k="CRITICO"]')
    },
    users: () => openOperationalModule('users'),
    logout: () => routeTo(logoutToLogin),
    retry: () => window.v36PortalHome?.(),
    retryIndicators: () => {
      if (!state) return
      const role = String(state.session.profile.rol || '').toUpperCase()
      const hasGps = canOpen(state.session, 'gps', window.rymHasModule)
      if (state.summary?.control && !state.controlIndicators) { state.controlState = 'loading'; state.controlError = '' }
      if (hasGps && !state.gpsIndicators) { state.gpsState = 'loading'; state.gpsError = '' }
      void window.__RYM_VUE_NEXT_HOME_MAIN?.refreshIndicators?.(role, { control: !!state.summary?.control, gps: false })
      if (hasGps) void window.__RYM_VUE_NEXT_GPS_PRIORITY?.()
      void refreshPanapassAudit(true)
    },
    navigateLegacy: (moduleId: string) => navigateToLegacyView(moduleId, navDisposers, state?.session.profile),
  }
}

async function openOperationalModule(module: 'revisados' | 'control' | 'gps' | 'users'): Promise<void> {
  const root = document.querySelector<HTMLElement>('#app')
  if (!root || !window.__RYM_VUE_NEXT_API) return
  disposeHome()
  disposePanapass()
  disposeValidatorApp()
  workspaceApp?.unmount()
  root.innerHTML = '<div id="rym-vue-next-operational"></div>'
  const mount = root.querySelector<HTMLElement>('#rym-vue-next-operational')
  if (!mount) return
  try {
    const { default: OperationalModuleView } = await import('./views/OperationalModuleView.vue')
    const legacyActions = { revisados: window.v60OpenRevisados, control: window.v70OpenControl, gps: window.v113OpenGps, users: window.v70OpenUsers }
    workspaceApp = createApp(OperationalModuleView, {
      module,
      onBack: () => { workspaceApp?.unmount(); workspaceApp = null; window.v36PortalHome?.() },
      onOpenLegacy: () => { workspaceApp?.unmount(); workspaceApp = null; routeTo(legacyActions[module]) },
    })
    workspaceApp.mount(mount)
  } catch (error) {
    mount.textContent = error instanceof Error ? error.message : 'No se pudo abrir el módulo Vue.'
  }
}

function logoutToLogin(): void {
  window.clearSession?.()
  disposeHome()
  renderLogin()
}

async function openPanapass(): Promise<void> {
  const route = window.v70OpenPanapass
  if (typeof route !== 'function') return
  const authorized = !!window.rymHasModule?.('portal.panapass') || !!state?.session.modules.includes('portal.panapass')
  if (!authorized) return
  disposeHome()
  await route()
  const view = document.querySelector<HTMLElement>('#view')
  const main = window.__RYM_VUE_NEXT_PANAPASS_MAIN
  if (!view || !main?.read || document.body.classList.contains('v66-revisados')) return
  groupPanapassNavigation()
  renderPanapass(view)
}

function groupPanapassNavigation(): void {
  const nav = document.querySelector<HTMLElement>('.side .nav')
  if (!nav || nav.querySelector('[data-rym-pan-nav]')) return
  const groups = [
    { label: 'OPERACIÓN', modules: ['dashboard', 'negativos_hoy', 'pagos_hoy'] },
    { label: 'GESTIÓN', modules: ['cargar_pagos', 'historial', 'recurrentes', 'bajas_panapass'] },
    { label: 'ANÁLISIS', modules: ['ranking', 'reportes', 'recorrido', 'operaciones'] },
  ]
  const fragment = document.createDocumentFragment()
  const ordered = new Set<HTMLElement>()
  for (const group of groups) {
    const buttons = group.modules.map(code => nav.querySelector<HTMLElement>(`[data-m="${code}"]`)).filter((button): button is HTMLElement => !!button)
    if (!buttons.length) continue
    const label = document.createElement('div')
    label.className = 'rym-pan-nav-label'
    label.dataset.rymPanNav = '1'
    label.textContent = group.label
    fragment.append(label)
    for (const button of buttons) { ordered.add(button); fragment.append(button) }
  }
  for (const child of [...nav.children]) if (!ordered.has(child as HTMLElement)) fragment.append(child)
  nav.replaceChildren(fragment)
}

export async function renderPanapass(view = document.querySelector<HTMLElement>('#view')): Promise<void> {
  if (!view) return
  disposePanapass()
  document.body.classList.add('rym-panapass-vue')
  const sequence = ++panapassSequence
  view.innerHTML = '<div id="rym-vue-next-panapass"></div>'
  const root = view.querySelector<HTMLElement>('#rym-vue-next-panapass')
  if (!root) return
  const read = window.__RYM_VUE_NEXT_PANAPASS_MAIN?.read
  if (!read) return
  const observer = new MutationObserver(() => {
    if (!root.isConnected) disposePanapass()
  })
  panapassObserver = observer
  observer.observe(view, { childList: true, subtree: true })
  const componentState = reactive({ snapshot: null as PanapassSnapshot | null, loading: true, error: '', stale: false })
  const load = async (force = false) => {
    componentState.loading = true
    componentState.error = ''
    try {
      const next = await read(force)
      if (sequence !== panapassSequence || !root.isConnected || document.querySelector('#view') !== view) return
      componentState.snapshot = next
      componentState.stale = next.state === 'stale'
      componentState.error = next.error || ''
    } catch (error) {
      if (sequence !== panapassSequence || !root.isConnected) return
      componentState.error = error instanceof Error ? error.message : String(error)
    } finally {
      if (sequence === panapassSequence && root.isConnected) componentState.loading = false
    }
  }
  let PanapassView: typeof import('./views/PanapassView.vue')['default']
  try {
    const [component] = await Promise.all([import('./views/PanapassView.vue'), loadPanapassStyles()])
    PanapassView = component.default
  } catch (error) {
    if (sequence === panapassSequence && root.isConnected) {
      const alert = document.createElement('section')
      alert.className = 'pan-state pan-error'
      alert.setAttribute('role', 'alert')
      const message = document.createElement('span')
      message.textContent = 'No se pudo cargar el dashboard Panapass. Comprueba tu conexión e inténtalo de nuevo.'
      const retry = document.createElement('button')
      retry.type = 'button'
      retry.textContent = 'Reintentar'
      retry.onclick = () => { void renderPanapass(view) }
      alert.append(message, retry)
      root.replaceChildren(alert)
    }
    return
  }
  if (sequence !== panapassSequence || !root.isConnected || document.querySelector('#view') !== view) return
  panapassApp = createApp(PanapassView, { state: componentState, retry: () => { void load(true) } })
  panapassApp.mount(root)
  void load()
}

export function disposePanapass(): void {
  panapassSequence++
  document.body.classList.remove('rym-panapass-vue')
  panapassObserver?.disconnect()
  panapassObserver = null
  panapassApp?.unmount()
  panapassApp = null
}

function normUnit(val: unknown): string {
  return String(val ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()
}

function extractSinPanapassFromSummary(summary: HomeSummary | null | undefined): number | null {
  if (!summary) return null
  const s = summary as any
  if (typeof s.control_sin_panapass === 'number') return s.control_sin_panapass
  if (typeof s.panapass?.sin_panapass === 'number') return s.panapass.sin_panapass
  if (typeof s.control?.sin_panapass === 'number') return s.control.sin_panapass
  if (Array.isArray(summary.alerts)) {
    for (const a of summary.alerts) {
      const txt = `${a.title || ''} ${a.text || ''}`
      const m = txt.match(/(\d+)\s+.*sin\s+panapass/i)
      if (m) return Number(m[1])
    }
  }
  if (typeof summary.panapass?.bajas?.alertas === 'number') {
    return summary.panapass.bajas.alertas
  }
  return null
}

function extractBajasPendientesFromSummary(summary: HomeSummary | null | undefined): number | null {
  if (!summary) return null
  const p = summary.panapass as Record<string, any> | undefined
  if (typeof p?.bajas?.pendientes === 'number') return Math.max(0, p.bajas.pendientes)
  if (typeof p?.bajas_pendientes === 'number') return Math.max(0, p.bajas_pendientes)
  if (Array.isArray(summary.alerts)) {
    for (const a of summary.alerts) {
      const txt = `${a.title || ''} ${a.text || ''}`
      const m = txt.match(/(\d+)\s+bajas?\s+pendientes?/i)
      if (m) return Number(m[1])
    }
  }
  return null
}

async function refreshPanapassAudit(force = false): Promise<void> {
  if (!state || !isHomeActive()) return
  const summary = state.summary
  const sinFromSummary = extractSinPanapassFromSummary(summary)
  const bajasFromSummary = extractBajasPendientesFromSummary(summary)
  const negSummary = typeof summary?.panapass?.negativos_hoy === 'number' ? summary.panapass.negativos_hoy : null
  const pagSummary = typeof summary?.panapass?.pagos_hoy === 'number' ? summary.panapass.pagos_hoy : null

  const api = window.__RYM_VUE_NEXT_API
  if (!api?.rpc || !summary?.panapass) {
    const hasPagos = (pagSummary ?? 0) > 0
    const scenario = negSummary === null
      ? 'UNCONFIRMED'
      : (hasPagos ? 'PM_COMPLETED' : 'AM_CUT')
    state.panapassAudit = {
      loaded: true,
      scenario,
      negativosDetectados: negSummary,
      negativosConPago: pagSummary ?? 0,
      negativosPendientesReales: scenario === 'UNCONFIRMED' ? null : 0,
      pagosPreparadosHoy: 0,
      pagosArchivadosHoy: pagSummary ?? 0,
      pagosEjecutadosHoy: pagSummary,
      sinPanapassActivo: sinFromSummary,
      bajasPendientes: bajasFromSummary,
      fuenteEsHoy: scenario !== 'UNCONFIRMED',
      estadoGestionLabel: scenario === 'PM_COMPLETED'
        ? 'Gestión PM completada'
        : scenario === 'AM_CUT'
          ? 'Corte AM registrado'
          : 'Pendiente de actualización',
      ultimaConsultaAt: summary?.generated_at || null,
    }
    return
  }

  try {
    const ctx = api.viewContext ? api.viewContext() : { today: null, isAdmin: false }
    const today = ctx.today || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date())

    // Consultar prioritariamente la función oficial backend panapass_inicio_conciliado_v1()
    const conciliadoResPromise = api.rpc<any>('panapass_inicio_conciliado_v1', {}).catch(err => {
      console.warn('RPC panapass_inicio_conciliado_v1 no disponible o error:', err)
      return null
    })

    const [conciliadoRes, negRowsRes, pagRowsRes, hojaRowsRes, estadoRes, enaRunsRes, bajasRes] = await Promise.all([
      conciliadoResPromise,
      api.rpc<any[]>('panapass_negativos_fecha_v2', { p_fecha: today, p_galera: null, p_supervisora_id: null }).catch(() => null),
      api.rpc<any[]>('panapass_pagos_fecha_v2', { p_fecha: today, p_galera: null, p_supervisora: null }).catch(() => null),
      api.rpc<any[]>('panapass_v10_pagos_hoy', {}).catch(() => null),
      api.rpc<any[]>('panapass_v10_estado_operativo', {}).catch(() => null),
      api.rpc<any[]>('panapass_ena_estado', {}).catch(() => null),
      api.rpc<any>('panapass_bajas_centro_v7', {}).catch(() => null),
    ])

    if (!state || !isHomeActive()) return

    const conciliado = (conciliadoRes && typeof conciliadoRes === 'object') ? (Array.isArray(conciliadoRes) ? conciliadoRes[0] : conciliadoRes) : null

    const negRows = Array.isArray(negRowsRes) ? negRowsRes : null
    const pagRows = Array.isArray(pagRowsRes) ? pagRowsRes : null
    const hojaRows = Array.isArray(hojaRowsRes) ? hojaRowsRes : null
    const estadoOp = Array.isArray(estadoRes) ? estadoRes[0] : (estadoRes || null)
    const enaRuns = Array.isArray(enaRunsRes) ? enaRunsRes : null

    const run6 = enaRuns?.find(r => String(r?.tipo || '').toUpperCase() === '6AM') || null
    const run11 = enaRuns?.find(r => String(r?.tipo || '').toUpperCase() === '11AM') || null
    const run11Estado = String(run11?.estado || '').toUpperCase()

    // 1. Pagos realizados hoy (únicamente cuando estén confirmados: archivados, guardados/validados o registrados en pm_pagados)
    const paidUnitsSet = new Set<string>()
    let pagosArchivadosCount = pagSummary ?? 0
    if (pagRows) {
      const validPag = pagRows.filter(r => {
        const monto = Number(r?.a_pagar ?? r?.monto ?? 0)
        const st = normUnit(r?.status || r?.estado || 'CONFIRMADO')
        return monto > 0 && st !== 'ANULADO' && st !== 'RECHAZADO' && st !== 'BORRADOR'
      })
      pagosArchivadosCount = validPag.length
      for (const r of validPag) {
        const u = normUnit(r?.unidad)
        if (u) paidUnitsSet.add(u)
      }
    }

    let pagosPreparadosCount = 0
    let hojaCargadosCount = 0
    if (hojaRows) {
      hojaCargadosCount = hojaRows.filter(r => normUnit(r?.origen_registro) !== 'EXTRAORDINARIO').length
      const validHoja = hojaRows.filter(r => {
        const monto = Number(r?.a_pagar ?? 0)
        if (monto <= 0) return false
        const st = normUnit(r?.status || r?.estado || '')
        // Contabilizar solamente cuando el pago esté confirmado/guardado (no borradores no confirmados)
        if (st === 'BORRADOR' || st === 'PENDIENTE_CONFIRMAR' || st === 'RECHAZADO') return false
        if (r?.guardado_en === false) return false
        return true
      })
      pagosPreparadosCount = validHoja.length
      for (const r of validHoja) {
        const u = normUnit(r?.unidad)
        if (u) paidUnitsSet.add(u)
      }
    }

    const opPmPagados = typeof estadoOp?.pm_pagados === 'number' ? estadoOp.pm_pagados : 0
    const pagosEjecutadosHoy = Math.max(pagosArchivadosCount, pagosPreparadosCount, opPmPagados, pagSummary ?? 0)

    // 2. Fotografía histórica del corte AM (NO asumir que todas siguen negativas en la tarde)
    let negativosDetectados: number | null = negSummary
    if (typeof estadoOp?.am_negativos === 'number') {
      negativosDetectados = estadoOp.am_negativos
    } else if (negRows) {
      const negUnits = [...new Set(negRows.map(r => normUnit(r?.unidad)).filter(Boolean))]
      negativosDetectados = negUnits.length
    }

    // 3. Unidades sin Panapass activo y Bajas pendientes (categorías independientes)
    let sinPan = sinFromSummary
    if (bajasRes && Array.isArray(bajasRes.alertas)) {
      const alertUnits = new Set(
        bajasRes.alertas
          .filter((x: any) => !x?.tipo || normUnit(x?.tipo) === 'PANAPASS_NO_ASIGNADO' || normUnit(x?.tipo).includes('PANAPASS'))
          .map((x: any) => normUnit(x?.unidad || x?.id || JSON.stringify(x)))
          .filter(Boolean)
      )
      sinPan = alertUnits.size
    }

    let bajasPend = bajasFromSummary
    if (bajasRes && Array.isArray(bajasRes.pendientes)) {
      const pendUnits = new Set(
        bajasRes.pendientes
          .filter((x: any) => {
            const st = normUnit(x?.estado || x?.status || 'PENDIENTE')
            return st !== 'COMPLETADA' && st !== 'COMPLETADO' && st !== 'FINALIZADA'
          })
          .map((x: any) => normUnit(x?.id || x?.unidad || JSON.stringify(x)))
          .filter(Boolean)
      )
      bajasPend = pendUnits.size
    }

    // 4. Última consulta / corte confirmado
    const ultimaConsultaAt =
      run11?.finalizado_en ||
      run6?.finalizado_en ||
      bajasRes?.ultimo_corte?.capturado_en ||
      summary?.generated_at ||
      null

    // 5. Clasificación de los Escenarios Operativos AM/PM (FASE 2 & VALIDACIÓN FINAL AM/PM)
    // Reglas estrictas:
    // - AM conserva los negativos (ej. 122) como dato histórico y NO los interpreta como pagos pendientes.
    // - Errores o ausencia de datos del PM NUNCA se interpretan como gestión completada.
    // - Cuando llega información confirmada del PM:
    //   - Si quedan unidades pendientes reales (> 0) -> PM_PENDING (naranja/ámbar).
    //   - Si el PM confirma que NO quedan pagos pendientes (0) -> PM_COMPLETED (verde/neutral, sin naranja).
    let scenario: 'AM_CUT' | 'PM_COMPLETED' | 'PM_PENDING' | 'UNCONFIRMED' = 'AM_CUT'
    let negativosPendientesReales: number | null = 0
    let estadoGestionLabel = 'Corte AM en seguimiento'
    let fuenteEsHoy = true

    const pmRunHasError = ['ERROR', 'EXPIRADO', 'FUENTE_INCOMPLETA'].includes(run11Estado)
    const allMainRpcsFailed = estadoOp === null && enaRuns === null && hojaRows === null && pagRows === null

    if (allMainRpcsFailed || pmRunHasError || (estadoOp && estadoOp.fuente_es_hoy === false)) {
      // Regla 8: Errores o ausencia de datos del PM nunca se interpretan como gestión completada
      scenario = 'UNCONFIRMED'
      fuenteEsHoy = false
      negativosPendientesReales = null
      estadoGestionLabel = 'Pendiente de actualización'
    } else if (estadoOp && typeof estadoOp.pm_pendientes === 'number') {
      const pmPendRaw = Math.max(0, Number(estadoOp.pm_pendientes))
      const motivoPmNorm = normUnit(estadoOp.motivo_pm)
      // Determinar si ya se obtuvo o procesó información del PM (11:05 AM)
      const hasPmInfo =
        run11Estado === 'LISTO' ||
        pmPendRaw > 0 ||
        pagosEjecutadosHoy > 0 ||
        hojaCargadosCount > 0 ||
        motivoPmNorm.includes('PROCESADO') ||
        motivoPmNorm.includes('COMPLETADO') ||
        motivoPmNorm.includes('YA EJECUTADO')

      if (!hasPmInfo) {
        // Todavía estamos en horario/etapa AM: conservar los 122 negativos como dato histórico en seguimiento
        scenario = 'AM_CUT'
        negativosPendientesReales = 0
        estadoGestionLabel = 'Corte AM en seguimiento'
      } else if (hojaRows && hojaCargadosCount > 0) {
        const unpaidInSheet = Math.max(0, hojaCargadosCount - pagosPreparadosCount)
        if (unpaidInSheet > 0) {
          scenario = 'PM_PENDING'
          negativosPendientesReales = unpaidInSheet
          estadoGestionLabel = `${unpaidInSheet} pendientes PM`
        } else {
          scenario = 'PM_COMPLETED'
          negativosPendientesReales = 0
          estadoGestionLabel = pagosEjecutadosHoy > 0 ? 'Gestión PM completada' : 'PM sin pagos pendientes'
        }
      } else if (pmPendRaw > 0) {
        if (pagosEjecutadosHoy > 0 && pmPendRaw <= opPmPagados && pagosArchivadosCount >= pmPendRaw) {
          scenario = 'PM_COMPLETED'
          negativosPendientesReales = 0
          estadoGestionLabel = 'Gestión PM completada'
        } else {
          // Si pm_pendientes reporta el total del corte PM y ya hay pagos confirmados de esas unidades, descontar solo los confirmados
          const remainingPm = opPmPagados > 0 && pmPendRaw > opPmPagados
            ? pmPendRaw
            : Math.max(0, pmPendRaw - pagosArchivadosCount)
          if (remainingPm > 0) {
            scenario = 'PM_PENDING'
            negativosPendientesReales = remainingPm
            estadoGestionLabel = `${remainingPm} pendientes PM`
          } else {
            scenario = 'PM_COMPLETED'
            negativosPendientesReales = 0
            estadoGestionLabel = 'Gestión PM completada'
          }
        }
      } else {
        // hasPmInfo === true y pmPendRaw === 0: el PM confirma que no quedan pagos pendientes
        scenario = 'PM_COMPLETED'
        negativosPendientesReales = 0
        estadoGestionLabel = pagosEjecutadosHoy > 0 ? 'Gestión PM completada' : 'PM sin pagos pendientes'
      }
    } else {
      // Respaldo cuando estadoOp no está disponible (ej. rol sin acceso a estadoOp, pero con acceso a runs/hoja/pagos)
      if (hojaRows && hojaCargadosCount > 0) {
        const unpaidInSheet = Math.max(0, hojaCargadosCount - pagosPreparadosCount)
        if (unpaidInSheet > 0) {
          scenario = 'PM_PENDING'
          negativosPendientesReales = unpaidInSheet
          estadoGestionLabel = `${unpaidInSheet} pendientes PM`
        } else {
          scenario = 'PM_COMPLETED'
          negativosPendientesReales = 0
          estadoGestionLabel = 'Gestión PM completada'
        }
      } else if (pagosEjecutadosHoy > 0 || run11Estado === 'LISTO') {
        scenario = 'PM_COMPLETED'
        negativosPendientesReales = 0
        estadoGestionLabel = pagosEjecutadosHoy > 0 ? 'Gestión PM completada' : 'PM sin pagos pendientes'
      } else if (negativosDetectados !== null && negativosDetectados >= 0) {
        scenario = 'AM_CUT'
        negativosPendientesReales = 0
        estadoGestionLabel = 'Corte AM en seguimiento'
      } else {
        scenario = 'UNCONFIRMED'
        fuenteEsHoy = false
        negativosPendientesReales = null
        estadoGestionLabel = 'Sin confirmar'
      }
    }

    // Si conciliadoRes vino del backend con datos oficiales:
    let finalNegativosDetectados = negSummary !== null && negSummary > 0 ? negSummary : negativosDetectados
    let finalPagosEjecutados = pagosEjecutadosHoy
    let finalPagosMonto: number | null = null
    let finalPositivosVerificados: number | null = null
    let finalNegativosSinPago: number | null = null
    let finalSinConsultaPosterior: number | null = null
    let finalUltimaConsultaAt = ultimaConsultaAt

    if (conciliado) {
      if (typeof conciliado.negativos_am === 'number' && conciliado.negativos_am > 0) {
        finalNegativosDetectados = conciliado.negativos_am
      } else if (negSummary !== null && negSummary > 0) {
        finalNegativosDetectados = Math.max(negSummary, finalNegativosDetectados ?? 0)
      }

      if (typeof conciliado.pagos_reales_unidades === 'number') {
        finalPagosEjecutados = conciliado.pagos_reales_unidades
      }
      if (typeof conciliado.pagos_reales_monto === 'number') {
        finalPagosMonto = conciliado.pagos_reales_monto
      }
      if (typeof conciliado.positivos_verificados === 'number') {
        finalPositivosVerificados = conciliado.positivos_verificados
      }
      if (typeof conciliado.negativos_sin_pago_registrado === 'number') {
        finalNegativosSinPago = conciliado.negativos_sin_pago_registrado
        negativosPendientesReales = conciliado.negativos_sin_pago_registrado
        if (conciliado.negativos_sin_pago_registrado > 0) {
          scenario = 'PM_PENDING'
          estadoGestionLabel = `${conciliado.negativos_sin_pago_registrado} por verificar`
        } else if (finalPagosEjecutados > 0 || (finalPositivosVerificados !== null && finalPositivosVerificados > 0)) {
          scenario = 'PM_COMPLETED'
          estadoGestionLabel = 'Gestión conciliada al día'
        } else if (finalNegativosDetectados && finalNegativosDetectados > 0) {
          // Si el corte AM tiene negativos y no hay pagos ni positivos confirmados hoy,
          // no marcar como completado: es un corte AM activo en seguimiento
          scenario = 'AM_CUT'
          estadoGestionLabel = `${finalNegativosDetectados} por revisar`
        } else {
          scenario = 'PM_COMPLETED'
          estadoGestionLabel = 'Al día'
        }
      }
      if (typeof conciliado.sin_consulta_posterior === 'number') {
        finalSinConsultaPosterior = conciliado.sin_consulta_posterior
      }
      if (conciliado.ultima_consulta_saldo_at || conciliado.generated_at) {
        finalUltimaConsultaAt = conciliado.ultima_consulta_saldo_at || conciliado.generated_at
      }
    }

    // Regla de salvaguarda de corte AM: si hay negativos AM detectados y 0 pagos realizados hoy,
    // el escenario NUNCA puede ser 'PM_COMPLETED' ("Gestión completada").
    if ((finalNegativosDetectados ?? 0) > 0 && finalPagosEjecutados === 0 && (finalPositivosVerificados ?? 0) === 0) {
      scenario = 'AM_CUT'
      estadoGestionLabel = `${finalNegativosDetectados} por revisar`
      negativosPendientesReales = finalNegativosDetectados
    }

    state.panapassAudit = {
      loaded: true,
      conciliadoData: conciliado,
      scenario,
      negativosDetectados: finalNegativosDetectados,
      negativosConPago: finalPagosEjecutados,
      negativosPendientesReales,
      pagosPreparadosHoy: pagosPreparadosCount,
      pagosArchivadosHoy: pagosArchivadosCount,
      pagosEjecutadosHoy: finalPagosEjecutados,
      pagosRealesMonto: finalPagosMonto,
      positivosVerificados: finalPositivosVerificados,
      negativosSinPagoRegistrado: finalNegativosSinPago,
      sinConsultaPosterior: finalSinConsultaPosterior,
      sinPanapassActivo: sinPan,
      bajasPendientes: bajasPend,
      fuenteEsHoy,
      estadoGestionLabel,
      ultimaConsultaAt: finalUltimaConsultaAt,
      corte6am: run6?.estado || undefined,
      corte11am: run11?.estado || undefined,
    }
  } catch (err) {
    if (!state) return
    state.panapassAudit = {
      loaded: true,
      error: err instanceof Error ? err.message : 'No se pudo consultar el estado ENA',
      scenario: 'UNCONFIRMED',
      negativosDetectados: negSummary,
      negativosConPago: pagSummary ?? 0,
      negativosPendientesReales: null,
      pagosPreparadosHoy: 0,
      pagosArchivadosHoy: pagSummary ?? 0,
      pagosEjecutadosHoy: pagSummary,
      sinPanapassActivo: sinFromSummary,
      bajasPendientes: bajasFromSummary,
      fuenteEsHoy: false,
      estadoGestionLabel: 'Sin confirmar',
      ultimaConsultaAt: summary?.generated_at || null,
    }
  }
}

export function renderHome(summary: HomeSummary): void {
  disposeLogin()
  const root = document.querySelector<HTMLElement>('#app')
  if (!root) return
  if (state && !document.querySelector('#rym-vue-next-home')) disposeHome()
  if (!state) {
    state = reactive(createDashboardState({ profile: profileOf(summary), modules: summary.modules || [] })) as DashboardState
    methods = currentActions()
    root.innerHTML = '<div id="rym-vue-next-home"></div>'
    app = createApp(HomeView, { state, actions: methods, hasModule: (code: string) => window.rymHasModule?.(code) ?? state?.session.modules.includes(code) ?? false, validatorApi: { search: (query: string) => window.__RYM_VUE_NEXT_HOME_MAIN?.searchValidator?.(query) ?? Promise.resolve([]), load: (unit: Record<string, unknown>) => window.__RYM_VUE_NEXT_HOME_MAIN?.loadValidator?.(unit) ?? Promise.reject(Error('El validador no está disponible.')), enrich: (detail: Record<string, any>) => window.__RYM_VUE_NEXT_HOME_MAIN?.enrichValidator?.(detail) ?? Promise.resolve(detail), ficha: async (unit: Record<string, unknown>) => { const api = window.__RYM_VUE_NEXT_API; if (!api) throw Error('El servicio de ficha no está disponible.'); return api.call('revisados-ficha', { placa: String(unit.placa_unica ?? unit.placa ?? unit.placa_comercial ?? ''), unidad: String(unit.unidad ?? unit.unit ?? '') }) }, gps: async (unit: Record<string, unknown>) => { const api = window.__RYM_VUE_NEXT_API; if (!api?.hasModule('portal.gps')) throw Error('No se pudo validar el GPS con el servicio alterno.'); return api.call('gps-rym-admin', { q: String(unit.unidad ?? unit.unit ?? '') , galera: 'TODAS', estado: 'TODOS', nivel: 'TODOS', onlyProblems: false }) } } })
    app.mount('#rym-vue-next-home')
    controlIndicatorsRequested = false
    gpsIndicatorsRequested = false
    panapassAuditRequested = false
  }
  Object.assign(state.session, { profile: summary.profile || state.session.profile, modules: summary.modules || state.session.modules })
  Object.assign(state, acceptHomeSummary(state, summary))
  void nextTick(() => {
    if (!state || !document.querySelector('[data-testid="vue-next-home"]')) return
    const role = String(state.session.profile.rol || '').toUpperCase()
    const control = !!state.summary?.control && !controlIndicatorsRequested
    const gps = canOpen(state.session, 'gps', window.rymHasModule) && !gpsIndicatorsRequested
    if (control) {
      controlIndicatorsRequested = true
      void window.__RYM_VUE_NEXT_HOME_MAIN?.refreshIndicators?.(role, { control: true, gps: false })
    }
    if (gps) {
      gpsIndicatorsRequested = true
      void window.__RYM_VUE_NEXT_GPS_PRIORITY?.()
    }
    if (state.summary?.panapass && !panapassAuditRequested) {
      panapassAuditRequested = true
      void refreshPanapassAudit()
    } else if (state.summary?.panapass) {
      // Actualizar sinPanapass o conteos si llegó un resumen nuevo
      void refreshPanapassAudit()
    }
  })
}

export function mountValidatorApp(root: HTMLElement, access: 'allowed' | 'denied' = 'allowed'): void {
  if (validatorApp && root.querySelector('[data-testid="vue-unit-validator"]')) {
    setValidatorAccess(access)
    return
  }
  validatorApp?.unmount()
  root.replaceChildren()
  validatorProps = reactive({
    access,
    api: {
      search: (query: string) => window.searchValidator99?.(query, false) ?? Promise.resolve([]),
      load: (unit: Record<string, unknown>) => window.__RYM_VUE_NEXT_HOME_MAIN?.loadValidator?.(unit) ?? window.loadValidatorDetail99?.(unit, { deferChecks: true }) ?? Promise.reject(Error('El validador no está disponible.')),
      enrich: (detail: any) => window.__RYM_VUE_NEXT_HOME_MAIN?.enrichValidator?.(detail) ?? Promise.resolve(detail),
      ficha: async (unit: Record<string, unknown>) => { if (window.__RYM_VUE_NEXT_HOME_MAIN?.fichaValidator) return window.__RYM_VUE_NEXT_HOME_MAIN.fichaValidator(unit); const api = window.__RYM_VUE_NEXT_API; if (!api) throw Error('Ficha no disponible.'); return api.call('revisados-ficha', { placa: String(unit.placa_unica ?? unit.placa ?? unit.placa_comercial ?? ''), unidad: String(unit.unidad ?? unit.unit ?? '') }) },
    },
  })
  validatorApp = createApp(ValidatorAppView, validatorProps)
  validatorApp.mount(root)
}

export function setValidatorAccess(access: 'allowed' | 'denied'): void {
  if (validatorProps) validatorProps.access = access
}

export function disposeValidatorApp(): void {
  validatorApp?.unmount()
  validatorApp = null
  validatorProps = null
}

export function failHome(error: unknown): void {
  if (state) Object.assign(state, failHomeSummary(state, error))
}

export function isHomeActive(): boolean { return !!state && !!document.querySelector('[data-testid="vue-next-home"]') }
export function hasControlSummary(): boolean { return isHomeActive() && !!state?.summary?.control }
export function setControlIndicators(data: ExecutiveIndicators): void { if (isHomeActive() && state) Object.assign(state, acceptIndicator(state, 'control', data)) }
export function setGpsIndicators(data: ExecutiveIndicators): void { if (isHomeActive() && state) Object.assign(state, acceptIndicator(state, 'gps', data)) }
export function failControlIndicators(error: unknown): void { if (isHomeActive() && state) Object.assign(state, failIndicator(state, 'control', error)) }
export function failGpsIndicators(error: unknown): void { if (isHomeActive() && state) Object.assign(state, failIndicator(state, 'gps', error)) }

export function disposeHome(): void { app?.unmount(); app = null; state = null; controlIndicatorsRequested = false; gpsIndicatorsRequested = false; panapassAuditRequested = false }

let viewApp: ReturnType<typeof createApp> | null = null
const nativeViews: Record<string, () => Promise<{ default: Component }>> = {
  ranking: () => import('./views/RankingView.vue'),
  historial: () => import('./views/HistorialView.vue'),
  operaciones: () => import('./views/OperacionesView.vue'),
  pagos_hoy: () => import('./views/PagosView.vue'),
  negativos_hoy: () => import('./views/NegativosView.vue'),
  cargar_pagos: () => import('./views/CargarPagosView.vue'),
  recurrentes: () => import('./views/RecurrentesView.vue'),
  reportes: () => import('./views/ReportesView.vue'),
  usuarios: () => import('./views/UsuariosView.vue'),
}

export function disposeView(): void {
  viewApp?.unmount()
  viewApp = null
}

/** Monta una vista Vue nativa en #view. Devuelve false si el módulo sigue en legacy o si falla el montaje. */
export async function mountView(moduleId: string, root: HTMLElement): Promise<boolean> {
  disposeView()
  const loader = nativeViews[moduleId]
  if (!loader) return false
  try {
    const { default: View } = await loader()
    root.innerHTML = ''
    const host = document.createElement('div')
    root.appendChild(host)
    viewApp = createApp(View)
    viewApp.mount(host)
    return true
  } catch {
    return false
  }
}
