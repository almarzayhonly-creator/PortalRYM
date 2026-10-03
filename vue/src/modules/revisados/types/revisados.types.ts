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
  supervisora?: string
  estado: RevisadoEstado
  fechaUltimoRevisado?: string
  detalleEstado?: string
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
