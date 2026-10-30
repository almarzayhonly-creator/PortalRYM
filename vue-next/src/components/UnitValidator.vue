<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ModuleIcon from './ModuleIcon.vue'
import type { PortalProfile } from '../types'
import asignadorMap from '../asignadorMap.json'
import {
  applyValidatorSections,
  formatPanamaDate,
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

// Control de vista / pestaña principal: 'monitoreo' | 'expediente'
const activeMainTab = ref<'monitoreo' | 'expediente'>('monitoreo')

// Control de pestaña activa en el panel de detalle contextual (Fases 7, 8 y 9)
// null = ninguno abierto; 'panapass' | 'revisados' | 'gps' | 'control' = sistema enfocado
const activeContextTab = ref<string | null>(null)

// Control de apertura del Expediente Completo de la Unidad (Fase 9)
const showFullDossier = ref(false)

// Control de expansión de las 3 secciones secundarias
const expandedSecondary = ref<Record<string, boolean>>({
  tecnicos: false,
  asignacion: false,
  documentacion: false,
})

// Feedback de copiado rápido
const copiedTarget = ref<'' | 'unit' | 'plate' | 'panapass' | 'vin' | 'whatsapp'>('')
let copyTimer: number | undefined

function copyText(text: string, target: 'unit' | 'plate' | 'panapass' | 'vin' | 'whatsapp') {
  const clean = String(text || '').trim()
  if (!clean || clean === '—') return
  window.clearTimeout(copyTimer)
  copiedTarget.value = target
  if (typeof window !== 'undefined' && window.navigator?.clipboard) {
    void window.navigator.clipboard.writeText(clean).catch(() => {})
  }
  copyTimer = window.setTimeout(() => {
    copiedTarget.value = ''
  }, 2200)
}

function copyValidationToWhatsApp() {
  if (!detail.value) return
  const d = detail.value
  const c = d.controlRecord || {}

  // 1. Fecha de hoy formateada
  const todayFmt = new Intl.DateTimeFormat('es-PA', {
    timeZone: 'America/Panama',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date())

  // 2. Panapass
  const panaCard = fourSystemCards.value.find(x => x.key === 'panapass')
  const panaEstado = panaCard ? `${panaCard.value} (${panaCard.badge})` : 'Sin datos'

  // 3. Revisado
  const revCard = fourSystemCards.value.find(x => x.key === 'revisados')
  const revEstado = revCard ? `${revCard.value} (${revCard.badge})` : 'Sin datos'

  // 4. GPS
  const gpsCard = fourSystemCards.value.find(x => x.key === 'gps')
  let gpsEstado = 'Sin datos'
  if (gpsCard) {
    const ants = gpsAntennas(gpsCard)
    gpsEstado = `${ants.map(a => `${a.label}: ${a.text}`).join(' · ')} (${gpsCard.badge})`
  }

  // 5. Control de Auto / Estatus
  const ctrlCard = fourSystemCards.value.find(x => x.key === 'control')
  const ctrlEstado = ctrlCard ? `${ctrlCard.value} (${ctrlCard.badge})` : operationalStatusHeader.value.label

  const opEmpresa = companyOperatorLabel.value !== '—' ? companyOperatorLabel.value : companyHeaderLabel.value
  const duenaEmpresa = companyOwnerLabel.value !== '—' ? companyOwnerLabel.value : '—'

  const message = [
    `🚗 *VALIDACIÓN OPERATIVA RYM*`,
    `📅 *Fecha:* ${todayFmt}`,
    `----------------------------------------`,
    `🔹 *Unidad:* ${d.unit}`,
    `🔹 *Placa:* ${d.plate}`,
    `🔹 *Vehículo:* ${vehicleIdentityLabel.value}`,
    `🔹 *Color:* ${carColorStyle.value.name}`,
    `🔹 *Operadora:* ${opEmpresa}`,
    `🔹 *Empresa Dueña:* ${duenaEmpresa}`,
    `🔹 *Galera:* ${d.galera || '—'} | *Supervisora:* ${d.supervisor || '—'}`,
    `----------------------------------------`,
    `📋 *ESTADO DE LOS 4 SISTEMAS:*`,
    `💳 *Panapass:* ${panaEstado}`,
    `📑 *Revisado ATTT:* ${revEstado}`,
    `🛰️ *GPS:* ${gpsEstado}`,
    `🚦 *Control de Flota:* ${ctrlEstado}`,
    `----------------------------------------`,
    `✅ *Diagnóstico General:* ${operationalStatusHeader.value.label} (${operationalStatusHeader.value.sub})`,
    `_Generado desde Portal RYM - Centro de Control_`
  ].join('\n')

  copyText(message, 'whatsapp')
}

// Permisos por rol de usuario
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

// FASE 8: Selección de tarjeta para panel contextual bajo demanda
// Al seleccionar Panapass -> muestra únicamente el detalle de Panapass
// Al seleccionar Revisados -> cambia al detalle de Revisados
// Si ya está activo -> se cierra con suavidad
function toggleSystemCard(key: string, event?: Event) {
  if (event && (event.target as HTMLElement)?.closest('button:not(.v-sys-expand-btn), a')) {
    return
  }
  if (activeContextTab.value === key) {
    activeContextTab.value = null
  } else {
    activeContextTab.value = key
  }
}

function closeContextDrawer() {
  activeContextTab.value = null
}

function toggleSecondarySection(key: 'tecnicos' | 'asignacion' | 'documentacion') {
  expandedSecondary.value[key] = !expandedSecondary.value[key]
}

async function select(row: Unit) {
  panelOpen.value = false
  searched.value = false
  modalOpen.value = true
  selectedSeed.value = row
  activeMainTab.value = 'monitoreo'
  activeContextTab.value = null
  showFullDossier.value = false
  expandedSecondary.value = { tecnicos: true, asignacion: false, documentacion: false }
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
          syncStatus: 'error',
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

function consultAnotherUnit() {
  closeDetail()
  window.setTimeout(() => {
    input.value?.focus()
    input.value?.select()
  }, 60)
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
// DATOS DERIVADOS PARA LA NUEVA FICHA DE UNIDAD
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

const companyOperatorLabel = computed(() => {
  if (!detail.value) return '—'
  const c = detail.value.controlRecord || {}
  return String(
    c.empresa_operadora || detail.value.operator || c.empresa || '—'
  ).trim()
})

const companyOwnerLabel = computed(() => {
  if (!detail.value) return '—'
  const c = detail.value.controlRecord || {}
  const direct = String(c.empresa_duena || detail.value.owner || '').trim()
  if (direct && direct !== '—' && direct !== 'null' && direct !== 'undefined') {
    return direct
  }
  const u = String(detail.value.unit || '').trim().toUpperCase()
  const p = String(detail.value.plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  const mapUnits = (asignadorMap as any).units || {}
  const mapPlates = (asignadorMap as any).plates || {}
  const fromMap = mapUnits[u] || mapPlates[p]
  if (fromMap && String(fromMap).trim()) {
    return String(fromMap).trim()
  }
  return '—'
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
  // Un solo mensaje coherente: cuántos de los 4 sistemas tienen incidencia
  const cards = fourSystemCards.value
  const total = cards.length || 4
  const bad = cards.filter(card => card.tone === 'bad').length
  const warn = cards.filter(card => card.tone === 'warn').length
  const issues = bad + warn
  if (issues > 0) {
    return {
      label: `${issues} DE ${total} CON INCIDENCIA`,
      sub: 'Unidad activa',
      tone: bad > 0 ? 'bad' : 'warn',
    }
  }
  return { label: `${total} DE ${total} AL DÍA`, sub: 'Unidad activa', tone: 'ok' }
})

// Datos oficiales eCarCheck / ATTT
const officialOwnerLabel = computed(() => {
  if (!detail.value) return ''
  const f = (detail.value.fichaRecord as Unit) || {}
  const o = (f.oficial as Unit) || {}
  const raw = ((o.ultima_respuesta_exitosa || o.ultima_respuesta) as Record<string, unknown>) || {}
  const owner = raw.nombrePropietario || o.propietario
  return owner ? String(owner).trim() : ''
})

const vehicleVinLabel = computed(() => {
  if (!detail.value) return ''
  const c = detail.value.controlRecord || {}
  const f = (detail.value.fichaRecord as Unit) || {}
  const u = (f.unidad as Unit) || {}
  const o = (f.oficial as Unit) || {}
  const raw = ((o.ultima_respuesta_exitosa || o.ultima_respuesta) as Record<string, unknown>) || {}
  return String(c.chasis || c.vin || u.chasis || raw.nroChasis || raw.nroVin || o.chasis || o.vin || '').trim()
})

const vehicleMotorLabel = computed(() => {
  if (!detail.value) return ''
  const c = detail.value.controlRecord || {}
  const f = (detail.value.fichaRecord as Unit) || {}
  const u = (f.unidad as Unit) || {}
  const o = (f.oficial as Unit) || {}
  const raw = ((o.ultima_respuesta_exitosa || o.ultima_respuesta) as Record<string, unknown>) || {}
  return String(c.motor || u.motor || raw.nroMotor || o.motor || '').trim()
})

const vehicleCupoLabel = computed(() => {
  if (!detail.value) return ''
  const c = detail.value.controlRecord || {}
  const f = (detail.value.fichaRecord as Unit) || {}
  const u = (f.unidad as Unit) || {}
  const o = (f.oficial as Unit) || {}
  const raw = ((o.ultima_respuesta_exitosa || o.ultima_respuesta) as Record<string, unknown>) || {}
  const cupo = c.placa_comercial || u.placa_comercial || raw.cupo || o.cupo
  return (cupo && String(cupo).trim() !== '—') ? String(cupo).trim() : ''
})

const vehicleSupervisorLabel = computed(() => {
  if (!detail.value) return ''
  const c = detail.value.controlRecord || {}
  const sup = detail.value.supervisor || c.supervisora
  return (sup && String(sup).trim() !== '—') ? String(sup).trim() : ''
})

const normCompany = (s: unknown) =>
  String(s ?? '').toUpperCase().replace(/\b(S\.?\s?A\.?|INC\.?|CORP\.?)\b/g, '').replace(/[^A-Z0-9]/g, '')

// Cabecera: datos internos de operación sin repetir la misma empresa varias veces
const headerOpsFields = computed(() => {
  if (!detail.value) return [] as { label: string; value: string }[]
  const c = detail.value.controlRecord || {}
  const clean = (v: unknown) => {
    const s = String(v ?? '').trim()
    return s && s !== '—' && s !== 'null' && s !== 'undefined' ? s : ''
  }
  const out: { label: string; value: string }[] = []
  const op = clean(companyOperatorLabel.value) || clean(companyHeaderLabel.value)
  const owner = clean(companyOwnerLabel.value)
  if (op && owner && normCompany(op) !== normCompany(owner)) {
    out.push({ label: 'OPERADORA', value: op }, { label: 'DUEÑA', value: owner })
  } else if (op || owner) {
    out.push({ label: 'EMPRESA', value: owner || op })
  }
  const galera = clean(detail.value.galera)
  if (galera && ![op, owner].some(x => x && normCompany(x) === normCompany(galera))) {
    out.push({ label: 'GALERA', value: galera })
  }
  const sup = clean(detail.value.supervisor)
  if (sup) out.push({ label: 'SUPERVISORA', value: sup })
  const estatus = clean(c.estatus2 ?? c.status2 ?? c.estatus)
  if (estatus) out.push({ label: 'ESTATUS', value: estatus })
  const ns = clean(c.estatus_netsuite)
  if (ns && ns.toUpperCase() !== estatus.toUpperCase()) out.push({ label: 'NETSUITE', value: ns })
  const pana = clean(c.panapass_numero)
  if (pana) out.push({ label: 'PANAPASS', value: pana })
  return out
})

// FASE 5: Diagnóstico global de sincronización y estado de consultas
const consultationStatusSummary = computed(() => {
  if (!detail.value) {
    return { text: 'Consultando sistemas…', state: 'syncing', dotClass: 'syncing' }
  }
  if (detailEnriching.value) {
    return { text: 'Sincronizando fuentes en vivo…', state: 'syncing', dotClass: 'syncing' }
  }
  const cards = fourSystemCards.value
  const hasError = cards.some(c => c.syncStatus === 'error' || c.tone === 'bad' && /ERROR|SIN RESPUESTA/i.test(`${c.badge} ${c.value}`))
  const hasIncomplete = cards.some(c => c.syncStatus === 'incomplete' || /SIN DATOS|SIN REGISTRO|NO DISPONIBLE/i.test(`${c.badge} ${c.value}`))
  const hasOutdated = cards.some(c => c.syncStatus === 'outdated')

  if (hasError) {
    return { text: 'Consulta incompleta (reintentar)', state: 'error', dotClass: 'error' }
  }
  if (hasIncomplete) {
    return { text: 'Datos parciales confirmados', state: 'incomplete', dotClass: 'incomplete' }
  }
  if (hasOutdated) {
    return { text: 'Información histórica', state: 'outdated', dotClass: 'outdated' }
  }
  // Datos completos, pero el badge no debe decir "al día" si hay sistemas en alerta
  const attention = cards.filter(c => c.tone === 'bad' || c.tone === 'warn').length
  if (attention > 0) {
    const ok = cards.length - attention
    return {
      text: `${ok} al día · ${attention} ${attention === 1 ? 'requiere' : 'requieren'} atención`,
      state: 'attention',
      dotClass: 'attention',
    }
  }
  return { text: '4 sistemas verificados al día', state: 'verified', dotClass: 'verified' }
})

const systemsNeedingAttention = computed(() =>
  fourSystemCards.value.filter(c => c.tone === 'bad' || c.tone === 'warn').length,
)

// Alertas que ya se ven en su tarjeta no se repiten en la cinta del encabezado
const CARD_MIRRORED_ISSUES = new Set(['PANAPASS_INCIDENCIA', 'GPS_CRITICO', 'REVISADO_SIN_REGISTRO', 'REVISADO_VENCIDO'])
const headerAuditIssues = computed(() =>
  (detail.value?.auditIssues || []).filter(issue => !CARD_MIRRORED_ISSUES.has(issue.code)),
)

const SYSTEM_KICKERS: Record<string, string> = {
  panapass: 'PEAJES ENA',
  revisados: 'INSPECCIÓN ATTT',
  gps: 'SATELITAL',
  control: 'FLOTA',
}

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
    syncStatus: panNum ? 'error' : 'incomplete',
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
    syncStatus: 'incomplete',
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
    syncStatus: 'incomplete',
    note: canSeeGps.value ? 'No se recibieron lecturas de GPS 1 / GPS 2.' : 'Monitoreo satelital reservado a supervisión y administración.',
  }

  const internalStopReason = String(c.estatus2 || c.status2 || c.estado || c.estatus || 'SIN DETALLE').trim().toUpperCase()
  const operationalStatus = detail.value.closed ? 'CERRADA' : detail.value.active ? 'ACTIVA' : 'PARADA'
  const displayCtrlValue = internalStopReason && internalStopReason !== '—' && internalStopReason !== operationalStatus
    ? `${operationalStatus} · ${internalStopReason}`
    : operationalStatus

  const ctrlCard: DetailCard = byKey.get('control') || {
    key: 'control',
    title: 'Control de Auto',
    tone: detail.value.closed ? 'neutral' : detail.value.active ? 'ok' : 'warn',
    badge: operationalStatus,
    value: displayCtrlValue,
    details: [
      { label: 'Galera', value: detail.value.galera || '—' },
      { label: 'Supervisora', value: detail.value.supervisor || '—' },
    ],
    updatedAt: 'Sincronizado RYM',
    syncStatus: 'verified',
    note: detail.value.active ? 'Unidad activa en Control de Auto.' : `Unidad parada · Estado interno: ${internalStopReason}`,
  }

  return [panCard, revCard, gpsCard, ctrlCard]
})

// FASE 7: Tarjeta enfocada activa para el Panel Contextual
const activeContextCard = computed<DetailCard | null>(() => {
  if (!activeContextTab.value) return null
  return fourSystemCards.value.find(c => c.key === activeContextTab.value) || null
})

// ===== Rediseño HUD: helpers visuales basados SOLO en datos reales de la tarjeta =====
const MONTHS_ES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

/** Saldo numérico del Panapass (null si no hay cifra confirmada: no se inventa nada). */
function panapassAmount(card: DetailCard): number | null {
  const m = String(card.value ?? '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}

/** Nivel de la barra de saldo: 0–100 (B/. 10 = lleno). Solo decorativo; el número real va en el chip. */
function panapassLevelPct(card: DetailCard): number {
  const n = panapassAmount(card)
  if (n === null) return 0
  return Math.max(4, Math.min(100, Math.round((Math.max(n, 0) / 10) * 100)))
}

/** Índice (0–11) del mes ATTT mostrado en la tarjeta, o -1 si no es identificable. */
function revisadoMonthIndex(card: DetailCard): number {
  const v = String(card.value ?? '').toUpperCase()
  return MONTHS_ES.findIndex(m => v.includes(m))
}

/** True si la descripción ya dice lo mismo que el título (evita "Saldo Negativo ENA: Saldo negativo registrado…"). */
function issueRepeatsLabel(issue: { label: string; desc: string }): boolean {
  const norm = (s: string) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  const label = norm(issue.label)
  const desc = norm(issue.desc)
  if (!label || !desc) return false
  const words = label.split(' ').filter(w => w.length > 2)
  return words.length > 0 && words.filter(w => desc.includes(w)).length >= Math.min(2, words.length)
}

/** Antenas GPS: estado REAL por equipo (viene de gpsRecord). */
function gpsAntennas(card: DetailCard): Array<{ label: string; on: boolean; stateClass: string; text: string }> {
  const devs = card.gpsDevices && card.gpsDevices.length
    ? card.gpsDevices
    : [{ label: 'GPS 1', state: 'unknown' as const }, { label: 'GPS 2', state: 'unknown' as const }]
  return devs.map(d => ({
    label: d.label,
    on: d.state === 'on',
    stateClass: d.state, // 'on' | 'off' | 'none' | 'unknown'
    text: d.state === 'on' ? 'Reporta' : d.state === 'off' ? 'Sin reportar' : d.state === 'none' ? 'Sin GPS' : 'Sin dato',
  }))
}

// FASE 7: Métricas esenciales hiper-limpias para la vista minimalista (Dato principal + Dato secundario)
function cardPrimaryMetrics(card: DetailCard): Array<{ label: string; value: string }> {
  const c = detail.value?.controlRecord || {}
  const rev = detail.value?.revisadoRecord || {}

  if (card.key === 'panapass') {
    // La tarjeta ya muestra en grande el Saldo (ej: B/. 0.00 o B/. 26.40)
    // El dato secundario es la fecha de consulta y su vigencia
    return []
  }

  if (card.key === 'revisados') {
    const month = String(c.mes_revisado || rev.mes_revisado || rev.mes || 'No definido').trim()
    return [
      { label: 'Mes ATTT', value: month.toUpperCase() },
    ]
  }

  if (card.key === 'gps') {
    // La tarjeta ya muestra en grande '2 de 2 reportando' / '1 de 2'
    return []
  }

  // Control de Auto
  const internalState = String(c.estatus2 || c.status2 || c.estado || (detail.value?.active ? 'ACTIVO' : 'PARADA')).trim()
  return [
    { label: detail.value?.active ? 'Condición' : 'Motivo parada', value: internalState || '—' },
  ]
}

// Datos Técnicos y Administrativos agrupados en 3 secciones secundarias
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
    { label: 'Última verificación eCarCheck', value: formatPanamaDate(o.actualizado_at || f.consulta_at || r.ultimo_revisado) || 'Sin verificación reciente' },
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

    <!-- Autocompletado Inteligente con Prioridad Estricta -->
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
          <div class="v-res-unit-badge">
            <span class="v-unit-code">{{ unit(item) }}</span>
          </div>

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
       FICHA REFINADA DE UNIDAD — BENTO COMMAND SHEET (FASES 1 A 6)
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

          <!-- Contenido Principal de la Ficha -->
          <template v-else-if="detail">
            <!-- CABECERA INTELIGENTE DE UNIDAD -->
            <header class="v-ficha-header" data-testid="ficha-header">
              <div class="v-ficha-header-main">
                <!-- Identificador Principal de Unidad -->
                <div class="v-ficha-unit-hero">
                  <div class="v-ficha-unit-badge-box">
                    <span class="v-ficha-kicker">UNIDAD</span>
                    <div class="v-ficha-unit-title-row">
                      <h2 id="v-ficha-unit-title" class="v-ficha-unit-number">{{ detail.unit }}</h2>
                    </div>
                  </div>

                  <!-- Metadatos Primarios en Cápsulas Limpias -->
                  <div class="v-ficha-identity-meta">
                    <div class="v-ficha-primary-pills">
                      <!-- 2. Placa -->
                      <div class="v-ficha-plate-group">
                        <span class="v-ficha-plate-label">PLACA</span>
                        <strong class="v-ficha-plate-val">{{ detail.plate }}</strong>
                      </div>

                      <!-- 3. Marca, Modelo y Año -->
                      <span class="v-ficha-meta-pill vehicle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                          <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/>
                          <circle cx="6.5" cy="16.5" r="2.5"/>
                          <circle cx="16.5" cy="16.5" r="2.5"/>
                        </svg>
                        <span>{{ vehicleIdentityLabel }}</span>
                      </span>

                      <!-- 4. Color del Vehículo (Animado) -->
                      <span
                        v-if="detail.vehicleColor"
                        class="v-ficha-meta-pill color-pill is-animated"
                        :style="{
                          backgroundColor: carColorStyle.bg,
                          color: carColorStyle.text,
                          borderColor: carColorStyle.border,
                        }"
                      >
                        <span class="color-swatch-dot is-pulsing" :style="{ backgroundColor: carColorStyle.dot }"></span>
                        <span>{{ carColorStyle.name }}</span>
                      </span>
                    </div>

                    <!-- Datos Registrales e Internos en orden solicitado -->
                    <div class="v-ficha-company-row">
                      <!-- 5. Propietario oficial de eCarCheck -->
                      <span v-if="officialOwnerLabel" class="v-ficha-info-item">
                        <small>PROPIETARIO OFICIAL (ECARCHECK)</small>
                        <strong class="text-official">{{ officialOwnerLabel }}</strong>
                      </span>

                      <!-- 6. Chasis / VIN -->
                      <span v-if="vehicleVinLabel" class="v-ficha-info-item">
                        <small>CHASIS / VIN</small>
                        <strong class="mono-code">{{ vehicleVinLabel }}</strong>
                      </span>

                      <!-- 7. Motor -->
                      <span v-if="vehicleMotorLabel" class="v-ficha-info-item">
                        <small>MOTOR</small>
                        <strong class="mono-code">{{ vehicleMotorLabel }}</strong>
                      </span>

                      <!-- 8. Cupo si aplica -->
                      <span v-if="vehicleCupoLabel && vehicleCupoLabel !== 'No aplica'" class="v-ficha-info-item">
                        <small>CUPO</small>
                        <strong>{{ vehicleCupoLabel }}</strong>
                      </span>

                      <!-- 9. Supervisora -->
                      <span v-if="vehicleSupervisorLabel" class="v-ficha-info-item">
                        <small>SUPERVISORA</small>
                        <strong>{{ vehicleSupervisorLabel }}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Derecha: Semáforo de Estado Operativo + Acción WhatsApp + Actualizar + Cerrar -->
                <div class="v-ficha-header-controls">
                  <div class="v-ficha-op-semaphore" :class="`tone-${operationalStatusHeader.tone}`" data-testid="ficha-operational-status">
                    <span class="v-ficha-op-dot">
                      <span class="v-op-dot-ping"></span>
                    </span>
                    <div class="v-ficha-op-text">
                      <strong>{{ operationalStatusHeader.label }}</strong>
                      <small>{{ operationalStatusHeader.sub }}</small>
                    </div>
                  </div>

                  <div class="v-ficha-action-buttons">
                    <button
                      type="button"
                      class="v-ficha-whatsapp-btn icon-only"
                      :class="{ copied: copiedTarget === 'whatsapp' }"
                      :title="copiedTarget === 'whatsapp' ? '¡Copiado!' : 'Copiar reporte para WhatsApp'"
                      :aria-label="copiedTarget === 'whatsapp' ? 'Reporte copiado' : 'Copiar reporte para WhatsApp'"
                      data-testid="btn-copy-whatsapp"
                      @click="copyValidationToWhatsApp"
                    >
                      <svg v-if="copiedTarget !== 'whatsapp'" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
                        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.43 9.43 0 0 1-4.8-1.32l-.35-.21-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.44 9.45-9.44a9.38 9.38 0 0 1 6.68 2.77 9.38 9.38 0 0 1 2.76 6.68c0 5.21-4.24 9.44-9.45 9.44zm8.04-17.48A11.3 11.3 0 0 0 12.04.7C5.77.7.67 5.8.67 12.06c0 2 .52 3.96 1.52 5.68L.57 23.7l6.1-1.6a11.33 11.33 0 0 0 5.37 1.37h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.04-1.18-5.89-3.33-8.04z"/>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="16" height="16" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
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

              <!-- Cinta de Alertas Puntuales Confirmadas -->
              <div v-if="headerAuditIssues.length" class="v-ficha-alerts-strip" data-testid="ficha-audit-alerts">
                <div
                  v-for="issue in headerAuditIssues"
                  :key="issue.code"
                  class="v-ficha-alert-chip"
                  :class="`sev-${issue.severity}`"
                >
                  <span class="v-ficha-alert-dot"></span>
                  <strong v-if="!issueRepeatsLabel(issue)">{{ issue.label }}</strong>
                  <span>{{ issue.desc }}</span>
                </div>
              </div>
            </header>

            <!-- CUERPO DESPLAZABLE DE LA FICHA -->
            <div class="v-ficha-body">
              <!-- NAVEGACIÓN TABULADA EJECUTIVA HUD -->
              <div class="v-ficha-nav-tabs-bar" role="tablist">
                <button
                  type="button"
                  class="v-ficha-nav-tab"
                  :class="{ active: activeMainTab === 'monitoreo' }"
                  role="tab"
                  :aria-selected="activeMainTab === 'monitoreo'"
                  @click="activeMainTab = 'monitoreo'"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  <span>Sistemas</span>
                  <span
                    v-if="systemsNeedingAttention > 0"
                    class="v-tab-pill-indicator is-alert"
                    :title="`${systemsNeedingAttention} sistema(s) requieren atención`"
                  >{{ systemsNeedingAttention }}</span>
                  <span v-else class="v-tab-pill-indicator is-ok" title="Todos los sistemas al día">✓</span>
                </button>

                <button
                  type="button"
                  class="v-ficha-nav-tab"
                  :class="{ active: activeMainTab === 'expediente' }"
                  role="tab"
                  :aria-selected="activeMainTab === 'expediente'"
                  @click="activeMainTab = 'expediente'"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  <span>Expediente</span>
                  <span v-if="detail.fichaRecord" class="v-tab-pill-badge">eCarCheck</span>
                </button>
              </div>

              <!-- CONTENIDO TAB 1: MONITOREO 4 SISTEMAS -->
              <section v-show="activeMainTab === 'monitoreo'" class="v-ficha-systems-section" aria-label="Estado de los cuatro sistemas">
                <!-- Sin barra de título: el encabezado ya resume el estado de los 4 sistemas -->
                <span
                  v-if="consultationStatusSummary.state === 'syncing' || consultationStatusSummary.state === 'error' || consultationStatusSummary.state === 'incomplete'"
                  class="v-ficha-live-indicator v-ficha-live-inline"
                  :class="`status-${consultationStatusSummary.state}`"
                  data-testid="consultation-status-badge"
                >
                  <span class="live-dot" :class="consultationStatusSummary.dotClass"></span>
                  <span>{{ consultationStatusSummary.text }}</span>
                </span>

                <!-- FASE 7: 4 TARJETAS PRINCIPALES MINIMALISTAS HUD -->
                <div class="v-ficha-bento-grid" data-testid="ficha-four-systems-grid">
                  <article
                    v-for="card in fourSystemCards"
                    :key="card.key"
                    class="v-sys-bento-card"
                    :class="[`sys-${card.key}`, `tone-${card.tone || 'neutral'}`, { active: activeContextTab === card.key }]"
                    :data-testid="`ficha-system-card-${card.key}`"
                    tabindex="0"
                    role="button"
                    :aria-expanded="activeContextTab === card.key"
                    :aria-label="`Tarjeta ${card.title}. Clic para ${activeContextTab === card.key ? 'cerrar' : 'ver'} detalles completos.`"
                    @click="toggleSystemCard(card.key, $event)"
                    @keydown.enter="toggleSystemCard(card.key)"
                    @keydown.space.prevent="toggleSystemCard(card.key)"
                  >
                    <!-- Halo de energía viva según el estado -->
                    <div class="v-card-ambient-glow" :class="`glow-${card.tone || 'neutral'}`"></div>

                    <!-- Cabecera de la Tarjeta del Sistema -->
                    <div class="v-sys-card-top">
                      <div class="v-sys-card-brand">
                        <span class="v-sys-icon-box" :class="`sys-${card.key}`">
                          <ModuleIcon :name="card.key === 'control' ? 'control' : card.key" />
                        </span>
                        <div class="v-sys-title-group">
                          <h4 class="v-sys-card-name">{{ card.title }}</h4>
                        </div>
                      </div>

                      <!-- Semáforo de Estado del Sistema -->
                      <span class="v-sys-status-badge" :class="`tone-${card.tone || 'neutral'}`">
                        <span class="v-sys-badge-dot"></span>
                        <span>{{ card.badge }}</span>
                      </span>
                    </div>

                    <!-- HERO VISUAL por sistema (sin textos duplicados) -->
                    <div class="v-sys-hero-metric" :class="`hero-${card.key}`">
                      <strong v-if="card.key !== 'gps'" class="v-sys-hero-value" :class="`tone-${card.tone || 'neutral'}`">
                        {{ card.value }}
                      </strong>

                      <!-- Panapass: barra de nivel de saldo -->
                      <div v-if="card.key === 'panapass' && panapassAmount(card) !== null" class="v-level-track" aria-hidden="true">
                        <span class="v-level-fill" :class="`tone-${card.tone || 'neutral'}`" :style="{ width: panapassLevelPct(card) + '%' }"></span>
                      </div>

                      <!-- Revisados: línea de 12 meses con el mes vigente -->
                      <div v-else-if="card.key === 'revisados' && revisadoMonthIndex(card) >= 0" class="v-year-strip" aria-hidden="true">
                        <span
                          v-for="(mm, i) in MONTHS_ES"
                          :key="mm"
                          class="v-year-seg"
                          :class="[{ current: i === revisadoMonthIndex(card) }, `tone-${card.tone || 'neutral'}`]"
                          :title="mm"
                        ></span>
                      </div>

                      <!-- GPS: antenas con barras de señal -->
                      <div v-else-if="card.key === 'gps'" class="v-gps-antennas">
                        <span
                          v-for="ant in gpsAntennas(card)"
                          :key="ant.label"
                          class="v-gps-ant"
                          :class="`state-${ant.stateClass}`"
                        >
                          <span class="v-sig-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
                          <span class="v-gps-ant-label">{{ ant.label }}</span>
                          <span class="v-gps-ant-state">{{ ant.text }}</span>
                        </span>
                      </div>

                      <p v-if="card.key !== 'gps' && card.note" class="v-sys-hero-note">{{ card.note }}</p>
                    </div>

                    <!-- Pie mínimo: hora relativa/auditada + indicador de expansión (toda la tarjeta es clickable) -->
                    <div class="v-sys-card-footer">
                      <span class="v-sys-timestamp" title="Última actualización / comunicación en horario de Panamá">
                        <span class="v-live-tick"></span>
                        <span>{{ card.updatedAt || 'Sin consulta' }}</span>
                      </span>
                      <span
                        v-if="card.sections && card.sections.length"
                        class="v-sys-chevron-pill"
                        :class="{ open: activeContextTab === card.key }"
                        :data-testid="`btn-expand-${card.key}`"
                        aria-hidden="true"
                      >
                        <span class="v-chev-label">{{ activeContextTab === card.key ? 'Ocultar' : 'Ver detalle' }}</span>
                        <span class="v-chev-icon">▾</span>
                      </span>
                    </div>
                  </article>
                </div>

                <!-- FASE 8: PANEL CONTEXTUAL BAJO DEMANDA UNIFICADO -->
                <!-- No deforma la grilla ni abre 4 acordeones simultáneos -->
                <transition name="v-context-slide">
                  <div
                    v-if="activeContextCard && activeContextCard.sections && activeContextCard.sections.length"
                    class="v-contextual-detail-panel"
                    :class="`focus-${activeContextCard.key}`"
                    :data-testid="`contextual-panel-${activeContextCard.key}`"
                  >
                    <div class="v-contextual-panel-header">
                      <div class="v-contextual-panel-title">
                        <span class="v-contextual-kicker">DETALLE OPERATIVO OFICIAL</span>
                        <h4>{{ activeContextCard.title }} · Información Completa</h4>
                      </div>
                      <div class="v-contextual-panel-controls">
                        <!-- Selector rápido entre sistemas -->
                        <div class="v-contextual-system-pills">
                          <button
                            v-for="c in fourSystemCards"
                            :key="c.key"
                            type="button"
                            class="v-system-pill-btn"
                            :class="{ active: activeContextTab === c.key }"
                            @click="activeContextTab = c.key"
                          >
                            {{ c.title }}
                          </button>
                        </div>
                        <button
                          type="button"
                          class="v-contextual-close-btn"
                          aria-label="Cerrar panel de detalle"
                          @click="closeContextDrawer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div class="v-contextual-panel-content">
                      <div
                        v-for="sec in activeContextCard.sections"
                        :key="sec.title"
                        class="v-contextual-section-block"
                      >
                        <h5 class="v-contextual-section-heading">{{ sec.title }}</h5>
                        <div class="v-contextual-fields-grid">
                          <div
                            v-for="fld in sec.fields"
                            :key="fld.label"
                            class="v-contextual-field-item"
                          >
                            <span class="v-contextual-field-label">{{ fld.label }}</span>
                            <strong class="v-contextual-field-val">{{ fld.value }}</strong>
                            <small v-if="fld.reference" class="v-contextual-field-ref">Ref: {{ fld.reference }}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </transition>
              </section>

              <!-- CONTENIDO TAB 2: EXPEDIENTE COMPLETO DEL VEHÍCULO -->
              <section v-show="activeMainTab === 'expediente'" class="v-ficha-secondary-section" aria-label="Expediente de la unidad">
                <div class="v-ficha-dossier-bar">
                  <div class="v-ficha-dossier-copy">
                    <span class="v-ficha-section-kicker">DATOS REGISTRALES Y ADMINISTRATIVOS</span>
                    <h3>Expediente Completo del Vehículo</h3>
                    <p>Accede a datos de motor, chasis/VIN, póliza de seguro, supervisión y cotejo eCarCheck.</p>
                  </div>
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

            <!-- PIE DE FICHA SIMPLIFICADO: CERRAR Y CONSULTAR OTRA UNIDAD -->
            <footer class="v-ficha-footer">
              <div class="v-ficha-footer-main-actions">
                <button
                  type="button"
                  class="v-ficha-btn-secondary"
                  data-testid="btn-close-modal"
                  @click="closeDetail"
                >
                  <span>Cerrar</span>
                </button>
                <button
                  type="button"
                  class="v-ficha-btn-primary"
                  data-testid="btn-consultar-otra"
                  @click="consultAnotherUnit"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <span>Consultar otra unidad</span>
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
   1. BUSCADOR GLOBAL DE UNIDADES Y AUTOCOMPLETADO INTELIGENTE
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
   2. FICHA REFINADA DE UNIDAD — BENTO COMMAND SHEET
========================================================================== */
.v-ficha-backdrop {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9999 !important;
  background: rgba(10, 25, 47, 0.72) !important;
  backdrop-filter: blur(14px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(14px) saturate(180%) !important;
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
  border-radius: 26px !important;
  box-shadow: 0 35px 80px -15px rgba(2, 22, 54, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 10px 30px rgba(0, 0, 0, 0.15) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  font-family: 'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
  color: #0f172a !important;
  animation: vSheetPop 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

@keyframes vSheetPop {
  0% { transform: scale(0.96) translateY(12px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

.v-ficha-fade-enter-active,
.v-ficha-fade-leave-active {
  transition: opacity 0.22s ease !important;
}
.v-ficha-fade-enter-from,
.v-ficha-fade-leave-to {
  opacity: 0 !important;
}

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

/* CABECERA VIBRANTE CON EFECTO GLASS & GRADIENTE HUD */
.v-ficha-header {
  background: linear-gradient(135deg, #091b38 0%, #0d2854 48%, #0369a1 100%) !important;
  color: #ffffff !important;
  padding: 20px 26px 18px !important;
  border-bottom: 1px solid rgba(56, 189, 248, 0.22) !important;
  flex-shrink: 0 !important;
  position: relative !important;
  box-shadow: 0 10px 25px rgba(3, 27, 78, 0.25) !important;
}

.v-ficha-header::before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  background: radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.22) 0%, transparent 60%),
              radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.18) 0%, transparent 55%) !important;
  pointer-events: none !important;
}

.v-ficha-header-main {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 18px !important;
  flex-wrap: wrap !important;
  position: relative !important;
  z-index: 2 !important;
}

.v-ficha-unit-hero {
  display: flex !important;
  align-items: center !important;
  gap: 18px !important;
  flex-wrap: wrap !important;
}

.v-ficha-unit-badge-box {
  background: rgba(255, 255, 255, 0.09) !important;
  backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  border-radius: 16px !important;
  padding: 8px 16px !important;
  display: flex !important;
  flex-direction: column !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
}

.v-ficha-kicker {
  display: block !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  letter-spacing: 0.12em !important;
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
  font-size: 28px !important;
  font-weight: 900 !important;
  line-height: 1.05 !important;
  letter-spacing: -0.03em !important;
  color: #ffffff !important;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
}

.v-ficha-copy-chip {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 4px 9px !important;
  border-radius: 8px !important;
  background: rgba(255, 255, 255, 0.14) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  color: #e0f2fe !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.v-ficha-copy-chip:hover {
  background: rgba(255, 255, 255, 0.25) !important;
  transform: translateY(-1px) scale(1.02) !important;
  color: #ffffff !important;
}

.v-ficha-copy-chip.copied {
  background: #10b981 !important;
  border-color: #34d399 !important;
  color: #ffffff !important;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.5) !important;
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

.color-swatch-dot.is-pulsing {
  animation: colorDotPulse 2s ease-in-out infinite !important;
}

@keyframes colorDotPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.6);
  }
  50% {
    transform: scale(1.25);
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.25);
  }
}

.v-ficha-meta-pill.color-pill.is-animated {
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}
.v-ficha-meta-pill.color-pill.is-animated:hover {
  transform: translateY(-1px) scale(1.03) !important;
}

.mono-code {
  font-family: 'JetBrains Mono', ui-monospace, monospace !important;
  letter-spacing: 0.02em !important;
}

.text-official {
  color: #38bdf8 !important;
  font-weight: 800 !important;
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

/* Derecha de la Cabecera */
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
  position: relative !important;
}

.v-op-dot-ping {
  position: absolute !important;
  inset: -4px !important;
  border-radius: 50% !important;
  border: 2px solid currentColor !important;
  opacity: 0.8 !important;
  animation: vBeaconPing 2s cubic-bezier(0, 0, 0.2, 1) infinite !important;
}

@keyframes vBeaconPing {
  0% { transform: scale(0.8); opacity: 0.9; }
  70%, 100% { transform: scale(2.2); opacity: 0; }
}

.v-ficha-op-semaphore.tone-ok .v-ficha-op-dot {
  background: #34d399 !important;
  color: #34d399 !important;
  box-shadow: 0 0 10px rgba(52, 211, 153, 0.8) !important;
}

.v-ficha-op-semaphore.tone-warn .v-ficha-op-dot {
  background: #fbbf24 !important;
  color: #fbbf24 !important;
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.8) !important;
}

.v-ficha-op-semaphore.tone-bad .v-ficha-op-dot {
  background: #f87171 !important;
  color: #f87171 !important;
  box-shadow: 0 0 10px rgba(248, 113, 113, 0.85) !important;
}

.v-ficha-op-semaphore.tone-info .v-ficha-op-dot,
.v-ficha-op-semaphore.tone-neutral .v-ficha-op-dot {
  background: #38bdf8 !important;
  color: #38bdf8 !important;
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

.v-ficha-whatsapp-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  height: 38px !important;
  padding: 0 14px !important;
  border-radius: 11px !important;
  background: #25d366 !important;
  border: 1px solid #22c55e !important;
  color: #ffffff !important;
  font-size: 12.5px !important;
  font-weight: 800 !important;
  cursor: pointer !important;
  box-shadow: 0 2px 10px rgba(37, 211, 102, 0.35) !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.v-ficha-whatsapp-btn:hover {
  background: #20ba5a !important;
  transform: translateY(-1px) scale(1.02) !important;
  box-shadow: 0 4px 14px rgba(37, 211, 102, 0.5) !important;
}

.v-ficha-whatsapp-btn.copied {
  background: #059669 !important;
  border-color: #10b981 !important;
  box-shadow: 0 0 14px rgba(16, 185, 129, 0.7) !important;
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
  border-radius: 12px !important;
  background: rgba(255, 255, 255, 0.14) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  color: #ffffff !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.v-ficha-close-btn:hover {
  background: rgba(239, 68, 68, 0.9) !important;
  border-color: rgba(248, 113, 113, 0.9) !important;
  transform: rotate(90deg) scale(1.08) !important;
}

/* =========================================================================
   BARRA DE PESTAÑAS TABULADAS HUD VIVA (INTERACTIVA & MODERNA)
========================================================================== */
.v-ficha-nav-tabs-bar {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  background: #eef2f6 !important;
  padding: 5px !important;
  border-radius: 16px !important;
  border: 1.5px solid #e2e8f0 !important;
  margin-bottom: 2px !important;
  position: relative !important;
}

.v-ficha-nav-tab {
  flex: 1 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  padding: 11px 18px !important;
  border-radius: 12px !important;
  border: none !important;
  background: transparent !important;
  color: #64748b !important;
  font-family: inherit !important;
  font-size: 13.5px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1) !important;
  position: relative !important;
}

.v-ficha-nav-tab svg {
  transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

.v-ficha-nav-tab:hover {
  color: #0f172a !important;
  background: rgba(255, 255, 255, 0.7) !important;
}

.v-ficha-nav-tab:hover svg {
  transform: scale(1.15) rotate(-5deg) !important;
}

.v-ficha-nav-tab.active {
  background: #ffffff !important;
  color: #0284c7 !important;
  font-weight: 800 !important;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04) !important;
}

.v-ficha-nav-tab.active svg {
  color: #0284c7 !important;
}

.v-tab-pill-indicator {
  background: #e0f2fe !important;
  color: #0369a1 !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  padding: 2px 7px !important;
  border-radius: 999px !important;
}

.v-ficha-nav-tab.active .v-tab-pill-indicator {
  background: #0284c7 !important;
  color: #ffffff !important;
}

.v-tab-pill-badge {
  background: #ecfdf5 !important;
  color: #059669 !important;
  border: 1px solid #a7f3d0 !important;
  font-size: 10.5px !important;
  font-weight: 800 !important;
  padding: 2px 7px !important;
  border-radius: 6px !important;
}

/* CUERPO DE LA FICHA */
.v-ficha-body {
  padding: 18px 24px !important;
  overflow-y: auto !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
  background: #f8fafc !important;
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

/* FASE 5: Indicador de Estado de Consulta Diferenciado */
.v-ficha-live-indicator {
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  padding: 5px 12px !important;
  border-radius: 999px !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
  color: #475569 !important;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04) !important;
}

.v-ficha-live-indicator.status-verified {
  border-color: #bbf7d0 !important;
  background: #f0fdf4 !important;
  color: #15803d !important;
}

.v-ficha-live-indicator.status-incomplete {
  border-color: #fed7aa !important;
  background: #fff7ed !important;
  color: #c2410c !important;
}

.v-ficha-live-indicator.status-error {
  border-color: #fecaca !important;
  background: #fef2f2 !important;
  color: #b91c1c !important;
}

.v-ficha-live-indicator.status-outdated {
  border-color: #e2e8f0 !important;
  background: #f8fafc !important;
  color: #475569 !important;
}

.live-dot {
  width: 7px !important;
  height: 7px !important;
  border-radius: 50% !important;
  background: #10b981 !important;
}

.live-dot.verified {
  background: #10b981 !important;
}
.live-dot.incomplete {
  background: #f59e0b !important;
}
.live-dot.error {
  background: #ef4444 !important;
}
.live-dot.outdated {
  background: #64748b !important;
}
.live-dot.syncing {
  background: #0284c7 !important;
  animation: vSpin 1s linear infinite !important;
}

/* BENTO GRID DE LOS 4 SISTEMAS HUD (VIVO, INTERACTIVO & RESPONSIVE) */
.v-ficha-bento-grid {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 14px !important;
  align-items: stretch !important;
}

.v-sys-bento-card {
  background: #ffffff !important;
  border: 1.5px solid #e2e8f0 !important;
  border-radius: 20px !important;
  padding: 18px !important;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
  cursor: pointer !important;
  transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
  outline: none !important;
  position: relative !important;
  overflow: hidden !important;
}

/* Halos vivos de luz y respiración sutil */
.v-card-ambient-glow {
  position: absolute !important;
  top: 0; left: 0; right: 0; height: 4px !important;
  background: #94a3b8 !important;
  transition: all 0.3s ease !important;
}

.v-card-ambient-glow.glow-ok {
  background: linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%) !important;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.6) !important;
}

.v-card-ambient-glow.glow-warn {
  background: linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%) !important;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.6) !important;
  animation: vGlowPulse 2.4s ease-in-out infinite alternate !important;
}

.v-card-ambient-glow.glow-bad {
  background: linear-gradient(90deg, #b91c1c 0%, #ef4444 50%, #f87171 100%) !important;
  box-shadow: 0 0 14px rgba(239, 68, 68, 0.75) !important;
  animation: vGlowPulse 1.8s ease-in-out infinite alternate !important;
}

@keyframes vGlowPulse {
  0% { opacity: 0.65; box-shadow: 0 0 8px currentColor; }
  100% { opacity: 1; box-shadow: 0 0 16px currentColor; }
}

.v-sys-bento-card:hover {
  transform: translateY(-4px) scale(1.012) !important;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04) !important;
  border-color: #cbd5e1 !important;
}

.v-sys-bento-card:hover .v-card-ambient-glow {
  height: 6px !important;
}

.v-sys-bento-card:active {
  transform: scale(0.985) !important;
}

.v-sys-bento-card:focus-visible {
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.35), 0 8px 24px rgba(15, 23, 42, 0.1) !important;
}

.v-sys-bento-card.tone-ok {
  border-color: rgba(16, 185, 129, 0.25) !important;
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.35) 0%, #ffffff 40%) !important;
}
.v-sys-bento-card.tone-ok:hover {
  border-color: rgba(16, 185, 129, 0.5) !important;
}
.v-sys-bento-card.tone-warn {
  border-color: #fde68a !important;
  background: linear-gradient(180deg, rgba(254, 252, 232, 0.5) 0%, #ffffff 40%) !important;
}
.v-sys-bento-card.tone-warn:hover {
  border-color: #f59e0b !important;
}
.v-sys-bento-card.tone-bad {
  border-color: #fecaca !important;
  background: linear-gradient(180deg, rgba(254, 242, 242, 0.6) 0%, #ffffff 45%) !important;
}
.v-sys-bento-card.tone-bad:hover {
  border-color: #ef4444 !important;
}
.v-sys-bento-card.tone-pending,
.v-sys-bento-card.tone-info {
  border-color: #bae6fd !important;
  background: linear-gradient(180deg, rgba(240, 249, 255, 0.5) 0%, #ffffff 40%) !important;
}
.v-sys-bento-card.tone-neutral {
  border-color: #e2e8f0 !important;
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
  width: 38px !important;
  height: 38px !important;
  border-radius: 12px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  background: #f0f9ff !important;
  color: #0284c7 !important;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04) !important;
  transition: transform 0.2s ease !important;
}

.v-sys-bento-card:hover .v-sys-icon-box {
  transform: scale(1.08) rotate(3deg) !important;
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

/* FASE 1: DATO PRINCIPAL PROTAGONISTA HUD */
.v-sys-hero-metric {
  background: #f8fafc !important;
  border: 1px solid #eef2f6 !important;
  border-radius: 14px !important;
  padding: 12px 14px !important;
  position: relative !important;
  transition: all 0.2s ease !important;
}

.v-sys-bento-card:hover .v-sys-hero-metric {
  background: #ffffff !important;
  border-color: #e2e8f0 !important;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03) !important;
}

.v-sys-hero-value {
  display: block !important;
  font-size: 22px !important;
  font-weight: 900 !important;
  color: #0f172a !important;
  letter-spacing: -0.02em !important;
  margin-bottom: 3px !important;
  transition: transform 0.2s ease !important;
}

.v-sys-bento-card:hover .v-sys-hero-value {
  transform: scale(1.02) !important;
  transform-origin: left center !important;
}

.v-sys-hero-value.tone-bad {
  color: #dc2626 !important;
  text-shadow: 0 1px 2px rgba(220, 38, 38, 0.15) !important;
}
.v-sys-hero-value.tone-ok {
  color: #059669 !important;
  text-shadow: 0 1px 2px rgba(5, 150, 105, 0.15) !important;
}
.v-sys-hero-value.tone-warn {
  color: #d97706 !important;
  text-shadow: 0 1px 2px rgba(217, 119, 6, 0.15) !important;
}

.v-sys-hero-note {
  margin: 0 !important;
  font-size: 11.5px !important;
  color: #64748b !important;
  line-height: 1.4 !important;
  font-weight: 550 !important;
}

/* Lista simplificada de datos esenciales */
.v-sys-priority-list {
  margin: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 5px !important;
}

.v-sys-priority-row {
  display: flex !important;
  justify-content: space-between !important;
  align-items: baseline !important;
  gap: 8px !important;
  font-size: 12px !important;
  padding-bottom: 4px !important;
  border-bottom: 1px dashed #f1f5f9 !important;
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

/* Pie de tarjeta */
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
  padding: 4px 8px !important;
  border-radius: 7px !important;
  cursor: pointer !important;
  transition: background 0.15s ease !important;
}

.v-sys-expand-btn:hover {
  background: #e0f2fe !important;
}

.v-sys-chevron {
  display: inline-block !important;
  transition: transform 0.2s ease !important;
}

.v-sys-chevron.open {
  transform: rotate(180deg) !important;
}

/* FASE 7: Tarjeta enfocada activa */
.v-sys-bento-card.active {
  border-color: #0284c7 !important;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.16), 0 8px 24px rgba(2, 132, 199, 0.12) !important;
  background: #ffffff !important;
}

.v-sys-expand-btn.active {
  background: #0284c7 !important;
  color: #ffffff !important;
}

/* FASE 8: PANEL CONTEXTUAL UNIFICADO BAJO DEMANDA */
.v-contextual-detail-panel {
  margin-top: 18px !important;
  border-radius: 18px !important;
  background: #ffffff !important;
  border: 1.5px solid #e0e7f0 !important;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08) !important;
  overflow: hidden !important;
  animation: contextSlideDown 0.24s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.v-contextual-detail-panel.focus-panapass {
  border-color: #bfdbfe !important;
}
.v-contextual-detail-panel.focus-revisados {
  border-color: #bbf7d0 !important;
}
.v-contextual-detail-panel.focus-gps {
  border-color: #a5f3fc !important;
}
.v-contextual-detail-panel.focus-control {
  border-color: #cbd5e1 !important;
}

@keyframes contextSlideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.v-contextual-panel-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 16px !important;
  padding: 16px 20px !important;
  background: #f8fafc !important;
  border-bottom: 1px solid #e2e8f0 !important;
  flex-wrap: wrap !important;
}

.v-contextual-kicker {
  display: block !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  color: #0284c7 !important;
  text-transform: uppercase !important;
}

.v-contextual-panel-title h4 {
  margin: 2px 0 0 !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  color: #0f172a !important;
}

.v-contextual-panel-controls {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}

.v-contextual-system-pills {
  display: inline-flex !important;
  align-items: center !important;
  background: #e2e8f0 !important;
  padding: 3px !important;
  border-radius: 999px !important;
  gap: 2px !important;
}

.v-system-pill-btn {
  border: none !important;
  background: transparent !important;
  color: #475569 !important;
  font-size: 11.5px !important;
  font-weight: 700 !important;
  padding: 4px 10px !important;
  border-radius: 999px !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.v-system-pill-btn:hover {
  color: #0f172a !important;
}

.v-system-pill-btn.active {
  background: #ffffff !important;
  color: #0284c7 !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1) !important;
}

.v-contextual-close-btn {
  width: 30px !important;
  height: 30px !important;
  border-radius: 50% !important;
  border: 1px solid #cbd5e1 !important;
  background: #ffffff !important;
  color: #64748b !important;
  font-size: 14px !important;
  font-weight: 800 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.v-contextual-close-btn:hover {
  background: #fee2e2 !important;
  border-color: #fca5a5 !important;
  color: #b91c1c !important;
}

.v-contextual-panel-content {
  padding: 20px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 18px !important;
  max-height: 420px !important;
  overflow-y: auto !important;
}

.v-contextual-section-heading {
  margin: 0 0 10px !important;
  font-size: 12.5px !important;
  font-weight: 800 !important;
  color: #334155 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

.v-contextual-section-heading::after {
  content: '' !important;
  flex: 1 !important;
  height: 1px !important;
  background: #e2e8f0 !important;
}

.v-contextual-fields-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
  gap: 10px !important;
}

.v-contextual-field-item {
  background: #f8fafc !important;
  border: 1px solid #edf2f7 !important;
  border-radius: 10px !important;
  padding: 8px 12px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 3px !important;
}

.v-contextual-field-label {
  font-size: 10.5px !important;
  color: #64748b !important;
  font-weight: 600 !important;
}

.v-contextual-field-val {
  font-size: 13px !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  word-break: break-word !important;
}

.v-contextual-field-ref {
  font-size: 10.5px !important;
  color: #0369a1 !important;
  font-weight: 600 !important;
}

/* FASE 9: BARRA DE EXPEDIENTE COMPLETO */
.v-ficha-dossier-bar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 16px !important;
  padding: 16px 20px !important;
  background: #f8fafc !important;
  border: 1.5px solid #e2e8f0 !important;
  border-radius: 16px !important;
  margin-top: 8px !important;
  flex-wrap: wrap !important;
}

.v-ficha-dossier-copy h3 {
  margin: 3px 0 2px !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  color: #0f172a !important;
}

.v-ficha-dossier-copy p {
  margin: 0 !important;
  font-size: 12px !important;
  color: #64748b !important;
}

.v-ficha-dossier-toggle-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 9px 18px !important;
  border-radius: 10px !important;
  border: 1.5px solid #0284c7 !important;
  background: #ffffff !important;
  color: #0284c7 !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.v-ficha-dossier-toggle-btn:hover {
  background: #0284c7 !important;
  color: #ffffff !important;
}

.v-ficha-dossier-toggle-btn.active {
  background: #0f172a !important;
  border-color: #0f172a !important;
  color: #ffffff !important;
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
   3. SECCIONES SECUNDARIAS EXPANDIBLES
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

/* =========================================================================
   4. PIE DE FICHA REFINADO (FASE 6: Acción Principal Destacada + Secundarias)
========================================================================== */
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

.v-ficha-footer-secondary-links {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  flex-wrap: wrap !important;
  font-size: 12px !important;
}

.v-footer-links-label {
  font-weight: 600 !important;
  color: #64748b !important;
}

.v-ficha-sub-link {
  border: none !important;
  background: transparent !important;
  color: #0284c7 !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  padding: 2px 4px !important;
  border-radius: 4px !important;
  transition: color 0.15s ease, background 0.15s ease !important;
  text-decoration: underline !important;
  text-underline-offset: 3px !important;
}

.v-ficha-sub-link:hover {
  color: #0369a1 !important;
  background: #f0f9ff !important;
}

.v-sub-sep {
  color: #cbd5e1 !important;
  font-weight: 800 !important;
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
  transition: background 0.15s ease !important;
}

.v-ficha-btn-secondary:hover {
  background: #f1f5f9 !important;
}

/* Acción Principal Destacada: Abrir en Control de Auto */
.v-ficha-btn-primary {
  padding: 10px 20px !important;
  border-radius: 11px !important;
  background: linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%) !important;
  border: none !important;
  color: #ffffff !important;
  font-size: 13.5px !important;
  font-weight: 800 !important;
  cursor: pointer !important;
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.3) !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease !important;
}

.v-ficha-btn-primary:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 18px rgba(2, 132, 199, 0.4) !important;
  filter: brightness(1.05) !important;
}

/* =========================================================================
   5. DISEÑO RESPONSIVE (FASE 7)
========================================================================== */
@media (max-width: 1180px) {
  .v-ficha-bento-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 720px) {
  .v-ficha-backdrop {
    padding: 0 !important;
    align-items: flex-end !important;
  }

  .v-ficha-sheet {
    width: 100% !important;
    height: 100dvh !important;
    max-height: 100dvh !important;
    border-radius: 18px 18px 0 0 !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }

  /* Cabecera ultra-compacta: altura contenida y visible sin recortes */
  .v-ficha-header {
    padding: max(8px, env(safe-area-inset-top)) 10px 6px !important;
    flex-shrink: 0 !important;
  }

  .v-ficha-header-main {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 5px !important;
  }

  .v-ficha-unit-hero {
    width: 100% !important;
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 6px !important;
  }

  /* Badge de Unidad en móvil */
  .v-ficha-unit-badge-box {
    padding: 3px 8px !important;
    min-width: auto !important;
    flex-shrink: 0 !important;
  }

  .v-ficha-kicker {
    font-size: 7.5px !important;
    letter-spacing: 0.04em !important;
    margin-bottom: 0 !important;
  }

  .v-ficha-unit-number {
    font-size: 18px !important;
    line-height: 1.1 !important;
  }

  .v-ficha-identity-meta {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 3px !important;
  }

  .v-ficha-primary-pills {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 4px !important;
  }

  .v-ficha-plate-group {
    padding: 2px 6px !important;
    gap: 3px !important;
  }

  .v-ficha-plate-label {
    font-size: 8px !important;
  }

  .v-ficha-plate-val {
    font-size: 11.5px !important;
  }

  .v-ficha-meta-pill {
    padding: 2px 6px !important;
    font-size: 10.5px !important;
    max-width: 180px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .v-ficha-meta-pill svg {
    display: none !important;
  }

  /* Empresa Operadora, Dueña, Galera y Supervisora: grilla compacta de 2 columnas */
  .v-ficha-company-row {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 2px 8px !important;
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    border-radius: 6px !important;
    padding: 4px 6px !important;
    margin-top: 1px !important;
  }

  .v-ficha-info-item {
    gap: 0 !important;
  }

  .v-ficha-info-item small {
    font-size: 7.5px !important;
    letter-spacing: 0.04em !important;
  }

  .v-ficha-info-item strong {
    font-size: 10.5px !important;
    line-height: 1.15 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  /* Controles de cabecera en móvil: Semáforo y WhatsApp + Cerrar */
  .v-ficha-header-controls {
    margin-left: 0 !important;
    width: 100% !important;
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 5px !important;
  }

  .v-ficha-op-semaphore {
    flex: 1 1 auto !important;
    padding: 3px 6px !important;
    border-radius: 6px !important;
    gap: 5px !important;
  }

  .v-ficha-op-dot {
    width: 8px !important;
    height: 8px !important;
  }

  .v-ficha-op-text strong {
    font-size: 10px !important;
    line-height: 1.1 !important;
  }

  .v-ficha-op-text small {
    font-size: 8.5px !important;
    line-height: 1 !important;
    display: block !important;
  }

  .v-ficha-action-buttons {
    flex: 0 0 auto !important;
    display: flex !important;
    gap: 4px !important;
    align-items: center !important;
  }

  .v-ficha-whatsapp-btn {
    height: 28px !important;
    padding: 0 8px !important;
    font-size: 10.5px !important;
    border-radius: 6px !important;
    gap: 3px !important;
  }

  .v-ficha-whatsapp-btn svg {
    width: 12px !important;
    height: 12px !important;
  }

  .v-ficha-close-btn {
    width: 28px !important;
    height: 28px !important;
    border-radius: 6px !important;
    font-size: 12px !important;
  }

  /* Cinta de alertas compacta */
  .v-ficha-alerts-strip {
    margin-top: 4px !important;
    gap: 3px !important;
  }

  .v-ficha-alert-chip {
    padding: 2px 6px !important;
    font-size: 9.5px !important;
    gap: 4px !important;
  }

  /* Cuerpo con scroll optimizado y padding mínimo */
  .v-ficha-body {
    padding: 6px 8px !important;
    flex: 1 1 auto !important;
    overflow-y: auto !important;
    min-height: 0 !important;
  }

  .v-ficha-nav-tabs-bar {
    gap: 2px !important;
    padding: 2px !important;
    margin-bottom: 6px !important;
  }

  .v-ficha-nav-tab {
    padding: 4px 6px !important;
    font-size: 10.5px !important;
    gap: 4px !important;
  }

  .v-ficha-nav-tab svg {
    width: 13px !important;
    height: 13px !important;
  }

  /* En móvil ocultamos la barra de título larga para ahorrar 40px */
  .v-ficha-section-bar {
    display: none !important;
  }

  /* GRILLA 2x2 EN MÓVIL: Las 4 tarjetas caben 100% en el viewport */
  .v-ficha-bento-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 6px !important;
  }

  .v-sys-bento-card {
    padding: 7px 6px 6px !important;
    border-radius: 10px !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    min-height: 105px !important;
  }

  .v-sys-card-top {
    gap: 2px !important;
    margin-bottom: 2px !important;
  }

  .v-sys-card-brand {
    gap: 4px !important;
  }

  .v-sys-icon-box {
    width: 22px !important;
    height: 22px !important;
    border-radius: 6px !important;
  }

  .v-sys-icon-box svg {
    width: 12px !important;
    height: 12px !important;
  }

  .v-sys-kicker {
    font-size: 7px !important;
    line-height: 1 !important;
  }

  .v-sys-card-name {
    font-size: 10.5px !important;
    line-height: 1.1 !important;
  }

  .v-sys-status-badge {
    padding: 1px 4px !important;
    font-size: 7.5px !important;
    gap: 2px !important;
  }

  .v-sys-hero-metric {
    padding: 4px 6px !important;
    border-radius: 6px !important;
    margin-bottom: 2px !important;
  }

  .v-sys-hero-value {
    font-size: 13.5px !important;
    line-height: 1.1 !important;
  }

  .v-level-track {
    height: 3px !important;
    margin: 3px 0 2px !important;
  }

  .v-sys-hero-note {
    font-size: 8.5px !important;
    line-height: 1.1 !important;
    margin: 1px 0 0 !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
  }

  /* GPS en móvil: barras horizontales sin ocupar tanto espacio */
  .v-gps-antennas {
    display: flex !important;
    gap: 3px !important;
  }

  .v-gps-ant {
    flex: 1 !important;
    padding: 2px 4px !important;
    font-size: 8px !important;
    flex-direction: column !important;
    align-items: center !important;
    gap: 1px !important;
  }

  .v-sig-bars {
    height: 8px !important;
    gap: 1px !important;
  }

  .v-sig-bars i {
    width: 1.5px !important;
  }

  .v-gps-ant-label {
    font-size: 7.5px !important;
  }

  .v-gps-ant-state {
    font-size: 7.5px !important;
  }

  /* Pie de tarjeta ultra compacto */
  .v-sys-card-footer {
    padding-top: 3px !important;
    margin-top: 2px !important;
  }

  .v-sys-timestamp {
    font-size: 8px !important;
    gap: 2px !important;
  }

  .v-sys-chevron-pill {
    width: 16px !important;
    height: 16px !important;
    font-size: 9px !important;
  }

  /* Pie de la ficha: Cerrar y Consultar otra unidad */
  .v-ficha-footer {
    padding: 6px 10px max(6px, env(safe-area-inset-bottom)) !important;
    gap: 6px !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
    flex-shrink: 0 !important;
    background: #ffffff !important;
    border-top: 1px solid #e2e8f0 !important;
  }

  .v-ficha-footer-secondary-links {
    display: none !important;
  }

  .v-ficha-footer-main-actions {
    margin-left: 0 !important;
    display: flex !important;
    width: 100% !important;
    gap: 8px !important;
  }

  .v-ficha-footer-main-actions button {
    flex: 1 !important;
    text-align: center !important;
    padding: 7px 10px !important;
    font-size: 11.5px !important;
    border-radius: 8px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;
  }

  .v-ficha-footer-main-actions button svg {
    width: 14px !important;
    height: 14px !important;
  }
}

/* =========================================================================
   REDISEÑO HUD: barras de nivel, tira anual, antenas GPS, pie mínimo
========================================================================== */
.v-level-track {
  height: 6px !important;
  border-radius: 999px !important;
  background: #e2e8f0 !important;
  margin: 8px 0 6px !important;
  overflow: hidden !important;
}
.v-level-fill {
  display: block !important;
  height: 100% !important;
  border-radius: 999px !important;
  background: #94a3b8 !important;
  transform-origin: left center !important;
  animation: vFillGrow 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both !important;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}
.v-level-fill.tone-ok { background: linear-gradient(90deg, #10b981, #34d399) !important; }
.v-level-fill.tone-warn { background: linear-gradient(90deg, #f59e0b, #fbbf24) !important; }
.v-level-fill.tone-bad { background: linear-gradient(90deg, #ef4444, #f87171) !important; }
@keyframes vFillGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.v-year-strip {
  display: grid !important;
  grid-template-columns: repeat(12, 1fr) !important;
  gap: 3px !important;
  margin: 9px 0 6px !important;
}
.v-year-seg {
  height: 7px !important;
  border-radius: 3px !important;
  background: #e2e8f0 !important;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}
.v-year-seg.current {
  height: 11px !important;
  margin-top: -2px !important;
  background: #10b981 !important;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.55) !important;
  animation: vSegPulse 2.2s ease-in-out infinite !important;
}
.v-year-seg.current.tone-warn { background: #f59e0b !important; box-shadow: 0 0 10px rgba(245, 158, 11, 0.55) !important; }
.v-year-seg.current.tone-bad { background: #ef4444 !important; box-shadow: 0 0 10px rgba(239, 68, 68, 0.55) !important; }
@keyframes vSegPulse { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.25); } }

.v-gps-antennas {
  display: flex !important;
  gap: 10px !important;
  margin-top: 0 !important;
}
.v-gps-ant {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 12px 8px !important;
  border-radius: 12px !important;
  background: #f1f5f9 !important;
  color: #94a3b8 !important;
  font-size: 11.5px !important;
  font-weight: 800 !important;
}
.v-gps-ant.state-on,
.v-gps-ant.on {
  background: #ecfdf5 !important;
  color: #059669 !important;
}
.v-gps-ant.state-off {
  background: #fef2f2 !important;
  color: #dc2626 !important;
  border: 1px solid rgba(239, 68, 68, 0.2) !important;
}
.v-gps-ant.state-none,
.v-gps-ant.state-unknown {
  background: #f1f5f9 !important;
  color: #94a3b8 !important;
}

.v-sig-bars { display: inline-flex !important; align-items: flex-end !important; gap: 4px !important; height: 30px !important; }
.v-sig-bars i {
  display: block !important;
  width: 6px !important;
  border-radius: 2px !important;
  background: currentColor !important;
  opacity: 0.3 !important;
  transform-origin: bottom center !important;
}
.v-sig-bars i:nth-child(1) { height: 9px !important; }
.v-sig-bars i:nth-child(2) { height: 16px !important; }
.v-sig-bars i:nth-child(3) { height: 23px !important; }
.v-sig-bars i:nth-child(4) { height: 30px !important; }

/* GPS Reportando (Verde en movimiento armónico) */
.v-gps-ant.state-on .v-sig-bars i,
.v-gps-ant.on .v-sig-bars i {
  opacity: 1 !important;
  animation: vSigWave 1.4s ease-in-out infinite !important;
}
.v-gps-ant.state-on .v-sig-bars i:nth-child(2),
.v-gps-ant.on .v-sig-bars i:nth-child(2) { animation-delay: 0.15s !important; }
.v-gps-ant.state-on .v-sig-bars i:nth-child(3),
.v-gps-ant.on .v-sig-bars i:nth-child(3) { animation-delay: 0.3s !important; }
.v-gps-ant.state-on .v-sig-bars i:nth-child(4),
.v-gps-ant.on .v-sig-bars i:nth-child(4) { animation-delay: 0.45s !important; }

/* GPS Sin Reportar (Rojo en movimiento/alerta viva pulsante) */
.v-gps-ant.state-off .v-sig-bars i {
  opacity: 0.85 !important;
  animation: vSigWaveAlert 1.1s ease-in-out infinite alternate !important;
}
.v-gps-ant.state-off .v-sig-bars i:nth-child(2) { animation-delay: 0.12s !important; }
.v-gps-ant.state-off .v-sig-bars i:nth-child(3) { animation-delay: 0.24s !important; }
.v-gps-ant.state-off .v-sig-bars i:nth-child(4) { animation-delay: 0.36s !important; }

@keyframes vSigWave {
  0%, 100% { transform: scaleY(1); opacity: 1; }
  50% { transform: scaleY(0.45); opacity: 0.45; }
}

@keyframes vSigWaveAlert {
  0% { transform: scaleY(0.4); opacity: 0.4; }
  100% { transform: scaleY(1); opacity: 1; filter: drop-shadow(0 0 3px rgba(220, 38, 38, 0.6)); }
}

/* Cabecera ordenada: datos etiquetados */
.v-ficha-company-row {
  display: flex !important;
  align-items: flex-start !important;
  flex-wrap: wrap !important;
  gap: 8px 22px !important;
}
.v-ficha-info-item {
  display: flex !important;
  flex-direction: column !important;
  gap: 1px !important;
  min-width: 0 !important;
}
.v-ficha-info-item small {
  font-size: 9.5px !important;
  font-weight: 800 !important;
  letter-spacing: 0.1em !important;
  color: #7dd3fc !important;
}
.v-ficha-info-item strong {
  font-size: 13px !important;
  font-weight: 700 !important;
  color: #ffffff !important;
}
.v-op-dot-ping { inset: -3px !important; border-width: 1.5px !important; }
@keyframes vBeaconPing {
  0% { transform: scale(0.8); opacity: 0.8; }
  70%, 100% { transform: scale(1.7); opacity: 0; }
}
.v-ficha-op-semaphore { gap: 12px !important; padding: 8px 16px 8px 14px !important; }

/* Cabecera: identidad a la izquierda, controles fijos a la derecha (no se bajan de línea) */
.v-ficha-header-main { flex-wrap: nowrap !important; align-items: flex-start !important; }
.v-ficha-unit-hero { flex: 1 1 auto !important; min-width: 0 !important; align-items: flex-start !important; }
.v-ficha-identity-meta { min-width: 0 !important; }
.v-ficha-header-controls { flex: 0 0 auto !important; margin-left: auto !important; flex-wrap: nowrap !important; }
.v-ficha-action-buttons { flex-wrap: nowrap !important; }

/* Franja de alertas confirmadas */
.v-ficha-alerts-strip {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin-top: 12px !important;
  position: relative !important;
  z-index: 2 !important;
}
.v-ficha-alert-chip {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 6px 12px !important;
  border-radius: 999px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.22) !important;
  color: #ffffff !important;
}
.v-ficha-alert-chip strong { font-weight: 800 !important; }
.v-ficha-alert-chip.sev-bad { background: rgba(239, 68, 68, 0.28) !important; border-color: rgba(248, 113, 113, 0.6) !important; }
.v-ficha-alert-chip.sev-warn { background: rgba(245, 158, 11, 0.28) !important; border-color: rgba(251, 191, 36, 0.6) !important; }
.v-ficha-alert-dot { width: 8px !important; height: 8px !important; border-radius: 50% !important; background: currentColor !important; flex-shrink: 0 !important; }
.v-ficha-alert-chip.sev-bad .v-ficha-alert-dot { color: #fca5a5 !important; }
.v-ficha-alert-chip.sev-warn .v-ficha-alert-dot { color: #fcd34d !important; }

.v-gps-ant-state { font-size: 10.5px !important; font-weight: 700 !important; opacity: 0.95 !important; }
.v-gps-ant.state-on .v-gps-ant-state,
.v-gps-ant.on .v-gps-ant-state { color: #059669 !important; }
.v-gps-ant.state-off .v-gps-ant-state { color: #dc2626 !important; font-weight: 800 !important; }
.v-gps-ant.state-none .v-gps-ant-state,
.v-gps-ant.state-unknown .v-gps-ant-state { color: #64748b !important; }

@media (max-width: 720px) {
  .v-ficha-header-main { flex-wrap: wrap !important; }
  .v-ficha-header-controls { margin-left: 0 !important; width: 100% !important; justify-content: space-between !important; }
}

.v-live-tick {
  width: 6px !important;
  height: 6px !important;
  border-radius: 50% !important;
  background: #10b981 !important;
  display: inline-block !important;
  animation: vTick 2s ease-in-out infinite !important;
}
@keyframes vTick { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.7); } }

.v-sys-chevron-pill {
  width: auto !important;
  height: 26px !important;
  padding: 0 10px !important;
  gap: 4px !important;
  border-radius: 999px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #f0f9ff !important;
  color: #0369a1 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  white-space: nowrap !important;
  transition: background 0.2s ease, color 0.2s ease !important;
}
.v-chev-icon { display: inline-block; font-size: 12px; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.v-sys-bento-card:hover .v-sys-chevron-pill { background: #e0f2fe !important; }
.v-sys-chevron-pill.open { background: #0284c7 !important; color: #fff !important; }
.v-sys-chevron-pill.open .v-chev-icon { transform: rotate(180deg); }

/* Badge de consulta: datos completos pero con sistemas en alerta */
.v-ficha-live-indicator.status-attention {
  border-color: #fde68a !important;
  background: #fffbeb !important;
  color: #b45309 !important;
}
.live-dot.attention { background: #f59e0b !important; }

/* Pestaña: contador de alertas en lugar del "4" redundante */
.v-tab-pill-indicator.is-alert { background: #dc2626 !important; color: #fff !important; }
.v-tab-pill-indicator.is-ok { background: #16a34a !important; color: #fff !important; }

/* Kicker en una sola línea para alinear los títulos de las 4 tarjetas */
.v-sys-kicker { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
.v-sys-card-name { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }

/* Pie de tarjeta siempre anclado abajo: las 4 tarjetas quedan alineadas */
.v-sys-card-footer { margin-top: auto !important; }

/* WhatsApp: botón circular solo con logo */
.v-ficha-whatsapp-btn.icon-only {
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
  padding: 0 !important;
  border-radius: 50% !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #25d366 !important;
  color: #fff !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.35) !important;
  transition: transform 0.15s ease, box-shadow 0.2s ease !important;
}
.v-ficha-whatsapp-btn.icon-only:hover { transform: scale(1.08) !important; box-shadow: 0 6px 16px rgba(37, 211, 102, 0.5) !important; }
.v-ficha-whatsapp-btn.icon-only.copied { background: #128c7e !important; }

/* Estado de consulta solo cuando hay algo que avisar (sincronizando / error) */
.v-ficha-live-inline { align-self: flex-end !important; margin-bottom: 8px !important; }

/* Pie: separación entre icono y texto del botón primario */
.v-ficha-footer button { gap: 8px !important; }

@media (hover: none) {
  .v-sys-bento-card:hover { transform: none !important; }
  .v-sys-bento-card { min-height: 64px !important; }
}
@media (prefers-reduced-motion: reduce) {
  .v-level-fill, .v-year-seg.current, .v-sig-bars i, .v-live-tick, .v-op-dot-ping, .v-card-ambient-glow { animation: none !important; }
}
</style>
