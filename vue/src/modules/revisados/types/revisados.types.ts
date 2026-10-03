export type RevisadoEstado =
  | 'vigente'
  | 'pendiente_ciclo'
  | 'pendiente_cambio_color'
  | 'no_aplica'
  | 'incidencia'

export interface RevisadoRecord {
  id: string
  unidad: string
  placa: string
  galera: string
  empresa?: string
  supervisora?: string
  estado: RevisadoEstado
  fechaUltimoRevisado?: string
  prioridad?: string
  detalleEstado?: string
  vigente: boolean
  requiereAtencion: boolean
  cambioColor: boolean
  tieneAlertas: boolean
}

export interface CanonicalIncident {
  tipo_codigo?: string
  tipo_nombre?: string
  estado?: string
}

export interface CanonicalAlert {
  tipo?: string
  nivel?: string
  texto?: string
}

export interface CanonicalRevisadoRow {
  unidad_id?: string | number
  unidad?: string
  placa?: string
  galera?: string
  empresa?: string
  supervisora?: string
  estado?: string
  emitido?: boolean
  requiere_atencion?: boolean
  pendiente_tipo?: string | null
  ultimo_revisado?: string
  prioridad?: string
  bloqueado?: boolean
  incidencias_abiertas?: CanonicalIncident[]
  alerts?: CanonicalAlert[]
}

export interface CanonicalRevisadosResponse {
  ok: boolean
  error?: string
  rows?: CanonicalRevisadoRow[]
  profile?: {
    nombre?: string
    rol?: string
    scope_label?: string
    can?: Record<string, boolean>
  }
  kpis?: {
    activas?: number
    cubiertas?: number
    pendientes?: number
    pendientes_normales?: number
    pendientes_externos?: number
    pendientes_color?: number
    pendientes_criticos?: number
    sin_fotos?: number
    con_boleta?: number
    con_boleta_empresa?: number
    con_alertas?: number
    bloqueadas?: number
    emitidos_hoy?: number
  }
}

export interface RevisadosFilters {
  galeras: string[]
  supervisoras: string[]
  estados: RevisadoEstado[]
  search: string
}

export interface RevisadosMetrics {
  total: number
  vigentes: number
  pendientesCiclo: number
  cambiosColor: number
  incidencias: number
}
