import type { ExecutiveIndicators, HomeSummary, ModuleAction, PanapassAuditIndicators, PortalSession } from './types'

export type LoadState = 'loading' | 'ready' | 'stale' | 'error'
export interface DashboardState { summary: HomeSummary | null; session: PortalSession; state: LoadState; error: string; controlIndicators: ExecutiveIndicators | null; controlState: LoadState; controlError: string; gpsIndicators: ExecutiveIndicators | null; gpsState: LoadState; gpsError: string; panapassAudit?: PanapassAuditIndicators | null }
export interface Metric { label: string; value: string | number; tone: string; detail: string }

export function createDashboardState(session: PortalSession): DashboardState {
  return { summary: null, session, state: 'loading', error: '', controlIndicators: null, controlState: 'loading', controlError: '', gpsIndicators: null, gpsState: 'loading', gpsError: '', panapassAudit: null }
}

export function acceptIndicator(current: DashboardState, key: 'control' | 'gps', data: ExecutiveIndicators): DashboardState {
  if (key === 'control') return { ...current, controlIndicators: data, controlState: 'ready', controlError: '' }
  return { ...current, gpsIndicators: data, gpsState: 'ready', gpsError: '' }
}

export function failIndicator(current: DashboardState, key: 'control' | 'gps', error: unknown): DashboardState {
  const message = error instanceof Error ? error.message : String(error || 'No se pudo cargar el indicador.')
  if (key === 'control') return { ...current, controlState: current.controlIndicators ? 'stale' : 'error', controlError: message }
  return { ...current, gpsState: current.gpsIndicators ? 'stale' : 'error', gpsError: message }
}

export function acceptHomeSummary(current: DashboardState, next: HomeSummary): DashboardState {
  const hasData = next?.ok || next?.panapass || next?.revisados || next?.control;
  if (hasData) return { ...current,
    summary: { ok: true, ...next },
    session: { profile: next.profile || current.session.profile, modules: next.modules || current.session.modules },
    state: 'ready', error: '',
  }
  return current
}

export function failHomeSummary(current: DashboardState, error: unknown): DashboardState {
  return {
    ...current,
    state: current.summary ? 'stale' : 'error',
    error: error instanceof Error ? error.message : String(error || 'No se pudo cargar el resumen.'),
  }
}

export function canOpen(session: PortalSession, module: 'gps' | 'users', allowed?: (code: string) => boolean): boolean {
  const modules = session.modules
  if (module === 'gps') {
    const known = modules.some(code => code === 'portal.gps' || code.startsWith('gps.'))
    return known ? modules.includes('portal.gps') || modules.includes('gps.dashboard')
      : ['ADMIN_TOTAL', 'ADMIN', 'GERENTE_GALERA', 'SUPERVISORA', 'SISTEMA'].includes(String(session.profile.rol || '').toUpperCase())
  }
  return String(session.profile.rol || '').toUpperCase() === 'ADMIN_TOTAL' && (allowed?.('admin.usuarios') ?? modules.includes('admin.usuarios'))
}

export function moduleCards(summary: HomeSummary): Array<{ key: string; title: string; description: string; metrics: Metric[]; badge: string; action?: keyof ModuleAction }> {
  const pan = summary.panapass, rev = summary.revisados, ctl = summary.control
  const cards: ReturnType<typeof moduleCards> = []
  if (pan) cards.push({ key: 'panapass', title: 'Panapass', description: 'Cobros, negativos, pagos, historial y operación ENA.', metrics: [
    { label: 'Negativos hoy', value: pan.negativos_hoy ?? 0, tone: Number(pan.negativos_hoy || 0) ? 'warning' : 'good', detail: `${pan.pagos_hoy ?? 0} pagos` },
    { label: 'Pagado mes', value: `B/. ${money(pan.monto_mes)}`, tone: '', detail: pan.rank ? `#${pan.rank.posicion_galera} en ${pan.rank.galera}` : 'Dentro de tu alcance' },
    ...(pan.bajas ? [{ label: 'Bajas pendientes', value: pan.bajas.pendientes ?? 0, tone: Number(pan.bajas.alertas || 0) ? 'danger' : '', detail: `${pan.bajas.procesadas ?? 0} procesadas · ${pan.bajas.devoluciones ?? 0} devoluciones` }] : []),
  ], badge: 'Disponible', action: 'panapass' })
  if (rev) cards.push({ key: 'revisados', title: 'Revisados', description: 'Vencimientos, operación ATTT, historial y avance del mes.', metrics: [
    { label: 'Pendientes', value: rev.pendientes ?? 0, tone: '', detail: 'Por gestionar' },
    { label: 'Críticos', value: rev.criticos ?? 0, tone: Number(rev.criticos || 0) ? 'warning' : 'good', detail: 'Dentro del alcance' },
    { label: 'Emitidos hoy', value: `${rev.emitidos_hoy ?? 0}/${rev.limite_hoy ?? 0}`, tone: '', detail: Number(rev.pendientes || 0) ? `${rev.pendientes} por gestionar` : 'Al día' },
  ], badge: Number(rev.pendientes || 0) ? `${rev.pendientes} por gestionar` : 'Al día', action: 'revisados' })
  if (ctl) cards.push({ key: 'control', title: 'Control de Auto', description: 'Maestra de flota, eCarCheck, cupos, auditoría y trazabilidad.', metrics: [
    { label: 'Total flota', value: Number(ctl.activas || 0) + Number(ctl.otros || 0), tone: '', detail: 'Activas y fuera de operación' },
    { label: 'Activas en Control', value: ctl.activas ?? 0, tone: 'good', detail: 'Flota activa' },
    { label: 'Fuera de operación', value: ctl.otros ?? 0, tone: '', detail: `${ctl.cerradas ?? 0} cerradas` },
  ], badge: 'Maestra', action: 'control' })
  return cards
}

export function mainKpis(summary: HomeSummary): Metric[] {
  const pan = summary.panapass, rev = summary.revisados, ctl = summary.control
  const items: Metric[] = []
  if (pan) {
    items.push({ label: 'Panapass', value: pan.negativos_hoy ?? 0, tone: Number(pan.negativos_hoy || 0) ? 'warning' : 'good', detail: `Negativos hoy · ${pan.pagos_hoy ?? 0} pagos` })
    items.push({ label: 'Pagado este mes', value: `B/. ${money(pan.monto_mes)}`, tone: '', detail: pan.rank ? `Posición #${pan.rank.posicion_galera} de ${pan.rank.total_galera}` : 'Dentro de tu alcance' })
    if (pan.bajas) items.push({ label: 'Bajas Panapass', value: pan.bajas.pendientes ?? 0, tone: Number(pan.bajas.alertas || 0) ? 'danger' : '', detail: `${pan.bajas.procesadas ?? 0} procesadas · ${pan.bajas.devoluciones ?? 0} devolución(es)` })
  }
  if (rev) items.push({ label: 'Revisados', value: rev.pendientes ?? 0, tone: Number(rev.criticos || 0) ? 'warning' : 'good', detail: `${rev.emitidos_hoy ?? 0}/${rev.limite_hoy ?? 0} emitidos hoy` })
  if (ctl && items.length < 4) items.push({ label: 'Control de Auto', value: ctl.activas ?? 0, tone: 'good', detail: `${ctl.cerradas ?? 0} cerradas` })
  return items.slice(0, 4)
}

function money(value: unknown): string { return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
