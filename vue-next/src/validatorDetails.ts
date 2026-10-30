export type Unit = Record<string, unknown>
export type DetailField = { label: string; value: string; reference?: string; comparison?: 'match' | 'diff' | 'missing' }
export type DetailSection = { title: string; fields: DetailField[] }
export type DetailCard = {
  key: string
  title: string
  tone: string
  badge: string
  value: string
  details: Array<{ label: string; value: string }>
  note: string
  updatedAt?: string
  syncStatus?: 'verified' | 'outdated' | 'incomplete' | 'error'
  sections?: DetailSection[]
  /** Estado real por equipo GPS (on = instalado y reportando, off = instalado sin reportar, none = sin GPS, unknown = sin dato) */
  gpsDevices?: Array<{ label: string; state: 'on' | 'off' | 'none' | 'unknown'; last?: string }>
}
export type AuditIssue = { code: string; label: string; severity: 'bad' | 'warn' | 'info'; desc: string; fixAction?: string }
export type UnitDetail = {
  unit: string
  plate: string
  owner: string
  operator: string
  supervisor: string
  galera: string
  closed: boolean
  active: boolean
  status: string
  overall: string
  cards: DetailCard[]
  controlRecord?: Unit
  revisadoRecord?: Unit
  enaAccount?: Unit
  enaResponse?: Unit
  gpsRecord?: Unit
  fichaRecord?: Unit | null
  vehicleColor?: string
  auditIssues?: AuditIssue[]
  healthScore?: number
  healthBreakdown?: Array<{ name: string; score: number; max: number; status: 'ok' | 'warn' | 'bad' | 'neutral' }>
}
export type Api = {
  search: (query: string) => Promise<Unit[]>
  load: (unit: Unit) => Promise<unknown>
  enrich?: (detail: any) => Promise<any>
  ficha?: (unit: Unit) => Promise<Unit>
  gps?: (unit: Unit) => Promise<Record<string, unknown>>
}

const hasValue = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '' && String(value).trim() !== '—'
const displayValue = (value: unknown) => !hasValue(value) ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value).trim()
const pickValue = (...values: unknown[]) => values.find(hasValue)
function objectValue(value: unknown): Unit { return value && typeof value === 'object' && !Array.isArray(value) ? value as Unit : {} }
const upperValue = (value: unknown) => displayValue(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
const compactAlnum = (value: unknown) => upperValue(value).replace(/[^A-Z0-9]/g, '')

function rawObject(value: unknown): Unit {
  if (typeof value === 'string') { try { return objectValue(JSON.parse(value)) } catch { return {} } }
  return objectValue(value)
}

// ============================================================================
// FASE 1 & FASE 2: GESTIÓN AUDITADA DE FECHAS EN HORARIO DE PANAMÁ (America/Panama)
// Ejemplo: "28 oct 2026 · 10:30 a. m."
// Nunca mostrar cadenas ISO brutas (T...Z) al usuario.
// Detecta e invalida fechas futuras inconsistentes o campos de base de datos mal asignados.
// ============================================================================

export interface ParsedDateInfo {
  raw: string
  formatted: string
  relative: string
  isFuture: boolean
  isOutdated: boolean
  diffHours: number
  dateObj: Date | null
}

export function parseDateMetadata(rawDate: unknown, maxHoursFresh = 24): ParsedDateInfo {
  const emptyRes: ParsedDateInfo = {
    raw: '',
    formatted: '',
    relative: '',
    isFuture: false,
    isOutdated: true,
    diffHours: Infinity,
    dateObj: null,
  }
  if (!rawDate) return emptyRes
  const str = String(rawDate).trim()
  if (!str || str === '—' || /sin consulta|sin registro|no disponible|fallida|consultando/i.test(str)) {
    return { ...emptyRes, raw: str, formatted: str }
  }

  let dt: Date | null = null

  // 1. Formato DD/MM/YYYY o DD-MM-YYYY con hora opcional (admite coma y a.m./p.m.)
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap]\.?\s*m\.?))?)?/i)
  if (dmyMatch) {
    let [, day, month, year, h = '0', m = '0', s = '0', ampm] = dmyMatch
    let hour = Number(h)
    if (ampm) {
      const isPm = ampm.toLowerCase().includes('p')
      const isAm = ampm.toLowerCase().includes('a')
      if (isPm && hour < 12) hour += 12
      if (isAm && hour === 12) hour = 0
    }
    // Ajustar a hora local de Panamá (UTC-5): UTC = local + 5h
    dt = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), hour + 5, Number(m), Number(s)))
  } else {
    // 2. Formato textual en español (ej. "28 oct 2026 · 11:25 a. m." o "12 agosto 2026, 7:35 a. m.")
    const monthsMap: Record<string, number> = {
      ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11
    }
    const textMatch = str.match(/^(\d{1,2})\s+([a-záéíóúñ]{3,10})\.?\s+(\d{4})(?:[,\s·]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap]\.?\s*m\.?))?)?/i)
    if (textMatch) {
      let [, day, mStr, year, h = '0', m = '0', s = '0', ampm] = textMatch
      const mKey = mStr.toLowerCase().slice(0, 3).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const monthNum = monthsMap[mKey] ?? 0
      let hour = Number(h)
      if (ampm) {
        const isPm = ampm.toLowerCase().includes('p')
        const isAm = ampm.toLowerCase().includes('a')
        if (isPm && hour < 12) hour += 12
        if (isAm && hour === 12) hour = 0
      }
      dt = new Date(Date.UTC(Number(year), monthNum, Number(day), hour + 5, Number(m), Number(s)))
    } else {
      // 3. Formato YYYY-MM-DD sin hora
      const ymdOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (ymdOnlyMatch) {
        const [, year, month, day] = ymdOnlyMatch
        dt = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 5, 0, 0))
      } else {
        const parsed = new Date(str)
        if (!isNaN(parsed.getTime())) {
          dt = parsed
        }
      }
    }
  }

  if (!dt || isNaN(dt.getTime())) {
    return { ...emptyRes, raw: str, formatted: str }
  }

  const now = new Date()
  const diffMs = now.getTime() - dt.getTime()
  // Si la fecha está más de 5 minutos en el futuro (margen para leves desfaces de reloj de servidor)
  const isFuture = diffMs < -300000
  const diffHours = diffMs / (1000 * 60 * 60)
  const isOutdated = isFuture || diffHours > maxHoursFresh

  // Formatear en horario oficial de Panamá
  let formatted = str
  let relative = ''
  try {
    const datePart = new Intl.DateTimeFormat('es-PA', {
      timeZone: 'America/Panama',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(dt).replace('.', '')

    const timePart = new Intl.DateTimeFormat('es-PA', {
      timeZone: 'America/Panama',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(dt).toLowerCase()

    formatted = `${datePart} · ${timePart}`

    if (isFuture) {
      relative = 'Fecha futura inconsistente'
    } else {
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 5) relative = 'Hace unos momentos'
      else if (diffMins < 60) relative = `Hace ${diffMins} min`
      else if (diffHours < 24) relative = `Hace ${Math.floor(diffHours)} h`
      else {
        const days = Math.floor(diffHours / 24)
        if (days === 1) relative = 'Ayer'
        else if (days < 7) relative = `Hace ${days} días`
        else if (days < 30) relative = `Hace ${Math.floor(days / 7)} sem`
        else if (days < 365) relative = `Hace ${Math.floor(days / 30)} meses`
        else relative = `Hace ${Math.floor(days / 365)} años`
      }
    }
  } catch {
    formatted = str
  }

  return {
    raw: str,
    formatted,
    relative,
    isFuture,
    isOutdated,
    diffHours,
    dateObj: dt,
  }
}

export function formatPanamaDate(rawDate: unknown, showTime = true): string {
  if (!rawDate) return ''
  const str = String(rawDate).trim()
  if (!str || str === '—' || /sin registro|sin consulta|no disponible/i.test(str)) {
    return str
  }

  // Si ya contiene el formato amigable de mes y separador '·', respetarlo
  if (/\b(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b/i.test(str) && str.includes('·')) {
    return str
  }

  const meta = parseDateMetadata(rawDate)
  if (!meta.dateObj) return str

  if (!showTime) {
    try {
      return new Intl.DateTimeFormat('es-PA', {
        timeZone: 'America/Panama',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(meta.dateObj).replace('.', '')
    } catch {
      return str
    }
  }

  return meta.formatted
}

// ============================================================================
// FASE 1 & FASE 2: MOTOR DE BÚSQUEDA Y PRIORIDAD ESTRICTA DE UNIDADES
// ============================================================================

export type SearchMatchTier =
  | 'exact_unit'
  | 'exact_plate'
  | 'exact_panapass'
  | 'prefix'
  | 'partial'
  | 'approximate'

export function normalizeSearchQuery(rawQuery: unknown): string {
  return String(rawQuery ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
}

function naturalUnitCompare(a: Unit, b: Unit): number {
  const ua = upperValue(pickValue(a.unidad, a.unit))
  const ub = upperValue(pickValue(b.unidad, b.unit))
  return ua.localeCompare(ub, 'es', { numeric: true, sensitivity: 'base' })
}

function scoreCompleteness(row: Unit): number {
  let score = 0
  if (hasValue(row.placa_unica) || hasValue(row.placa)) score += 3
  if (hasValue(row.panapass_numero) || hasValue(row.panapass)) score += 3
  if (hasValue(row.empresa_duena) || hasValue(row.empresa_operadora) || hasValue(row.empresa)) score += 2
  if (hasValue(row.estatus) || hasValue(row.estado)) score += 2
  if (hasValue(row.marca) || hasValue(row.modelo)) score += 1
  return score
}

export function deduplicateUnits(rows: Unit[]): Unit[] {
  const map = new Map<string, Unit>()
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue
    const uKey = compactAlnum(pickValue(raw.unidad, raw.unit))
    const pKey = compactAlnum(pickValue(raw.placa_unica, raw.placa, raw.placa_comercial))
    const key = uKey || (pKey ? `PLATE:${pKey}` : '')
    if (!key) continue
    const existing = map.get(key)
    if (!existing || scoreCompleteness(raw) > scoreCompleteness(existing)) {
      map.set(key, existing ? { ...existing, ...raw } : raw)
    }
  }
  return Array.from(map.values())
}

function isApproximateUnitMatch(target: string, query: string): boolean {
  if (!target || !query || query.length < 3) return false
  if (Math.abs(target.length - query.length) > 1) return false
  let diffs = 0
  const maxLen = Math.max(target.length, query.length)
  for (let i = 0; i < maxLen; i++) {
    if (target[i] !== query[i]) diffs++
    if (diffs > 1) return false
  }
  return diffs === 1
}

export function rankAndFilterUnits(rawRows: Unit[], rawQuery: string, maxResults = 16): Unit[] {
  const q = normalizeSearchQuery(rawQuery)
  const qCompact = q.replace(/[^A-Z0-9]/g, '')
  if (!qCompact) return []

  const uniqueRows = deduplicateUnits(Array.isArray(rawRows) ? rawRows : [])

  const tier1ExactUnit: Unit[] = []
  const tier2ExactPlate: Unit[] = []
  const tier3ExactPanapass: Unit[] = []
  const tier4PrefixUnit: Unit[] = []
  const tier4PrefixPlate: Unit[] = []
  const tier4PrefixPanapass: Unit[] = []
  const tier5PartialUnit: Unit[] = []
  const tier5PartialPlate: Unit[] = []
  const tier5PartialPanapass: Unit[] = []
  const tier5PartialCompany: Unit[] = []
  const tier6Approximate: Unit[] = []

  for (const row of uniqueRows) {
    const unitNorm = upperValue(pickValue(row.unidad, row.unit))
    const unitCompact = compactAlnum(unitNorm)

    const platesNorm = [
      upperValue(row.placa_unica),
      upperValue(row.placa),
      upperValue(row.placa_comercial),
    ].filter(Boolean)
    const platesCompact = platesNorm.map(p => p.replace(/[^A-Z0-9]/g, '')).filter(Boolean)

    const panaNorm = upperValue(pickValue(row.panapass_numero, row.panapass))
    const panaCompact = panaNorm.replace(/[^A-Z0-9]/g, '')

    const companyNorm = upperValue(
      pickValue(row.empresa_duena, row.empresa_operadora, row.empresa, row.empresa_nombre, row.razon_social)
    )

    // 1. Coincidencia exacta de unidad
    if (unitNorm === q || (unitCompact && unitCompact === qCompact)) {
      tier1ExactUnit.push({ ...row, _matchTier: 'exact_unit' })
      continue
    }

    // 2. Coincidencia exacta de placa
    if (platesNorm.includes(q) || platesCompact.includes(qCompact)) {
      tier2ExactPlate.push({ ...row, _matchTier: 'exact_plate' })
      continue
    }

    // 3. Coincidencia exacta de Panapass
    if ((panaNorm && panaNorm === q) || (panaCompact && panaCompact === qCompact)) {
      tier3ExactPanapass.push({ ...row, _matchTier: 'exact_panapass' })
      continue
    }

    // 4. Coincidencias por prefijo (unidad -> placa -> Panapass)
    if (unitNorm.startsWith(q) || (unitCompact && unitCompact.startsWith(qCompact))) {
      tier4PrefixUnit.push({ ...row, _matchTier: 'prefix' })
      continue
    }
    if (platesNorm.some(p => p.startsWith(q)) || platesCompact.some(p => p.startsWith(qCompact))) {
      tier4PrefixPlate.push({ ...row, _matchTier: 'prefix' })
      continue
    }
    if ((panaNorm && panaNorm.startsWith(q)) || (panaCompact && panaCompact.startsWith(qCompact))) {
      tier4PrefixPanapass.push({ ...row, _matchTier: 'prefix' })
      continue
    }

    // 5. Coincidencias parciales relevantes en campos habilitados (unidad, placa, Panapass, empresa)
    if (unitNorm.includes(q) || (unitCompact && unitCompact.includes(qCompact))) {
      tier5PartialUnit.push({ ...row, _matchTier: 'partial' })
      continue
    }
    if (platesNorm.some(p => p.includes(q)) || platesCompact.some(p => p.includes(qCompact))) {
      tier5PartialPlate.push({ ...row, _matchTier: 'partial' })
      continue
    }
    if ((panaNorm && panaNorm.includes(q)) || (panaCompact && panaCompact.includes(qCompact))) {
      tier5PartialPanapass.push({ ...row, _matchTier: 'partial' })
      continue
    }
    if (q.length >= 3 && /[A-Z]/.test(q) && companyNorm && companyNorm.includes(q)) {
      tier5PartialCompany.push({ ...row, _matchTier: 'partial' })
      continue
    }

    // 6. Sugerencias aproximadas únicamente si no hay coincidencias exactas/prefijo/parciales
    if (
      isApproximateUnitMatch(unitCompact, qCompact) ||
      platesCompact.some(p => isApproximateUnitMatch(p, qCompact))
    ) {
      tier6Approximate.push({ ...row, _matchTier: 'approximate' })
    }
  }

  // REGLA PRINCIPAL OBLIGATORIA:
  // Si existe una coincidencia exacta de unidad, mostrar EXCLUSIVAMENTE esa unidad.
  if (tier1ExactUnit.length > 0) {
    return tier1ExactUnit.sort(naturalUnitCompare)
  }

  if (tier2ExactPlate.length > 0) {
    return tier2ExactPlate.sort(naturalUnitCompare)
  }

  if (tier3ExactPanapass.length > 0) {
    return tier3ExactPanapass.sort(naturalUnitCompare)
  }

  const combinedRelevant = [
    ...tier4PrefixUnit.sort(naturalUnitCompare),
    ...tier4PrefixPlate.sort(naturalUnitCompare),
    ...tier4PrefixPanapass.sort(naturalUnitCompare),
    ...tier5PartialUnit.sort(naturalUnitCompare),
    ...tier5PartialPlate.sort(naturalUnitCompare),
    ...tier5PartialPanapass.sort(naturalUnitCompare),
    ...tier5PartialCompany.sort(naturalUnitCompare),
  ]

  if (combinedRelevant.length > 0) {
    return combinedRelevant.slice(0, maxResults)
  }

  return tier6Approximate.sort(naturalUnitCompare).slice(0, Math.min(5, maxResults))
}

// ============================================================================
// SECCIONES EXPANDIBLES DE LOS 4 SISTEMAS + DATOS TÉCNICOS Y ADMINISTRATIVOS
// ============================================================================

function controlSections(detail: UnitDetail, fichaResponse: Unit | null): DetailSection[] {
  const control = objectValue(detail.controlRecord)
  const ficha = objectValue(fichaResponse)
  const unitRecord = objectValue(ficha.unidad)
  const official = objectValue(ficha.oficial)
  const raw = rawObject(pickValue(official.ultima_respuesta_exitosa, official.ultima_respuesta))
  const addSection = (title: string, rows: Array<[string, unknown]>): DetailSection | null => {
    const fields = rows.filter(([, field]) => hasValue(field)).map(([label, field]) => ({ label, value: displayValue(field) }))
    return fields.length ? { title, fields } : null
  }
  const sections: DetailSection[] = []

  // 1. SISTEMA INTERNO: Control de Auto · RYM (gestión y estatus de flota)
  const controlSection = addSection('Control de Auto · RYM (Gestión Interna)', [
    ['Estado operativo', detail.active ? 'ACTIVA' : (detail.closed ? 'CERRADA' : 'PARADA')],
    ['Estado interno', pickValue(control.estatus2, control.status2, control.estado, control.estatus)],
    ['Galera asignada', pickValue(detail.galera, control.galera)],
    ['Empresa operadora', pickValue(detail.operator, control.empresa_operadora, control.empresa)],
    ['Empresa propietaria (Dueña)', pickValue(detail.owner, control.empresa_duena)],
    ['Supervisora', pickValue(detail.supervisor, control.supervisora)],
    ['Póliza NetSuite', control.nro_poliza],
    ['Cupo / placa comercial', pickValue(control.placa_comercial, unitRecord.placa_comercial)],
    ['Estatus NetSuite', pickValue(control.estatus_netsuite, unitRecord.estatus_netsuite)],
    ['Marca / Modelo / Año (Interno)', [control.marca, control.modelo, control.anio].filter(hasValue).join(' ') || null],
    ['Color (Interno)', control.color],
    ['Chasis / VIN (Interno)', pickValue(control.chasis, control.vin)],
    ['Motor (Interno)', control.motor],
    ['Transmisión', control.transmision],
  ])
  if (controlSection) sections.push(controlSection)

  // 2. REGISTRO OFICIAL ATTT: eCarCheck (Cotejo oficial de la ATTT de Panamá)
  const officialSection = addSection('Ficha Oficial ATTT · eCarCheck', [
    ['Propietario oficial ATTT', pickValue(raw.nombrePropietario, official.propietario)],
    ['Placa oficial consultada', pickValue(raw.nroPlaca, official.placa)],
    ['Cupo oficial ATTT', pickValue(raw.cupo, official.cupo)],
    ['Marca oficial (ATTT)', pickValue(raw.marcaVehiculo, raw.marcavehiculo, official.marca)],
    ['Modelo oficial (ATTT)', pickValue(raw.modeloVehiculo, official.modelo)],
    ['Año oficial (ATTT)', pickValue(raw.anioVehiculo, official.anio)],
    ['Color oficial (ATTT)', pickValue(raw.colorVehiculo, official.color)],
    ['Chasis oficial (ATTT)', pickValue(raw.nroChasis, official.chasis)],
    ['VIN oficial (ATTT)', pickValue(raw.nroVin, official.vin)],
    ['Motor oficial (ATTT)', pickValue(raw.nroMotor, official.motor)],
    ['Resultado eCarCheck', pickValue(ficha.resultado, raw.detalleRespuesta, raw.detalle_respuesta)],
    ['Última verificación eCarCheck', formatPanamaDate(pickValue(official.actualizado_at, ficha.consulta_at))],
  ])
  if (officialSection) sections.push(officialSection)

  // 3. Seguro y restricciones
  const legal = addSection('Póliza de Seguro y Restricciones Legales', [
    ['Aseguradora', pickValue(raw.nombreAseguradora, raw.aseguradora, official.aseguradora)],
    ['Póliza de seguro', pickValue(raw.nroPolizaSeguro, raw.poliza, official.poliza)],
    ['Hipoteca', pickValue(raw.hipoteca, official.hipoteca)],
    ['Restricción vehicular', pickValue(raw.restriccionVehiculos, official.restriccion_vehicular)],
  ])
  if (legal) sections.push(legal)

  const officialValues: Array<[string, unknown, unknown]> = [
    ['Chasis', pickValue(control.chasis, unitRecord.chasis), pickValue(raw.nroChasis, official.chasis)],
    ['VIN', pickValue(control.vin, unitRecord.vin), pickValue(raw.nroVin, official.vin)],
    ['Motor', pickValue(control.motor, unitRecord.motor), pickValue(raw.nroMotor, official.motor)],
    ['Placa', pickValue(control.placa_unica, unitRecord.placa_unica), pickValue(raw.nroPlaca, official.placa)],
    ['Marca', pickValue(control.marca, unitRecord.marca), pickValue(raw.marcaVehiculo, raw.marcavehiculo, official.marca)],
    ['Modelo', pickValue(control.modelo, unitRecord.modelo), pickValue(raw.modeloVehiculo, official.modelo)],
    ['Año', pickValue(control.anio, unitRecord.anio), pickValue(raw.anioVehiculo, official.anio)],
    ['Color', pickValue(control.color, unitRecord.color), pickValue(raw.colorVehiculo, official.color)],
  ]
  const normalize = (item: unknown) => displayValue(item).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[\s-]+/g, '')
  const comparisons: DetailSection = {
    title: 'Comparación RYM / eCarCheck',
    fields: officialValues.map(([label, left, right]) => {
      const comparison = !hasValue(left) || !hasValue(right) ? 'missing' : normalize(left) === normalize(right) ? 'match' : 'diff'
      return { label, value: hasValue(left) ? displayValue(left) : 'Sin dato', reference: hasValue(right) ? displayValue(right) : 'Sin dato', comparison }
    }),
  }
  if (officialValues.some(([, left, right]) => hasValue(left) || hasValue(right))) sections.push(comparisons)
  return sections
}

function fields(title: string, rows: Array<[string, unknown]>): DetailSection | null {
  const values = rows.filter(([, item]) => hasValue(item)).map(([label, item]) => ({ label, value: displayValue(item) }))
  return values.length ? { title, fields: values } : null
}

function panSections(detail: UnitDetail): DetailSection[] {
  const c = objectValue(detail.controlRecord), account = objectValue(detail.enaAccount)
  const tagsRaw = c.tags_detalle
  let tags: Unit[] = Array.isArray(tagsRaw) ? tagsRaw as Unit[] : []
  if (!tags.length && typeof tagsRaw === 'string') {
    try { const parsed: unknown = JSON.parse(tagsRaw); tags = Array.isArray(parsed) ? parsed as Unit[] : [] } catch { tags = [] }
  }
  const ids = Array.isArray(c.tags_ena) ? c.tags_ena.join(' · ') : c.tags_ena
  const sections = [fields('Panapass y TAGs', [
    ['Número Panapass', pickValue(c.panapass_numero, c.numero_panapass)],
    ['Panapass display', pickValue(account.panapass_display, c.panapass_display)],
    ['Cuenta ENA', pickValue(c.cuenta_ena, c.numero_cuenta, account.ena_empresa)],
    ['TAG principal', pickValue(c.tag, 'Sin TAG registrado')],
    ['Otros TAGs ENA', ids],
    ['Cantidad de TAGs', c.cantidad_tags],
    ['Último resultado ENA', c.ena_ultimo_resultado],
    ['Última consulta ENA', formatPanamaDate(pickValue(account.ultima_consulta, c.ena_ultima_consulta))],
    ['Último error', pickValue(c.ena_ultimo_error, account.ultimo_error)],
  ])]
  for (const [i, tag] of tags.entries()) {
    const section = fields(`TAG ${displayValue(pickValue(tag.tag, tag.numero_tag, i + 1))}`, [
      ['Estado del TAG', pickValue(tag.estado_tag, tag.estado)],
      ['Estado financiero', tag.estado_financiero],
      ['Tipo de TAG', pickValue(tag.tipo_tag, tag.tipo)],
      ['Matrícula', pickValue(tag.matricula, tag.placa)],
      ['Saldo del TAG', tag.saldo],
      ['Consulta del TAG', formatPanamaDate(tag.consultado_at)],
    ])
    if (section) sections.push(section)
  }
  const admin = fields('Información disponible de ENA', [
    ['Estado de acceso ENA', pickValue(account.estado_acceso, c.ena_estado_acceso)],
    ['Empresa ENA', pickValue(account.ena_empresa, c.ena_empresa)],
    ['RUC ENA', pickValue(account.ena_ruc, c.ena_ruc)],
    ['Última actualización cuenta', formatPanamaDate(pickValue(account.updated_at, c.ena_actualizado_at))],
  ])
  if (admin) sections.push(admin)
  return sections.filter((item): item is DetailSection => !!item)
}

function revisadoSections(detail: UnitDetail, fichaResponse: Unit | null): DetailSection[] {
  const c = objectValue(detail.controlRecord), r = objectValue(detail.revisadoRecord), f = objectValue(fichaResponse)
  const official = objectValue(f.oficial), raw = rawObject(pickValue(official.ultima_respuesta_exitosa, official.ultima_respuesta)), op = objectValue(f.operacion)
  const section = fields('Detalle de Revisado y eCarCheck', [
    ['Mes asignado ATTT', pickValue(c.mes_revisado, objectValue(f.unidad).mes_revisado, r.mes_revisado, r.mes)],
    ['Fecha trámite emisión', formatPanamaDate(pickValue(op.fecha_ultimo_revisado, official.fecha_revisado, raw.fechaRevisado, r.ultimo_revisado, r.fecha), false)],
    ['Año revisado', pickValue(official.anio_revisado, r.anio_revisado)],
    ['Rev ID', pickValue(raw.revId, raw.idRevisados, official.rev_id, r.rev_id)],
    ['Taller / emisor', pickValue(raw.ultTallerRevisado, official.taller, official.emisor, objectValue(f.unidad).taller_revisado)],
    ['Estado oficial vehículo', pickValue(raw.estadoVehiculo, official.estado_vehiculo)],
    ['Emitido', r.emitido == null ? null : r.emitido ? 'Sí' : 'No'],
    ['Bloqueado / Boletas', r.bloqueado == null ? null : r.bloqueado ? 'Sí' : 'No'],
    ['Observaciones eCarCheck', pickValue(raw.observaciones, official.observacion, objectValue(f.unidad).observacion_revisado)],
    ['Última verificación eCarCheck', formatPanamaDate(pickValue(official.actualizado_at, f.consulta_at, r.updated_at))],
  ])
  return section ? [section] : []
}

function gpsSections(detail: UnitDetail): DetailSection[] {
  const r = objectValue(detail.gpsRecord), g1 = objectValue(r.gps1), g2 = objectValue(r.gps2)
  const evaluation = fields('Evaluación Satelital GPS', [
    ['Clasificación final', r.nivel],
    ['Motivo / Alerta', r.razon],
    ['Diagnóstico operativo', pickValue(r.diagnostico_operativo, r.estado_operativo)],
    ['Velocidad reportada', r.velocidad != null ? `${displayValue(r.velocidad)} km/h` : null],
  ])
  const equipment = fields('Estado de GPS 1 y GPS 2', [
    ['GPS 1', [g1.label, formatPanamaDate(g1.last)].filter(hasValue).join(' · ')],
    ['GPS 2', [g2.label, formatPanamaDate(g2.last)].filter(hasValue).join(' · ')],
    ['Proveedor GPS 1', pickValue(g1.proveedor, g1.fuente)],
    ['Proveedor GPS 2', pickValue(g2.proveedor, g2.fuente)],
  ])
  const device = (title: string, source: Unit): DetailSection | null => {
    const commMeta = parseDateMetadata(pickValue(source.last, source.ultima_senal))
    return fields(title, [
      ['Estado del equipo', source.label],
      ['Diagnóstico específico', source.razon],
      ['Última señal del satélite', commMeta.formatted || 'Sin transmisión'],
      ['Antigüedad de la señal', commMeta.relative || 'Desconocida'],
      ['Proveedor', pickValue(source.proveedor, source.fuente)],
      ['IMEI / ID', pickValue(source.imei, source.id)],
    ])
  }
  return [evaluation, equipment, device('GPS 1 · Detalle técnico', g1), device('GPS 2 · Detalle técnico', g2)].filter((item): item is DetailSection => !!item)
}

// ============================================================================
// FASE 4 & FASE 5: ESTADO DE CONSULTAS Y REGLAS DE NEGOCIO REALES
// Clasificación de estado de consulta:
// - verified: Consulta exitosa y datos al día
// - outdated: Información antigua / histórica
// - incomplete: Faltan fuentes o datos no configurados
// - error: Fallo al consultar el servicio
// ============================================================================

function applyOperationalPresentation(detail: UnitDetail, ficha: Unit | null): void {
  const c = objectValue(detail.controlRecord)
  const account = objectValue(detail.enaAccount)

  // 1. PANAPASS (AUDITORÍA FASE 1 & FASE 2)
  // Separación estricta entre Estado Financiero y Vigencia de la Información.
  // La fecha de consulta SOLO proviene de consultas reales a ENA (consultado_at / ultima_consulta),
  // NUNCA de updated_at de tablas ni de fechas de corte o vencimiento futuro.
  const pana = detail.cards.find(card => card.key === 'panapass')
  if (pana) {
    const panNum = displayValue(pickValue(c.panapass_numero, c.numero_panapass))
    const enaRes = objectValue(detail.enaResponse)
    
    // Filtrar estrictamente: solo timestamps de consulta real a ENA
    const realEnaQueryRaw = pickValue(
      enaRes.consultado_at,
      enaRes.ultima_consulta,
      account.ultima_consulta,
      c.ena_ultima_consulta,
      pana.details?.find(d => /consulta/i.test(d.label))?.value
    )
    
    // Auditar metadata de la fecha (margen de 24h para considerarlo 'al día')
    const queryMeta = parseDateMetadata(realEnaQueryRaw, 24)
    
    // Descartar fechas futuras de la consulta (inconsistencias de base de datos)
    const validQueryDate = queryMeta.isFuture ? '' : queryMeta.formatted
    pana.updatedAt = validQueryDate || (realEnaQueryRaw ? 'Consulta anterior' : 'Sin consulta reciente')

    const savedSaldo = c.ena_saldo !== null && c.ena_saldo !== undefined && String(c.ena_saldo).trim() !== '' ? Number(c.ena_saldo) : null
    const hasNegative = (savedSaldo !== null && savedSaldo < 0) || /NEGATIVO/i.test(pana.badge)

    if (!panNum) {
      pana.tone = detail.active ? 'bad' : 'neutral'
      pana.badge = 'SIN PANAPASS'
      pana.value = 'No asignado'
      pana.syncStatus = 'incomplete'
      pana.note = 'Control de Auto no tiene Panapass activo asignado.'
    } else if (/NO DISPONIBLE|SIN RESPUESTA|ERROR/i.test(`${pana.badge} ${pana.value}`)) {
      pana.tone = hasNegative ? 'bad' : 'neutral'
      pana.badge = hasNegative ? 'SALDO NEGATIVO' : 'SIN RESPUESTA'
      pana.syncStatus = 'error'
      pana.note = 'No se pudo conectar con ENA. Se muestra último saldo conocido.'
    } else if (hasNegative) {
      // Saldo negativo siempre es crítico para la operación
      pana.tone = 'bad'
      pana.badge = 'SALDO NEGATIVO'
      pana.syncStatus = queryMeta.isOutdated ? 'outdated' : 'verified'
      pana.note = queryMeta.isOutdated
        ? `Saldo negativo registrado (${queryMeta.relative || 'anterior'}). Requiere confirmación.`
        : 'Saldo negativo confirmado en ENA. Requiere pago inmediato.'
    } else if (queryMeta.isOutdated || !realEnaQueryRaw) {
      // Saldo >= 0 pero la consulta NO es de hoy -> DATO HISTÓRICO, NUNCA verde 'AL DÍA'
      pana.tone = 'neutral'
      pana.badge = 'ÚLTIMO SALDO'
      pana.syncStatus = 'outdated'
      pana.note = validQueryDate
        ? `Último saldo registrado · ${queryMeta.relative || validQueryDate}`
        : 'Saldo guardado histórico · Sin consulta reciente de ENA'
    } else {
      // Saldo >= 0 y consultado hoy
      pana.tone = 'ok'
      pana.badge = 'AL DÍA'
      pana.syncStatus = 'verified'
      pana.note = 'Sin saldo pendiente en ENA · Verificado hoy'
    }
  }

  // 2. REVISADO (AUDITORÍA FASE 3)
  // Distinción entre:
  // - Fecha del trámite de emisión del revisado (ej. 7 mar 2026)
  // - Fecha de verificación en eCarCheck / ATTT (ej. 24 oct 2026)
  // - Vigencia oficial: sticker anual de 12 meses según reglamentación ATTT
  const rev = objectValue(detail.revisadoRecord)
  const fObj = objectValue(ficha)
  const operation = objectValue(fObj.operacion)
  const official = objectValue(fObj.oficial)
  const review = detail.cards.find(card => card.key === 'revisados')
  if (review) {
    const hasRevData = Object.keys(rev).length > 0 || Object.keys(operation).length > 0 || Object.keys(official).length > 0
    if (hasRevData) {
      const source = upperValue(pickValue(rev.estado, operation.estado_revisado, official.estado_vehiculo))
      const legacy = [source, review.badge, review.value, ...review.details.map(item => item.value)].join(' ')
      let status = 'PENDIENTE'
      if (upperValue(operation.estado_revisado) === 'VENCIDO' || ['VENCIDO', 'EXPIRADO', 'CRITICO', 'CRÍTICO'].includes(source)) status = 'VENCIDO'
      else if (source === 'PROXIMO' || source === 'PRÓXIMO' || /PROXIM|POR VENCER/.test(upperValue(legacy))) status = 'PRÓXIMO A VENCER'
      else if (source === 'PENDIENTE') status = Number(rev.meses_atraso) > 0 ? 'VENCIDO' : 'PENDIENTE'
      else if (source === 'VIGENTE' || rev.emitido === true) status = 'VIGENTE'
      else if (source === 'SIN_MES') status = 'SIN MES'
      else if (/VENCID|EXPIR|CRITIC/.test(upperValue(legacy))) status = 'VENCIDO'
      else if (/PENDIENT|NO VIGENTE/.test(upperValue(legacy))) status = 'PENDIENTE'
      else if (/VIGENTE|AL DIA|VALIDO/.test(upperValue(legacy))) status = 'VIGENTE'
      else status = 'SIN REGISTRO'

      const month = displayValue(pickValue(c.mes_revisado, objectValue(fObj.unidad).mes_revisado, rev.mes_revisado, rev.mes))
      const rawEmissionDate = pickValue(operation.fecha_ultimo_revisado, official.fecha_revisado, rev.ultimo_revisado, rev.fecha)
      const lastEmissionFormatted = rawEmissionDate ? formatPanamaDate(rawEmissionDate, false) : 'Sin registro'
      
      // Fecha de consulta real al sistema eCarCheck
      const rawCheckDate = pickValue(official.actualizado_at, fObj.consulta_at, rev.updated_at)
      const checkMeta = parseDateMetadata(rawCheckDate, 168) // eCarCheck es válido por semanas si no hay cambio
      const checkDateFormatted = checkMeta.formatted || 'Sin verificación reciente'

      const tone = status === 'VIGENTE'
        ? (rev.bloqueado ? 'warn' : 'ok')
        : status === 'VENCIDO'
          ? 'bad'
          : status === 'SIN REGISTRO'
            ? (detail.active ? 'warn' : 'neutral')
            : 'warn'

      Object.assign(review, {
        tone,
        badge: status,
        value: month ? month.toUpperCase() : (lastEmissionFormatted !== 'Sin registro' ? lastEmissionFormatted : status),
        details: [
          { label: 'Mes asignado', value: month || 'No definido' },
          { label: 'Último trámite', value: lastEmissionFormatted },
          { label: 'Cotejo eCarCheck', value: checkDateFormatted },
        ],
        updatedAt: checkDateFormatted,
        syncStatus: status === 'SIN REGISTRO' ? 'incomplete' : checkMeta.isOutdated ? 'outdated' : 'verified',
        note: status === 'VIGENTE'
          ? `Revisado vigente · Trámite: ${lastEmissionFormatted}`
          : `Estado ${status.toLowerCase()} · Referencia: ${month || lastEmissionFormatted}`,
      })
    } else if (review.badge === 'CONSULTANDO' || review.tone === 'pending') {
      review.updatedAt = 'Consultando…'
      review.syncStatus = 'incomplete'
    } else if (/SIN REGISTRO|NO DISPONIBLE/i.test(`${review.badge} ${review.value}`)) {
      review.tone = detail.active ? 'warn' : 'neutral'
      review.updatedAt = 'Sin registro confirmado'
      review.syncStatus = 'incomplete'
    }
  }

  // 3. GPS (AUDITORÍA FASE 4)
  // Distinguir estrictamente entre:
  // - Última transmisión / señal del satélite al vehículo
  // - Fecha de consulta al servidor / base de datos
  // Nunca mostrar '2 de 2 reportando' si los dispositivos no transmiten en tiempo y forma.
  const gps = detail.cards.find(card => card.key === 'gps')
  const row = objectValue(detail.gpsRecord)
  if (gps) {
    if (Object.keys(row).length) {
      const devices = [objectValue(row.gps1), objectValue(row.gps2)]
      const complete = devices.every(item => typeof item.installed === 'boolean' && typeof item.ok === 'boolean')
      let level = upperValue(row.nivel), reason = displayValue(row.razon || row.diagnostico)
      const historic = ['CERRADO', 'CERRADA', 'CANIBALIZADO', 'CANIBALIZADA'].includes(upperValue(row.estatus_control))

      if (level === 'HISTORICO' || row.historico || historic) {
        level = 'SIN INFORMACIÓN'
        reason ||= 'Información GPS histórica'
      } else if (complete) {
        const installed = devices.filter(item => item.installed).length
        const reporting = devices.filter(item => item.installed && item.ok).length
        level = !installed || !reporting ? 'CRÍTICO' : installed === 2 && reporting === 1 ? 'ALERTA' : 'NORMAL'
        if (installed === 1 && reporting === 1) reason = '1 GPS instalado y reportando'
      }

      const tone = (level === 'OK' || level === 'NORMAL')
        ? 'ok'
        : level === 'ALERTA'
          ? 'warn'
          : (level === 'CRITICO' || level === 'CRÍTICO')
            ? 'bad'
            : 'neutral'

      const formatDeviceLabel = (item: Unit): string => {
        if (item.installed === false) return 'Sin GPS'
        if (item.installed === true) return item.ok === true ? 'Reportando' : displayValue(item.label || 'Sin comunicación')
        return 'Sin información'
      }

      const reporting = devices.filter(item => item.installed === true && item.ok === true).length
      const installed = devices.filter(item => item.installed === true).length
      const known = devices.some(item => typeof item.installed === 'boolean' || hasValue(item.label))
      const summary = !known ? 'Sin información' : installed === 0 ? '0 dispositivos instalados' : `${reporting} de ${Math.max(installed, 2)} reportando`
      
      // La última señal real: priorizar el equipo que SÍ está reportando (no el GPS viejo/caído)
      const rawComm = pickValue(
        devices.find(item => item.installed === true && item.ok === true)?.last,
        devices[0]?.last,
        devices[1]?.last,
        row.ultima_transmision,
      )
      const commMeta = parseDateMetadata(rawComm, 12) // GPS requiere señal dentro de 12h
      const lastCommFormatted = commMeta.formatted ? `Última señal: ${commMeta.relative || commMeta.formatted}` : 'Sin transmisión reciente'

      const gpsDevices = devices.map((item, i) => ({
        label: `GPS ${i + 1}`,
        state: (item.installed === false
          ? 'none'
          : item.installed === true
            ? (item.ok === true ? 'on' : 'off')
            : 'unknown') as 'on' | 'off' | 'none' | 'unknown',
        last: item.last ? formatPanamaDate(item.last) : undefined,
      }))

      Object.assign(gps, {
        gpsDevices,
        tone,
        badge: level === 'OK' ? 'NORMAL' : (level === 'ALERTA' && reporting === 1 ? 'PARCIAL 1/2' : level),
        value: summary,
        details: [
          { label: 'GPS 1', value: `${formatDeviceLabel(devices[0]!)}${devices[0]?.last ? ` · ${formatPanamaDate(devices[0]?.last)}` : ''}` },
          { label: 'GPS 2', value: `${formatDeviceLabel(devices[1]!)}${devices[1]?.last ? ` · ${formatPanamaDate(devices[1]?.last)}` : ''}` },
        ],
        updatedAt: lastCommFormatted,
        syncStatus: level === 'SIN INFORMACIÓN' ? 'outdated' : (level === 'CRÍTICO' || level === 'CRITICO' ? 'incomplete' : commMeta.isOutdated ? 'outdated' : 'verified'),
        note: reason ? `${level} · ${reason}` : `Estado satelital: ${level}`,
      })
    } else if (/NO DISPONIBLE|SIN GPS|NO VALIDADO|SIN INFORMAC/i.test(`${gps.badge} ${gps.value}`)) {
      if (gps.tone === 'ok') gps.tone = 'neutral'
      gps.updatedAt = 'Sin comunicación confirmada'
      gps.syncStatus = 'incomplete'
    }
  }

  // 4. CONTROL DE AUTO (AUDITORÍA FASE 5)
  // Mostrar estado operativo verídico (ACTIVA / PARADA / CERRADA)
  // Fecha: última actualización de estado de la unidad en flota, no la hora del navegador.
  const ctrlCard = detail.cards.find(card => card.key === 'control')
  if (ctrlCard) {
    const rawInternal = pickValue(c.estatus2, c.status2, c.estado, c.estatus, detail.status)
    const internalState = displayValue(rawInternal)
    const operationalStatus = detail.closed ? 'CERRADA' : detail.active ? 'ACTIVA' : 'PARADA'
    ctrlCard.tone = detail.closed ? 'neutral' : detail.active ? 'ok' : 'warn'
    ctrlCard.badge = operationalStatus

    // Formato exacto requerido: "Activa - Activa" o "Parada - Chapisteria" según corresponda
    const cleanOp = operationalStatus === 'ACTIVA' ? 'Activa' : operationalStatus === 'PARADA' ? 'Parada' : 'Cerrada'
    let cleanInt = internalState && internalState !== '—' && internalState !== 'SIN DETALLE' ? internalState : ''
    if (cleanInt) {
      // Normalizar a capitalización amigable (ej: "Activa", "Chapisteria", "Salud")
      cleanInt = cleanInt.charAt(0).toUpperCase() + cleanInt.slice(1).toLowerCase()
    } else {
      cleanInt = cleanOp
    }

    ctrlCard.value = `${cleanOp} - ${cleanInt}`
    
    const rawUpdate = pickValue(c.fecha_actualizacion_estado, c.fecha_estado, c.updated_at)
    const updateMeta = parseDateMetadata(rawUpdate, 720) // Estado operativo de flota
    ctrlCard.updatedAt = updateMeta.formatted ? `Actualizado: ${updateMeta.relative || updateMeta.formatted}` : 'Sincronizado RYM'
    ctrlCard.syncStatus = 'verified'
  }
}

export function applyValidatorSections(detail: UnitDetail, ficha: Unit | null = null): void {
  if (ficha) detail.fichaRecord = ficha
  applyOperationalPresentation(detail, ficha)
  for (const card of detail.cards) {
    if (card.key === 'control') card.sections = controlSections(detail, ficha)
    if (card.key === 'panapass') card.sections = panSections(detail)
    if (card.key === 'revisados') card.sections = revisadoSections(detail, ficha)
    if (card.key === 'gps') card.sections = gpsSections(detail)
  }

  // Detect Vehicle Color
  const c = objectValue(detail.controlRecord)
  const f = objectValue(ficha || detail.fichaRecord)
  const u = objectValue(f.unidad)
  const o = objectValue(f.oficial)
  const r = rawObject(pickValue(o.ultima_respuesta_exitosa, o.ultima_respuesta))
  const detectedColor = pickValue(
    c.color,
    c.color_vehiculo,
    u.color,
    r.colorVehiculo,
    o.color,
    (c.marca_modelo as string)?.split(/[\s·-]+/).pop()
  )
  if (detectedColor) {
    detail.vehicleColor = String(detectedColor).trim()
  }

  // Audit issues
  const issues: Array<{ code: string; label: string; severity: 'bad' | 'warn' | 'info'; desc: string }> = []

  const controlSec = detail.cards.find(x => x.key === 'control')?.sections || []
  const compSection = controlSec.find(s => s.title.includes('Comparación'))
  if (compSection) {
    const diffs = compSection.fields.filter(fld => fld.comparison === 'diff')
    if (diffs.length > 0) {
      issues.push({
        code: 'DISCREPANCIA_OFICIAL',
        label: `${diffs.length} Discrepancia${diffs.length > 1 ? 's' : ''} eCarCheck`,
        severity: 'warn',
        desc: `Cotejo oficial difiere en: ${diffs.map(d => `${d.label} (RYM: ${d.value} vs Oficial: ${d.reference})`).join(', ')}`
      })
    }
  }

  const revCard = detail.cards.find(x => x.key === 'revisados')
  if (revCard && detail.active) {
    if (revCard.badge === 'SIN REGISTRO' || revCard.value.includes('Sin registro')) {
      issues.push({
        code: 'REVISADO_SIN_REGISTRO',
        label: 'Sin Inspección ATTT',
        severity: 'warn',
        desc: 'Unidad activa en flota sin registro de revisado en eCarCheck / ATTT.'
      })
    } else if (revCard.tone === 'bad' || revCard.badge === 'VENCIDO') {
      issues.push({
        code: 'REVISADO_VENCIDO',
        label: 'Revisado Vencido',
        severity: 'bad',
        desc: 'La inspección técnica vehicular de la unidad está vencida.'
      })
    }
  }

  const panaCard = detail.cards.find(x => x.key === 'panapass')
  if (panaCard && panaCard.tone === 'bad') {
    issues.push({
      code: 'PANAPASS_INCIDENCIA',
      label: panaCard.badge === 'SIN PANAPASS' ? 'Sin Panapass Activo' : 'Saldo Negativo ENA',
      severity: 'bad',
      desc: panaCard.badge === 'SIN PANAPASS' ? 'Unidad sin número Panapass asignado en Control de Auto.' : 'Saldo negativo registrado en corredores ENA.'
    })
  }

  const gpsCard = detail.cards.find(x => x.key === 'gps')
  if (gpsCard && detail.active && (gpsCard.tone === 'bad' || gpsCard.badge === 'CRÍTICO' || gpsCard.badge === 'GPS CRÍTICO')) {
    issues.push({
      code: 'GPS_CRITICO',
      label: 'GPS Crítico',
      severity: 'bad',
      desc: 'La unidad presenta alerta crítica de transmisión satelital.'
    })
  }

  detail.auditIssues = issues
}
