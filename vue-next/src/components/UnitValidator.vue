<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ModuleIcon from './ModuleIcon.vue'
import type { PortalProfile } from '../types'
import {
  applyValidatorSections,
  rankAndFilterUnits,
  type Unit,
  type UnitDetail,
  type Api,
  type DetailCard,
  type DetailSection,
} from '../validatorDetails'

const props = defineProps<{
  api?: Api
  profile?: PortalProfile
  onControl?: () => unknown
  onModuleNavigate?: (moduleId: 'panapass' | 'revisados' | 'control' | 'gps') => void
}>()

const query = ref('')
const rows = ref<Unit[]>([])
const loading = ref(false)
const searched = ref(false)
const searchError = ref('')
const activeIndex = ref(-1)
const input = ref<HTMLInputElement>()
const wrap = ref<HTMLDivElement>()
const panelOpen = ref(false)
const detail = ref<UnitDetail | null>(null)
const selectedSeed = ref<Unit | null>(null)
const detailLoading = ref(false)
const detailEnriching = ref(false)
const detailError = ref('')
const modalOpen = ref(false)
const recentUnits = ref<Unit[]>([])

// Control de expansión de cada una de las 4 tarjetas principales de sistemas
const expandedSystemCards = ref<Record<string, boolean>>({
  panapass: false,
  revisados: false,
  gps: false,
  control: false,
})

// Control de expansión de las 3 secciones secundarias (Fase 5: no permanentemente abiertas)
const expandedSecondary = ref<Record<string, boolean>>({
  tecnicos: false,
  asignacion: false,
  documentacion: false,
})

// Feedback de copiado rápido (Fase 8)
const copiedTarget = ref<'' | 'unit' | 'plate' | 'panapass' | 'vin'>('')
let copyTimer: number | undefined

function copyText(text: string, target: 'unit' | 'plate' | 'panapass' | 'vin') {
  const clean = String(text || '').trim()
  if (!clean || clean === '—') return
  window.clearTimeout(copyTimer)
  copiedTarget.value = target
  if (typeof window !== 'undefined' && window.navigator?.clipboard) {
    void window.navigator.clipboard.writeText(clean).catch(() => {})
  }
  copyTimer = window.setTimeout(() => {
    copiedTarget.value = ''
  }, 1800)
}

// Permisos por rol de usuario (Fase 5: proteger PIN y credenciales sensibles)
const userRole = computed(() => {
  const fromProp = props.profile?.rol
  const fromGlobal = typeof window !== 'undefined' ? (window as any).__RYM_ROLE : ''
  return String(fromProp || fromGlobal || 'OPERATIVO').trim().toUpperCase()
})

const canSeeSensitivePin = computed(() => ['ADMIN_TOTAL', 'ADMIN'].includes(userRole.value))
const canSeeGps = computed(() => ['ADMIN_TOTAL', 'ADMIN', 'GERENTE_GALERA', 'SUPERVISORA'].includes(userRole.value))
const canNavigateControl = computed(() => ['ADMIN_TOTAL', 'ADMIN', 'SUPERVISORA'].includes(userRole.value))

// Mapeo de color de carrocería (Panamá / RYM / ATTT)
const carColorStyle = computed(() => {
  const raw = (detail.value?.vehicleColor || '').toLowerCase().trim()
  if (/blanco|white|perla/i.test(raw)) {
    return { bg: '#f8fafc', text: '#0f172a', border: '#cbd5e1', dot: '#ffffff', name: 'Blanco' }
  }
  if (/negro|black/i.test(raw)) {
    return { bg: '#0f172a', text: '#f8fafc', border: '#334155', dot: '#09090b', name: 'Negro' }
  }
  if (/rojo|red|vino|escarlata/i.test(raw)) {
    return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', dot: '#dc2626', name: 'Rojo' }
  }
  if (/azul|blue|marino|celeste/i.test(raw)) {
    return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', dot: '#2563eb', name: 'Azul' }
  }
  if (/amarillo|yellow|oro|gold/i.test(raw)) {
    return { bg: '#fefce8', text: '#854d0e', border: '#fef08a', dot: '#eab308', name: 'Amarillo' }
  }
  if (/verde|green/i.test(raw)) {
    return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', dot: '#16a34a', name: 'Verde' }
  }
  if (/gris|grey|plata|silver/i.test(raw)) {
    return { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1', dot: '#64748b', name: 'Gris Plata' }
  }
  if (/naranja|orange/i.test(raw)) {
    return { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa', dot: '#ea580c', name: 'Naranja' }
  }
  return { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd', dot: '#0ea5e9', name: detail.value?.vehicleColor || 'Estándar' }
})

let timer: number | undefined
let sequence = 0
let detailSequence = 0
let previousOverflow = ''

const visible = computed(() => panelOpen.value && query.value.trim().length >= 2 && (loading.value || searched.value))

const value = (row: Unit, ...keys: string[]) =>
  String(keys.map(key => row[key]).find(item => item !== undefined && item !== null && String(item).trim() && String(item).trim() !== '—') ?? '—')

const unit = (row: Unit) => value(row, 'unidad', 'unit')
const plate = (row: Unit) => value(row, 'placa_unica', 'placa', 'placa_comercial')
const company = (row: Unit) => value(row, 'empresa_operadora', 'empresa_duena', 'empresa', 'empresa_nombre', 'razon_social', 'duena', 'propietario')
const panapass = (row: Unit) => {
  const raw = value(row, 'panapass_numero', 'panapass')
  return raw === '—' ? '' : raw
}
const status = (row: Unit) => {
  const st1 = String(row.estatus ?? row.estado ?? '').trim().toUpperCase()
  const st2 = String(row.estatus2 ?? row.status2 ?? '').trim().toUpperCase()
  if (st1 === 'CERRADO' || st1 === 'CERRADA') return 'CERRADA'
  if (st1 === 'ACTIVO' && (!st2 || st2 === 'ACTIVO' || st2 === 'CONVENIO')) return 'ACTIVA'
  if (st2 && st2 !== 'ACTIVO' && st2 !== 'SIN DETALLE') return `PARADA · ${st2}`
  if (st1) return st1
  return 'ACTIVA'
}
const statusToneClass = (row: Unit) => {
  const s = status(row)
  if (/^ACTIVA|^ACTIVO|^OPERATIVO/i.test(s)) return 'is-ok'
  if (/CERRAD/i.test(s)) return 'is-neutral'
  return 'is-warn'
}
const matchBadgeText = (row: Unit) => {
  const tier = String(row._matchTier || '')
  if (tier === 'exact_unit') return 'Coincidencia exacta · Unidad'
  if (tier === 'exact_plate') return 'Coincidencia exacta · Placa'
  if (tier === 'exact_panapass') return 'Coincidencia exacta · Panapass'
  if (tier === 'approximate') return 'Sugerencia aproximada'
  return ''
}

function toggleSystemCard(key: string) {
  expandedSystemCards.value[key] = !expandedSystemCards.value[key]
}

function toggleSecondarySection(key: 'tecnicos' | 'asignacion' | 'documentacion') {
  expandedSecondary.value[key] = !expandedSecondary.value[key]
}

async function select(row: Unit) {
  panelOpen.value = false
  searched.value = false
  modalOpen.value = true
  selectedSeed.value = row
  expandedSystemCards.value = { panapass: false, revisados: false, gps: false, control: false }
  expandedSecondary.value = { tecnicos: false, asignacion: false, documentacion: false }
  recentUnits.value = [row, ...recentUnits.value.filter(item => unit(item) !== unit(row))].slice(0, 5)
  await loadUnitDetail(row)
}

async function refreshCurrentUnit() {
  if (!selectedSeed.value && !detail.value) return
  const seed = selectedSeed.value || (detail.value?.controlRecord as Unit) || { unidad: detail.value?.unit, placa_unica: detail.value?.plate }
  await loadUnitDetail(seed, true)
}

async function loadUnitDetail(row: Unit, isRefresh = false) {
  if (!isRefresh) {
    detail.value = null
    detailLoading.value = true
  }
  detailEnriching.value = true
  detailError.value = ''

  const current = ++detailSequence
  try {
    if (!props.api) throw Error('El validador no está disponible.')
    const result = await props.api.load(row) as UnitDetail
    if (current !== detailSequence) return
    applyValidatorSections(result, null)
    detail.value = result
    detailLoading.value = false

    let fichaData: Unit | null = null
    const applyExtras = (ficha: Unit | null = fichaData) => {
      if (current !== detailSequence || !detail.value) return
      applyValidatorSections(detail.value, ficha)
      // Trigger reactivity on deep update
      detail.value = { ...detail.value, cards: [...detail.value.cards] }
    }
    applyExtras(null)

    const enrichment = props.api.enrich
      ? props.api.enrich(result).then(updated => {
          if (current === detailSequence) {
            detail.value = updated
            applyExtras()
          }
        }).catch(() => {})
      : Promise.resolve()

    const fichaPromise = props.api.ficha
      ? props.api.ficha(row).then(ficha => {
          fichaData = ficha
          applyExtras()
        }).catch(() => {})
      : Promise.resolve()

    await Promise.all([enrichment, fichaPromise])

    const gps = result.cards.find(card => card.key === 'gps')
    const stateDetail = gps?.details.find(item => item.label === 'Estado')?.value || ''
    if (gps && /HTTP\s+5\d\d/i.test(stateDetail) && props.api.gps) {
      try {
        const response = await props.api.gps(row)
        if (!response.ok) throw Error(String(response.error || 'El servicio alterno no respondió.'))
        const gpsRows = Array.isArray(response.rows) ? response.rows as Unit[] : []
        const q = unit(row).trim().toLocaleUpperCase()
        const match = gpsRows.find(item => unit(item).trim().toLocaleUpperCase() === q) || gpsRows[0]
        if (!match) throw Error('El servicio alterno no encontró esa unidad.')
        result.gpsRecord = match
        applyExtras()
      } catch {
        Object.assign(gps, {
          tone: 'neutral',
          badge: 'SIN CONEXIÓN',
          value: 'No se pudo consultar GPS',
          details: [
            { label: 'GPS 1', value: 'Sin respuesta del servidor' },
            { label: 'GPS 2', value: 'Sin respuesta del servidor' },
          ],
          updatedAt: 'Consulta fallida',
          note: 'El servicio satelital no respondió. No se asume estado en verde.',
        })
      }
    }
    if (current === detailSequence && detail.value) {
      applyExtras()
    }
  } catch (error) {
    if (current === detailSequence) detailError.value = error instanceof Error ? error.message : String(error)
  } finally {
    if (current === detailSequence) {
      detailLoading.value = false
      detailEnriching.value = false
    }
  }
}

function closeDetail() {
  modalOpen.value = false
  detailSequence++
  detailLoading.value = false
  detailEnriching.value = false
  detail.value = null
  detailError.value = ''
  window.setTimeout(() => {
    input.value?.focus({ preventScroll: true })
    input.value?.select()
  }, 40)
}

async function executeSearch(rawTerm: string): Promise<Unit[]> {
  if (!props.api) return []
  const rawResult = await props.api.search(rawTerm)
  return rankAndFilterUnits(Array.isArray(rawResult) ? rawResult : [], rawTerm)
}

async function searchNow() {
  window.clearTimeout(timer)
  const term = query.value.trim()
  if (term.length < 2 || !props.api) return

  // Si ya hay un resultado activo o único en pantalla, Enter o Buscar lo abre inmediatamente
  if (rows.value.length === 1) {
    void select(rows.value[0]!)
    return
  }
  if (activeIndex.value >= 0 && rows.value[activeIndex.value]) {
    void select(rows.value[activeIndex.value]!)
    return
  }

  const current = ++sequence
  panelOpen.value = true
  loading.value = true
  searched.value = false
  searchError.value = ''
  try {
    const ranked = await executeSearch(term)
    if (current !== sequence) return
    rows.value = ranked
    searched.value = true
    activeIndex.value = ranked.length > 0 ? 0 : -1
    if (ranked.length === 1) {
      void select(ranked[0]!)
    }
  } catch (error) {
    if (current !== sequence) return
    searched.value = true
    searchError.value = error instanceof Error ? error.message : String(error)
  } finally {
    if (current === sequence) loading.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (panelOpen.value) {
      panelOpen.value = false
      event.preventDefault()
      return
    }
    if (query.value) {
      query.value = ''
      rows.value = []
      searched.value = false
      event.preventDefault()
      return
    }
  }
  if (!visible.value || !rows.value.length) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void searchNow()
    }
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % rows.value.length
    scrollActiveIntoView()
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = activeIndex.value <= 0 ? rows.value.length - 1 : activeIndex.value - 1
    scrollActiveIntoView()
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    const targetIdx = activeIndex.value >= 0 ? activeIndex.value : 0
    if (rows.value[targetIdx]) {
      void select(rows.value[targetIdx]!)
    }
  }
}

function scrollActiveIntoView() {
  const el = wrap.value?.querySelectorAll('.v-result-card')[activeIndex.value] as HTMLElement | undefined
  el?.scrollIntoView({ block: 'nearest' })
}

function outsideClick(event: PointerEvent) {
  if (!wrap.value?.contains(event.target as Node)) {
    panelOpen.value = false
  }
}

function lockPage(open: boolean) {
  if (open) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = previousOverflow
  }
}

watch(query, (val) => {
  window.clearTimeout(timer)
  const term = val.trim()
  const current = ++sequence
  rows.value = []
  searched.value = false
  activeIndex.value = -1
  searchError.value = ''
  if (term.length < 2 || !props.api) {
    loading.value = false
    return
  }
  panelOpen.value = true
  loading.value = true
  timer = window.setTimeout(async () => {
    try {
      const ranked = await executeSearch(term)
      if (current === sequence) {
        rows.value = ranked
        searched.value = true
        // Si hay coincidencia exacta o resultado único, dejarlo resaltado para abrir con Enter
        activeIndex.value = ranked.length > 0 ? 0 : -1
      }
    } catch (error) {
      if (current === sequence) {
        searched.value = true
        searchError.value = error instanceof Error ? error.message : String(error)
      }
    } finally {
      if (current === sequence) loading.value = false
    }
  }, 160)
})

// =========================================================================
// DATOS DERIVADOS PARA LA NUEVA FICHA DE UNIDAD (FASE 3, 4, 5, 6)
// =========================================================================

const vehicleIdentityLabel = computed(() => {
  if (!detail.value) return ''
  const c = detail.value.controlRecord || {}
  const f = (detail.value.fichaRecord as Unit) || {}
  const u = (f.unidad as Unit) || {}
  const o = (f.oficial as Unit) || {}
  const parts = [
    c.marca || u.marca || o.marca,
    c.modelo || u.modelo || o.modelo,
    c.anio || u.anio || o.anio,
  ]
    .map(x => String(x ?? '').trim())
    .filter(x => x && x !== '—')
  return parts.join(' · ') || 'Vehículo de flota RYM'
})

const companyHeaderLabel = computed(() => {
  if (!detail.value) return '—'
  const c = detail.value.controlRecord || {}
  return String(
    c.empresa_operadora || detail.value.operator || c.empresa_duena || detail.value.owner || 'Flota RYM Panamá'
  ).trim()
})

const operationalStatusHeader = computed(() => {
  if (!detail.value) return { label: 'CONSULTANDO', sub: '', tone: 'info' }
  const c = detail.value.controlRecord || {}
  const internalRaw = String(c.estatus2 ?? c.status2 ?? c.estado ?? '').trim().toUpperCase()
  if (detail.value.closed) {
    return { label: 'UNIDAD CERRADA', sub: internalRaw || 'Histórico', tone: 'neutral' }
  }
  if (!detail.value.active) {
    const reason = internalRaw && internalRaw !== 'ACTIVO' ? internalRaw : 'EN PATIO / TALLER'
    return { label: 'UNIDAD PARADA', sub: reason, tone: 'bad' }
  }
  const hasBadCard = detail.value.cards.some(card => card.tone === 'bad')
  const hasWarnCard = detail.value.cards.some(card => card.tone === 'warn')
  if (hasBadCard) {
    return { label: 'ACTIVA · CON INCIDENCIA', sub: internalRaw || 'Operativa con alerta', tone: 'warn' }
  }
  if (hasWarnCard) {
    return { label: 'ACTIVA · EN SEGUIMIENTO', sub: internalRaw || 'Operativa', tone: 'info' }
  }
  return { label: 'ACTIVA · OPERATIVA', sub: internalRaw && internalRaw !== 'ACTIVO' ? internalRaw : 'Operación normal', tone: 'ok' }
})

// Los 4 sistemas principales garantizados en orden: Panapass, Revisado, GPS, Control de Auto
const fourSystemCards = computed<DetailCard[]>(() => {
  if (!detail.value) return []
  const byKey = new Map<string, DetailCard>()
  for (const card of detail.value.cards) {
    byKey.set(card.key, card)
  }

  const c = detail.value.controlRecord || {}
  const panNum = String(c.panapass_numero || '').trim()

  const panCard: DetailCard = byKey.get('panapass') || {
    key: 'panapass',
    title: 'Panapass',
    tone: panNum ? 'neutral' : 'bad',
    badge: panNum ? 'SIN RESPUESTA' : 'SIN PANAPASS',
    value: panNum ? 'No disponible' : 'No asignado',
    details: [{ label: 'Número Panapass', value: panNum || 'No asignado' }],
    updatedAt: 'Sin consulta reciente',
    note: panNum ? 'Sin confirmación de saldo ENA.' : 'Control de Auto no registra Panapass activo.',
  }

  const revCard: DetailCard = byKey.get('revisados') || {
    key: 'revisados',
    title: 'Revisado',
    tone: 'neutral',
    badge: 'SIN CONFIRMAR',
    value: String(c.mes_revisado || 'Sin registro'),
    details: [{ label: 'Mes asignado', value: String(c.mes_revisado || 'No definido') }],
    updatedAt: 'Sin consulta reciente',
    note: 'Estado de revisado vehicular.',
  }

  const gpsCard: DetailCard = byKey.get('gps') || {
    key: 'gps',
    title: 'GPS',
    tone: 'neutral',
    badge: canSeeGps.value ? 'SIN DATOS GPS' : 'RESTRINGIDO',
    value: canSeeGps.value ? 'Sin información satelital' : 'Nivel de acceso estándar',
    details: [
      { label: 'GPS 1', value: canSeeGps.value ? 'Sin información' : 'No habilitado en este perfil' },
      { label: 'GPS 2', value: canSeeGps.value ? 'Sin información' : 'No habilitado en este perfil' },
    ],
    updatedAt: 'Sin comunicación confirmada',
    note: canSeeGps.value ? 'No se recibieron lecturas de GPS 1 / GPS 2.' : 'Monitoreo satelital reservado a supervisión y administración.',
  }

  const internalStopReason = String(c.estatus2 || c.status2 || c.estado || c.estatus || 'SIN DETALLE').trim().toUpperCase()
  const ctrlCard: DetailCard = byKey.get('control') || {
    key: 'control',
    title: 'Control de Auto',
    tone: detail.value.closed ? 'neutral' : detail.value.active ? 'ok' : 'warn',
    badge: detail.value.closed ? 'CERRADA' : detail.value.active ? 'ACTIVA' : 'PARADA',
    value: detail.value.closed ? 'CERRADA' : detail.value.active ? 'EN OPERACIÓN' : internalStopReason,
    details: [
      { label: 'Galera', value: detail.value.galera || '—' },
      { label: 'Supervisora', value: detail.value.supervisor || '—' },
    ],
    updatedAt: 'Sincronizado RYM',
    note: detail.value.active ? 'Unidad activa en Control de Auto.' : `Unidad parada · Estado interno: ${internalStopReason}`,
  }

  return [panCard, revCard, gpsCard, ctrlCard]
})

function cardPrimaryMetrics(card: DetailCard): Array<{ label: string; value: string }> {
  const c = detail.value?.controlRecord || {}
  const rev = detail.value?.revisadoRecord || {}
  const gps = detail.value?.gpsRecord || {}
  const g1 = (gps.gps1 as Unit) || {}
  const g2 = (gps.gps2 as Unit) || {}

  if (card.key === 'panapass') {
    const panNum = String(c.panapass_numero || c.panapass || 'No asignado').trim()
    const tagNum = String(c.tag || 'Sin TAG').trim()
    return [
      { label: 'Estado del saldo', value: card.badge || 'Sin confirmar' },
      { label: 'N.º Panapass / TAG', value: `${panNum}${tagNum && tagNum !== 'Sin TAG' ? ` · TAG ${tagNum}` : ''}` },
      { label: 'Última consulta ENA', value: card.updatedAt || card.details?.[0]?.value || 'Sin consulta reciente' },
    ]
  }

  if (card.key === 'revisados') {
    const month = String(c.mes_revisado || rev.mes_revisado || rev.mes || 'No definido').trim()
    const lastRev = card.details?.find(d => /último|fecha/i.test(d.label))?.value || String(rev.ultimo_revisado || 'Sin registro')
    return [
      { label: 'Estado actual', value: card.badge || 'SIN CONFIRMAR' },
      { label: 'Mes / Vencimiento', value: month },
      { label: 'Última consulta / ref.', value: lastRev },
    ]
  }

  if (card.key === 'gps') {
    const g1Text = card.details?.[0]?.value || (g1.installed === false ? 'Sin GPS' : String(g1.label || 'Sin dato'))
    const g2Text = card.details?.[1]?.value || (g2.installed === false ? 'Sin GPS' : String(g2.label || 'Sin dato'))
    return [
      { label: 'GPS 1', value: g1Text },
      { label: 'GPS 2', value: g2Text },
      { label: 'Última comunicación', value: card.updatedAt || 'Sin transmisión reciente' },
    ]
  }

  // Control de Auto
  const internalState = String(c.estatus2 || c.status2 || c.estado || (detail.value?.active ? 'ACTIVO' : 'PARADA')).trim()
  return [
    { label: detail.value?.active ? 'Condición operativa' : 'Estado interno (Parada)', value: internalState || '—' },
    { label: 'Galera / Supervisora', value: `${detail.value?.galera || '—'} · ${detail.value?.supervisor || '—'}` },
    { label: 'Empresa operadora', value: detail.value?.operator || '—' },
  ]
}

// Datos Técnicos y Administrativos agrupados en 3 secciones secundarias (Fase 5)
const technicalFields = computed(() => {
  if (!detail.value) return []
  const c = detail.value.controlRecord || {}
  const f = (detail.value.fichaRecord as Unit) || {}
  const u = (f.unidad as Unit) || {}
  const o = (f.oficial as Unit) || {}

  const items: Array<{ label: string; value: string; mono?: boolean; copyKey?: 'vin' | 'plate'; sensitive?: boolean }> = [
    { label: 'Placa única', value: String(c.placa_unica || detail.value.plate || '—'), mono: true, copyKey: 'plate' },
    { label: 'Placa comercial / Cupo', value: String(c.placa_comercial || u.placa_comercial || o.cupo || 'No aplica'), mono: true },
    { label: 'VIN / Chasis', value: String(c.chasis || c.vin || u.chasis || o.chasis || o.vin || '—'), mono: true, copyKey: 'vin' },
    { label: 'Número de motor', value: String(c.motor || u.motor || o.motor || '—'), mono: true },
    { label: 'Transmisión', value: String(c.transmision || u.transmision || o.transmision || '—') },
    { label: 'Marca / Modelo / Año', value: vehicleIdentityLabel.value },
    { label: 'Color registrado', value: String(c.color || detail.value.vehicleColor || '—') },
  ]

  // Mostrar PIN únicamente cuando corresponda al perfil autorizado (ADMIN_TOTAL / ADMIN)
  if (canSeeSensitivePin.value && c.pin && String(c.pin).trim() !== '' && String(c.pin).trim() !== '—') {
    items.push({
      label: 'PIN de seguridad (Autorizado)',
      value: String(c.pin).trim(),
      mono: true,
      sensitive: true,
    })
  }

  return items
})

const assignmentFields = computed(() => {
  if (!detail.value) return []
  const c = detail.value.controlRecord || {}
  return [
    { label: 'Empresa propietaria (Dueña)', value: String(c.empresa_duena || detail.value.owner || '—') },
    { label: 'Empresa operadora', value: String(c.empresa_operadora || detail.value.operator || '—') },
    { label: 'Supervisora asignada', value: String(detail.value.supervisor || c.supervisora || '—') },
    { label: 'Galera / Patio operativo', value: String(detail.value.galera || c.galera || '—') },
    { label: 'Estado en Control de Auto', value: detail.value.active ? 'ACTIVA' : (detail.value.closed ? 'CERRADA' : 'PARADA') },
    { label: 'Sub-estado operativo interno', value: String(c.estatus2 || c.status2 || c.estatus_netsuite || detail.value.status || '—') },
  ]
})

const documentationFields = computed(() => {
  if (!detail.value) return []
  const c = detail.value.controlRecord || {}
  const f = (detail.value.fichaRecord as Unit) || {}
  const o = (f.oficial as Unit) || {}
  const r = (detail.value.revisadoRecord as Unit) || {}
  return [
    { label: 'Póliza NetSuite', value: String(c.nro_poliza || 'Sin póliza registrada'), mono: true },
    { label: 'Estatus NetSuite', value: String(c.estatus_netsuite || c.estatus || '—') },
    { label: 'Aseguradora oficial', value: String(o.aseguradora || c.aseguradora || '—') },
    { label: 'Póliza oficial / Seguro', value: String(o.poliza || c.nro_poliza || '—'), mono: true },
    { label: 'Mes de revisado asignado', value: String(c.mes_revisado || r.mes_revisado || o.mes_revisado || '—') },
    { label: 'Última verificación eCarCheck', value: String(o.actualizado_at || f.consulta_at || r.ultimo_revisado || 'Sin verificación reciente') },
  ]
})

const officialComparisons = computed(() => {
  if (!detail.value) return []
  const ctrlCard = detail.value.cards.find(c => c.key === 'control')
  const compSec: DetailSection | undefined = ctrlCard?.sections?.find(s => s.title.includes('Comparación'))
  return compSec?.fields || []
})

function handleModuleShortcut(mod: 'panapass' | 'revisados' | 'control' | 'gps') {
  closeDetail()
  if (props.onModuleNavigate) {
    props.onModuleNavigate(mod)
  } else if (mod === 'control' && props.onControl) {
    props.onControl()
  }
}

onMounted(() => document.addEventListener('pointerdown', outsideClick))
watch(modalOpen, lockPage)
onUnmounted(() => {
  window.clearTimeout(timer)
  window.clearTimeout(copyTimer)
  sequence++
  detailSequence++
  document.body.style.overflow = previousOverflow
  document.removeEventListener('pointerdown', outsideClick)
})
</script>

<template>
  <div ref="wrap" class="v-search-box" data-testid="unit-validator-search">
    <!-- Search Bar with Integrated Action -->
    <div class="v-search-bar" :class="{ focused: panelOpen }">
      <div class="v-search-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <input
        id="v101ValidatorQ"
        ref="input"
        v-model="query"
        type="search"
        placeholder="Escribe unidad (ej. I480), placa o Panapass..."
        autocomplete="off"
        aria-label="Buscar unidad, placa o Panapass"
        aria-controls="v101ValidatorList"
        :aria-expanded="visible"
        @focus="panelOpen = true"
        @keydown="onKeydown"
      >
      <kbd v-if="query" class="v-kbd" title="Limpiar búsqueda" @click="query = ''; rows = []; searched = false">ESC</kbd>
      <button
        id="v101ValidatorGo"
        class="v-submit-btn"
        type="button"
        :disabled="query.trim().length < 2 || loading"
        @click="searchNow"
      >
        <span>Buscar unidad</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </button>
    </div>

    <!-- FASE 1 & FASE 2: Autocompletado Inteligente con Prioridad Estricta -->
    <div
      v-if="visible"
      id="v101ValidatorList"
      class="v-dropdown-panel"
      role="listbox"
      aria-label="Unidades encontradas"
      data-testid="search-autocomplete-dropdown"
    >
      <div v-if="loading" class="v-state-loading">
        <div class="v-sonar-spinner"></div>
        <span>Buscando coincidencia exacta en la flota...</span>
      </div>

      <div v-else-if="searchError" class="v-state-error" role="alert">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>{{ searchError }}</span>
      </div>

      <div v-else-if="!rows.length" class="v-state-empty" data-testid="search-empty-state">
        <div class="v-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <circle cx="11" cy="11" r="7"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <div>
          <strong>Sin coincidencias para “{{ query.trim() }}”</strong>
          <p>Verifica el número de unidad, placa única o cuenta Panapass.</p>
        </div>
      </div>

      <div v-else class="v-results-list">
        <div class="v-results-meta">
          <span class="v-results-count">
            <template v-if="rows.length === 1 && matchBadgeText(rows[0]!)">
              <strong>{{ matchBadgeText(rows[0]!) }}</strong>
            </template>
            <template v-else>
              {{ rows.length }} {{ rows.length === 1 ? 'unidad encontrada' : 'unidades encontradas' }}
            </template>
          </span>
          <small>↑ ↓ navegar · <b>Enter ↵</b> abrir ficha</small>
        </div>

        <button
          v-for="(item, index) in rows"
          :key="`${unit(item)}-${plate(item)}`"
          type="button"
          class="v-result-card"
          :class="{ active: index === activeIndex, 'is-exact': String(item._matchTier || '').startsWith('exact_') }"
          role="option"
          :data-testid="`search-result-item-${unit(item)}`"
          :aria-selected="index === activeIndex"
          @click="select(item)"
          @mouseenter="activeIndex = index"
        >
          <!-- Columna 1: Número de Unidad -->
          <div class="v-res-unit-badge">
            <span class="v-unit-code">{{ unit(item) }}</span>
          </div>

          <!-- Columna 2: Placa, Empresa y Panapass (sin repetir información) -->
          <div class="v-res-body">
            <div class="v-res-top-line">
              <span class="v-res-company">{{ company(item) }}</span>
              <span class="v-res-status-pill" :class="statusToneClass(item)">
                <span class="status-pulse-dot"></span>
                {{ status(item) }}
              </span>
            </div>
            <div class="v-res-tags">
              <span class="v-tag plate">
                <b>PLACA</b> {{ plate(item) }}
              </span>
              <span v-if="panapass(item)" class="v-tag panapass">
                <b>PANAPASS</b> {{ panapass(item) }}
              </span>
              <span v-else class="v-tag no-panapass">
                Sin Panapass
              </span>
              <span v-if="matchBadgeText(item)" class="v-tag exact-pill">
                {{ matchBadgeText(item) }}
              </span>
            </div>
          </div>

          <!-- Acción -->
          <div class="v-res-action" aria-hidden="true">
            <span class="v-action-enter">Ver ficha →</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Quick Recent Units -->
    <div v-if="recentUnits.length && !visible" class="v-recent-chips">
      <span class="v-recent-label">Recientes:</span>
      <button
        v-for="item in recentUnits"
        :key="unit(item)"
        type="button"
        class="v-chip"
        @click="select(item)"
      >
        <span>{{ unit(item) }}</span>
        <small>{{ plate(item) }}</small>
      </button>
    </div>
  </div>

  <!-- =======================================================================
       FASE 3, 4, 5, 6, 7 & 8: NUEVA FICHA PREMIUM DE UNIDAD (BENTO COMMAND SHEET)
       ======================================================================= -->
  <Teleport to="body">
    <Transition name="v-ficha-fade">
      <div
        v-if="modalOpen"
        class="v-ficha-backdrop"
        role="presentation"
        data-testid="unit-ficha-backdrop"
        @pointerdown.self="closeDetail"
        @keydown.esc.prevent="closeDetail"
      >
        <div
          class="v-ficha-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="v-ficha-unit-title"
          data-testid="unit-ficha-modal"
        >
          <!-- Estado de Carga Inicial -->
          <div v-if="detailLoading && !detail" class="v-ficha-loading">
            <div class="v-ficha-loader-ring"></div>
            <div class="v-ficha-loading-copy">
              <strong>Consultando ficha operativa en tiempo real</strong>
              <span>Sincronizando Panapass ENA, Revisado ATTT, GPS y Control de Auto...</span>
            </div>
          </div>

          <!-- Estado de Error -->
          <div v-else-if="detailError && !detail" class="v-ficha-error" role="alert">
            <div class="v-ficha-error-icon">!</div>
            <h4>No fue posible cargar la ficha de la unidad</h4>
            <p>{{ detailError }}</p>
            <div class="v-ficha-error-actions">
              <button type="button" class="v-ficha-btn-secondary" @click="closeDetail">Cerrar</button>
              <button type="button" class="v-ficha-btn-primary" @click="refreshCurrentUnit">Reintentar consulta</button>
            </div>
          </div>

          <!-- Contenido Principal de la Ficha Bento Command Sheet -->
          <template v-else-if="detail">
            <!-- FASE 4.1: CABECERA INTELIGENTE DE UNIDAD (Sin repetir ID innecesariamente) -->
            <header class="v-ficha-header" data-testid="ficha-header">
              <div class="v-ficha-header-main">
                <!-- Identificador Principal de Unidad + Acción Rápida Copiar -->
                <div class="v-ficha-unit-hero">
                  <div class="v-ficha-unit-badge-box">
                    <span class="v-ficha-kicker">UNIDAD</span>
                    <div class="v-ficha-unit-title-row">
                      <h2 id="v-ficha-unit-title" class="v-ficha-unit-number">{{ detail.unit }}</h2>
                      <button
                        type="button"
                        class="v-ficha-copy-chip"
                        :class="{ copied: copiedTarget === 'unit' }"
                        title="Copiar número de unidad"
                        data-testid="btn-copy-unit"
                        @click="copyText(detail.unit, 'unit')"
                      >
                        <svg v-if="copiedTarget !== 'unit'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <span>{{ copiedTarget === 'unit' ? '¡Copiada!' : 'Copiar unidad' }}</span>
                      </button>
                    </div>
                  </div>

                  <!-- Metadatos Primarios en Cápsulas Limpias (Placa, Empresa, Vehículo, Color) -->
                  <div class="v-ficha-identity-meta">
                    <div class="v-ficha-primary-pills">
                      <!-- Placa + Botón Copiar Placa -->
                      <div class="v-ficha-plate-group">
                        <span class="v-ficha-plate-label">PLACA</span>
                        <strong class="v-ficha-plate-val">{{ detail.plate }}</strong>
                        <button
                          type="button"
                          class="v-ficha-plate-copy"
                          :class="{ copied: copiedTarget === 'plate' }"
                          title="Copiar placa"
                          data-testid="btn-copy-plate"
                          @click="copyText(detail.plate, 'plate')"
                        >
                          {{ copiedTarget === 'plate' ? '✓ Copiada' : 'Copiar' }}
                        </button>
                      </div>

                      <!-- Marca, Modelo y Año -->
                      <span class="v-ficha-meta-pill vehicle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                          <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/>
                          <circle cx="6.5" cy="16.5" r="2.5"/>
                          <circle cx="16.5" cy="16.5" r="2.5"/>
                        </svg>
                        <span>{{ vehicleIdentityLabel }}</span>
                      </span>

                      <!-- Color del Vehículo -->
                      <span
                        v-if="detail.vehicleColor"
                        class="v-ficha-meta-pill color-pill"
                        :style="{
                          backgroundColor: carColorStyle.bg,
                          color: carColorStyle.text,
                          borderColor: carColorStyle.border,
                        }"
                      >
                        <span class="color-swatch-dot" :style="{ backgroundColor: carColorStyle.dot }"></span>
                        <span>{{ carColorStyle.name }}</span>
                      </span>
                    </div>

                    <!-- Empresa Propietaria / Operadora y Ubicación Operativa -->
                    <div class="v-ficha-company-row">
                      <span class="v-ficha-company-name">
                        <strong>{{ companyHeaderLabel }}</strong>
                      </span>
                      <span v-if="detail.galera && detail.galera !== '—'" class="v-ficha-company-sep">·</span>
                      <span v-if="detail.galera && detail.galera !== '—'" class="v-ficha-company-sub">
                        Galera: <b>{{ detail.galera }}</b>
                      </span>
                      <span v-if="detail.supervisor && detail.supervisor !== '—'" class="v-ficha-company-sep">·</span>
                      <span v-if="detail.supervisor && detail.supervisor !== '—'" class="v-ficha-company-sub">
                        Supervisora: <b>{{ detail.supervisor }}</b>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Derecha: Semáforo de Estado Operativo + Actualizar Unidad + Cerrar -->
                <div class="v-ficha-header-controls">
                  <div class="v-ficha-op-semaphore" :class="`tone-${operationalStatusHeader.tone}`" data-testid="ficha-operational-status">
                    <span class="v-ficha-op-dot"></span>
                    <div class="v-ficha-op-text">
                      <strong>{{ operationalStatusHeader.label }}</strong>
                      <small>{{ operationalStatusHeader.sub }}</small>
                    </div>
                  </div>

                  <div class="v-ficha-action-buttons">
                    <button
                      type="button"
                      class="v-ficha-refresh-btn"
                      :disabled="detailEnriching"
                      title="Actualizar datos en vivo de la unidad"
                      data-testid="btn-refresh-unit"
                      @click="refreshCurrentUnit"
                    >
                      <svg :class="{ spinning: detailEnriching }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15">
                        <polyline points="23 4 23 10 17 10"/>
                        <polyline points="1 20 1 14 7 14"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                      </svg>
                      <span>{{ detailEnriching ? 'Sincronizando…' : 'Actualizar' }}</span>
                    </button>

                    <button
                      type="button"
                      class="v-ficha-close-btn"
                      aria-label="Cerrar ficha de unidad"
                      data-testid="btn-close-ficha"
                      @click="closeDetail"
                    >
                      <span>✕</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Cinta de Alertas Puntuales Confirmadas (Solo si existen incidencias críticas reales) -->
              <div v-if="detail.auditIssues && detail.auditIssues.length" class="v-ficha-alerts-strip" data-testid="ficha-audit-alerts">
                <div
                  v-for="issue in detail.auditIssues"
                  :key="issue.code"
                  class="v-ficha-alert-chip"
                  :class="`sev-${issue.severity}`"
                >
                  <span class="v-ficha-alert-dot"></span>
                  <strong>{{ issue.label }}:</strong>
                  <span>{{ issue.desc }}</span>
                </div>
              </div>
            </header>

            <!-- CUERPO DESPLAZABLE DE LA FICHA -->
            <div class="v-ficha-body">
              <!-- FASE 4.2: ESTADO DE LOS CUATRO SISTEMAS (4 Tarjetas Visuales Independientes en Bento Grid) -->
              <section class="v-ficha-systems-section" aria-label="Estado de los cuatro sistemas">
                <div class="v-ficha-section-bar">
                  <div class="v-ficha-section-title">
                    <span class="v-ficha-section-kicker">MONITOREO MULTISISTEMA</span>
                    <h3>Estado Operativo de los 4 Sistemas</h3>
                  </div>
                  <span class="v-ficha-live-indicator">
                    <span class="live-dot" :class="{ syncing: detailEnriching }"></span>
                    <span>{{ detailEnriching ? 'Actualizando fuentes oficiales…' : '4 fuentes consultadas' }}</span>
                  </span>
                </div>

                <div class="v-ficha-bento-grid" data-testid="ficha-four-systems-grid">
                  <article
                    v-for="card in fourSystemCards"
                    :key="card.key"
                    class="v-sys-bento-card"
                    :class="[`sys-${card.key}`, `tone-${card.tone || 'neutral'}`, { expanded: expandedSystemCards[card.key] }]"
                    :data-testid="`ficha-system-card-${card.key}`"
                  >
                    <!-- Cabecera de la Tarjeta del Sistema -->
                    <div class="v-sys-card-top">
                      <div class="v-sys-card-brand">
                        <span class="v-sys-icon-box" :class="`sys-${card.key}`">
                          <ModuleIcon :name="card.key === 'control' ? 'control' : card.key" />
                        </span>
                        <div class="v-sys-title-group">
                          <span class="v-sys-kicker">
                            {{ card.key === 'panapass' ? 'PEAJES & CORREDORES' : card.key === 'revisados' ? 'INSPECCIÓN ATTT' : card.key === 'gps' ? 'TELEMETRÍA SATELITAL' : 'ESTADO DE FLOTA' }}
                          </span>
                          <h4 class="v-sys-card-name">{{ card.title }}</h4>
                        </div>
                      </div>

                      <!-- Semáforo de Estado del Sistema -->
                      <span class="v-sys-status-badge" :class="`tone-${card.tone || 'neutral'}`">
                        <span class="v-sys-badge-dot"></span>
                        <span>{{ card.badge }}</span>
                      </span>
                    </div>

                    <!-- Valor Principal Destacado (Prioridad Visual) -->
                    <div class="v-sys-hero-metric">
                      <strong class="v-sys-hero-value" :class="`tone-${card.tone || 'neutral'}`">
                        {{ card.value }}
                      </strong>
                      <p class="v-sys-hero-note">{{ card.note }}</p>
                    </div>

                    <!-- Puntos Clave Prioritarios del Sistema -->
                    <dl class="v-sys-priority-list">
                      <div
                        v-for="metric in cardPrimaryMetrics(card)"
                        :key="metric.label"
                        class="v-sys-priority-row"
                      >
                        <dt>{{ metric.label }}</dt>
                        <dd>{{ metric.value }}</dd>
                      </div>
                    </dl>

                    <!-- Pie de Tarjeta: Timestamp de Consulta + Botón Expandir Detalle -->
                    <div class="v-sys-card-footer">
                      <span class="v-sys-timestamp" title="Última actualización o consulta del sistema">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>{{ card.updatedAt || 'Consulta reciente' }}</span>
                      </span>

                      <button
                        v-if="card.sections && card.sections.length"
                        type="button"
                        class="v-sys-expand-btn"
                        :aria-expanded="!!expandedSystemCards[card.key]"
                        :data-testid="`btn-expand-${card.key}`"
                        @click="toggleSystemCard(card.key)"
                      >
                        <span>{{ expandedSystemCards[card.key] ? 'Ocultar detalle' : 'Ver detalle' }}</span>
                        <span class="v-sys-chevron" :class="{ open: expandedSystemCards[card.key] }">▾</span>
                      </button>
                    </div>

                    <!-- Detalle Expandible del Sistema -->
                    <div
                      v-if="expandedSystemCards[card.key] && card.sections && card.sections.length"
                      class="v-sys-expanded-drawer"
                      :data-testid="`drawer-${card.key}`"
                    >
                      <div
                        v-for="sec in card.sections"
                        :key="sec.title"
                        class="v-sys-drawer-group"
                      >
                        <h5>{{ sec.title }}</h5>
                        <div class="v-sys-drawer-fields">
                          <div
                            v-for="fld in sec.fields"
                            :key="fld.label"
                            class="v-sys-drawer-field"
                          >
                            <span>{{ fld.label }}</span>
                            <strong>{{ fld.value }}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </section>

              <!-- FASE 5: DATOS TÉCNICOS Y ADMINISTRATIVOS (Secciones Secundarias Expandibles) -->
              <section class="v-ficha-secondary-section" aria-label="Datos técnicos y administrativos">
                <div class="v-ficha-section-bar secondary">
                  <div class="v-ficha-section-title">
                    <span class="v-ficha-section-kicker">EXPEDIENTE DE UNIDAD</span>
                    <h3>Datos Técnicos, Asignación y Documentación</h3>
                  </div>
                  <small class="v-ficha-secondary-hint">Haz clic en cualquier bloque para desplegar su información</small>
                </div>

                <div class="v-ficha-accordions-grid" data-testid="ficha-secondary-accordions">
                  <!-- 1. DATOS TÉCNICOS -->
                  <article class="v-ficha-accordion-card" :class="{ open: expandedSecondary.tecnicos }">
                    <button
                      type="button"
                      class="v-ficha-accordion-head"
                      :aria-expanded="expandedSecondary.tecnicos"
                      data-testid="accordion-btn-tecnicos"
                      @click="toggleSecondarySection('tecnicos')"
                    >
                      <div class="v-acc-title-wrap">
                        <span class="v-acc-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <rect x="3" y="4" width="18" height="16" rx="2"/>
                            <line x1="7" y1="8" x2="17" y2="8"/>
                            <line x1="7" y1="12" x2="13" y2="12"/>
                            <line x1="7" y1="16" x2="11" y2="16"/>
                          </svg>
                        </span>
                        <div>
                          <h4>Datos Técnicos del Vehículo</h4>
                          <small>Placas, VIN / chasis, motor, transmisión{{ canSeeSensitivePin ? ' y PIN' : '' }}</small>
                        </div>
                      </div>
                      <span class="v-acc-toggle-pill">
                        {{ expandedSecondary.tecnicos ? 'Ocultar −' : 'Desplegar +' }}
                      </span>
                    </button>

                    <div v-if="expandedSecondary.tecnicos" class="v-ficha-accordion-body" data-testid="accordion-body-tecnicos">
                      <div class="v-sec-data-grid">
                        <div
                          v-for="item in technicalFields"
                          :key="item.label"
                          class="v-sec-data-cell"
                          :class="{ 'is-sensitive': item.sensitive }"
                        >
                          <span class="v-sec-label">{{ item.label }}</span>
                          <div class="v-sec-val-row">
                            <strong :class="{ 'font-mono': item.mono }">{{ item.value }}</strong>
                            <button
                              v-if="item.copyKey && item.value !== '—'"
                              type="button"
                              class="v-sec-mini-copy"
                              @click="copyText(item.value, item.copyKey)"
                            >
                              {{ copiedTarget === item.copyKey ? '✓' : 'Copiar' }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>

                  <!-- 2. ASIGNACIÓN Y OPERACIÓN -->
                  <article class="v-ficha-accordion-card" :class="{ open: expandedSecondary.asignacion }">
                    <button
                      type="button"
                      class="v-ficha-accordion-head"
                      :aria-expanded="expandedSecondary.asignacion"
                      data-testid="accordion-btn-asignacion"
                      @click="toggleSecondarySection('asignacion')"
                    >
                      <div class="v-acc-title-wrap">
                        <span class="v-acc-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <path d="M3 21h18"/>
                            <path d="M5 21V7l8-4v18"/>
                            <path d="M19 21V11l-6-4"/>
                          </svg>
                        </span>
                        <div>
                          <h4>Asignación y Operación</h4>
                          <small>Empresa propietaria, operadora, supervisora y galera</small>
                        </div>
                      </div>
                      <span class="v-acc-toggle-pill">
                        {{ expandedSecondary.asignacion ? 'Ocultar −' : 'Desplegar +' }}
                      </span>
                    </button>

                    <div v-if="expandedSecondary.asignacion" class="v-ficha-accordion-body" data-testid="accordion-body-asignacion">
                      <div class="v-sec-data-grid">
                        <div
                          v-for="item in assignmentFields"
                          :key="item.label"
                          class="v-sec-data-cell"
                        >
                          <span class="v-sec-label">{{ item.label }}</span>
                          <strong>{{ item.value }}</strong>
                        </div>
                      </div>
                    </div>
                  </article>

                  <!-- 3. DOCUMENTACIÓN Y COTEJO OFICIAL -->
                  <article class="v-ficha-accordion-card" :class="{ open: expandedSecondary.documentacion }">
                    <button
                      type="button"
                      class="v-ficha-accordion-head"
                      :aria-expanded="expandedSecondary.documentacion"
                      data-testid="accordion-btn-documentacion"
                      @click="toggleSecondarySection('documentacion')"
                    >
                      <div class="v-acc-title-wrap">
                        <span class="v-acc-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <path d="m9 15 2 2 4-4"/>
                          </svg>
                        </span>
                        <div>
                          <h4>Documentación y Cotejo eCarCheck</h4>
                          <small>Póliza NetSuite, aseguradora y comparación contra registro oficial</small>
                        </div>
                      </div>
                      <span class="v-acc-toggle-pill">
                        {{ expandedSecondary.documentacion ? 'Ocultar −' : 'Desplegar +' }}
                      </span>
                    </button>

                    <div v-if="expandedSecondary.documentacion" class="v-ficha-accordion-body" data-testid="accordion-body-documentacion">
                      <div class="v-sec-data-grid">
                        <div
                          v-for="item in documentationFields"
                          :key="item.label"
                          class="v-sec-data-cell"
                        >
                          <span class="v-sec-label">{{ item.label }}</span>
                          <strong :class="{ 'font-mono': item.mono }">{{ item.value }}</strong>
                        </div>
                      </div>

                      <!-- Tabla de comparación RYM vs eCarCheck si existe -->
                      <div v-if="officialComparisons.length" class="v-sec-comparison-block">
                        <h5>Cotejo RYM vs. Registro Oficial eCarCheck</h5>
                        <div class="v-sec-comp-list">
                          <div
                            v-for="cmp in officialComparisons"
                            :key="cmp.label"
                            class="v-sec-comp-row"
                            :class="`cmp-${cmp.comparison}`"
                          >
                            <span class="cmp-label">{{ cmp.label }}</span>
                            <span class="cmp-val"><b>RYM:</b> {{ cmp.value }}</span>
                            <span class="cmp-ref"><b>eCarCheck:</b> {{ cmp.reference }}</span>
                            <em class="cmp-badge">
                              {{ cmp.comparison === 'match' ? '✓ Coincide' : cmp.comparison === 'diff' ? '! Difiere' : 'Sin comparar' }}
                            </em>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            </div>

            <!-- FASE 8: PIE DE FICHA CON ACCIONES RÁPIDAS Y NAVEGACIÓN A MÓDULOS -->
            <footer class="v-ficha-footer">
              <div class="v-ficha-footer-shortcuts">
                <button
                  type="button"
                  class="v-ficha-shortcut-btn"
                  @click="handleModuleShortcut('panapass')"
                >
                  <span>Ir a Panapass</span>
                </button>
                <button
                  type="button"
                  class="v-ficha-shortcut-btn"
                  @click="handleModuleShortcut('revisados')"
                >
                  <span>Ir a Revisados</span>
                </button>
                <button
                  v-if="canSeeGps"
                  type="button"
                  class="v-ficha-shortcut-btn"
                  @click="handleModuleShortcut('gps')"
                >
                  <span>Ir a GPS</span>
                </button>
              </div>

              <div class="v-ficha-footer-main-actions">
                <button type="button" class="v-ficha-btn-secondary" @click="closeDetail">
                  <span>Cerrar ficha</span>
                </button>
                <button
                  v-if="canNavigateControl"
                  type="button"
                  class="v-ficha-btn-primary"
                  @click="handleModuleShortcut('control')"
                >
                  <span>Abrir en Control de Auto →</span>
                </button>
              </div>
            </footer>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
/* =========================================================================
   1. BUSCADOR GLOBAL DE UNIDADES Y AUTOCOMPLETADO INTELIGENTE (FASE 1 & 2)
========================================================================== */
.v-search-box {
  position: relative !important;
  width: 100% !important;
}

.v-search-bar {
  display: flex !important;
  align-items: center !important;
  background: #ffffff !important;
  border: 1.5px solid #cbd5e1 !important;
  border-radius: 16px !important;
  padding: 4px 6px 4px 14px !important;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05) !important;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
  height: 50px !important;
  box-sizing: border-box !important;
}

.v-search-bar.focused,
.v-search-bar:focus-within {
  border-color: #0284c7 !important;
  box-shadow: 0 0 0 4px rgba(2, 132, 199, 0.14), 0 8px 24px rgba(15, 23, 42, 0.08) !important;
}

.v-search-icon {
  display: flex !important;
  align-items: center !important;
  color: #64748b !important;
  margin-right: 10px !important;
  flex-shrink: 0 !important;
}

.v-search-icon svg {
  width: 18px !important;
  height: 18px !important;
}

.v-search-bar input {
  flex: 1 !important;
  border: none !important;
  outline: none !important;
  background: transparent !important;
  font-family: inherit !important;
  font-size: 14.5px !important;
  font-weight: 600 !important;
  color: #0f172a !important;
  min-width: 0 !important;
}

.v-search-bar input::placeholder {
  color: #94a3b8 !important;
  font-weight: 500 !important;
}

.v-kbd {
  background: #f1f5f9 !important;
  border: 1px solid #cbd5e1 !important;
  border-radius: 6px !important;
  padding: 2px 6px !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  color: #64748b !important;
  margin-right: 8px !important;
  cursor: pointer !important;
  user-select: none !important;
}

.v-submit-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  background: linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%) !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 12px !important;
  padding: 0 16px !important;
  height: 38px !important;
  font-family: inherit !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.28) !important;
  white-space: nowrap !important;
}

.v-submit-btn svg {
  width: 14px !important;
  height: 14px !important;
}

.v-submit-btn:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 16px rgba(2, 132, 199, 0.36) !important;
}

.v-submit-btn:disabled {
  opacity: 0.55 !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
}

/* Dropdown de Autocompletado */
.v-dropdown-panel {
  position: absolute !important;
  top: calc(100% + 8px) !important;
  left: 0 !important;
  right: 0 !important;
  background: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1.5px solid #cbd5e1 !important;
  border-radius: 18px !important;
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.06) !important;
  z-index: 1000 !important;
  overflow: hidden !important;
  max-height: 430px !important;
  display: flex !important;
  flex-direction: column !important;
}

.v-state-loading,
.v-state-error,
.v-state-empty {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 22px 20px !important;
  color: #475569 !important;
  font-size: 13.5px !important;
  font-weight: 600 !important;
  justify-content: center !important;
}

.v-state-empty strong {
  display: block !important;
  color: #0f172a !important;
  font-size: 14px !important;
  margin-bottom: 2px !important;
}

.v-state-empty p {
  margin: 0 !important;
  font-size: 12.5px !important;
  color: #64748b !important;
  font-weight: 500 !important;
}

.v-sonar-spinner {
  width: 20px !important;
  height: 20px !important;
  border: 2.5px solid #e2e8f0 !important;
  border-top-color: #0284c7 !important;
  border-radius: 50% !important;
  animation: vSpin 0.7s linear infinite !important;
}

@keyframes vSpin {
  to { transform: rotate(360deg); }
}

.v-results-list {
  padding: 8px !important;
  overflow-y: auto !important;
  max-height: 410px !important;
}

.v-results-meta {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 6px 12px 8px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  color: #64748b !important;
  border-bottom: 1px solid #f1f5f9 !important;
  margin-bottom: 6px !important;
}

.v-results-count strong {
  color: #0369a1 !important;
  font-weight: 800 !important;
}

.v-result-card {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  width: 100% !important;
  padding: 10px 12px !important;
  background: transparent !important;
  border: 1.5px solid transparent !important;
  border-radius: 13px !important;
  cursor: pointer !important;
  text-align: left !important;
  transition: all 0.16s ease !important;
  margin-bottom: 4px !important;
  font-family: inherit !important;
}

.v-result-card:last-child {
  margin-bottom: 0 !important;
}

.v-result-card:hover,
.v-result-card.active {
  background: #f0f9ff !important;
  border-color: #bae6fd !important;
}

.v-result-card.is-exact {
  background: linear-gradient(90deg, rgba(240, 249, 255, 0.9) 0%, rgba(224, 242, 254, 0.45) 100%) !important;
  border-color: #7dd3fc !important;
}

.v-res-unit-badge {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 58px !important;
  height: 42px !important;
  padding: 0 10px !important;
  border-radius: 11px !important;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  font-size: 15px !important;
  letter-spacing: -0.02em !important;
  flex-shrink: 0 !important;
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.15) !important;
}

.v-result-card.active .v-res-unit-badge {
  background: linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%) !important;
}

.v-res-body {
  flex: 1 !important;
  min-width: 0 !important;
}

.v-res-top-line {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
  margin-bottom: 5px !important;
}

.v-res-company {
  font-size: 13px !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.v-res-status-pill {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 2px 8px !important;
  border-radius: 999px !important;
  font-size: 10.5px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  flex-shrink: 0 !important;
}

.v-res-status-pill.is-ok {
  background: #dcfce7 !important;
  color: #15803d !important;
}

.v-res-status-pill.is-warn {
  background: #fef3c7 !important;
  color: #b45309 !important;
}

.v-res-status-pill.is-neutral {
  background: #e2e8f0 !important;
  color: #475569 !important;
}

.status-pulse-dot {
  width: 6px !important;
  height: 6px !important;
  border-radius: 50% !important;
  background: currentColor !important;
}

.v-res-tags {
  display: flex !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 6px !important;
}

.v-tag {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 2px 7px !important;
  border-radius: 6px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  background: #f1f5f9 !important;
  color: #334155 !important;
  border: 1px solid #e2e8f0 !important;
}

.v-tag b {
  font-size: 9.5px !important;
  font-weight: 800 !important;
  color: #64748b !important;
}

.v-tag.no-panapass {
  color: #94a3b8 !important;
  background: #f8fafc !important;
}

.v-tag.exact-pill {
  background: #e0f2fe !important;
  color: #0369a1 !important;
  border-color: #bae6fd !important;
  font-weight: 700 !important;
}

.v-res-action {
  flex-shrink: 0 !important;
}

.v-action-enter {
  font-size: 11.5px !important;
  font-weight: 700 !important;
  color: #0284c7 !important;
  opacity: 0.75 !important;
  transition: opacity 0.15s ease, transform 0.15s ease !important;
}

.v-result-card:hover .v-action-enter,
.v-result-card.active .v-action-enter {
  opacity: 1 !important;
}

/* Recientes */
.v-recent-chips {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  margin-top: 6px !important;
  flex-wrap: wrap !important;
}

.v-recent-label {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #64748b !important;
}

.v-chip {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 2px 9px !important;
  border-radius: 999px !important;
  background: #f8fafc !important;
  border: 1px solid #cbd5e1 !important;
  font-size: 11.5px !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.v-chip small {
  color: #64748b !important;
  font-weight: 600 !important;
}

.v-chip:hover {
  background: #e0f2fe !important;
  border-color: #7dd3fc !important;
  color: #0369a1 !important;
}

/* =========================================================================
   2. NUEVA FICHA PREMIUM DE UNIDAD — BENTO COMMAND SHEET (FASES 3 A 9)
========================================================================== */
.v-ficha-backdrop {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9999 !important;
  background: rgba(15, 23, 42, 0.62) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 20px !important;
  box-sizing: border-box !important;
}

.v-ficha-sheet {
  width: min(1140px, 96vw) !important;
  max-height: min(90vh, 920px) !important;
  background: #f8fafc !important;
  border: 1px solid rgba(226, 232, 240, 0.95) !important;
  border-radius: 24px !important;
  box-shadow: 0 32px 72px rgba(15, 23, 42, 0.34), 0 8px 24px rgba(15, 23, 42, 0.14) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  font-family: 'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
  color: #0f172a !important;
}

/* Transición del Modal */
.v-ficha-fade-enter-active,
.v-ficha-fade-leave-active {
  transition: opacity 0.22s ease !important;
}
.v-ficha-fade-enter-from,
.v-ficha-fade-leave-to {
  opacity: 0 !important;
}

/* Estados de carga y error en la ficha */
.v-ficha-loading,
.v-ficha-error {
  padding: 64px 32px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  gap: 16px !important;
  background: #ffffff !important;
}

.v-ficha-loader-ring {
  width: 42px !important;
  height: 42px !important;
  border: 3.5px solid #e2e8f0 !important;
  border-top-color: #0284c7 !important;
  border-radius: 50% !important;
  animation: vSpin 0.8s linear infinite !important;
}

.v-ficha-loading-copy strong {
  display: block !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  color: #0f172a !important;
  margin-bottom: 4px !important;
}

.v-ficha-loading-copy span {
  font-size: 13.5px !important;
  color: #64748b !important;
}

/* CABECERA DE LA FICHA (FASE 4.1) */
.v-ficha-header {
  background: linear-gradient(135deg, #0c2d48 0%, #0f3d5e 52%, #134e6f 100%) !important;
  color: #ffffff !important;
  padding: 20px 26px 18px !important;
  border-bottom: 1px solid rgba(56, 189, 248, 0.22) !important;
  flex-shrink: 0 !important;
}

.v-ficha-header-main {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 20px !important;
  flex-wrap: wrap !important;
}

.v-ficha-unit-hero {
  display: flex !important;
  align-items: center !important;
  gap: 22px !important;
  flex-wrap: wrap !important;
}

.v-ficha-unit-badge-box {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(125, 211, 252, 0.28) !important;
  border-radius: 16px !important;
  padding: 10px 16px !important;
  min-width: 140px !important;
}

.v-ficha-kicker {
  display: block !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  letter-spacing: 0.1em !important;
  color: #7dd3fc !important;
  text-transform: uppercase !important;
  margin-bottom: 2px !important;
}

.v-ficha-unit-title-row {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}

.v-ficha-unit-number {
  margin: 0 !important;
  font-size: 30px !important;
  font-weight: 900 !important;
  line-height: 1.05 !important;
  letter-spacing: -0.03em !important;
  color: #ffffff !important;
}

.v-ficha-copy-chip {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 4px 9px !important;
  border-radius: 8px !important;
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #e0f2fe !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.v-ficha-copy-chip:hover {
  background: rgba(255, 255, 255, 0.22) !important;
  color: #ffffff !important;
}

.v-ficha-copy-chip.copied {
  background: #10b981 !important;
  border-color: #34d399 !important;
  color: #ffffff !important;
}

.v-ficha-identity-meta {
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
}

.v-ficha-primary-pills {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  flex-wrap: wrap !important;
}

.v-ficha-plate-group {
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 5px 8px 5px 11px !important;
  border-radius: 10px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
}

.v-ficha-plate-label {
  font-size: 10px !important;
  font-weight: 800 !important;
  color: #64748b !important;
  letter-spacing: 0.05em !important;
}

.v-ficha-plate-val {
  font-size: 14px !important;
  font-weight: 900 !important;
  color: #0f172a !important;
  font-family: 'JetBrains Mono', ui-monospace, monospace !important;
}

.v-ficha-plate-copy {
  border: none !important;
  background: #e0f2fe !important;
  color: #0369a1 !important;
  font-size: 10.5px !important;
  font-weight: 800 !important;
  padding: 3px 7px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.v-ficha-plate-copy:hover {
  background: #bae6fd !important;
}

.v-ficha-plate-copy.copied {
  background: #dcfce7 !important;
  color: #15803d !important;
}

.v-ficha-meta-pill {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 5px 12px !important;
  border-radius: 10px !important;
  font-size: 12.5px !important;
  font-weight: 700 !important;
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #f8fafc !important;
}

.color-swatch-dot {
  width: 10px !important;
  height: 10px !important;
  border-radius: 50% !important;
  border: 1px solid rgba(15, 23, 42, 0.25) !important;
  flex-shrink: 0 !important;
}

.v-ficha-company-row {
  display: flex !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  font-size: 13px !important;
  color: #bae6fd !important;
}

.v-ficha-company-name strong {
  color: #ffffff !important;
  font-weight: 700 !important;
}

.v-ficha-company-sub b {
  color: #f0f9ff !important;
  font-weight: 700 !important;
}

/* Derecha de la Cabecera: Semáforo + Controles */
.v-ficha-header-controls {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  flex-wrap: wrap !important;
}

.v-ficha-op-semaphore {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 7px 14px !important;
  border-radius: 13px !important;
  border: 1px solid transparent !important;
}

.v-ficha-op-semaphore.tone-ok {
  background: rgba(16, 185, 129, 0.18) !important;
  border-color: rgba(52, 211, 153, 0.45) !important;
  color: #ecfdf5 !important;
}

.v-ficha-op-semaphore.tone-warn {
  background: rgba(245, 158, 11, 0.22) !important;
  border-color: rgba(251, 191, 36, 0.5) !important;
  color: #fffbeb !important;
}

.v-ficha-op-semaphore.tone-bad {
  background: rgba(239, 68, 68, 0.24) !important;
  border-color: rgba(248, 113, 113, 0.55) !important;
  color: #fef2f2 !important;
}

.v-ficha-op-semaphore.tone-info,
.v-ficha-op-semaphore.tone-neutral {
  background: rgba(56, 189, 248, 0.18) !important;
  border-color: rgba(125, 211, 252, 0.4) !important;
  color: #f0f9ff !important;
}

.v-ficha-op-dot {
  width: 10px !important;
  height: 10px !important;
  border-radius: 50% !important;
  flex-shrink: 0 !important;
}

.v-ficha-op-semaphore.tone-ok .v-ficha-op-dot {
  background: #34d399 !important;
  box-shadow: 0 0 10px rgba(52, 211, 153, 0.8) !important;
}

.v-ficha-op-semaphore.tone-warn .v-ficha-op-dot {
  background: #fbbf24 !important;
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.8) !important;
}

.v-ficha-op-semaphore.tone-bad .v-ficha-op-dot {
  background: #f87171 !important;
  box-shadow: 0 0 10px rgba(248, 113, 113, 0.85) !important;
}

.v-ficha-op-semaphore.tone-info .v-ficha-op-dot,
.v-ficha-op-semaphore.tone-neutral .v-ficha-op-dot {
  background: #38bdf8 !important;
}

.v-ficha-op-text {
  display: flex !important;
  flex-direction: column !important;
}

.v-ficha-op-text strong {
  font-size: 12px !important;
  font-weight: 800 !important;
  letter-spacing: 0.03em !important;
}

.v-ficha-op-text small {
  font-size: 11px !important;
  opacity: 0.88 !important;
}

.v-ficha-action-buttons {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.v-ficha-refresh-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  height: 38px !important;
  padding: 0 13px !important;
  border-radius: 11px !important;
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.24) !important;
  color: #ffffff !important;
  font-size: 12.5px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.v-ficha-refresh-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.22) !important;
}

.v-ficha-refresh-btn svg.spinning {
  animation: vSpin 0.8s linear infinite !important;
}

.v-ficha-close-btn {
  width: 38px !important;
  height: 38px !important;
  border-radius: 11px !important;
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.22) !important;
  color: #ffffff !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.15s ease !important;
}

.v-ficha-close-btn:hover {
  background: rgba(239, 68, 68, 0.85) !important;
  border-color: rgba(248, 113, 113, 0.9) !important;
}

/* Tira de alertas confirmadas en cabecera */
.v-ficha-alerts-strip {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin-top: 14px !important;
  padding-top: 12px !important;
  border-top: 1px solid rgba(255, 255, 255, 0.14) !important;
}

.v-ficha-alert-chip {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 5px 11px !important;
  border-radius: 9px !important;
  font-size: 12px !important;
  background: rgba(15, 23, 42, 0.45) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  color: #f8fafc !important;
}

.v-ficha-alert-chip.sev-bad {
  background: rgba(185, 28, 28, 0.35) !important;
  border-color: rgba(248, 113, 113, 0.55) !important;
}

.v-ficha-alert-chip.sev-warn {
  background: rgba(180, 83, 9, 0.35) !important;
  border-color: rgba(251, 191, 36, 0.5) !important;
}

.v-ficha-alert-dot {
  width: 7px !important;
  height: 7px !important;
  border-radius: 50% !important;
  background: #fbbf24 !important;
}

.v-ficha-alert-chip.sev-bad .v-ficha-alert-dot {
  background: #f87171 !important;
}

/* CUERPO DE LA FICHA */
.v-ficha-body {
  padding: 22px 26px !important;
  overflow-y: auto !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 24px !important;
}

.v-ficha-section-bar {
  display: flex !important;
  align-items: flex-end !important;
  justify-content: space-between !important;
  gap: 12px !important;
  margin-bottom: 14px !important;
  flex-wrap: wrap !important;
}

.v-ficha-section-kicker {
  display: block !important;
  font-size: 10.5px !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  color: #0284c7 !important;
  text-transform: uppercase !important;
  margin-bottom: 2px !important;
}

.v-ficha-section-title h3 {
  margin: 0 !important;
  font-size: 17px !important;
  font-weight: 800 !important;
  color: #0f172a !important;
  letter-spacing: -0.015em !important;
}

.v-ficha-live-indicator {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  color: #475569 !important;
  background: #ffffff !important;
  padding: 4px 11px !important;
  border-radius: 999px !important;
  border: 1px solid #e2e8f0 !important;
}

.live-dot {
  width: 7px !important;
  height: 7px !important;
  border-radius: 50% !important;
  background: #10b981 !important;
}

.live-dot.syncing {
  background: #0284c7 !important;
  animation: vSpin 1s linear infinite !important;
}

/* BENTO GRID DE LOS 4 SISTEMAS (FASE 4.2 & FASE 7 RESPONSIVE) */
.v-ficha-bento-grid {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 14px !important;
  align-items: start !important;
}

.v-sys-bento-card {
  background: #ffffff !important;
  border: 1.5px solid #e2e8f0 !important;
  border-top-width: 4px !important;
  border-radius: 16px !important;
  padding: 16px !important;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  transition: all 0.2s ease !important;
}

.v-sys-bento-card:hover {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08) !important;
}

/* Colores semánticos del borde superior (Fase 6: nunca verde si falta información) */
.v-sys-bento-card.tone-ok {
  border-top-color: #10b981 !important;
}
.v-sys-bento-card.tone-warn {
  border-top-color: #f59e0b !important;
}
.v-sys-bento-card.tone-bad {
  border-top-color: #ef4444 !important;
  background: linear-gradient(180deg, rgba(254, 242, 242, 0.45) 0%, #ffffff 38%) !important;
}
.v-sys-bento-card.tone-pending,
.v-sys-bento-card.tone-info {
  border-top-color: #0284c7 !important;
}
.v-sys-bento-card.tone-neutral {
  border-top-color: #94a3b8 !important;
}

.v-sys-card-top {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 8px !important;
}

.v-sys-card-brand {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}

.v-sys-icon-box {
  width: 36px !important;
  height: 36px !important;
  border-radius: 10px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  background: #f0f9ff !important;
  color: #0284c7 !important;
}

.v-sys-icon-box.sys-panapass {
  background: #eff6ff !important;
  color: #2563eb !important;
}
.v-sys-icon-box.sys-revisados {
  background: #f0fdf4 !important;
  color: #16a34a !important;
}
.v-sys-icon-box.sys-gps {
  background: #ecfeff !important;
  color: #0891b2 !important;
}
.v-sys-icon-box.sys-control {
  background: #f8fafc !important;
  color: #334155 !important;
}

.v-sys-icon-box svg {
  width: 19px !important;
  height: 19px !important;
}

.v-sys-kicker {
  display: block !important;
  font-size: 9.5px !important;
  font-weight: 800 !important;
  letter-spacing: 0.06em !important;
  color: #64748b !important;
  text-transform: uppercase !important;
}

.v-sys-card-name {
  margin: 0 !important;
  font-size: 14.5px !important;
  font-weight: 800 !important;
  color: #0f172a !important;
}

/* Badge de estado de cada sistema */
.v-sys-status-badge {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 3px 8px !important;
  border-radius: 999px !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.03em !important;
  white-space: nowrap !important;
}

.v-sys-status-badge.tone-ok {
  background: #dcfce7 !important;
  color: #15803d !important;
}
.v-sys-status-badge.tone-warn {
  background: #fef3c7 !important;
  color: #b45309 !important;
}
.v-sys-status-badge.tone-bad {
  background: #fee2e2 !important;
  color: #b91c1c !important;
}
.v-sys-status-badge.tone-pending,
.v-sys-status-badge.tone-info {
  background: #e0f2fe !important;
  color: #0369a1 !important;
}
.v-sys-status-badge.tone-neutral {
  background: #f1f5f9 !important;
  color: #475569 !important;
}

.v-sys-badge-dot {
  width: 6px !important;
  height: 6px !important;
  border-radius: 50% !important;
  background: currentColor !important;
}

/* Métrica principal de cada tarjeta */
.v-sys-hero-metric {
  background: #f8fafc !important;
  border: 1px solid #f1f5f9 !important;
  border-radius: 12px !important;
  padding: 10px 12px !important;
}

.v-sys-hero-value {
  display: block !important;
  font-size: 19px !important;
  font-weight: 900 !important;
  color: #0f172a !important;
  letter-spacing: -0.02em !important;
  margin-bottom: 3px !important;
}

.v-sys-hero-value.tone-bad {
  color: #dc2626 !important;
}
.v-sys-hero-value.tone-ok {
  color: #059669 !important;
}
.v-sys-hero-value.tone-warn {
  color: #d97706 !important;
}

.v-sys-hero-note {
  margin: 0 !important;
  font-size: 11.5px !important;
  color: #64748b !important;
  line-height: 1.35 !important;
}

/* Lista de métricas prioritarias del sistema */
.v-sys-priority-list {
  margin: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
}

.v-sys-priority-row {
  display: flex !important;
  justify-content: space-between !important;
  align-items: baseline !important;
  gap: 8px !important;
  font-size: 12px !important;
  padding-bottom: 5px !important;
  border-bottom: 1px dashed #e2e8f0 !important;
}

.v-sys-priority-row:last-child {
  border-bottom: none !important;
  padding-bottom: 0 !important;
}

.v-sys-priority-row dt {
  color: #64748b !important;
  font-weight: 600 !important;
  flex-shrink: 0 !important;
}

.v-sys-priority-row dd {
  margin: 0 !important;
  color: #0f172a !important;
  font-weight: 700 !important;
  text-align: right !important;
  word-break: break-word !important;
}

/* Pie de tarjeta de sistema */
.v-sys-card-footer {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
  padding-top: 8px !important;
  border-top: 1px solid #f1f5f9 !important;
  margin-top: auto !important;
}

.v-sys-timestamp {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  font-size: 10.5px !important;
  font-weight: 600 !important;
  color: #64748b !important;
}

.v-sys-expand-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  border: none !important;
  background: #f0f9ff !important;
  color: #0284c7 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  padding: 4px 9px !important;
  border-radius: 7px !important;
  cursor: pointer !important;
  transition: background 0.15s ease !important;
}

.v-sys-expand-btn:hover {
  background: #e0f2fe !important;
}

.v-sys-chevron {
  display: inline-block !important;
  transition: transform 0.18s ease !important;
}

.v-sys-chevron.open {
  transform: rotate(180deg) !important;
}

/* Cajón expandido dentro de la tarjeta del sistema */
.v-sys-expanded-drawer {
  margin-top: 6px !important;
  padding-top: 10px !important;
  border-top: 1.5px solid #e2e8f0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
}

.v-sys-drawer-group h5 {
  margin: 0 0 6px !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  color: #0369a1 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
}

.v-sys-drawer-fields {
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
}

.v-sys-drawer-field {
  display: flex !important;
  justify-content: space-between !important;
  gap: 8px !important;
  font-size: 11.5px !important;
  padding: 3px 0 !important;
}

.v-sys-drawer-field span {
  color: #64748b !important;
}

.v-sys-drawer-field strong {
  color: #0f172a !important;
  text-align: right !important;
}

/* =========================================================================
   3. SECCIONES SECUNDARIAS EXPANDIBLES (FASE 5)
========================================================================== */
.v-ficha-secondary-hint {
  font-size: 12px !important;
  color: #64748b !important;
  font-weight: 500 !important;
}

.v-ficha-accordions-grid {
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
}

.v-ficha-accordion-card {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 14px !important;
  overflow: hidden !important;
  transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
}

.v-ficha-accordion-card.open {
  border-color: #bae6fd !important;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05) !important;
}

.v-ficha-accordion-head {
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  padding: 13px 18px !important;
  background: transparent !important;
  border: none !important;
  cursor: pointer !important;
  text-align: left !important;
  font-family: inherit !important;
}

.v-ficha-accordion-head:hover {
  background: #f8fafc !important;
}

.v-acc-title-wrap {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}

.v-acc-icon {
  width: 34px !important;
  height: 34px !important;
  border-radius: 9px !important;
  background: #f0f9ff !important;
  color: #0284c7 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
}

.v-acc-title-wrap h4 {
  margin: 0 !important;
  font-size: 14px !important;
  font-weight: 800 !important;
  color: #0f172a !important;
}

.v-acc-title-wrap small {
  font-size: 12px !important;
  color: #64748b !important;
}

.v-acc-toggle-pill {
  padding: 4px 10px !important;
  border-radius: 8px !important;
  background: #f1f5f9 !important;
  color: #334155 !important;
  font-size: 11.5px !important;
  font-weight: 700 !important;
  white-space: nowrap !important;
}

.v-ficha-accordion-card.open .v-acc-toggle-pill {
  background: #e0f2fe !important;
  color: #0369a1 !important;
}

.v-ficha-accordion-body {
  padding: 14px 18px 18px !important;
  border-top: 1px solid #f1f5f9 !important;
  background: #fcfdff !important;
}

.v-sec-data-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
  gap: 10px !important;
}

.v-sec-data-cell {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 10px !important;
  padding: 9px 12px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 3px !important;
}

.v-sec-data-cell.is-sensitive {
  background: #fffbeb !important;
  border-color: #fde68a !important;
}

.v-sec-label {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #64748b !important;
  text-transform: uppercase !important;
  letter-spacing: 0.03em !important;
}

.v-sec-val-row {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
}

.v-sec-data-cell strong {
  font-size: 13px !important;
  font-weight: 800 !important;
  color: #0f172a !important;
  word-break: break-word !important;
}

.font-mono {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace !important;
}

.v-sec-mini-copy {
  border: none !important;
  background: #f1f5f9 !important;
  color: #0284c7 !important;
  font-size: 10.5px !important;
  font-weight: 700 !important;
  padding: 2px 7px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
}

/* Cotejo Oficial RYM vs eCarCheck */
.v-sec-comparison-block {
  margin-top: 14px !important;
  padding-top: 12px !important;
  border-top: 1px dashed #cbd5e1 !important;
}

.v-sec-comparison-block h5 {
  margin: 0 0 8px !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  color: #334155 !important;
  text-transform: uppercase !important;
}

.v-sec-comp-list {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important;
  gap: 8px !important;
}

.v-sec-comp-row {
  display: flex !important;
  flex-direction: column !important;
  gap: 3px !important;
  padding: 8px 11px !important;
  border-radius: 9px !important;
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  font-size: 11.5px !important;
}

.v-sec-comp-row.cmp-match {
  border-left: 3px solid #10b981 !important;
}
.v-sec-comp-row.cmp-diff {
  border-left: 3px solid #ef4444 !important;
  background: #fef2f2 !important;
}

.cmp-label {
  font-weight: 800 !important;
  color: #0f172a !important;
}

.cmp-badge {
  font-style: normal !important;
  font-size: 10.5px !important;
  font-weight: 800 !important;
  color: #059669 !important;
}

.v-sec-comp-row.cmp-diff .cmp-badge {
  color: #dc2626 !important;
}

/* PIE DE LA FICHA (FASE 8) */
.v-ficha-footer {
  background: #ffffff !important;
  border-top: 1px solid #e2e8f0 !important;
  padding: 14px 26px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 14px !important;
  flex-wrap: wrap !important;
  flex-shrink: 0 !important;
}

.v-ficha-footer-shortcuts {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  flex-wrap: wrap !important;
}

.v-ficha-shortcut-btn {
  padding: 7px 12px !important;
  border-radius: 9px !important;
  background: #f1f5f9 !important;
  border: 1px solid #cbd5e1 !important;
  color: #334155 !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.v-ficha-shortcut-btn:hover {
  background: #e0f2fe !important;
  border-color: #7dd3fc !important;
  color: #0369a1 !important;
}

.v-ficha-footer-main-actions {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  margin-left: auto !important;
}

.v-ficha-btn-secondary {
  padding: 9px 16px !important;
  border-radius: 11px !important;
  background: #f8fafc !important;
  border: 1px solid #cbd5e1 !important;
  color: #334155 !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
}

.v-ficha-btn-secondary:hover {
  background: #f1f5f9 !important;
}

.v-ficha-btn-primary {
  padding: 9px 18px !important;
  border-radius: 11px !important;
  background: linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%) !important;
  border: none !important;
  color: #ffffff !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25) !important;
}

.v-ficha-btn-primary:hover {
  filter: brightness(1.06) !important;
}

/* =========================================================================
   4. DISEÑO RESPONSIVE (FASE 7: Desktop, Laptop, Tablet y Móvil)
========================================================================== */
@media (max-width: 1180px) {
  .v-ficha-bento-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 720px) {
  .v-ficha-backdrop {
    padding: 8px !important;
    align-items: flex-end !important;
  }

  .v-ficha-sheet {
    width: 100% !important;
    max-height: 94vh !important;
    border-radius: 20px 20px 14px 14px !important;
  }

  .v-ficha-header {
    padding: 14px 16px !important;
  }

  .v-ficha-header-main {
    gap: 12px !important;
  }

  .v-ficha-unit-hero {
    gap: 12px !important;
  }

  .v-ficha-unit-badge-box {
    padding: 7px 12px !important;
    min-width: 0 !important;
  }

  .v-ficha-unit-number {
    font-size: 24px !important;
  }

  .v-ficha-body {
    padding: 14px 16px !important;
  }

  .v-ficha-bento-grid {
    grid-template-columns: 1fr !important;
  }

  .v-ficha-footer {
    padding: 10px 14px !important;
    gap: 8px !important;
  }

  .v-submit-btn span {
    display: none !important;
  }

  .v-submit-btn {
    padding: 0 12px !important;
  }
}
</style>
