<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ModuleIcon from '../components/ModuleIcon.vue'

import { applyValidatorSections, type Unit, type UnitDetail as Detail } from '../validatorDetails'
type Api = { search: (query: string) => Promise<Unit[]>; load: (unit: Unit) => Promise<Detail>; enrich?: (detail: Detail) => Promise<Detail>; ficha?: (unit: Unit) => Promise<Unit> }
const props = defineProps<{ api: Api; access: 'allowed' | 'denied' }>()
const query = ref('')
const rows = ref<Unit[]>([])
const selected = ref<Unit | null>(null)
const detail = ref<Detail | null>(null)
const busy = ref(false)
const searching = ref(false)
const searched = ref(false)
const open = ref(false)
const error = ref('')
const enriching = ref(false)
const expanded = ref<string | null>(null)
const fichaError = ref('')
let fichaData: Unit | null = null
let fichaRequested = false
const input = ref<HTMLInputElement>()
const unitLabel = (row: Unit) => String(row.unidad ?? row.unit ?? 'Unidad')
const plateLabel = (row: Unit) => String(row.placa_unica ?? row.placa ?? row.placa_comercial ?? '—')
const ownerLabel = (row: Unit) => String(row.empresa_duena ?? row.empresa_operadora ?? row.empresa ?? 'Empresa no registrada')
const statusLabel = (row: Unit) => String(row.estatus ?? row.estado ?? 'Sin estado')
const statusTone = (value: string) => /activo|activa|operativo/i.test(value) ? 'ok' : 'warn'
const overallTone = computed(() => !detail.value?.active ? 'bad' : detail.value.cards.some(card => card.tone !== 'ok') ? 'warn' : 'ok')
let timer = 0
let searchVersion = 0
let detailVersion = 0

async function runSearch() {
  window.clearTimeout(timer)
  const term = query.value.trim()
  if (term.length < 2) { rows.value = []; searched.value = false; open.value = false; return }
  const version = ++searchVersion
  searching.value = true; searched.value = false; error.value = ''; open.value = true
  try {
    const result = await props.api.search(term)
    if (version !== searchVersion) return
    rows.value = Array.isArray(result) ? result : []
    searched.value = true
    if (rows.value.length === 1) await choose(rows.value[0]!)
  } catch (reason) {
    if (version === searchVersion) { rows.value = []; searched.value = true; error.value = reason instanceof Error ? reason.message : String(reason) }
  } finally { if (version === searchVersion) searching.value = false }
}
async function choose(row: Unit) {
  const version = ++detailVersion
  expanded.value = null; fichaData = null; fichaRequested = false; fichaError.value = ''; enriching.value = false
  selected.value = row; detail.value = null; busy.value = true; error.value = ''; open.value = false
  try {
    const result = await props.api.load(row)
    if (version !== detailVersion) return
    applyValidatorSections(result)
    detail.value = result
    busy.value = false
    if (props.api.enrich) {
      enriching.value = true
      void props.api.enrich(result).then(updated => {
        if (version !== detailVersion) return
        applyValidatorSections(updated, fichaData); detail.value = updated
      }).catch(() => { if (version === detailVersion) fichaError.value = 'No se pudieron actualizar todos los servicios.' })
        .finally(() => { if (version === detailVersion) enriching.value = false })
    }
  }
  catch (reason) { if (version === detailVersion) error.value = reason instanceof Error ? reason.message : String(reason) }
  finally { if (version === detailVersion) busy.value = false }
}
async function toggleCard(key: string) {
  expanded.value = expanded.value === key ? null : key
  if (!expanded.value || fichaRequested || !props.api.ficha || !selected.value) return
  fichaRequested = true
  const version = detailVersion
  try {
    const ficha = await props.api.ficha(selected.value)
    if (version !== detailVersion || !detail.value) return
    fichaData = ficha; fichaError.value = ''; applyValidatorSections(detail.value, ficha)
  } catch {
    if (version === detailVersion) { fichaRequested = false; fichaError.value = 'Ficha complementaria no disponible. Puedes volver a abrir el detalle para reintentar.' }
  }
}
function reset() {
  expanded.value = null; enriching.value = false; fichaError.value = ''; searching.value = false
  ++searchVersion; ++detailVersion; selected.value = null; detail.value = null; busy.value = false; error.value = ''; query.value = ''; rows.value = []; searched.value = false; open.value = false
  window.setTimeout(() => input.value?.focus({ preventScroll: true }), 30)
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') { event.preventDefault(); void runSearch() }
  if (event.key === 'Escape') { open.value = false; if (selected.value) reset() }
  if (event.key === 'ArrowDown' && rows.value.length) { event.preventDefault(); document.querySelector<HTMLButtonElement>('.vua-result')?.focus() }
}
watch(query, value => {
  window.clearTimeout(timer)
  ++searchVersion; rows.value = []; searched.value = false; error.value = ''
  if (value.trim().length < 2) { open.value = false; searching.value = false; return }
  open.value = true
  timer = window.setTimeout(() => { void runSearch() }, 260)
})
function outside(event: PointerEvent) { if (!(event.target as HTMLElement | null)?.closest('.vua-search')) open.value = false }
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => { window.clearTimeout(timer); ++searchVersion; ++detailVersion; document.removeEventListener('pointerdown', outside) })
</script>

<template>
  <main class="vua-app" data-testid="vue-unit-validator" :class="{ 'is-denied': access === 'denied', 'has-selection': !!selected }">
    <section v-if="access === 'denied'" class="vua-denied" role="alert">
      <span class="vua-denied-mark">!</span><span class="vua-kicker">ACCESO DE OPERACIÓN</span>
      <h1>Acceso restringido</h1><p>Tu usuario no tiene habilitado el permiso de Validador de Unidad.</p>
    </section>
    <template v-else>
      <header v-if="!selected" class="vua-heading">
        <div><span class="vua-kicker">CONSULTA INTEGRAL DE FLOTA</span><h1>{{ selected ? 'Ficha de unidad' : 'Validador de unidad' }}</h1><p>{{ selected ? 'Estado operativo y servicios conectados en un solo lugar.' : 'Encuentra una unidad por número, placa o Panapass.' }}</p></div>
        <span class="vua-live"><i></i>Datos en línea</span>
      </header>

      <section v-if="!selected" class="vua-search" aria-label="Buscar unidad">
        <div class="vua-search-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/></svg></div>
        <div class="vua-search-body">
          <label for="vua-query">Búsqueda rápida</label>
          <input id="vua-query" ref="input" v-model="query" type="search" placeholder="Escribe unidad, placa o número Panapass" autocomplete="off" aria-label="Buscar unidad, placa o Panapass" :aria-expanded="open" @focus="open = rows.length > 0 || searching" @keydown="onKeydown">
          <span class="vua-search-hint">Mínimo 2 caracteres <kbd>↵</kbd></span>
        </div>
        <button class="vua-search-action" type="button" :disabled="query.trim().length < 2 || searching" @click="runSearch"><span v-if="searching" class="vua-spinner"></span><span v-else>Buscar unidad</span><span aria-hidden="true">→</span></button>
        <div v-if="open && (searching || searched || rows.length)" class="vua-results" role="listbox" aria-label="Resultados de búsqueda">
          <div class="vua-results-top"><strong>{{ searching ? 'Buscando en la flota…' : `${rows.length} ${rows.length === 1 ? 'resultado' : 'resultados'}` }}</strong><button type="button" aria-label="Cerrar resultados" @click="open = false">×</button></div>
          <div v-if="searching" class="vua-result-message"><span class="vua-spinner"></span>Consultando unidades disponibles</div>
          <div v-else-if="error" class="vua-result-message error">{{ error }}</div>
          <div v-else-if="!rows.length" class="vua-result-message">No encontramos unidades. Prueba con otra placa o Panapass.</div>
          <button v-for="row in rows" v-else :key="`${unitLabel(row)}-${plateLabel(row)}`" type="button" class="vua-result" role="option" @click="choose(row)">
            <span class="vua-result-avatar">{{ unitLabel(row).slice(0, 1) }}</span><span class="vua-result-copy"><strong>{{ unitLabel(row) }}</strong><small><b>{{ ownerLabel(row) }}</b><span>Placa {{ plateLabel(row) }} · Panapass {{ row.panapass_numero ?? '—' }}</span></small></span><span class="vua-state-chip" :class="statusTone(statusLabel(row))">{{ statusLabel(row) }}</span><span class="vua-result-arrow">↗</span>
          </button>
        </div>
      </section>

      <section v-if="busy" class="vua-loading"><span class="vua-spinner"></span><div><strong>Validando unidad</strong><p>Consultando Control de Auto, Panapass, Revisados y GPS.</p></div></section>
      <section v-else-if="selected && detail" class="vua-content">
        <section class="vua-identity">
          <div class="vua-identity-top"><div class="vua-unit-title"><h2>{{ detail.unit }}</h2><p>Placa {{ detail.plate }}</p></div><span class="vua-overall" :class="overallTone"><i></i>{{ detail.status }}</span><button class="vua-unit-close" type="button" aria-label="Cerrar ficha" @click="reset">×</button></div>
          <div class="vua-identity-facts"><div><span>SUPERVISORA</span><strong>{{ detail.supervisor }}</strong></div><div><span>GALERA</span><strong>{{ detail.galera }}</strong></div><div><span>EMPRESA</span><strong>{{ detail.operator }}</strong></div><div><span>ESTATUS INTERNO</span><strong>{{ detail.status.includes('·') ? detail.status.split('·').slice(1).join('·').trim() : detail.active ? 'ACTIVO' : detail.status }}</strong></div></div>
        </section>
        <div class="vua-section-head"><div><span class="vua-kicker">ESTADO POR SISTEMA</span><h2>Resumen operativo</h2></div><span>{{ detail.cards.length }} sistemas consultados</span></div>
        <section class="vua-card-grid" aria-label="Estado por sistema">
          <article v-for="card in detail.cards" :key="card.key" class="vua-card" :class="[card.key, card.tone]">
            <header><span class="vua-module-icon"><ModuleIcon :name="card.key" /></span><div class="vua-card-heading"><span class="vua-kicker">{{ card.title }}</span></div><span class="vua-card-status" :class="card.tone"><i>{{ card.tone === 'ok' ? '✓' : card.tone === 'warn' || card.tone === 'bad' ? '!' : '…' }}</i>{{ card.badge }}</span></header>
            <strong class="vua-card-value">{{ card.value }}</strong><div class="vua-card-facts"><div v-for="item in card.details" :key="item.label"><span>{{ item.label }}</span><b>{{ item.value }}</b></div></div><p>{{ card.note }}</p>
            <button type="button" class="vua-detail-toggle" :aria-expanded="expanded === card.key" :aria-controls="`vua-details-${card.key}`" @click="toggleCard(card.key)">{{ expanded === card.key ? 'Cerrar detalles' : 'Ver detalles' }} <span aria-hidden="true">{{ expanded === card.key ? '−' : '+' }}</span></button>
            <div v-if="expanded === card.key" :id="`vua-details-${card.key}`" class="vua-detail-panel">
              <section v-for="section in card.sections" :key="section.title"><h3>{{ section.title }}</h3><dl><div v-for="field in section.fields" :key="field.label" :class="field.comparison"><dt>{{ field.label }}</dt><dd>{{ field.value }}</dd><dd v-if="field.reference !== undefined"><small>eCarCheck</small> {{ field.reference }} <em>{{ field.comparison === 'match' ? 'Coincide' : field.comparison === 'diff' ? 'Diferencia' : 'Sin comparar' }}</em></dd></div></dl></section>
              <p v-if="!card.sections?.length">No hay información complementaria disponible.</p>
              <p v-if="fichaError" role="status">{{ fichaError }}</p>
            </div>
          </article>
        </section>
      </section>
      <section v-else-if="!selected" class="vua-empty"><div class="vua-empty-art"><span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15h18l-1.7-5a2 2 0 0 0-1.9-1.4H6.6A2 2 0 0 0 4.7 10L3 15Zm0 0v4h2v-2h14v2h2v-4M7 15h.01M17 15h.01M8 8.5l1.2-3h5.6l1.2 3"/></svg></div><span class="vua-kicker">VISTA DE FLOTA</span><h2>Todo sobre una unidad, de un vistazo.</h2><p>Busca una unidad para consultar su información y validar sus sistemas operativos.</p><div class="vua-empty-points"><span><i>✓</i> Control de Auto</span><span><i>✓</i> Panapass y Revisados</span><span><i>✓</i> GPS disponible</span></div></section>
      <section v-if="error && selected && !busy" class="vua-error" role="alert"><strong>No se pudo completar la consulta</strong><span>{{ error }}</span><button type="button" @click="reset">Intentar otra unidad</button></section>
      <footer v-if="selected" class="vua-footer"><span><i></i>{{ busy ? 'Consultando unidad…' : enriching ? 'Actualizando servicios…' : 'Consulta disponible' }} · {{ detail?.cards.length ?? 0 }} servicios</span><button type="button" @click="reset"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7v5h5M5.6 16a8 8 0 1 0-.6-6"/></svg>Otra unidad</button></footer>
    </template>
  </main>
</template>

<style scoped>
.vua-app{--ink:#142e4d;--muted:#74849b;--line:#e3eaf3;--blue:#286de1;--green:#0c9264;min-height:100%;padding:clamp(22px,4vw,52px);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:radial-gradient(ellipse at 92% 0%,#e5f2ff 0,transparent 29%),linear-gradient(145deg,#f7faff 0%,#f2f6fc 58%,#f5f8fc 100%);box-sizing:border-box}
.vua-heading{max-width:1320px;margin:0 auto 26px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px}.vua-kicker{display:block;color:#8393aa;font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.vua-heading h1{margin:5px 0 3px;font-size:clamp(23px,3vw,32px);letter-spacing:-.045em;color:#132f53}.vua-heading p{margin:0;color:var(--muted);font-size:13px}.vua-live{display:flex;align-items:center;gap:8px;padding:8px 11px;border:1px solid #d5eee5;border-radius:99px;background:#f2fbf7;color:#187c5c;font-size:11px;font-weight:750;white-space:nowrap}.vua-live i,.vua-footer>span i{width:7px;height:7px;border-radius:50%;background:#23b982;box-shadow:0 0 0 3px #23b9821b}
.vua-search{position:relative;z-index:4;max-width:1320px;margin:0 auto 22px;display:grid;grid-template-columns:46px minmax(0,1fr) auto;align-items:center;gap:14px;padding:13px 15px;border:1px solid #dbe6f1;border-radius:19px;background:#fff;box-shadow:0 10px 28px #17395d0a}.vua-search-icon{width:43px;height:43px;display:grid;place-items:center;border-radius:14px;background:#edf4ff;color:#316bce}.vua-search-icon svg{width:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}.vua-search-body{min-width:0;display:grid;grid-template-columns:1fr auto;align-items:center;gap:3px 10px}.vua-search-body label{grid-column:1/-1;color:#5e7189;font-size:10px;font-weight:750}.vua-search-body input{width:100%;min-width:0;height:32px;border:0;outline:0;background:transparent;color:#183858;font:inherit;font-size:14px;font-weight:600}.vua-search-body input::placeholder{color:#94a1b2;font-weight:450}.vua-search-hint{display:flex;align-items:center;gap:7px;color:#9ba7b6;font-size:9px;white-space:nowrap}.vua-search-hint kbd{padding:2px 5px;border:1px solid #e2e8f0;border-radius:5px;background:#f8fafc;color:#718198;font:inherit}.vua-search-action{height:45px;display:flex;align-items:center;justify-content:center;gap:10px;padding:0 17px;border:0;border-radius:12px;background:linear-gradient(110deg,#216cce,#118766);box-shadow:0 6px 14px #176bb526;color:#fff;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.vua-search-action:disabled{opacity:.62;cursor:default}.vua-results{position:absolute;top:calc(100% + 8px);left:0;right:0;max-height:min(390px,54vh);overflow:auto;padding:9px;border:1px solid #dce6f0;border-radius:17px;background:#fff;box-shadow:0 22px 50px #18365626}.vua-results-top{display:flex;justify-content:space-between;align-items:center;padding:4px 6px 8px;color:#6c7e94;font-size:11px}.vua-results-top button{width:25px;height:25px;border:0;border-radius:8px;background:#f3f6fa;color:#64768e;font-size:18px;cursor:pointer}.vua-result{width:100%;display:grid;grid-template-columns:38px minmax(0,1fr) auto 18px;align-items:center;gap:11px;padding:11px 10px;border:1px solid transparent;border-radius:12px;background:#fff;text-align:left;color:var(--ink);cursor:pointer}.vua-result:hover,.vua-result:focus-visible{border-color:#d6e5f7;background:#f7faff;outline:0}.vua-result+.vua-result{margin-top:4px}.vua-result-avatar{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;background:#eaf2ff;color:#2768cf;font-size:15px;font-weight:850}.vua-result-copy{display:grid;gap:3px;min-width:0}.vua-result-copy>strong{font-size:13px}.vua-result-copy small{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:8px;color:#718198;font-size:10px}.vua-result-copy small>*{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vua-state-chip{padding:5px 8px;border-radius:99px;font-size:10px;font-weight:750}.vua-state-chip.ok{background:#eaf8f1;color:#13805b}.vua-state-chip.warn{background:#fff5e6;color:#a8660c}.vua-result-arrow{color:#8b9bb0}.vua-result-message{min-height:70px;display:flex;align-items:center;justify-content:center;gap:10px;color:#6f8095;font-size:12px}.vua-result-message.error{color:#b14b4b}
.vua-content{max-width:1320px;margin:0 auto}.vua-identity{padding:22px 24px 20px;border:1px solid #d9e5f1;border-radius:20px;background:linear-gradient(115deg,#fff 0%,#f8fbff 65%,#f0f8f7 100%);box-shadow:0 10px 24px #14395d0a}.vua-identity-top{display:flex;align-items:center;gap:14px}.vua-unit-symbol{width:50px;height:50px;display:grid;place-items:center;border-radius:15px;background:#e8f1ff;color:#2467c4}.vua-unit-symbol svg{width:25px;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}.vua-unit-title{min-width:0}.vua-unit-title h2{margin:2px 0 0;color:#123d71;font-size:26px;letter-spacing:-.04em}.vua-unit-title p{margin:2px 0 0;color:#7b899c;font-size:11px}.vua-unit-title p b{color:#435c7a}.vua-overall{margin-left:auto;display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid;border-radius:99px;font-size:10px;font-weight:800}.vua-overall i{width:7px;height:7px;border-radius:50%;background:currentColor}.vua-overall.ok{border-color:#c7eadb;background:#effaf5;color:#11805b}.vua-overall.warn{border-color:#f3dfb9;background:#fff9ed;color:#a8660c}.vua-overall.bad{border-color:#f1cccc;background:#fff4f4;color:#b74444}.vua-identity-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:19px}.vua-identity-facts>div{min-width:0;padding:11px 12px;border:1px solid #e5ebf3;border-radius:11px;background:#ffffffb8}.vua-identity-facts span,.vua-identity-facts strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vua-identity-facts span{color:#8998aa;font-size:8px;font-weight:850;letter-spacing:.1em}.vua-identity-facts strong{margin-top:5px;color:#294667;font-size:11px}.vua-section-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin:24px 2px 12px}.vua-section-head h2{margin:3px 0 0;font-size:17px;letter-spacing:-.025em}.vua-section-head>span{color:#8493a7;font-size:10px}.vua-card-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.vua-card{min-width:0;padding:17px;border:1px solid #dce6f0;border-radius:17px;background:#fff;box-shadow:0 8px 22px #17395d08}.vua-card.panapass{border-top:3px solid #3279d8}.vua-card.revisados{border-top:3px solid #765bd4}.vua-card.control{border-top:3px solid #ee872f}.vua-card.gps{border-top:3px solid #18a9aa}.vua-card header{display:flex;align-items:center;gap:9px}.vua-module-icon{width:35px;height:35px;display:grid;place-items:center;flex:none;border-radius:11px;background:#edf4ff;color:#286ac9}.vua-card.revisados .vua-module-icon{background:#f2efff;color:#7056ca}.vua-card.control .vua-module-icon{background:#fff2e7;color:#d77524}.vua-card.gps .vua-module-icon{background:#eaf8f7;color:#128c91}.vua-module-icon :deep(svg){width:19px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.vua-card-heading{display:grid;gap:3px;min-width:0}.vua-card-heading .vua-kicker{font-size:8px;color:#70839a;letter-spacing:.08em}.vua-card-heading>b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#28445f;font-size:10px}.vua-card-status{width:23px;height:23px;display:grid;place-items:center;margin-left:auto;border-radius:50%;font-size:11px;font-weight:900}.vua-card-status.ok{background:#e9f8f0;color:#0e9562}.vua-card-status.warn,.vua-card-status.pending{background:#fff5e5;color:#b67612}.vua-card-status.bad{background:#fff0ef;color:#cf4a42}.vua-card-value{display:block;min-height:33px;margin:15px 0 10px;color:#0c805d;font-size:20px;letter-spacing:-.03em;overflow-wrap:anywhere}.vua-card.bad .vua-card-value{color:#bd4a45}.vua-card.warn .vua-card-value,.vua-card.pending .vua-card-value{color:#a56b18}.vua-card-facts{display:grid;gap:0;border-top:1px solid #edf1f5}.vua-card-facts>div{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #edf1f5}.vua-card-facts span{color:#8290a3;font-size:9px}.vua-card-facts b{max-width:60%;color:#405773;font-size:9px;text-align:right;overflow-wrap:anywhere}.vua-card>p{min-height:28px;margin:10px 0 0;color:#8592a2;font-size:9px;line-height:1.5}.vua-loading{max-width:1320px;min-height:120px;margin:auto;display:flex;align-items:center;justify-content:center;gap:13px;border:1px solid var(--line);border-radius:18px;background:#fff}.vua-loading strong{font-size:13px}.vua-loading p{margin:4px 0 0;color:var(--muted);font-size:11px}.vua-spinner{width:15px;height:15px;border:2px solid #dce8f5;border-top-color:#2d78db;border-radius:50%;animation:vua-spin .7s linear infinite}@keyframes vua-spin{to{transform:rotate(360deg)}}
.vua-empty{max-width:1320px;min-height:290px;margin:0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center;border:1px solid #e0e8f1;border-radius:22px;background:linear-gradient(145deg,#fff,#f5f9ff);box-shadow:0 10px 28px #14395d08}.vua-empty-art{width:72px;height:72px;position:relative;display:grid;place-items:center;margin-bottom:16px;border-radius:22px;background:linear-gradient(145deg,#edf5ff,#e9f8f5);color:#3677cf}.vua-empty-art svg{position:relative;width:34px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.vua-empty-art span{position:absolute;inset:11px;border:1px solid #d8e7f6;border-radius:16px}.vua-empty h2{margin:7px 0;color:#183a60;font-size:20px;letter-spacing:-.035em}.vua-empty p{max-width:430px;margin:0;color:#7c8ba0;font-size:12px;line-height:1.6}.vua-empty-points{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:18px}.vua-empty-points span{display:flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid #e4ebf3;border-radius:99px;background:#ffffffaa;color:#5f748d;font-size:9px;font-weight:700}.vua-empty-points i{width:14px;height:14px;display:grid;place-items:center;border-radius:50%;background:#eaf8f1;color:#148761;font-size:9px;font-style:normal}.vua-footer{position:sticky;bottom:0;z-index:2;max-width:1320px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:20px auto 0;padding:11px 14px;border:1px solid #e0e8f1;border-radius:14px;background:#ffffffeb;backdrop-filter:blur(12px)}.vua-footer>span{display:flex;align-items:center;gap:8px;color:#738399;font-size:10px}.vua-footer>span i{width:6px;height:6px}.vua-footer button{display:flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid #dce6f0;border-radius:10px;background:#fff;color:#315575;font:inherit;font-size:11px;font-weight:750;cursor:pointer}.vua-footer button:hover{border-color:#b5cbea;background:#f7faff}.vua-footer svg{width:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.vua-error{max-width:1320px;margin:12px auto;padding:14px;display:flex;align-items:center;gap:10px;border:1px solid #f0cccc;border-radius:12px;background:#fff7f7;color:#a74444;font-size:11px}.vua-error strong{font-size:12px}.vua-error span{flex:1}.vua-error button{border:1px solid #edcccc;border-radius:8px;padding:7px 9px;background:#fff;color:#a74444;cursor:pointer}.vua-denied{max-width:480px;margin:10vh auto;padding:38px;text-align:center;border:1px solid #e5eaf1;border-radius:22px;background:#fff;box-shadow:0 18px 48px #18395d12}.vua-denied-mark{width:42px;height:42px;display:grid;place-items:center;margin:0 auto 14px;border-radius:14px;background:#fff1ef;color:#ca4f47;font-size:20px;font-weight:900}.vua-denied h1{margin:7px 0;color:#183858;font-size:22px}.vua-denied p{margin:0;color:#718198;font-size:12px;line-height:1.6}
@media(max-width:1050px){.vua-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:680px){.vua-app{padding:20px 14px 26px}.vua-heading{align-items:flex-start}.vua-live{padding:7px 8px;font-size:9px}.vua-search{grid-template-columns:38px minmax(0,1fr);gap:10px;padding:11px}.vua-search-icon{width:37px;height:37px}.vua-search-body{grid-template-columns:1fr}.vua-search-body label{grid-column:auto}.vua-search-hint{display:none}.vua-search-action{grid-column:1/-1;height:42px}.vua-results{max-height:45vh}.vua-result{grid-template-columns:34px minmax(0,1fr) auto;gap:8px;padding:9px 6px}.vua-result-avatar{width:32px;height:32px}.vua-result-copy small{grid-template-columns:1fr}.vua-result-copy small span{display:none}.vua-result-arrow{display:none}.vua-identity{padding:16px}.vua-identity-top{gap:10px}.vua-unit-symbol{width:41px;height:41px}.vua-unit-title h2{font-size:22px}.vua-overall{max-width:120px;padding:7px;font-size:8px}.vua-identity-facts{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:14px}.vua-card-grid{grid-template-columns:1fr}.vua-card{padding:15px}.vua-card-value{min-height:0}.vua-footer{align-items:flex-start}.vua-footer>span{padding-top:9px}.vua-error{align-items:flex-start;flex-direction:column}}
@media(prefers-reduced-motion:reduce){.vua-spinner{animation:none}}

/* Small visual refinement of the existing Vue validator. */
.vua-app{background:radial-gradient(ellipse at 8% 0%,#e8f2ff 0,transparent 32%),radial-gradient(ellipse at 92% 4%,#fff2e3 0,transparent 27%),#f4f7fb}
.vua-heading h1{letter-spacing:-.045em}
.vua-search{border-color:#d5e1ef;box-shadow:0 12px 28px #193a5d0b}
.vua-search:focus-within{border-color:#75a6ed;box-shadow:0 0 0 3px #367be51a,0 14px 30px #193a5d0d}
.vua-search-body input{color:#163657;caret-color:#2877e8}
.vua-search-body input::placeholder{color:#6f8095;opacity:1}
.vua-search-action{box-shadow:0 7px 16px #176bc51f;transition:transform .16s ease,box-shadow .16s ease}
.vua-search-action:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 10px 20px #176bc52b}
.vua-results{border-color:#d9e4f0;box-shadow:0 20px 48px #17395d1a}
.vua-result{transition:background .14s ease,border-color .14s ease}
.vua-result:hover,.vua-result:focus-visible{background:#f5f9ff;border-color:#b9d2f5;outline:none}
.vua-identity{box-shadow:0 12px 28px #14395d0c}
.vua-card{border-color:#dce5ef;box-shadow:0 9px 24px #17395d0a;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
.vua-card header{min-height:38px}
.vua-card-value{line-height:1.2}
.vua-card-facts>div{min-height:34px;align-items:center}
.vua-card:focus-within{border-color:#a8c9f2;box-shadow:0 0 0 3px #367be514,0 12px 26px #17395d10}
@media(hover:hover){.vua-card:hover{transform:translateY(-2px);box-shadow:0 14px 30px #17395d12}}
@media(prefers-reduced-motion:reduce){.vua-card,.vua-search-action,.vua-result{transition:none}}
.vua-content{container:unit-content / inline-size}
.vua-card-heading .vua-kicker{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vua-card-facts b{overflow-wrap:normal;word-break:normal}
.vua-card.revisados{border-top:3px solid #168e58}
.vua-card.revisados .vua-module-icon{background:#e2f5eb;color:#078752}
.vua-card.revisados .vua-card-value{color:#078752}
.vua-card.revisados .vua-card-status.ok{background:#e9f8f0;color:#078752}
@container unit-content (max-width:1120px){.vua-card-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.vua-card{min-height:0}}
@container unit-content (max-width:600px){.vua-card-grid{grid-template-columns:1fr}}
.vua-app.has-selection{min-height:calc(100dvh - 82px);padding:26px 28px 96px;background:#f3f6fa}
.vua-app.has-selection .vua-heading,.vua-app.has-selection .vua-search,.vua-app.has-selection .vua-section-head{display:none}
.vua-app.has-selection .vua-content{max-width:none}
.vua-app.has-selection .vua-identity{padding:22px 25px 19px;border:0;border-radius:21px;background:#fff;box-shadow:none}
.vua-app.has-selection .vua-identity-top{gap:12px}
.vua-app.has-selection .vua-unit-title h2{font-size:46px;line-height:1.05;color:#102e56}
.vua-app.has-selection .vua-unit-title p{font-size:15px}
.vua-app.has-selection .vua-overall{margin-left:auto;padding:10px 13px;border:0;border-radius:10px;background:#fff1dc;color:#995700;font-size:12px;font-weight:850}
.vua-app.has-selection .vua-overall.ok{background:#e7f6ef;color:#087955}
.vua-app.has-selection .vua-overall.bad{background:#fff0ef;color:#bf3d36}
.vua-unit-close{width:54px;height:54px;display:grid;place-items:center;border:1px solid #d9e4f0;border-radius:15px;background:#fff;color:#607994;font:inherit;font-size:30px;line-height:1;cursor:pointer}
.vua-unit-close:hover{border-color:#aec5df;background:#f8fbff;color:#244a71}
.vua-app.has-selection .vua-identity-facts{gap:12px;margin-top:18px}
.vua-app.has-selection .vua-identity-facts>div{padding:0;border:0;border-radius:0;background:transparent}
.vua-app.has-selection .vua-identity-facts span{font-size:11px;letter-spacing:.08em}
.vua-app.has-selection .vua-identity-facts strong{margin-top:6px;color:#132f53;font-size:15px}
.vua-app.has-selection .vua-card-grid{gap:15px;margin-top:20px}
.vua-app.has-selection .vua-card{min-height:262px;padding:22px 21px;border-radius:21px;box-shadow:0 9px 25px #14395d0b}
.vua-app.has-selection .vua-card header{gap:10px}
.vua-app.has-selection .vua-module-icon{width:54px;height:54px;border-radius:16px}
.vua-app.has-selection .vua-card-heading .vua-kicker{font-size:13px;color:#164e9b;font-weight:900;letter-spacing:.08em}
.vua-app.has-selection .vua-card-status{width:auto;height:auto;min-height:32px;display:flex;gap:6px;margin-left:auto;padding:6px 10px;border:1px solid #a9e4c4;border-radius:99px;background:#eefbf4;font-size:12px;white-space:nowrap}
.vua-app.has-selection .vua-card-status i{width:19px;height:19px;display:grid;place-items:center;border-radius:50%;background:#07895f;color:#fff;font-size:12px;font-style:normal}
.vua-app.has-selection .vua-card-status.warn,.vua-app.has-selection .vua-card-status.pending{border-color:#f3d49b;background:#fff8e9;color:#9c640a}
.vua-app.has-selection .vua-card-status.bad{border-color:#ffc6c3;background:#fff4f3;color:#ba342e}
.vua-app.has-selection .vua-card-value{min-height:42px;margin:29px 0 12px;font-size:35px}
.vua-app.has-selection .vua-card-facts>div{padding:10px 0}
.vua-app.has-selection .vua-card-facts span,.vua-app.has-selection .vua-card-facts b{font-size:13px}
.vua-app.has-selection .vua-card>p{min-height:0;margin-top:13px;font-size:12px}
.vua-app.has-selection .vua-footer{position:fixed;right:0;bottom:0;left:0;max-width:none;justify-content:flex-end;margin:0;padding:16px 32px;border:0;border-top:1px solid #dce5ef;border-radius:0;background:#fff}
.vua-app.has-selection .vua-footer>span{display:flex;margin-right:auto}
.vua-app.has-selection .vua-footer button{min-width:275px;min-height:62px;justify-content:center;border:0;border-radius:15px;background:#294fae;color:#fff;font-size:16px}
@media(max-width:1050px){.vua-app.has-selection{padding:22px 20px 92px}.vua-app.has-selection .vua-card{min-height:225px;padding:18px}}
@media(max-width:680px){.vua-app.has-selection{padding:16px 13px 88px}.vua-app.has-selection .vua-identity{padding:16px;border-radius:17px}.vua-app.has-selection .vua-unit-title h2{font-size:34px}.vua-app.has-selection .vua-unit-title p{font-size:12px}.vua-unit-close{width:40px;height:40px;font-size:23px}.vua-app.has-selection .vua-identity-facts{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:15px}.vua-app.has-selection .vua-identity-facts span{font-size:9px}.vua-app.has-selection .vua-identity-facts strong{font-size:12px}.vua-app.has-selection .vua-card-grid{grid-template-columns:1fr;gap:9px;margin-top:14px}.vua-app.has-selection .vua-card{min-height:0;padding:15px}.vua-app.has-selection .vua-module-icon{width:42px;height:42px}.vua-app.has-selection .vua-card-heading .vua-kicker{font-size:10px}.vua-app.has-selection .vua-card-value{min-height:0;margin:15px 0 8px;font-size:25px}.vua-app.has-selection .vua-card-facts>div{padding:7px 0}.vua-app.has-selection .vua-card-facts span,.vua-app.has-selection .vua-card-facts b{font-size:10px}.vua-app.has-selection .vua-footer{padding:11px 13px}.vua-app.has-selection .vua-footer button{width:100%;min-width:0;min-height:48px;font-size:13px}}
.vua-detail-toggle{display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:auto;padding:12px 0 0;border:0;border-top:1px solid var(--line);background:transparent;color:#2356a1;font:inherit;font-size:12px;font-weight:750;cursor:pointer}.vua-detail-toggle:focus-visible{outline:2px solid #286de1;outline-offset:4px}.vua-detail-panel{min-width:0;margin-top:14px}.vua-detail-panel h3{margin:16px 0 8px;font-size:12px}.vua-detail-panel dl{margin:0}.vua-detail-panel dl>div{padding:9px 0;border-top:1px solid var(--line)}.vua-detail-panel dt{font-size:11px;color:var(--muted)}.vua-detail-panel dd{margin:5px 0 0;font-size:12px;overflow-wrap:anywhere}.vua-detail-panel em{display:block;font-size:10px;font-style:normal;color:#728399}.vua-detail-panel .diff em{color:#ac5800}.vua-detail-panel .match em{color:#087955}.vua-card-grid{align-items:start}
@media(max-width:680px){.vua-app.has-selection{padding-bottom:120px}.vua-app.has-selection .vua-footer{flex-direction:column;gap:7px}.vua-app.has-selection .vua-footer>span{padding-top:0;font-size:10px}}
</style>

