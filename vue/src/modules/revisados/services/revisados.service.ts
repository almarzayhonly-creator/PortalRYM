import type {
  CanonicalAlert,
  CanonicalIncident,
  CanonicalRevisadoRow,
  CanonicalRevisadosResponse,
  RevisadoRecord,
  RevisadoEstado,
} from '../types/revisados.types'

export type RevisadosNavItem = { id:string; label:string; icon:string }
export type RevisadosContext = {
  profile?: { nombre?:string; rol?:string; scope_label?:string }
  tabs: RevisadosNavItem[]
}

type RevisadosBridge = {
  load(): Promise<CanonicalRevisadosResponse>
  profile(): RevisadosContext['profile']
  tabs?(): RevisadosNavItem[]
  navigate?(tab:string): void
}

declare global {
  interface Window {
    RYM_REVISADOS_BRIDGE?: RevisadosBridge
  }
}

function normalize(value: unknown) {
  return String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

function incidentLabel(incident: CanonicalIncident) {
  const code = normalize(incident.tipo_codigo)
  if (code === 'CAMBIO_COLOR_REVISADO_TAXI') return 'Pendiente Revisado Taxi'
  return incident.tipo_nombre || incident.tipo_codigo || 'Incidencia'
}

function alertLabel(alert: CanonicalAlert) {
  const labels: Record<string, string> = {
    BOLETA_EMPRESA: 'Boleta empresa/documento',
    BOLETA_UNIDAD: 'Boleta placa',
    BOLETA_PLACA: 'Boleta placa',
    SIN_CUPO: 'Sin cupo',
    PROPIETARIO: 'Cambio dueño',
    CUPO: 'Cambio cupo',
    COLOR: 'Cambio color',
    CAMBIO_COLOR_REHACER: 'Cambio de color',
  }
  return labels[normalize(alert.tipo)] || alert.texto || alert.tipo || 'Alerta'
}

function primaryStatus(row: CanonicalRevisadoRow): RevisadoEstado {
  const backendState = normalize(row.estado)
  const pendingType = normalize(row.pendiente_tipo)
  if (backendState === 'VIGENTE') return 'vigente'
  if (pendingType === 'CAMBIO_COLOR') return 'pendiente_cambio_color'
  if (row.requiere_atencion) return 'pendiente_ciclo'
  if (backendState === 'SIN_MES') return 'no_aplica'
  return row.emitido ? 'vigente' : 'no_aplica'
}

function detailFor(row: CanonicalRevisadoRow) {
  const incidents = (row.incidencias_abiertas ?? []).map(incidentLabel)
  const alerts = (row.alerts ?? []).map(alertLabel)
  return [...incidents, ...alerts].filter(Boolean).join(' · ')
}

function mapRow(row: CanonicalRevisadoRow, index: number): RevisadoRecord {
  const vigente = normalize(row.estado) === 'VIGENTE'
  const requiereAtencion = row.requiere_atencion === true
  const cambioColor = requiereAtencion && normalize(row.pendiente_tipo) === 'CAMBIO_COLOR'
  const tieneAlertas = (row.alerts?.length ?? 0) > 0
  return {
    id: String(row.unidad_id ?? row.placa ?? row.unidad ?? index),
    unidad: String(row.unidad ?? '—'),
    placa: String(row.placa ?? '—'),
    galera: String(row.galera ?? '—'),
    empresa: row.empresa ? String(row.empresa) : undefined,
    supervisora: row.supervisora ? String(row.supervisora) : undefined,
    estado: primaryStatus(row),
    fechaUltimoRevisado: row.ultimo_revisado ? String(row.ultimo_revisado) : undefined,
    prioridad: row.prioridad ? String(row.prioridad) : undefined,
    detalleEstado: detailFor(row) || undefined,
    vigente,
    requiereAtencion,
    cambioColor,
    tieneAlertas,
  }
}

function getBridge(): RevisadosBridge | undefined {
  if (window.RYM_REVISADOS_BRIDGE) return window.RYM_REVISADOS_BRIDGE
  try {
    if (window.parent && window.parent !== window) {
      return (window.parent as Window & { RYM_REVISADOS_BRIDGE?: RevisadosBridge }).RYM_REVISADOS_BRIDGE
    }
  } catch { return undefined }
}

export const revisadosService = {
  async list(): Promise<RevisadoRecord[]> {
    const bridge=getBridge()
    if(!bridge)throw new Error('El bridge de Revisados no está disponible. Abre esta vista desde el shell autenticado del Portal RYM.')
    const response=await bridge.load()
    return (response.rows ?? []).map(mapRow)
  },
  context(): RevisadosContext {
    const bridge=getBridge()
    return {
      profile: bridge?.profile?.(),
      tabs: bridge?.tabs?.() ?? [{id:'dashboard',label:'Dashboard',icon:'⌂'}],
    }
  },
  navigate(tab:string) {
    const bridge=getBridge()
    if(tab==='dashboard') return
    bridge?.navigate?.(tab)
  },
}
