export type Unit = Record<string, unknown>
export type DetailField = { label: string; value: string; reference?: string; comparison?: 'match' | 'diff' | 'missing' }
export type DetailSection = { title: string; fields: DetailField[] }
export type DetailCard = { key: string; title: string; tone: string; badge: string; value: string; details: Array<{ label: string; value: string }>; note: string; sections?: DetailSection[] }
export type UnitDetail = { unit: string; plate: string; owner: string; operator: string; supervisor: string; galera: string; closed: boolean; active: boolean; status: string; overall: string; cards: DetailCard[]; controlRecord?: Unit; revisadoRecord?: Unit; enaAccount?: Unit; gpsRecord?: Unit }
export type Api = { search: (query: string) => Promise<Unit[]>; load: (unit: Unit) => Promise<unknown>; enrich?: (detail: any) => Promise<any>; ficha?: (unit: Unit) => Promise<Unit>; gps?: (unit: Unit) => Promise<Record<string, unknown>> }

const hasValue = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '' && String(value).trim() !== '—'
const displayValue = (value: unknown) => !hasValue(value) ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value).trim()
const pickValue = (...values: unknown[]) => values.find(hasValue)
function objectValue(value: unknown): Unit { return value && typeof value === 'object' && !Array.isArray(value) ? value as Unit : {} }
function rawObject(value: unknown): Unit {
  if (typeof value === 'string') { try { return objectValue(JSON.parse(value)) } catch { return {} } }
  return objectValue(value)
}
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
  const controlSection = addSection('Control de Auto · RYM', [
    ['Póliza NetSuite', control.nro_poliza], ['Cupo / placa comercial', pickValue(control.placa_comercial, unitRecord.placa_comercial)],
    ['Marca', pickValue(control.marca, unitRecord.marca)], ['Modelo', pickValue(control.modelo, unitRecord.modelo)],
    ['Color', pickValue(control.color, unitRecord.color)], ['Año', pickValue(control.anio, unitRecord.anio)],
  ])
  if (controlSection) sections.push(controlSection)
  const technicalRym = addSection('Datos técnicos RYM', [
    ['Chasis', pickValue(control.chasis, unitRecord.chasis)], ['Motor', pickValue(control.motor, unitRecord.motor)],
    ['Transmisión', pickValue(control.transmision, unitRecord.transmision)], ['Estatus NetSuite', pickValue(control.estatus_netsuite, unitRecord.estatus_netsuite)],
  ])
  if (technicalRym) sections.push(technicalRym)
  const officialSection = addSection('Ficha oficial · eCarCheck', [
    ['Última verificación', pickValue(official.actualizado_at, ficha.consulta_at)], ['Resultado eCarCheck', pickValue(ficha.resultado, raw.detalleRespuesta, raw.detalle_respuesta)],
    ['Placa consultada', pickValue(raw.nroPlaca, official.placa)], ['Cupo oficial', pickValue(raw.cupo, official.cupo)],
    ['Propietario oficial', pickValue(raw.nombrePropietario, official.propietario)], ['Documento propietario', pickValue(raw.nroDocumentoPropietario, official.documento_propietario)],
    ['VIN', pickValue(raw.nroVin, official.vin)], ['Chasis', pickValue(raw.nroChasis, official.chasis)], ['Motor', pickValue(raw.nroMotor, official.motor)],
  ])
  if (officialSection) sections.push(officialSection)
  const officialTechnical = addSection('Características oficiales', [
    ['Marca', pickValue(raw.marcaVehiculo, raw.marcavehiculo, official.marca)], ['Modelo', pickValue(raw.modeloVehiculo, official.modelo)],
    ['Año vehículo', pickValue(raw.anioVehiculo, official.anio)], ['Color oficial', pickValue(raw.colorVehiculo, official.color)],
    ['Tipo de vehículo', pickValue(raw.tipoVehiculo, official.tipo_vehiculo)], ['Tipo de placa', pickValue(raw.tipoPlaca, official.tipo_placa)],
    ['Tipo de uso', pickValue(raw.tipoUso, official.tipo_uso)], ['Estado vehículo', pickValue(raw.estadoVehiculo, official.estado_vehiculo)],
    ['Transmisión', pickValue(raw.tipoTransmision, official.transmision)], ['Combustible', pickValue(raw.tipoCombustible, official.combustible)],
    ['Cilindrada', pickValue(raw.cilindradaVehiculo, official.cilindrada)], ['Cilindros', pickValue(raw.nroCilindros, official.cilindros)],
    ['Capacidad', raw.capacidadVehiculo != null ? `${displayValue(raw.capacidadVehiculo)} ${displayValue(raw.tipoCapacidad)}`.trim() : official.capacidad],
    ['Puertas', pickValue(raw.nroPuertas, official.puertas)], ['Tracción', pickValue(raw.traccionMotor, official.traccion)],
    ['Aire acondicionado', pickValue(raw.tieneAireAcondicionado, official.aire_acondicionado)], ['Pertenencia', pickValue(raw.tipoPertenencia, official.pertenencia)],
  ])
  if (officialTechnical) sections.push(officialTechnical)
  const legal = addSection('Seguro y restricciones', [
    ['Hipoteca', pickValue(raw.hipoteca, official.hipoteca)], ['Aseguradora', pickValue(raw.nombreAseguradora, raw.aseguradora, official.aseguradora)],
    ['Póliza', pickValue(raw.nroPolizaSeguro, raw.poliza, official.poliza)], ['Restricción vehicular', pickValue(raw.restriccionVehiculos, official.restriccion_vehicular)],
  ])
  if (legal) sections.push(legal)
  const officialReview = addSection('Fuente oficial del revisado', [
    ['Último revisado', pickValue(raw.fechaRevisado, official.fecha_revisado)], ['Mes revisado', pickValue(raw.mesRevisado, official.mes_revisado)],
    ['Rev ID', pickValue(raw.revId, raw.idRevisados, official.rev_id)], ['Último taller', pickValue(raw.ultTallerRevisado, official.ultimo_taller)],
    ['Observaciones', pickValue(raw.observaciones, official.observaciones)],
  ])
  if (officialReview) sections.push(officialReview)
  const officialValues: Array<[string, unknown, unknown]> = [
    ['Chasis', pickValue(control.chasis, unitRecord.chasis), pickValue(raw.nroChasis, official.chasis)],
    ['VIN', pickValue(control.vin, unitRecord.vin), pickValue(raw.nroVin, official.vin)], ['Motor', pickValue(control.motor, unitRecord.motor), pickValue(raw.nroMotor, official.motor)],
    ['Placa', pickValue(control.placa_unica, unitRecord.placa_unica), pickValue(raw.nroPlaca, official.placa)],
    ['Marca', pickValue(control.marca, unitRecord.marca), pickValue(raw.marcaVehiculo, raw.marcavehiculo, official.marca)],
    ['Modelo', pickValue(control.modelo, unitRecord.modelo), pickValue(raw.modeloVehiculo, official.modelo)], ['Año', pickValue(control.anio, unitRecord.anio), pickValue(raw.anioVehiculo, official.anio)],
    ['Color', pickValue(control.color, unitRecord.color), pickValue(raw.colorVehiculo, official.color)],
  ]
  const normalize = (item: unknown) => displayValue(item).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[\s-]+/g, '')
  const comparisons: DetailSection = { title: 'Comparación RYM / eCarCheck', fields: officialValues.map(([label, left, right]) => {
    const comparison = !hasValue(left) || !hasValue(right) ? 'missing' : normalize(left) === normalize(right) ? 'match' : 'diff'
    return { label, value: hasValue(left) ? displayValue(left) : 'Sin dato', reference: hasValue(right) ? displayValue(right) : 'Sin dato', comparison }
  }) }
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
  if (!tags.length && typeof tagsRaw === 'string') { try { const parsed: unknown = JSON.parse(tagsRaw); tags = Array.isArray(parsed) ? parsed as Unit[] : [] } catch { tags = [] } }
  const ids = Array.isArray(c.tags_ena) ? c.tags_ena.join(' · ') : c.tags_ena
  const sections = [fields('Panapass y TAGs', [
    ['Número Panapass', pickValue(c.panapass_numero, c.numero_panapass)], ['Panapass display', pickValue(account.panapass_display, c.panapass_display)],
    ['TAG principal', pickValue(c.tag, 'Sin TAG registrado')], ['Otros TAGs ENA', ids], ['Cantidad de TAGs', c.cantidad_tags],
    ['Último resultado', c.ena_ultimo_resultado], ['Último error', pickValue(c.ena_ultimo_error, account.ultimo_error)],
  ])]
  for (const [i, tag] of tags.entries()) {
    const section = fields(`TAG ${displayValue(pickValue(tag.tag, tag.numero_tag, i + 1))}`, [
      ['Estado del TAG', pickValue(tag.estado_tag, tag.estado)], ['Estado financiero', tag.estado_financiero], ['Tipo de TAG', pickValue(tag.tipo_tag, tag.tipo)],
      ['Matrícula', pickValue(tag.matricula, tag.placa)], ['Saldo del TAG', tag.saldo], ['Tipo de vehículo', tag.tipo_vehiculo],
      ['Corregimiento', tag.corregimiento], ['Consulta del TAG', tag.consultado_at],
    ])
    if (section) sections.push(section)
  }
  const admin = fields('Información administrativa ENA', [
    ['Acceso ENA interno · no valida el vehículo', pickValue(account.estado_acceso, c.ena_estado_acceso)],
    ['Último login correcto', pickValue(account.ultimo_login_ok, c.ena_ultimo_login_ok)], ['Empresa ENA', pickValue(account.ena_empresa, c.ena_empresa)],
    ['RUC ENA', pickValue(account.ena_ruc, c.ena_ruc)], ['Email ENA', pickValue(account.ena_email, c.ena_email)],
    ['Tipo de credencial', pickValue(account.tipo_credencial, c.tipo_credencial)], ['Fecha de actualización', pickValue(account.updated_at, c.ena_actualizado_at)],
  ])
  if (admin) sections.push(admin)
  return sections.filter((item): item is DetailSection => !!item)
}
function revisadoSections(detail: UnitDetail, fichaResponse: Unit | null): DetailSection[] {
  const c = objectValue(detail.controlRecord), r = objectValue(detail.revisadoRecord), f = objectValue(fichaResponse)
  const official = objectValue(f.oficial), raw = rawObject(pickValue(official.ultima_respuesta_exitosa, official.ultima_respuesta)), op = objectValue(f.operacion)
  const photoCount = Number(r.cantidad_fotos ?? r.total_fotos ?? r.fotos_count ?? 0)
  const hasPhotos = r.fotos_disponibles === true || ['1', 'SI', 'TRUE', 'YES'].includes(String(r.fotos_disponibles ?? '').trim().toUpperCase()) || photoCount > 0
  const noPhotos = r.fotos_disponibles === false || ['0', 'NO', 'FALSE'].includes(String(r.fotos_disponibles ?? '').trim().toUpperCase())
  const photos = hasPhotos ? (photoCount ? `${photoCount} foto${photoCount === 1 ? '' : 's'}` : 'Fotos disponibles') : noPhotos ? 'Sin fotos' : null
  const section = fields('Revisado', [
    ['Mes asignado', pickValue(c.mes_revisado, objectValue(f.unidad).mes_revisado, r.mes_revisado, r.mes)], ['Año revisado', pickValue(official.anio_revisado, r.anio_revisado)],
    ['Rev ID', pickValue(raw.revId, raw.idRevisados, official.rev_id, r.rev_id)], ['Taller / emisor', pickValue(raw.ultTallerRevisado, official.taller, official.emisor, objectValue(f.unidad).taller_revisado)],
    ['Tipo de placa', pickValue(raw.tipoPlaca, official.tipo_placa)], ['Tipo de uso', pickValue(raw.tipoUso, official.tipo_uso)],
    ['Estado oficial del vehículo', pickValue(raw.estadoVehiculo, official.estado_vehiculo)], ['Emitido', r.emitido == null ? null : r.emitido ? 'Sí' : 'No'],
    ['Bloqueado', r.bloqueado == null ? null : r.bloqueado ? 'Sí' : 'No'], ['Fotos', photos], ['Observación', pickValue(raw.observaciones, official.observacion, objectValue(f.unidad).observacion_revisado)],
    ['Último revisado', pickValue(op.fecha_ultimo_revisado, official.fecha_revisado, raw.fechaRevisado, r.ultimo_revisado, r.fecha)],
  ])
  return section ? [section] : []
}
function gpsSections(detail: UnitDetail): DetailSection[] {
  const r = objectValue(detail.gpsRecord), g1 = objectValue(r.gps1), g2 = objectValue(r.gps2)
  const evaluation = fields('Evaluación GPS', [['Clasificación final', r.nivel], ['Motivo', r.razon], ['Diagnóstico operativo', pickValue(r.diagnostico_operativo, r.estado_operativo)]])
  const equipment = fields('GPS 1 y GPS 2', [['GPS 1', [g1.label, g1.last].filter(hasValue).join(' · ')], ['GPS 2', [g2.label, g2.last].filter(hasValue).join(' · ')], ['Proveedor GPS 1', pickValue(g1.proveedor, g1.fuente)], ['Proveedor GPS 2', pickValue(g2.proveedor, g2.fuente)]])
  return [evaluation, equipment].filter((item): item is DetailSection => !!item)
}
export function applyValidatorSections(detail: UnitDetail, ficha: Unit | null = null): void {
  for (const card of detail.cards) {
    if (card.key === 'control') card.sections = controlSections(detail, ficha)
    if (card.key === 'panapass') card.sections = panSections(detail)
    if (card.key === 'revisados') card.sections = revisadoSections(detail, ficha)
    if (card.key === 'gps') card.sections = gpsSections(detail)
  }
}
