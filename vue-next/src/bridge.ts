import { createApp, nextTick, reactive } from 'vue'
import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import ValidatorAppView from './views/ValidatorAppView.vue'
import { acceptHomeSummary, acceptIndicator, createDashboardState, failHomeSummary, failIndicator } from './dashboard'
import type { DashboardState } from './dashboard'
import type { ExecutiveIndicators, HomeSummary, ModuleAction, PortalProfile } from './types'
import type { PanapassSnapshot } from './panapass'
import './style.css'

declare global {
  interface Window {
    __RYM_VUE_NEXT_API?: {
      context: () => { profile: PortalProfile | null; modules: string[] }
      hasModule: (code: string) => boolean
      call: <T = Record<string, unknown>>(name: string, body?: Record<string, unknown>) => Promise<T>
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
    __RYM_VUE_NEXT_HOME_MAIN?: { searchValidator?: (query: string) => Promise<Record<string, unknown>[]>; loadValidator?: (unit: Record<string, unknown>) => Promise<unknown>; refreshIndicators?: (role: string, scope: { control: boolean; gps: boolean }) => unknown }
    __RYM_VUE_NEXT_LOGIN?: { render: (error?: string) => void; dispose: () => void }
    __RYM_VUE_NEXT_PANAPASS_MAIN?: { read?: (force?: boolean) => Promise<PanapassSnapshot> }
    searchValidator99?: (query: string, render?: boolean) => Promise<Record<string, unknown>[]>
    loadValidatorDetail99?: (unit: Record<string, unknown>) => Promise<unknown>
    __RYM_VUE_NEXT_GPS_PRIORITY?: () => unknown
  }
}

let app: ReturnType<typeof createApp> | null = null
let loginApp: ReturnType<typeof createApp> | null = null
let loginProps: { error: string; onSubmit: (event: SubmitEvent) => Promise<void> | void } | null = null
let state: DashboardState | null = null
let methods: ModuleAction = {}
let controlIndicatorsRequested = false
let gpsIndicatorsRequested = false
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
function currentActions(): ModuleAction {
  return {
    panapass: () => openPanapass(),
    revisados: () => openOperationalModule('revisados'),
    control: () => openOperationalModule('control'),
    gps: () => openOperationalModule('gps'),
    users: () => openOperationalModule('users'),
    logout: () => routeTo(logoutToLogin),
    retry: () => window.v36PortalHome?.(),
    retryIndicators: () => {
      if (!state) return
      if (state.summary?.control && !state.controlIndicators) { state.controlState = 'loading'; state.controlError = '' }
      if (String(state.session.profile.rol || '').toUpperCase() === 'ADMIN_TOTAL' && !state.gpsIndicators) { state.gpsState = 'loading'; state.gpsError = '' }
      const role = String(state.session.profile.rol || '').toUpperCase()
      void window.__RYM_VUE_NEXT_HOME_MAIN?.refreshIndicators?.(role, { control: !!state.summary?.control, gps: false })
      if (role === 'ADMIN_TOTAL') void window.__RYM_VUE_NEXT_GPS_PRIORITY?.()
    },
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

export function renderHome(summary: HomeSummary): void {
  disposeLogin()
  const root = document.querySelector<HTMLElement>('#app')
  if (!root) return
  if (state && !document.querySelector('#rym-vue-next-home')) disposeHome()
  if (!state) {
    state = reactive(createDashboardState({ profile: profileOf(summary), modules: summary.modules || [] })) as DashboardState
    methods = currentActions()
    root.innerHTML = '<div id="rym-vue-next-home"></div>'
    app = createApp(HomeView, { state, actions: methods, hasModule: (code: string) => window.rymHasModule?.(code) ?? state?.session.modules.includes(code) ?? false, validatorApi: { search: (query: string) => window.__RYM_VUE_NEXT_HOME_MAIN?.searchValidator?.(query) ?? Promise.resolve([]), load: (unit: Record<string, unknown>) => window.__RYM_VUE_NEXT_HOME_MAIN?.loadValidator?.(unit) ?? Promise.reject(Error('El validador no está disponible.')), ficha: async (unit: Record<string, unknown>) => { const api = window.__RYM_VUE_NEXT_API; if (!api) throw Error('El servicio de ficha no está disponible.'); return api.call('revisados-ficha', { placa: String(unit.placa_unica ?? unit.placa ?? unit.placa_comercial ?? ''), unidad: String(unit.unidad ?? unit.unit ?? '') }) }, gps: async (unit: Record<string, unknown>) => { const api = window.__RYM_VUE_NEXT_API; if (!api?.hasModule('portal.gps')) throw Error('No se pudo validar el GPS con el servicio alterno.'); return api.call('gps-rym-admin', { q: String(unit.unidad ?? unit.unit ?? ''), galera: 'TODAS', estado: 'TODOS', nivel: 'TODOS', onlyProblems: false }) } } })
    app.mount('#rym-vue-next-home')
    controlIndicatorsRequested = false
    gpsIndicatorsRequested = false
  }
  Object.assign(state.session, { profile: summary.profile || state.session.profile, modules: summary.modules || state.session.modules })
  Object.assign(state, acceptHomeSummary(state, summary))
  void nextTick(() => {
    if (!state || !document.querySelector('[data-testid="vue-next-home"]')) return
    const role = String(state.session.profile.rol || '').toUpperCase()
    const control = !!state.summary?.control && !controlIndicatorsRequested
    const gps = role === 'ADMIN_TOTAL' && !gpsIndicatorsRequested
    if (!control && !gps) return
    if (control) controlIndicatorsRequested = true
    if (gps) gpsIndicatorsRequested = true
    void window.__RYM_VUE_NEXT_HOME_MAIN?.refreshIndicators?.(role, { control, gps: false })
    if (gps) void window.__RYM_VUE_NEXT_GPS_PRIORITY?.()
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
      load: (unit: Record<string, unknown>) => window.loadValidatorDetail99?.(unit) ?? Promise.reject(Error('El validador no está disponible.')),
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

export function disposeHome(): void { app?.unmount(); app = null; state = null; controlIndicatorsRequested = false; gpsIndicatorsRequested = false }
