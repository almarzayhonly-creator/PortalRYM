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

export interface PanapassAuditIndicators {
  loaded?: boolean
  error?: string
  /** Escenario operativo AM/PM: 'AM_CUT' | 'PM_COMPLETED' | 'PM_PENDING' | 'UNCONFIRMED' */
  scenario?: 'AM_CUT' | 'PM_COMPLETED' | 'PM_PENDING' | 'UNCONFIRMED'
  /** Negativos detectados en el corte AM (fotografía histórica) */
  negativosDetectados?: number | null
  /** Unidades negativas que recibieron pago */
  negativosConPago?: number
  /** Negativos pendientes reales actuales después de evaluar PM y pagos ejecutados */
  negativosPendientesReales?: number | null
  pagosPreparadosHoy?: number
  pagosArchivadosHoy?: number
  /** Pagos reales ejecutados hoy */
  pagosEjecutadosHoy?: number | null
  /** Unidades operativas que deberían tener Panapass pero no tienen uno activo */
  sinPanapassActivo?: number | null
  /** Solicitudes de baja de Panapass pendientes de gestión o confirmación */
  bajasPendientes?: number | null
  /** Indica si la fuente ENA está confirmada con datos del día de hoy */
  fuenteEsHoy?: boolean
  /** Etiqueta descriptiva del estado de gestión AM/PM */
  estadoGestionLabel?: string
  /** Fecha/hora de última consulta o corte confirmado */
  ultimaConsultaAt?: string | null
  corte6am?: string
  corte11am?: string
}

export interface ModuleAction {
  panapass?: () => unknown
  panapassSinActivo?: () => unknown
  panapassBajasPendientes?: () => unknown
  revisados?: () => unknown
  revisadosCriticos?: () => unknown
  control?: () => unknown
  controlParadas?: () => unknown
  gps?: () => unknown
  gpsCriticos?: () => unknown
  users?: () => unknown
  logout?: () => unknown
  retry?: () => unknown
  retryIndicators?: () => unknown
  navigateLegacy?: (moduleId: string) => unknown
}
