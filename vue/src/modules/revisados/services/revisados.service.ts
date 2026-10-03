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
  load(force?: boolean): Promise<CanonicalRevisadosResponse>
  profile(): RevisadosContext['profile']
  tabs?(): RevisadosNavItem[]
  request?(path:string, init?: RequestInit): Promise<unknown>
  back?(): void
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
  async list(source?: CanonicalRevisadosResponse): Promise<RevisadoRecord[]> {
    const bridge=getBridge()
    if(!bridge)throw new Error('El bridge de Revisados no está disponible. Abre esta vista desde el shell autenticado del Portal RYM.')
    const response=source ?? await bridge.load()
    return (response.rows ?? []).map(mapRow)
  },
  async load(force=false): Promise<CanonicalRevisadosResponse> {
    const bridge=getBridge()
    if(!bridge) throw new Error('El bridge de Revisados no está disponible.')
    return bridge.load(force)
  },
  context(): RevisadosContext {
    const bridge=getBridge()
    return {
      profile: bridge?.profile?.(),
      tabs: bridge?.tabs?.() ?? [{id:'dashboard',label:'Dashboard',icon:'⌂'}],
    }
  },
  async request(path:string, init?: RequestInit) {
    const bridge=getBridge()
    if(!bridge?.request) throw new Error('El cliente de datos del Portal no está disponible.')
    return bridge.request(path, init)
  },
  async post(path:string, body:Record<string, unknown>) {
    return await revisadosService.request(path, {method:'POST', body:JSON.stringify(body)})
  },
  async ficha(placa:string, unidad?:string) {
    return await revisadosService.post('/functions/v1/revisados-ficha', {placa, unidad:unidad ?? ''}) as Record<string, any>
  },
  async crearIncidencia(input:{unidad_id:string|number; tipo_codigo:string; tipo_personalizado?:string; nota?:string}) {
    return await revisadosService.post('/functions/v1/revisados-incidencias', {action:'CREATE', ...input}) as Record<string, any>
  },
  async iniciarConsultaEcarcheck(placa:string) {
    return await revisadosService.post('/functions/v1/revisados-ecarcheck-v2-manual', {action:'START', placa}) as Record<string, any>
  },
  async estadoConsultaEcarcheck(queueId:string) {
    return await revisadosService.post('/functions/v1/revisados-ecarcheck-v2-manual', {action:'STATUS', queue_id:queueId}) as Record<string, any>
  },
  async iniciarSyncEcarcheck() {
    return await revisadosService.post('/functions/v1/revisados-ecarcheck-v2-sync', {action:'START'}) as Record<string, any>
  },
  async estadoSyncEcarcheck(runId:string) {
    return await revisadosService.post('/functions/v1/revisados-ecarcheck-v2-sync', {action:'STATUS', run_id:runId}) as Record<string, any>
  },
  async iniciarBoletasV2() {
    return await revisadosService.post('/functions/v1/revisados-boletas-v2', {action:'START'}) as Record<string, any>
  },
  async estadoBoletasV2(runId:string) {
    return await revisadosService.post('/functions/v1/revisados-boletas-v2', {action:'STATUS', run_id:runId}) as Record<string, any>
  },
  async destinatariosReporteDiario() {
    return await revisadosService.post('/functions/v1/revisados-reporte-diario-email', {action:'recipients'}) as Record<string, any>
  },
  async enviarReporteDiario(to:string[]) {
    return await revisadosService.post('/functions/v1/revisados-reporte-diario-email', {action:'send', to}) as Record<string, any>
  },
  async emitidosHoy() {
    return await revisadosService.request('/rest/v1/rpc/revisados_emitidos_hoy_v1', {method:'POST', body:'{}'})
  },
  back() {
    getBridge()?.back?.()
  },
}
