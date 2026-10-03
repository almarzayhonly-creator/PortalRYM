import type {
  CanonicalAlert,
  CanonicalIncident,
  CanonicalRevisadoRow,
  CanonicalRevisadosResponse,
  RevisadoRecord,
  RevisadoEstado,
} from '../types/revisados.types'

type RevisadosBridge = {
  load(): Promise<CanonicalRevisadosResponse>
  profile(): unknown
}

declare global {
  interface Window {
    RYM_REVISADOS_BRIDGE?: RevisadosBridge
  }
}

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function incidentLabel(incident: CanonicalIncident) {
  const code = normalize(incident.tipo_codigo)
  if (code === 'CAMBIO_COLOR_REVISADO_TAXI') return 'Pendiente Revisado Taxi'
  return incident.tipo_nombre || incident.tipo_codigo || 'Incidencia'
}

function alertLabel(alert: CanonicalAlert) {
  const labels: Record<string, string> = {
    BOLETA_EMPRESA: 'Boleta empresa',
    BOLETA_PLACA: 'Boleta unidad',
    SIN_CUPO: 'Sin cupo',
    PROPIETARIO: 'Cambio dueño',
    CUPO: 'Cambio cupo',
    COLOR: 'Cambio color',
  }
  return labels[normalize(alert.tipo)] || alert.texto || alert.tipo || 'Alerta'
}

function statusFor(row: CanonicalRevisadoRow): RevisadoEstado {
  if (row.emitido) return 'vigente'

  const incidents = row.incidencias_abiertas ?? []
  if (incidents.some((item) => normalize(item.tipo_codigo) === 'CAMBIO_COLOR_REVISADO_TAXI')) {
    return 'pendiente_cambio_color'
  }

  const nonTaxiIncidents = incidents.filter(
    (item) => normalize(item.tipo_codigo) !== 'CAMBIO_COLOR_REVISADO_TAXI',
  )
  if (nonTaxiIncidents.length || (row.alertas_auto?.length ?? 0) > 0) {
    return 'incidencia'
  }

  return 'pendiente_ciclo'
}

function detailFor(row: CanonicalRevisadoRow) {
  const incidents = (row.incidencias_abiertas ?? []).map(incidentLabel)
  const alerts = (row.alertas_auto ?? []).map(alertLabel)
  return [...incidents, ...alerts].filter(Boolean).join(' · ')
}

function mapRow(row: CanonicalRevisadoRow, index: number): RevisadoRecord {
  return {
    id: String(row.unidad_id ?? row.placa ?? row.unidad ?? index),
    unidad: String(row.unidad ?? '—'),
    placa: String(row.placa ?? '—'),
    galera: String(row.galera ?? '—'),
    empresa: row.empresa ? String(row.empresa) : undefined,
    supervisora: row.supervisora ? String(row.supervisora) : undefined,
    estado: statusFor(row),
    fechaUltimoRevisado: row.ultimo_revisado ? String(row.ultimo_revisado) : undefined,
    prioridad: row.prioridad ? String(row.prioridad) : undefined,
    detalleEstado: detailFor(row) || undefined,
  }
}

function getBridge(): RevisadosBridge | undefined {
  if (window.RYM_REVISADOS_BRIDGE) return window.RYM_REVISADOS_BRIDGE
  try {
    if (window.parent && window.parent !== window) {
      return (window.parent as Window & { RYM_REVISADOS_BRIDGE?: RevisadosBridge }).RYM_REVISADOS_BRIDGE
    }
  } catch {
    return undefined
  }
}

export const revisadosService = {
  async list(): Promise<RevisadoRecord[]> {
    const bridge = getBridge()
    if (!bridge) {
      throw new Error(
        'El bridge de Revisados no está disponible. Abre esta vista desde el shell autenticado del Portal RYM.',
      )
    }

    const response = await bridge.load()
    return (response.rows ?? []).map(mapRow)
  },
}
