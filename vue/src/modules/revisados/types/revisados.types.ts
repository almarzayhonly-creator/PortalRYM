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
  emitido?: boolean
  ultimo_revisado?: string
  prioridad?: string
  bloqueado?: boolean
  incidencias_abiertas?: CanonicalIncident[]
  alertas_auto?: CanonicalAlert[]
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
  kpis?: Record<string, number>
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
