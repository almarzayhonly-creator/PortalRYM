import { createApp, nextTick, reactive } from 'vue'
import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import { acceptHomeSummary, acceptIndicator, createDashboardState, failHomeSummary, failIndicator } from './dashboard'
import type { DashboardState } from './dashboard'
import type { ExecutiveIndicators, HomeSummary, ModuleAction, PortalProfile } from './types'
import './style.css'

declare global {
  interface Window {
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
    __RYM_VUE_NEXT_HOME_MAIN?: { bindValidator?: () => unknown; refreshIndicators?: (role: string, scope: { control: boolean; gps: boolean }) => unknown }
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
    panapass: () => routeTo(window.v70OpenPanapass),
    revisados: () => routeTo(window.v60OpenRevisados),
    control: () => routeTo(window.v70OpenControl),
    gps: () => routeTo(window.v113OpenGps),
    users: () => routeTo(window.v70OpenUsers),
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

function logoutToLogin(): void {
  window.clearSession?.()
  disposeHome()
  renderLogin()
}

export function renderHome(summary: HomeSummary): void {
  const root = document.querySelector<HTMLElement>('#app')
  if (!root) return
  if (state && !document.querySelector('#rym-vue-next-home')) disposeHome()
  if (!state) {
    state = reactive(createDashboardState({ profile: profileOf(summary), modules: summary.modules || [] })) as DashboardState
    methods = currentActions()
    root.innerHTML = '<div id="rym-vue-next-home"></div>'
    app = createApp(HomeView, { state, actions: methods, hasModule: (code: string) => window.rymHasModule?.(code) ?? state?.session.modules.includes(code) ?? false })
    app.mount('#rym-vue-next-home')
    controlIndicatorsRequested = false
    gpsIndicatorsRequested = false
  }
  Object.assign(state.session, { profile: summary.profile || state.session.profile, modules: summary.modules || state.session.modules })
  Object.assign(state, acceptHomeSummary(state, summary))
  void nextTick(() => {
    if (!state || !document.querySelector('[data-testid="vue-next-home"]')) return
    window.__RYM_VUE_NEXT_HOME_MAIN?.bindValidator?.()
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
