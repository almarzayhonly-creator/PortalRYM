export interface PortalProfile {
  id?: string
  nombre?: string
  email?: string
  rol?: string
  galera?: string
}

export interface PortalSession {
  profile: PortalProfile
  modules: string[]
}

export interface HomeSummary {
  ok?: boolean
  profile?: PortalProfile
  modules?: string[]
  generated_at?: string
  panapass?: {
    negativos_hoy?: number
    pagos_hoy?: number
    monto_mes?: number
    rank?: { posicion_galera?: number; total_galera?: number; galera?: string }
    bajas?: { pendientes?: number; alertas?: number; procesadas?: number; devoluciones?: number }
  } | null
  revisados?: { pendientes?: number; criticos?: number; emitidos_hoy?: number; limite_hoy?: number } | null
  control?: { activas?: number; otros?: number; cerradas?: number } | null
  alerts?: Array<{ level?: string; title?: string; text?: string; module?: string }>
}

export interface ExecutiveIndicators {
  ok?: boolean
  totals?: { activas?: number; paradas?: number; abono_adicional?: number }
  kpis?: { criticos?: number; alertas?: number; sin_gps?: number; pending?: number }
}

export interface ModuleAction {
  panapass?: () => unknown
  revisados?: () => unknown
  control?: () => unknown
  gps?: () => unknown
  users?: () => unknown
  logout?: () => unknown
  retry?: () => unknown
  retryIndicators?: () => unknown
  navigateLegacy?: (moduleId: string) => unknown
}
