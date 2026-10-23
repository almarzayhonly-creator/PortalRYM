<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ModuleIcon from './ModuleIcon.vue'

import { applyValidatorSections, type Unit, type UnitDetail, type Api } from '../validatorDetails'
const props = defineProps<{ api?: Api; onControl?: () => unknown }>()
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
const detailLoading = ref(false)
const detailError = ref('')
const modalOpen = ref(false)
const activeCardKey = ref('panapass')
const recentUnits = ref<Unit[]>([])
const activeCard = computed(() => detail.value?.cards.find(card => card.key === activeCardKey.value) ?? detail.value?.cards[0] ?? null)
let timer: number | undefined
let sequence = 0
let detailSequence = 0
let previousOverflow = ''
const visible = computed(() => panelOpen.value && query.value.trim().length >= 2 && (loading.value || searched.value))
const value = (row: Unit, ...keys: string[]) => String(keys.map(key => row[key]).find(item => item !== undefined && item !== null && String(item).trim()) ?? '—')
const unit = (row: Unit) => value(row, 'unidad', 'unit')
const plate = (row: Unit) => value(row, 'placa_unica', 'placa', 'placa_comercial')
const company = (row: Unit) => value(row, 'empresa_duena', 'empresa_operadora', 'empresa', 'empresa_nombre', 'razon_social', 'duena', 'propietario')
const panapass = (row: Unit) => value(row, 'panapass_numero', 'panapass')
const status = (row: Unit) => value(row, 'estatus', 'estado')
async function select(row: Unit) {
  panelOpen.value = false; rows.value = []; searched.value = false; modalOpen.value = true
  activeCardKey.value = 'panapass'
  recentUnits.value = [row, ...recentUnits.value.filter(item => unit(item) !== unit(row))].slice(0, 4)
  detail.value = null; detailError.value = ''; detailLoading.value = true
  const current = ++detailSequence
  try {
    if (!props.api) throw Error('El validador no está disponible.')
    const result = await props.api.load(row) as UnitDetail
    if (current !== detailSequence) return
    detail.value = result
    detailLoading.value = false
    let fichaData: Unit | null = null
    const applyExtras = (ficha: Unit | null = fichaData) => {
      if (current !== detailSequence || !detail.value) return
      applyValidatorSections(detail.value, ficha)
    }
    applyExtras(null)
    const enrichment = props.api.enrich ? props.api.enrich(result).then(updated => { if (current === detailSequence) { detail.value = updated; applyExtras() } }).catch(() => {}) : Promise.resolve()
    const fichaPromise = props.api.ficha ? props.api.ficha(row).then(ficha => { fichaData = ficha; applyExtras() }).catch(() => {}) : Promise.resolve()
    void Promise.all([enrichment, fichaPromise])
    const gps = result.cards.find(card => card.key === 'gps')
    const stateDetail = gps?.details.find(item => item.label === 'Estado')?.value || ''
    if (gps && /HTTP\s+5\d\d/i.test(stateDetail) && props.api.gps) {
      try {
        const response = await props.api.gps(row)
        if (!response.ok) throw Error(String(response.error || 'El servicio alterno no respondió.'))
        const rows = Array.isArray(response.rows) ? response.rows as Unit[] : []
        const query = unit(row).trim().toLocaleUpperCase()
        const match = rows.find(item => unit(item).trim().toLocaleUpperCase() === query) || rows[0]
        if (!match) throw Error('El servicio alterno no encontró esa unidad.')
        const gps1 = (match.gps1 && typeof match.gps1 === 'object' ? match.gps1 : {}) as Unit
        const gps2 = (match.gps2 && typeof match.gps2 === 'object' ? match.gps2 : {}) as Unit
        const label = (value: Unit) => !value.installed ? 'Sin GPS instalado' : value.ok ? 'Reportando' : String(value.label || 'Sin reportar')
        const last = (value: Unit) => value.last ? new Date(String(value.last)).toLocaleString('es-PA', { timeZone: 'America/Panama', dateStyle: 'short', timeStyle: 'short' }) : 'Sin transmisión reciente'
        const level = String(match.nivel || '').toLocaleUpperCase()
        Object.assign(gps, {
          tone: level === 'CRITICO' ? 'bad' : level === 'ALERTA' ? 'warn' : 'ok',
          badge: level === 'CRITICO' ? 'GPS CRÍTICO' : level === 'ALERTA' ? 'REVISAR GPS' : '2 GPS OK',
          value: `${label(gps1)} · ${label(gps2)}`,
          details: [{ label: 'GPS 1', value: `${label(gps1)} · ${last(gps1)}` }, { label: 'GPS 2', value: `${label(gps2)} · ${last(gps2)}` }],
          note: `${String(match.estado_operativo || '—')} · ${String(match.razon || 'Sin diagnóstico')}`,
        })
        const tones = result.cards.map(card => card.tone)
        result.overall = !result.active ? 'PARADA · REVISAR' : tones.includes('bad') ? 'ACTIVA · ALERTA' : tones.some(tone => tone === 'warn' || tone === 'pending') ? 'ACTIVA · REVISAR' : 'ACTIVA · TODO OK'
      } catch {
        Object.assign(gps, { tone: 'warn', badge: 'NO VALIDADO', value: 'No se pudo validar', details: [{ label: 'Unidad', value: result.unit }, { label: 'Estado', value: 'GPS no respondió' }], note: 'No significa que la unidad esté sin GPS instalado.' })
        result.overall = result.active ? 'ACTIVA · REVISAR' : result.overall
      }
    }
    if (current === detailSequence) detail.value = result
  }
  catch (error) { if (current === detailSequence) detailError.value = error instanceof Error ? error.message : String(error) }
  finally { if (current === detailSequence) detailLoading.value = false }
}
function closeDetail() { modalOpen.value = false; detailSequence++; detailLoading.value = false; detail.value = null; detailError.value = ''; window.setTimeout(() => { input.value?.focus({ preventScroll: true }); input.value?.select() }, 40) }
async function searchNow() {
  window.clearTimeout(timer)
  const term = query.value.trim()
  if (term.length < 2 || !props.api) return
  const current = ++sequence
  if (rows.value.length === 1) { void select(rows.value[0]!); return }
  panelOpen.value = true; loading.value = true; searched.value = false; searchError.value = ''
  try {
    const result = await props.api.search(term)
    if (current !== sequence) return
    rows.value = result; searched.value = true; activeIndex.value = result.length === 1 ? 0 : -1
    if (result.length === 1) void select(result[0]!)
  } catch (error) {
    if (current === sequence) { rows.value = []; searched.value = true; searchError.value = error instanceof Error ? error.message : String(error) }
  } finally { if (current === sequence) loading.value = false }
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' && rows.value.length) { event.preventDefault(); activeIndex.value = (activeIndex.value + 1) % rows.value.length }
  else if (event.key === 'ArrowUp' && rows.value.length) { event.preventDefault(); activeIndex.value = activeIndex.value <= 0 ? rows.value.length - 1 : activeIndex.value - 1 }
  else if (event.key === 'Enter') { if (activeIndex.value >= 0 && rows.value[activeIndex.value]) { event.preventDefault(); select(rows.value[activeIndex.value]!) } else { event.preventDefault(); void searchNow() } }
  else if (event.key === 'Escape') { if (modalOpen.value) closeDetail(); else panelOpen.value = false; activeIndex.value = -1 }
}
function outsideClick(event: PointerEvent) { if (wrap.value && !wrap.value.contains(event.target as Node)) panelOpen.value = false }
function lockPage(value: boolean) { if (value) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' } else document.body.style.overflow = previousOverflow }
watch(query, value => {
  window.clearTimeout(timer)
  const term = value.trim()
  const current = ++sequence
  rows.value = []; searched.value = false; activeIndex.value = -1; searchError.value = ''
  if (term.length < 2 || !props.api) { loading.value = false; return }
  panelOpen.value = true
  loading.value = true
  timer = window.setTimeout(async () => {
    try { const result = await props.api!.search(term); if (current === sequence) { rows.value = result; searched.value = true } }
    catch (error) { if (current === sequence) { searched.value = true; searchError.value = error instanceof Error ? error.message : String(error) } }
    finally { if (current === sequence) loading.value = false }
  }, 240)
})
onMounted(() => document.addEventListener('pointerdown', outsideClick))
watch(modalOpen, lockPage)
onUnmounted(() => { window.clearTimeout(timer); sequence++; detailSequence++; document.body.style.overflow = previousOverflow; document.removeEventListener('pointerdown', outsideClick) })
</script>

<template>
  <section class="ryn-validator" aria-label="Validador de unidad">
    <div class="ryn-validator-heading">
      <span class="ryn-validator-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; max-width: 20px; max-height: 20px; display: block;">
          <circle cx="10.8" cy="10.8" r="6.3" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="m16 16 4.2 4.2M8.5 10.8h4.6M10.8 8.5v4.6" />
        </svg>
      </span>
      <div>
        <span class="ryn-validator-kicker">BÚSQUEDA RÁPIDA</span>
        <h2>Validador de unidad</h2>
        <p>Unidad, placa o Panapass</p>
      </div>
    </div>
    <div ref="wrap" class="uv-search-wrap">
      <label class="uv-search-field">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width: 19px; height: 19px; max-width: 19px; max-height: 19px; flex: none; display: block;">
          <circle cx="10.8" cy="10.8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="m16 16 4.2 4.2" />
        </svg>
        <input id="v101ValidatorQ" ref="input" v-model="query" type="search" placeholder="Escribe unidad, placa o número Panapass" autocomplete="off" aria-label="Buscar unidad, placa o Panapass" aria-controls="v101ValidatorList" :aria-expanded="visible" @focus="panelOpen = true" @keydown="onKeydown">
        <kbd v-if="query">ESC</kbd>
      </label>
      <button id="v101ValidatorGo" class="uv-search-button" type="button" :disabled="query.trim().length < 2 || loading" @click="searchNow">Buscar unidad <span aria-hidden="true">→</span></button>
      <div v-if="visible" id="v101ValidatorList" class="uv-results" role="listbox" aria-label="Unidades encontradas">
        <div v-if="loading" class="uv-state"><span class="uv-spinner"></span>Buscando en la flota…</div>
        <div v-else-if="searchError" class="uv-state" role="alert">{{ searchError }}</div>
        <div v-else-if="!rows.length" class="uv-state">Sin coincidencias para “{{ query.trim() }}”. Revisa el dato e intenta otra vez.</div>
        <button v-for="(item, index) in rows" v-else :key="`${unit(item)}-${plate(item)}`" type="button" class="uv-result v101-validator-item" :class="{ active: index === activeIndex }" role="option" :aria-selected="index === activeIndex" @click="select(item)" @mouseenter="activeIndex = index">
          <span class="uv-unit-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7.5h16v12H4zM8 7.5V5h8v2.5M8 12h8M8 15.5h5"/></svg></span>
          <span class="uv-result-copy"><strong>{{ unit(item) }}</strong><span><b>EMPRESA</b>{{ company(item) }}</span><span class="uv-result-meta"><span><b>PLACA</b>{{ plate(item) }}</span><span><b>PANAPASS</b>{{ panapass(item) }}</span></span></span>
          <span class="uv-status" :class="/activo|activa|operativo/i.test(status(item)) ? 'ok' : 'warn'">{{ status(item) }}</span><span class="uv-chevron" aria-hidden="true">→</span>
        </button>
      </div>
    </div>
    <nav v-if="recentUnits.length" class="uv-recent" aria-label="Unidades recientes"><span>Recientes:</span><button v-for="item in recentUnits" :key="unit(item)" type="button" @click="select(item)">{{ unit(item) }}</button></nav>
  </section>
  <Teleport to="body">
    <Transition name="uv-modal">
      <div v-if="modalOpen" class="uv-overlay" role="presentation" @pointerdown.self="closeDetail" @keydown.esc.prevent="closeDetail">
        <section class="uv-dialog" role="dialog" aria-modal="true" aria-labelledby="uv-dialog-title">
          <header class="uv-dialog-head"><div><span class="uv-dialog-kicker">CONSULTA INTEGRAL DE FLOTA</span><h2 id="uv-dialog-title">Ficha de unidad</h2><p>{{ detail ? 'Resumen operativo · 4 sistemas consultados' : 'Preparando información de la unidad' }}</p></div><button class="uv-close" type="button" aria-label="Cerrar consulta" @click="closeDetail"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
          <div v-if="detailLoading" class="uv-detail-state"><span class="uv-spinner"></span><strong>Validando unidad…</strong><span>Consultamos Control de Auto, Revisados y sus servicios disponibles.</span></div>
          <div v-else-if="detailError" class="uv-detail-state error"><span class="uv-error-mark">!</span><strong>No se pudo completar la consulta</strong><span>{{ detailError }}</span><button type="button" @click="closeDetail">Volver a buscar</button></div>
          <template v-else-if="detail">
            <div class="uv-dialog-scroll">
              <section class="uv-identity"><div class="uv-identity-main"><span class="uv-identity-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h16v12H4zM8 7.5V5h8v2.5M8 12h8M8 15.5h5"/></svg></span><div><span class="uv-dialog-kicker">{{ detail.closed ? 'REGISTRO HISTÓRICO' : 'ESTADO DE LA UNIDAD' }}</span><h3>{{ detail.unit }}</h3><p><span class="uv-plate">PLACA <b>{{ detail.plate }}</b></span><span class="uv-divider" aria-hidden="true"></span>{{ detail.status }}</p></div></div><span class="uv-overall" :class="detail.active && detail.cards.every(card => card.tone === 'ok') ? 'ok' : detail.active ? 'warn' : 'bad'">{{ detail.overall }}</span>
                <div class="uv-identity-grid"><div><span>EMPRESA</span><b>{{ detail.operator }}</b></div><div><span>DUEÑA</span><b>{{ detail.owner }}</b></div><div><span>SUPERVISORA</span><b>{{ detail.supervisor }}</b></div><div><span>GALERA</span><b>{{ detail.galera }}</b></div></div>
              </section>
              <div class="uv-section-label"><div><span>VALIDACIÓN DE SERVICIOS</span><small>Estado actual de cada módulo conectado</small></div><b class="uv-system-count">04 <span>SISTEMAS</span></b></div>
              <section class="uv-check-grid" aria-label="Validaciones por sistema">
                <article v-for="card in detail.cards" :key="card.key" class="uv-check-card" :class="[card.key, card.tone, { selected: activeCard?.key === card.key }]">
                  <button class="uv-card-select" type="button" :aria-expanded="activeCard?.key === card.key" @click="activeCardKey = card.key">
                    <header><span class="uv-check-icon"><ModuleIcon :name="card.key" /></span><strong>{{ card.title }}</strong><span class="uv-check-badge"><i aria-hidden="true">{{ card.tone === 'ok' ? '✓' : card.tone === 'pending' ? '·' : '!' }}</i>{{ card.badge }}</span></header>
                    <b class="uv-check-value">{{ card.value }}</b>
                    <div class="uv-check-details"><div v-for="item in card.details.slice(0, 2)" :key="item.label"><span>{{ item.label }}</span><b>{{ item.value }}</b></div></div>
                    <p>{{ card.note }}</p>
                    <span class="uv-card-more">{{ activeCard?.key === card.key ? 'Detalle abierto' : 'Ver detalle' }} <i aria-hidden="true">→</i></span>
                  </button>
                </article>
              </section>
              <section v-if="activeCard" class="uv-active-detail" :class="activeCard.key" aria-live="polite">
                <header><div><span>DETALLE DE {{ activeCard.title.toLocaleUpperCase() }}</span><h3>{{ activeCard.value }}</h3></div><span class="uv-check-badge" :class="activeCard.tone">{{ activeCard.badge }}</span></header>
                <p v-if="activeCard.note">{{ activeCard.note }}</p>
                <div v-if="activeCard.details.length" class="uv-active-facts"><div v-for="item in activeCard.details" :key="item.label"><span>{{ item.label }}</span><b>{{ item.value }}</b></div></div>
                <details v-for="section in activeCard.sections" :key="section.title" class="uv-extra-section"><summary>{{ section.title }}<span>{{ section.fields.length }} campos <i aria-hidden="true">⌄</i></span></summary><div class="uv-extra-fields"><div v-for="field in section.fields" :key="field.label" class="uv-extra-field" :class="[field.comparison, { 'has-reference': field.reference !== undefined }]"><span>{{ field.label }}</span><template v-if="field.reference !== undefined"><b><small>RYM</small>{{ field.value }}</b><b><small>eCarCheck</small>{{ field.reference }}</b><em v-if="field.comparison">{{ field.comparison === 'match' ? 'Coincide' : field.comparison === 'diff' ? 'Diferencia' : 'Sin comparar' }}</em></template><b v-else>{{ field.value }}</b></div></div></details>
                <div v-if="!activeCard.sections?.length" class="uv-no-extra">No hay más datos disponibles para este sistema.</div>
              </section>
            </div>
            <footer class="uv-dialog-actions"><button type="button" class="uv-action secondary" @click="closeDetail">Otra unidad <span aria-hidden="true">↗</span></button><button type="button" class="uv-action primary" @click="closeDetail(); onControl?.()">Abrir Control de Auto <span aria-hidden="true">→</span></button></footer>
          </template>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.ryn-validator {
  max-width: 100% !important;
  box-sizing: border-box !important;
}
.ryn-validator-heading {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  margin-bottom: 8px !important;
}
.ryn-validator-icon {
  display: grid !important;
  place-items: center !important;
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  max-width: 40px !important;
  max-height: 40px !important;
  flex: 0 0 40px !important;
  border-radius: 12px !important;
  background: linear-gradient(135deg, #2563eb, #3b82f6) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28) !important;
}
.ryn-validator-icon svg {
  width: 20px !important;
  height: 20px !important;
  max-width: 20px !important;
  max-height: 20px !important;
  display: block !important;
  fill: none !important;
  stroke: #ffffff !important;
  stroke-width: 2 !important;
}
.ryn-validator-icon svg circle {
  fill: none !important;
  stroke: #ffffff !important;
}
.ryn-validator-kicker {
  display: block !important;
  font-size: 9px !important;
  font-weight: 800 !important;
  color: #2563eb !important;
  letter-spacing: 0.1em !important;
}
.ryn-validator-heading h2 {
  margin: 2px 0 0 !important;
  color: #0f172a !important;
  font-size: 16px !important;
  font-weight: 800 !important;
}
.ryn-validator-heading p {
  margin: 2px 0 0 !important;
  color: #64748b !important;
  font-size: 11px !important;
}
.uv-search-wrap{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start;margin-top:20px}
.uv-search-field{height:56px;display:flex;align-items:center;gap:12px;padding:0 16px;border:1px solid #c8d8eb;border-radius:14px;background:#fff;box-shadow:0 3px 12px #18395d0a;transition:border-color .18s,box-shadow .18s}
.uv-search-field:focus-within{border-color:#2877ef;box-shadow:0 0 0 4px #2877ef20}
.uv-search-field>svg{width:19px;flex:none;fill:none;stroke:#527092;stroke-width:1.8}
.uv-search-field input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#173656;font-family:inherit;font-size:15px;font-weight:600;line-height:1.3}
.uv-search-field input::placeholder{color:#71839a;opacity:1}
.uv-search-field input::-webkit-search-cancel-button{cursor:pointer}
.uv-search-field kbd{border:1px solid #d8e2ef;border-radius:5px;padding:2px 5px;color:#71839a;font-family:inherit;font-size:10px;font-weight:600}
.uv-search-button{height:56px;padding:0 22px;border:0;border-radius:14px;background:linear-gradient(115deg,#146bc5,#11855d);box-shadow:0 7px 18px #1978a52b;color:#fff;font-weight:750;white-space:nowrap;cursor:pointer;transition:transform .16s,filter .16s}
.uv-search-button:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.06)}.uv-search-button:disabled{opacity:.62;cursor:default}
.uv-results{position:absolute;z-index:30;top:calc(100% + 10px);left:0;right:132px;max-height:min(420px,60vh);overflow:auto;padding:8px;border:1px solid #d8e4f1;border-radius:18px;background:#fff;box-shadow:0 22px 55px #18395d25;overscroll-behavior:contain}
.uv-result{width:100%;display:grid;grid-template-columns:42px minmax(0,1fr) auto 16px;align-items:center;gap:12px;padding:12px;border:1px solid transparent;border-radius:13px;background:#fff;text-align:left;color:#183858;cursor:pointer;transition:background .15s,border-color .15s}
.uv-result+.uv-result{margin-top:5px}.uv-result:hover,.uv-result.active{border-color:#c9defa;background:#f3f8ff}
.uv-unit-icon{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:#eaf2ff;color:#236bd2}.uv-unit-icon svg{width:21px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.uv-result-copy{min-width:0;display:grid;gap:4px}.uv-result-copy strong{font-size:15px;color:#153c67}.uv-result-copy>span,.uv-result-meta>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#596f8b;font-size:11px}.uv-result-copy b{margin-right:6px;color:#8595a9;font-size:9px;letter-spacing:.07em}.uv-result-meta{display:flex;gap:16px}.uv-status{padding:6px 10px;border-radius:999px;font-size:11px;font-weight:750;white-space:nowrap}.uv-status.ok{background:#eaf8f0;color:#148257}.uv-status.warn{background:#fff4e3;color:#a56300}.uv-chevron{color:#6d88a5;font-size:17px}.uv-state{min-height:72px;display:flex;align-items:center;justify-content:center;gap:10px;padding:16px;color:#617790;font-size:13px;text-align:center}.uv-spinner{width:16px;height:16px;border:2px solid #d7e5f7;border-top-color:#2877ef;border-radius:50%;animation:uv-spin .7s linear infinite}@keyframes uv-spin{to{transform:rotate(360deg)}}
@media(max-width:640px){.uv-search-wrap{grid-template-columns:1fr;gap:8px}.uv-search-button{height:48px}.uv-results{right:0;max-height:50vh}.uv-result{grid-template-columns:36px minmax(0,1fr) auto;gap:9px;padding:10px}.uv-unit-icon{width:34px;height:34px}.uv-chevron{display:none}.uv-result-meta{gap:8px}.uv-result-copy>span,.uv-result-meta>span{font-size:10px}}
.uv-overlay{position:fixed;inset:0;z-index:100500;display:grid;place-items:center;padding:22px;background:#0c2444a6;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
.uv-dialog{width:min(980px,100%);max-height:min(850px,calc(100dvh - 44px));display:flex;flex-direction:column;gap:16px;padding:22px;border:1px solid #d8e5f2;border-radius:24px;background:linear-gradient(145deg,#fff 0%,#f8fbff 100%);box-shadow:0 34px 100px #071b3761;overflow:hidden;color:#183858}
.uv-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 0 14px;border-bottom:1px solid #e3ebf5;flex:none}
.uv-dialog-kicker{display:block;color:#758ba5;font-size:9px;font-weight:850;letter-spacing:.12em}
.uv-dialog-head h2{margin:5px 0 0;color:#183858;font-size:19px;letter-spacing:-.025em}
.uv-close{width:40px;height:40px;display:grid;place-items:center;flex:none;border:1px solid #d8e4f1;border-radius:13px;background:#f5f8fc;color:#355577;cursor:pointer;transition:background .16s,color .16s,transform .16s}
.uv-close:hover{transform:rotate(90deg);background:#eaf2fc;color:#176bc1}.uv-close svg{width:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
.uv-dialog-scroll{min-height:0;overflow:auto;padding:1px 2px 4px;scrollbar-width:thin;scrollbar-color:#c1d0e0 transparent}
.uv-identity{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;padding:18px;border:1px solid #dce7f2;border-radius:17px;background:linear-gradient(120deg,#f7faff,#fff)}
.uv-identity-main{display:flex;align-items:center;gap:13px;min-width:0}
.uv-identity-icon{width:48px;height:48px;display:grid;place-items:center;flex:none;border:1px solid #d5e5fa;border-radius:15px;background:#eaf3ff;color:#206ac2}.uv-identity-icon svg{width:23px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.uv-identity-main h3{margin:3px 0 2px;color:#14395f;font-size:25px;letter-spacing:-.04em}.uv-identity-main p{display:flex;align-items:center;gap:8px;margin:0;color:#657a94;font-size:12px}.uv-identity-main p b{color:#284768}
.uv-overall{align-self:start;padding:8px 11px;border:1px solid;border-radius:999px;font-size:10px;font-weight:850;letter-spacing:.035em;white-space:nowrap}
.uv-overall.ok{border-color:#b9e6cf;background:#ecf9f2;color:#08764b}.uv-overall.warn{border-color:#f3d39d;background:#fff7e9;color:#a36500}.uv-overall.bad{border-color:#f2c1c1;background:#fff0f0;color:#b32a2a}
.uv-identity-grid{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
.uv-identity-grid>div{min-width:0;display:grid;gap:5px;padding:10px 11px;border:1px solid #e5ecf4;border-radius:11px;background:#fff}
.uv-identity-grid span{color:#8494a8;font-size:8px;font-weight:850;letter-spacing:.08em}.uv-identity-grid b{overflow:hidden;color:#294967;font-size:11px;text-overflow:ellipsis;white-space:nowrap}
.uv-check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:13px}
.uv-check-card{position:relative;min-width:0;padding:15px;border:1px solid #dce7f1;border-radius:15px;background:#fff;box-shadow:0 5px 15px #18395d08;overflow:hidden}
.uv-check-card:before{position:absolute;inset:0 0 auto;height:3px;background:#d5dfeb;content:''}
.uv-check-card.ok:before{background:#20a56e}.uv-check-card.warn:before,.uv-check-card.pending:before{background:#eaa32b}.uv-check-card.bad:before{background:#e75454}
.uv-check-card>header{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:9px}
.uv-check-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#edf4ff;color:#2369ba}.uv-check-icon svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.uv-check-card.revisados .uv-check-icon{background:#eef1ff;color:#5b62c7}.uv-check-card.gps .uv-check-icon{background:#e8f7f7;color:#087e82}.uv-check-card.control .uv-check-icon{background:#fff0e5;color:#d76c19}
.uv-check-card>header>strong{min-width:0;color:#34506d;font-size:10px;text-transform:uppercase;letter-spacing:.06em}
.uv-check-badge{display:flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid #d8e4f0;border-radius:999px;background:#f7f9fc;color:#6b7e94;font-size:8px;font-weight:850;white-space:nowrap}
.uv-check-badge i{font-style:normal}.uv-check-card.ok .uv-check-badge{border-color:#bde7d1;background:#effaf4;color:#078254}.uv-check-card.warn .uv-check-badge,.uv-check-card.pending .uv-check-badge{border-color:#f1d49e;background:#fff8ec;color:#9b650a}.uv-check-card.bad .uv-check-badge{border-color:#f1c4c4;background:#fff2f2;color:#b53939}
.uv-check-value{display:block;margin:12px 0 8px;color:#08784f;font-size:17px;letter-spacing:-.02em}.uv-check-card.warn .uv-check-value,.uv-check-card.pending .uv-check-value{color:#9c680b}.uv-check-card.bad .uv-check-value{color:#b63838}
.uv-check-details{display:grid;gap:0}.uv-check-details>div{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid #edf1f5}.uv-check-details span{color:#7a8ca1;font-size:9px}.uv-check-details b{min-width:0;overflow:hidden;color:#38536f;font-size:10px;text-align:right;text-overflow:ellipsis;white-space:nowrap}
.uv-check-card>p{margin:9px 0 0;color:#73849a;font-size:9px;line-height:1.45}
.uv-dialog-actions{display:flex;justify-content:flex-end;gap:9px;flex:none;padding-top:13px;border-top:1px solid #e5edf5}
.uv-action{min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:0 15px;border:1px solid transparent;border-radius:11px;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;transition:transform .16s,filter .16s}
.uv-action:hover{transform:translateY(-1px);filter:brightness(1.04)}.uv-action.secondary{border-color:#d7e3f0;background:#fff;color:#375674}.uv-action.primary{background:linear-gradient(110deg,#176dc2,#087f65);box-shadow:0 6px 14px #167b7c2b;color:white}
.uv-dialog{width:min(1040px,100%);max-height:min(820px,calc(100dvh - 36px));gap:13px;padding:22px;border-radius:26px;background:radial-gradient(ellipse at 100% 0%,#eaf7f7 0,transparent 32%),linear-gradient(145deg,#fff 0%,#f8fbff 100%)}
.uv-dialog-head{padding-bottom:12px}.uv-dialog-head h2{font-size:20px}.uv-dialog-head p{margin:4px 0 0;color:#6c8199;font-size:12px;font-weight:550}
.uv-dialog-scroll{padding:2px 3px 6px;overscroll-behavior:contain}
.uv-identity{grid-template-columns:minmax(0,1fr) auto;gap:13px;padding:15px 16px;border-color:#d6e4f1;background:linear-gradient(112deg,#f0f6ff 0%,#fff 60%,#f0fbf8 100%);box-shadow:inset 3px 0 #2679d5}
.uv-identity-main{gap:12px}.uv-identity-icon{width:43px;height:43px;border:0;border-radius:14px;background:linear-gradient(145deg,#2476d2,#164b89);box-shadow:0 6px 13px #1761a72b;color:#fff}
.uv-identity-main h3{font-size:24px}.uv-identity-main p{gap:9px}.uv-plate{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid #d8e5f2;border-radius:7px;background:#fff;font-size:9px;font-weight:750;letter-spacing:.04em}.uv-plate b{color:#214f7c;font-size:11px;letter-spacing:0}.uv-divider{width:4px;height:4px;border-radius:50%;background:#a5b7c8}
.uv-overall{padding:8px 12px;font-size:10px}.uv-identity-grid{gap:8px}.uv-identity-grid>div{gap:4px;padding:9px 11px;border-color:#e1eaf3;background:#ffffffd9}.uv-identity-grid b{font-size:11px}
.uv-section-label{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:16px 2px 0}.uv-section-label span{color:#244664;font-size:10px;font-weight:900;letter-spacing:.09em}.uv-section-label small{color:#8192a6;font-size:10px}
.uv-check-grid{gap:10px;margin-top:8px}.uv-check-card{padding:13px 14px;border-radius:15px;box-shadow:0 7px 18px #18395d09;transition:transform .16s,box-shadow .16s}.uv-check-card:hover{transform:translateY(-2px);box-shadow:0 11px 22px #18395d12}
.uv-check-card:before{inset:0 auto 0 0;width:3px;height:auto;background:#8eb7e7}.uv-check-card.panapass:before{background:#2475d2}.uv-check-card.revisados:before{background:#5c63cb}.uv-check-card.gps:before{background:#0a9aa0}.uv-check-card.control:before{background:#e97921}.uv-check-card.warn:before,.uv-check-card.pending:before{background:#eaa32b}.uv-check-card.bad:before{background:#e75454}
.uv-check-card>header{grid-template-columns:34px minmax(0,1fr) auto;gap:8px}.uv-check-card>header>strong{font-size:9px;letter-spacing:.08em}.uv-check-badge{padding:5px 8px;font-size:8px}
.uv-check-value{margin:10px 0 6px;font-size:18px}.uv-check-details>div{padding:6px 0}.uv-check-details span{font-size:9px}.uv-check-details b{font-size:10px}.uv-check-card>p{margin-top:7px;font-size:9px}
.uv-dialog-actions{padding-top:11px}.uv-action{min-height:41px;border-radius:12px;font-size:11px}
.uv-dialog .uv-close{border:1px solid #d8e4f1!important;background:#f5f8fc!important;color:#355577!important;box-shadow:none!important}
.uv-dialog .uv-action.secondary{border:1px solid #d7e3f0!important;background:#fff!important;color:#375674!important;box-shadow:none!important}
.uv-dialog .uv-action.primary{border:1px solid transparent!important;background:linear-gradient(110deg,#176dc2,#087f65)!important;color:#fff!important}
.uv-identity{isolation:isolate;overflow:hidden;min-height:154px;grid-template-columns:minmax(0,1fr) auto;align-items:start;padding:19px 20px;border:0;background:radial-gradient(circle at 88% 20%,#ffffff16 0 2px,transparent 3px),radial-gradient(circle at 91% 14%,transparent 0 68px,#ffffff12 69px 70px,transparent 71px),linear-gradient(118deg,#102d50 0%,#174a76 62%,#11624f 100%);box-shadow:0 12px 28px #12345724}
.uv-identity:before{position:absolute;z-index:-1;right:-42px;top:-94px;width:230px;height:230px;border:1px solid #ffffff20;border-radius:50%;content:''}
.uv-identity-main{position:relative;z-index:1;align-items:center;gap:14px}.uv-identity-icon{width:54px;height:54px;border:1px solid #ffffff35;border-radius:17px;background:linear-gradient(145deg,#ffb22e,#f07815);box-shadow:0 8px 18px #081e3a3b;color:#173758}.uv-identity-icon svg{width:26px}
.uv-identity-main>div{display:grid;gap:2px}.uv-identity .uv-dialog-kicker{color:#b9d8ed;font-size:9px}.uv-identity-main h3{margin:0;color:#fff;font-size:32px;line-height:1.1;letter-spacing:-.045em}.uv-identity-main p{gap:10px;margin-top:4px;color:#d7e7f1;font-size:11px}
.uv-plate{padding:5px 9px;border-color:#ffffff36;background:#ffffff15;color:#d6e6f2}.uv-identity-main p .uv-plate b{color:#fff!important;font-size:12px}.uv-divider{background:#ffb42e}
.uv-overall{position:relative;z-index:1;margin:2px 0 0;padding:8px 11px;border-color:#ffffff38!important;background:#ffffff13!important;color:#fff!important;backdrop-filter:blur(5px);font-size:9px;letter-spacing:.06em}
.uv-identity-grid{position:relative;z-index:1;gap:8px}.uv-identity-grid>div{min-height:48px;gap:4px;padding:8px 10px;border-color:#ffffff24;background:#ffffff12;backdrop-filter:blur(5px)}.uv-identity-grid span{color:#b9d8ed;font-size:8px}.uv-identity-grid b{color:#fff;font-size:10px}
.uv-section-label{align-items:center;margin:17px 3px 0}.uv-section-label>div{display:grid;gap:3px}.uv-section-label span{color:#173858;font-size:10px;letter-spacing:.12em}.uv-section-label small{color:#7f90a4;font-size:10px}.uv-system-count{padding:6px 9px;border:1px solid #d9e5f0;border-radius:999px;background:#fff;color:#1f4c75;font-size:9px;letter-spacing:.06em}.uv-system-count span{color:#8194a9;font-size:8px}
.uv-check-grid{gap:11px;margin-top:9px}.uv-check-card{min-height:185px;padding:15px 16px 13px;border:1px solid #e0e8f0;border-radius:17px;background:#fff;box-shadow:0 7px 20px #112f4d0a}.uv-check-card:before{inset:0 0 auto;width:auto;height:4px;background:#2d78ce}
.uv-check-card.panapass{background:linear-gradient(145deg,#fff 0%,#f5f9ff 100%)}.uv-check-card.panapass:before{background:linear-gradient(90deg,#1674d3,#53a7ef)}.uv-check-card.revisados{background:linear-gradient(145deg,#fff 0%,#f3fbf7 100%)}.uv-check-card.revisados:before{background:linear-gradient(90deg,#078c59,#46c68d)}.uv-check-card.control{background:linear-gradient(145deg,#fff 0%,#fff8f0 100%)}.uv-check-card.control:before{background:linear-gradient(90deg,#f07815,#ffb43d)}.uv-check-card.gps{background:linear-gradient(145deg,#fff 0%,#f2fafb 100%)}.uv-check-card.gps:before{background:linear-gradient(90deg,#087e91,#36bec0)}
.uv-check-card.panapass .uv-check-icon{background:#e6f1ff;color:#176ac1}.uv-check-card.revisados .uv-check-icon{background:#e2f5eb;color:#078752}.uv-check-card.control .uv-check-icon{background:#fff0dc;color:#c9620c}.uv-check-card.gps .uv-check-icon{background:#e0f5f4;color:#087e91}
.uv-check-card>header{grid-template-columns:36px minmax(0,1fr) auto;gap:9px}.uv-check-icon{width:36px;height:36px;border-radius:12px}.uv-check-card>header>strong{color:#274563;font-size:9px}.uv-check-badge{padding:5px 8px;background:#fff;font-size:8px}
.uv-check-card.panapass .uv-check-value{color:#1769bb}.uv-check-card.revisados .uv-check-value{color:#078752}.uv-check-card.control .uv-check-value{color:#c9620c}.uv-check-card.gps .uv-check-value{color:#087e91}.uv-check-card.warn .uv-check-value,.uv-check-card.pending .uv-check-value{color:#9c680b}.uv-check-card.bad .uv-check-value{color:#b63838}
.uv-check-details>div{padding:7px 0;border-color:#e5ebf1}.uv-check-details span{color:#788ba0;font-size:9px}.uv-check-details b{color:#284865;font-size:10px}.uv-check-card>p{margin-top:9px;color:#72849a;font-size:9px}
.uv-dialog .uv-action.primary{background:linear-gradient(110deg,#f28a18,#e96b12)!important;color:#fff!important;box-shadow:0 7px 18px #dc711e32!important}.uv-dialog .uv-action.secondary{border-color:#d8e3ed!important;background:#fff!important}
.uv-dialog{max-height:min(790px,calc(100dvh - 32px));gap:10px;padding:18px}.uv-dialog-head{padding-bottom:9px}.uv-identity{min-height:132px;padding:14px 16px}.uv-identity-icon{width:46px;height:46px}.uv-identity-main h3{font-size:29px}.uv-identity-grid>div{min-height:40px;padding:7px 9px}.uv-section-label{margin-top:11px}.uv-check-grid{gap:9px;margin-top:7px}.uv-check-card{min-height:0;padding:11px 13px 9px}.uv-check-card>header{grid-template-columns:31px minmax(0,1fr) auto;gap:8px}.uv-check-icon{width:31px;height:31px;border-radius:10px}.uv-check-icon svg{width:17px;height:17px}.uv-check-badge{padding:4px 7px}.uv-check-value{margin:7px 0 4px;font-size:16px}.uv-check-details>div{padding:5px 0}.uv-check-details span{font-size:8px}.uv-check-details b{font-size:9px}.uv-check-card>p{margin-top:5px;font-size:8px}
.uv-detail-state{min-height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;color:#647a93}.uv-detail-state .uv-spinner{width:28px;height:28px;border-width:3px}.uv-detail-state>strong{color:#244766;font-size:16px}.uv-detail-state>span:last-of-type{max-width:400px;font-size:12px;line-height:1.55}.uv-detail-state.error{color:#9d4a4a}.uv-error-mark{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;background:#fff0f0;color:#bd3b3b;font-size:23px;font-weight:900}.uv-detail-state>button{min-height:38px;padding:0 14px;border:0;border-radius:10px;background:#206bc2;color:#fff;font-weight:700;cursor:pointer}
.uv-modal-enter-active,.uv-modal-leave-active{transition:opacity .18s ease}.uv-modal-enter-active .uv-dialog,.uv-modal-leave-active .uv-dialog{transition:transform .18s ease}.uv-modal-enter-from,.uv-modal-leave-to{opacity:0}.uv-modal-enter-from .uv-dialog,.uv-modal-leave-to .uv-dialog{transform:translateY(8px) scale(.99)}
@media(max-width:700px){.uv-overlay{align-items:stretch;padding:7px}.uv-dialog{width:100%;max-height:calc(100dvh - 14px);gap:10px;padding:14px;border-radius:19px}.uv-dialog-head{padding-bottom:10px}.uv-dialog-head h2{font-size:16px}.uv-close{width:36px;height:36px}.uv-identity{grid-template-columns:1fr;gap:12px;padding:13px}.uv-identity-main h3{font-size:21px}.uv-overall{justify-self:start;margin-left:61px;margin-top:-8px}.uv-identity-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.uv-identity-grid>div{padding:8px}.uv-check-grid{grid-template-columns:1fr;gap:8px;margin-top:9px}.uv-check-card{padding:12px}.uv-check-value{margin:8px 0 6px;font-size:15px}.uv-check-card>p{margin-top:7px}.uv-dialog-actions{gap:7px;padding-top:9px}.uv-action{min-height:38px;flex:1;padding:0 9px;font-size:10px}}
@media(max-width:700px){.uv-dialog{gap:9px;padding:13px}.uv-dialog-head h2{font-size:17px}.uv-dialog-head p{font-size:11px}.uv-identity{grid-template-columns:1fr auto;gap:9px;padding:11px}.uv-identity-main{gap:9px}.uv-identity-icon{width:38px;height:38px}.uv-identity-main h3{font-size:20px}.uv-identity-main p{flex-wrap:wrap;gap:6px;font-size:10px}.uv-overall{justify-self:end;margin:0;padding:6px 8px;font-size:9px}.uv-identity-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.uv-identity-grid>div{padding:7px 8px}.uv-identity-grid b{font-size:10px}.uv-section-label{align-items:flex-start;flex-direction:column;gap:3px;margin-top:12px}.uv-section-label small{font-size:9px}.uv-check-grid{grid-template-columns:1fr;gap:7px;margin-top:7px}.uv-check-card{padding:11px 12px}.uv-check-value{font-size:15px}.uv-check-details>div{padding:5px 0}.uv-dialog-actions{padding-top:8px}.uv-action{min-height:38px}}
@media(max-width:390px){.uv-dialog-actions{flex-direction:column-reverse}.uv-action{width:100%;flex:auto}.uv-identity{grid-template-columns:1fr}.uv-overall{justify-self:start;margin-left:47px}}
/* Polish the real dashboard detail modal while preserving its existing Vue flow. */
.uv-dialog{border-color:#cbdced;box-shadow:0 38px 110px #071b3770}
.uv-overall.ok{border-color:#4ad39b!important;background:#0c7a5b!important;color:#eafff6!important}
.uv-overall.warn{border-color:#ffc45c!important;background:#8a4b08!important;color:#fff5df!important}
.uv-overall.bad{border-color:#ff8f8f!important;background:#982f37!important;color:#fff0f0!important}
.uv-check-card.pending .uv-check-badge{border-color:#f4cd81;background:#fff7e6;color:#8b5700}
.uv-dialog :is(.uv-close,.uv-action):focus-visible{outline:3px solid #3987e8;outline-offset:3px}
.uv-check-card{transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
.uv-check-card:hover{border-color:#c7d9ea;box-shadow:0 12px 26px #112f4d14}
@media(prefers-reduced-motion:reduce){.uv-modal-enter-active,.uv-modal-leave-active,.uv-modal-enter-active .uv-dialog,.uv-modal-leave-active .uv-dialog{transition:none}}
/* Vue unit dossier: identity rail + focused service grid. */
.uv-dialog{width:min(1160px,100%);max-height:min(820px,calc(100dvh - 32px));gap:14px;padding:20px;border-radius:26px;background:linear-gradient(145deg,#fff 0%,#f5f9fd 100%)}
.uv-dialog-head{padding-bottom:12px}
.uv-dialog-scroll{display:grid;grid-template-columns:minmax(230px,.72fr) minmax(0,1.8fr);grid-template-rows:auto minmax(0,1fr);gap:14px;overflow:auto}
.uv-identity{grid-column:1;grid-row:1 / span 2;min-height:100%;align-content:start;grid-template-columns:1fr;gap:16px;padding:22px;border:0;border-radius:22px;background:radial-gradient(circle at 100% 0%,#2a6c8180 0 18%,transparent 18.2%),linear-gradient(155deg,#102f53 0%,#17466a 58%,#116b5a 100%);box-shadow:0 14px 32px #123b5c24;overflow:hidden}
.uv-identity:before{inset:auto -45px -50px auto;width:180px;height:180px;border:1px solid #ffffff1c;border-radius:50%;box-shadow:0 0 0 18px #ffffff08,0 0 0 38px #ffffff06;pointer-events:none}
.uv-identity-main{align-items:flex-start;flex-direction:column;gap:14px}
.uv-identity-icon{width:50px;height:50px;border-radius:16px;background:linear-gradient(145deg,#ffbd4b,#f47a12);box-shadow:0 8px 18px #071e3645;color:#143c60}
.uv-identity-main>div{min-width:0}
.uv-identity-main h3{margin-top:5px;font-size:37px;letter-spacing:-.055em}
.uv-identity-main p{gap:8px;color:#d3e2ee;font-size:11px}
.uv-plate{border:1px solid #ffffff34;background:#ffffff12;color:#d8e8f5}
.uv-plate b{color:#fff}
.uv-identity-grid{grid-template-columns:1fr;gap:8px}
.uv-identity-grid>div{min-height:0;padding:10px 11px;border-color:#ffffff26;border-radius:12px;background:#ffffff12}
.uv-identity-grid span{font-size:8px}
.uv-identity-grid b{font-size:11px}
.uv-overall{justify-self:start;grid-row:2;margin:0;padding:8px 11px;border-radius:999px!important}
.uv-section-label{grid-column:2;grid-row:1;margin:0 2px;align-self:end}
.uv-check-grid{grid-column:2;grid-row:2;grid-template-columns:repeat(2,minmax(0,1fr));align-content:stretch;gap:12px;margin:0}
.uv-check-card{min-height:190px;padding:17px 17px 14px;border-radius:19px;box-shadow:0 8px 22px #112f4d0b}
.uv-check-card>header{grid-template-columns:38px minmax(0,1fr) auto;gap:10px}
.uv-check-icon{width:38px;height:38px;border-radius:13px}
.uv-check-card>header>strong{font-size:10px;letter-spacing:.07em}
.uv-check-badge{padding:6px 9px;border-radius:999px;font-size:8px}
.uv-check-value{margin:12px 0 7px;font-size:21px;letter-spacing:-.035em}
.uv-check-details>div{padding:7px 0}
.uv-check-details span{font-size:9px}
.uv-check-details b{max-width:66%;font-size:10px}
.uv-check-card>p{margin-top:8px;font-size:9px;line-height:1.45}
.uv-dialog-actions{padding-top:12px}
.uv-extra-section{margin-top:8px;border-top:1px solid #e4ebf2;color:#264764}
.uv-extra-section>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 1px 3px;cursor:pointer;list-style:none;font-size:9px;font-weight:800}
.uv-extra-section>summary::-webkit-details-marker{display:none}
.uv-extra-section>summary>span{display:flex;align-items:center;gap:7px;color:#8293a6;font-size:8px;font-weight:650;white-space:nowrap}
.uv-extra-section>summary i{color:#176bc1;font-size:14px;font-style:normal;transition:transform .16s ease}
.uv-extra-section[open]>summary i{transform:rotate(180deg)}
.uv-extra-fields{display:grid;gap:0;padding:4px 0 2px}
.uv-extra-field{display:grid;grid-template-columns:minmax(90px,.75fr) minmax(0,1.25fr);gap:8px;padding:6px 0;border-top:1px solid #e9eef4;align-items:start}
.uv-extra-field>span{color:#7d8fa2;font-size:8px;line-height:1.4}
.uv-extra-field>b{min-width:0;color:#274865;font-size:9px;line-height:1.4;overflow-wrap:anywhere}
.uv-extra-field>b>small{display:block;margin-bottom:2px;color:#8b9bad;font-size:7px;letter-spacing:.07em}
.uv-extra-field.has-reference{grid-template-columns:1fr 1fr}
.uv-extra-field.has-reference>span,.uv-extra-field.has-reference>em{grid-column:1/-1}
.uv-extra-field>em{justify-self:start;padding:2px 6px;border-radius:999px;background:#eef3f7;color:#687d91;font-size:7px;font-style:normal;font-weight:750}
.uv-extra-field.match>em{background:#e8f7ef;color:#16805a}.uv-extra-field.diff>em{background:#fff0e9;color:#bc4e25}.uv-extra-field.missing>em{background:#f0f3f6;color:#758397}
.uv-extra-section :is(summary,button):focus-visible{outline:2px solid #3987e8;outline-offset:2px;border-radius:5px}
@media(max-width:760px){.uv-dialog-scroll{display:flex;flex-direction:column;gap:12px}.uv-identity{min-height:0;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:15px}.uv-identity-main{flex-direction:row;align-items:center;gap:11px}.uv-identity-icon{width:40px;height:40px}.uv-identity-main h3{font-size:25px}.uv-identity-grid{grid-column:1/-1;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.uv-identity-grid>div{padding:8px}.uv-overall{grid-column:2;grid-row:1;align-self:start;justify-self:end}.uv-section-label{align-items:center;flex-direction:row;margin:0}.uv-check-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.uv-check-card{min-height:165px;padding:12px}.uv-check-card>header{grid-template-columns:30px minmax(0,1fr);gap:7px}.uv-check-icon{width:30px;height:30px}.uv-check-badge{grid-column:2;justify-self:start}.uv-check-value{margin:9px 0 5px;font-size:17px}.uv-check-details>div{gap:8px}.uv-check-details b{max-width:62%;font-size:9px}}
@media(max-width:480px){.uv-dialog{padding:12px;border-radius:20px}.uv-check-grid{grid-template-columns:1fr}.uv-check-card{min-height:0}.uv-identity-grid{grid-template-columns:1fr 1fr}.uv-dialog-actions{flex-direction:column-reverse}.uv-action{width:100%;flex:auto}}
/* Service dossier: compact identity header, readable cards, and accordions that never clip. */
.uv-dialog{width:min(1280px,100%);max-height:min(900px,calc(100dvh - 32px));padding:20px;gap:12px}
.uv-dialog-scroll{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto;align-content:start;gap:12px;overflow:auto;overscroll-behavior:contain}
.uv-identity{grid-column:1;grid-row:auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px 18px;padding:16px 19px;border-radius:18px}
.uv-identity-main{grid-column:1;grid-row:1;align-items:center;flex-direction:row;gap:13px}
.uv-identity-icon{width:44px;height:44px;flex:none;border-radius:14px}
.uv-identity-main>div{display:grid;gap:2px}
.uv-identity-main h3{margin:0;font-size:30px}
.uv-identity-main p{margin-top:3px}
.uv-overall{grid-column:2;grid-row:1;justify-self:end;align-self:center;margin:0}
.uv-identity-grid{grid-column:1/-1;grid-row:2;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.uv-identity-grid>div{min-height:42px;padding:8px 10px}
.uv-section-label{grid-column:1;grid-row:auto;margin:0 2px;align-self:center}
.uv-check-grid{grid-column:1;grid-row:auto;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:min-content;align-content:start;gap:11px;margin:0}
.uv-check-card{min-height:0;align-self:start;padding:15px 16px 13px;overflow:visible}
.uv-check-card:hover{transform:none}
.uv-extra-section{overflow:visible}
.uv-extra-section[open]{padding-bottom:3px}
.uv-extra-fields{max-height:none;overflow:visible}
.uv-extra-field{grid-template-columns:minmax(110px,.8fr) minmax(0,1.2fr);padding:7px 0}
.uv-extra-field>span{font-size:9px}
.uv-extra-field>b{font-size:10px}
.uv-dialog-actions{padding-top:10px}
@media(max-width:760px){.uv-dialog{padding:15px}.uv-dialog-scroll{display:grid;grid-template-columns:1fr;gap:10px}.uv-identity{grid-template-columns:minmax(0,1fr) auto;padding:13px}.uv-identity-main{grid-column:1;grid-row:1;flex-direction:row;align-items:center}.uv-identity-main h3{font-size:24px}.uv-overall{grid-column:2;grid-row:1;justify-self:end;margin:0}.uv-identity-grid{grid-column:1/-1;grid-row:2;grid-template-columns:repeat(2,minmax(0,1fr))}.uv-section-label{margin:0 2px}.uv-check-grid{grid-template-columns:1fr;gap:9px}.uv-check-card{min-height:0}.uv-check-card>header{grid-template-columns:34px minmax(0,1fr) auto}.uv-check-icon{width:34px;height:34px}.uv-check-badge{grid-column:auto;justify-self:end}.uv-check-value{font-size:19px}}
@media(max-width:480px){.uv-dialog{padding:12px}.uv-identity{grid-template-columns:1fr auto;padding:11px}.uv-identity-main{grid-column:1;grid-row:1;flex-direction:row}.uv-identity-main h3{font-size:21px}.uv-overall{grid-column:2;grid-row:1}.uv-identity-grid{grid-template-columns:1fr 1fr}.uv-check-card{padding:12px}.uv-extra-field{grid-template-columns:minmax(90px,.8fr) minmax(0,1.2fr)}}
/* Match the independent validator's unit-first header and four service columns. */
.uv-dialog{width:min(1680px,calc(100vw - 36px));max-height:min(920px,calc(100dvh - 32px));padding:20px}
.uv-dialog-scroll{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto;align-content:start;gap:13px;overflow:auto}
.uv-identity{grid-column:1;grid-row:auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px 18px;padding:18px 22px;border:1px solid #d8e4f0;border-radius:18px;background:#fff!important;box-shadow:0 5px 16px #17395d0a;overflow:visible}
.uv-identity:before{display:none}
.uv-identity-main{grid-column:1;grid-row:1;display:flex;align-items:flex-start;flex-direction:column;gap:2px}
.uv-identity-icon{display:none}
.uv-identity .uv-dialog-kicker{color:#7186a0;font-size:9px}
.uv-identity-main h3{margin:0;color:#123862;font-size:36px;line-height:1.08}
.uv-identity-main p{margin:3px 0 0;color:#5e7691;font-size:12px}
.uv-plate{border-color:#dce7f2;background:#f7faff;color:#7186a0}
.uv-identity-main p .uv-plate b{color:#183d65!important}
.uv-overall{grid-column:2;grid-row:1;justify-self:end;align-self:start;margin:2px 0 0;border-color:#f3d8b6!important;background:#fff2e1!important;color:#92520b!important;backdrop-filter:none}
.uv-identity-grid{grid-column:1/-1;grid-row:2;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.uv-identity-grid>div{min-height:0;padding:8px 10px;border-color:#e3eaf1;background:#fff;backdrop-filter:none}
.uv-identity-grid span{color:#788da4}.uv-identity-grid b{color:#183d65}
.uv-section-label{grid-column:1;grid-row:auto;margin:0 2px;align-self:center}
.uv-check-grid{grid-column:1;grid-row:auto;grid-template-columns:repeat(4,minmax(0,1fr));align-content:start;gap:12px;margin:0}
.uv-check-card{order:0;min-height:240px;align-self:start;padding:17px 16px 14px;border-radius:17px;overflow:visible}
.uv-check-card.gps{order:3}.uv-check-card.control{order:4}
.uv-check-card>header{grid-template-columns:34px minmax(0,1fr) auto;gap:8px}
.uv-check-value{font-size:22px}
.uv-dialog-actions{padding-top:11px}
@media(max-width:1240px){.uv-dialog{width:min(1100px,calc(100vw - 28px))}.uv-check-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.uv-check-card{min-height:200px}}
@media(max-width:700px){.uv-dialog{width:100%;max-height:calc(100dvh - 14px);padding:14px}.uv-identity{grid-template-columns:minmax(0,1fr) auto;padding:13px}.uv-identity-main{grid-column:1;grid-row:1;align-items:flex-start;flex-direction:column}.uv-identity-main h3{font-size:27px}.uv-overall{grid-column:2;grid-row:1;justify-self:end}.uv-identity-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.uv-check-grid{grid-template-columns:1fr;gap:9px}.uv-check-card{min-height:0;padding:13px}.uv-check-value{font-size:19px}}
.uv-recent{display:flex;align-items:center;gap:8px;margin:10px 0 0;color:#6f8298;font-size:11px}
.uv-recent button{min-height:27px;padding:3px 10px;border:1px solid #d7e2ef;border-radius:999px;background:#fff;color:#24466a;font:inherit;font-weight:700;cursor:pointer}
.uv-recent button:hover{border-color:#aac5e5;background:#f6faff}
.uv-dialog{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.uv-check-card{align-self:stretch;min-height:240px;padding:0;border-width:1px;transition:border-color .16s,box-shadow .16s}
.uv-check-card.selected{border:2px solid #183f79;box-shadow:0 8px 20px #102f4d16}
.uv-card-select{width:100%;height:100%;min-height:inherit;display:flex;flex-direction:column;align-items:stretch;padding:17px 16px 14px;border:0;border-radius:inherit;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.uv-card-select:focus-visible{outline:3px solid #3d83dc;outline-offset:2px}
.uv-card-select>header{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:8px}
.uv-card-select>header>strong{min-width:0;color:#34506d;font-size:9px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
.uv-card-select .uv-check-value{margin:13px 0 5px}
.uv-card-select .uv-check-details{margin-top:2px}
.uv-card-select>p{margin:8px 0 0}
.uv-card-more{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:auto;padding-top:10px;color:#58718d;font-size:9px;font-weight:750}
.uv-card-more i{color:#176bc1;font-size:14px;font-style:normal}
.uv-active-detail{padding:18px 20px;border:1px solid #dbe6f1;border-radius:17px;background:#fff;box-shadow:0 7px 20px #112f4d0a}
.uv-active-detail>header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:11px;border-bottom:1px solid #e3ebf3}
.uv-active-detail>header>div>span{color:#748aa2;font-size:9px;font-weight:850;letter-spacing:.1em}
.uv-active-detail h3{margin:4px 0 0;color:#173c65;font-size:20px}
.uv-active-detail>p{margin:11px 0;color:#6f8298;font-size:11px}
.uv-active-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}
.uv-active-facts>div{min-width:0;display:grid;gap:5px;padding:9px 10px;border:1px solid #e3ebf3;border-radius:9px;background:#f8fbfe}
.uv-active-facts span{color:#7d90a5;font-size:9px}
.uv-active-facts b{overflow-wrap:anywhere;color:#264868;font-size:10px}
.uv-active-detail .uv-extra-section{margin-top:0}
.uv-active-detail .uv-extra-section>summary{padding:11px 1px 5px;font-size:10px}
.uv-no-extra{padding:12px 0;color:#7c8fa5;font-size:11px}
@media(max-width:1240px){.uv-check-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.uv-card-select{min-height:200px}}
@media(max-width:700px){.uv-card-select{min-height:0;padding:13px}.uv-active-detail{padding:14px}.uv-active-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.uv-recent{flex-wrap:wrap}}
@media(max-width:480px){.uv-check-grid{grid-template-columns:1fr}.uv-card-select{min-height:0}.uv-active-detail>header{align-items:flex-start;flex-direction:column}}
/* Keep the embedded Vue modal independent from the portal's legacy theme rules. */
.uv-dialog-scroll{display:flex!important;flex-direction:column!important;gap:12px!important}
.uv-identity{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto auto!important;flex:none!important;min-height:0!important}
.uv-identity-main{grid-column:1!important;grid-row:1!important}
.uv-identity-grid{grid-column:1/-1!important;grid-row:2!important;position:static!important}
.uv-section-label{flex:none!important;margin:0 2px!important}
.uv-check-grid{display:grid!important;flex:none!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;margin:0!important}
.uv-check-card{min-width:0!important;min-height:240px!important;padding:0!important;overflow:hidden!important;color:#163a60!important}
.uv-check-card.panapass{background:#f5f9ff!important}
.uv-check-card.revisados{background:#f3fbf7!important}
.uv-check-card.gps{background:#f2fafb!important}
.uv-check-card.control{background:#fff8f0!important}
.uv-check-card.selected{border:2px solid #2d6fc3!important;box-shadow:0 8px 22px #173e671c!important}
.uv-card-select{width:100%!important;min-height:inherit!important;height:100%!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;padding:17px 16px 14px!important;border:0!important;background:transparent!important;color:#163a60!important;text-align:left!important}
.uv-card-select:hover{background:transparent!important;color:#163a60!important;transform:none!important}
.uv-card-select>header>strong{color:#34506d!important}
.uv-card-select .uv-check-value{margin:13px 0 5px!important}
.uv-card-select .uv-check-details span{color:#71849a!important}
.uv-card-select .uv-check-details b{color:#284865!important}
.uv-card-select>p{color:#71849a!important}
@media(max-width:1240px){.uv-check-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.uv-check-card{min-height:200px!important}.uv-card-select{min-height:200px!important}}
@media(max-width:700px){.uv-identity{grid-template-columns:minmax(0,1fr) auto!important;padding:13px!important}.uv-identity-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.uv-check-grid{grid-template-columns:1fr!important;gap:9px!important}.uv-check-card,.uv-card-select{min-height:0!important}.uv-card-select{padding:13px!important}}
</style>
