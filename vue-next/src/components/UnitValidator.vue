<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ModuleIcon from './ModuleIcon.vue'

type Unit = Record<string, unknown>
type DetailCard = { key: string; title: string; tone: string; badge: string; value: string; details: Array<{ label: string; value: string }>; note: string }
type UnitDetail = { unit: string; plate: string; owner: string; operator: string; supervisor: string; galera: string; closed: boolean; active: boolean; status: string; overall: string; cards: DetailCard[] }
type Api = { search: (query: string) => Promise<Unit[]>; load: (unit: Unit) => Promise<unknown> }
const props = defineProps<{ api?: Api; onControl?: () => unknown }>()
const query = ref('')
const rows = ref<Unit[]>([])
const loading = ref(false)
const searched = ref(false)
const activeIndex = ref(-1)
const input = ref<HTMLInputElement>()
const wrap = ref<HTMLDivElement>()
const panelOpen = ref(false)
const detail = ref<UnitDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
const modalOpen = ref(false)
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
  detail.value = null; detailError.value = ''; detailLoading.value = true
  const current = ++detailSequence
  try { if (!props.api) throw Error('El validador no está disponible.'); detail.value = await props.api.load(row) as UnitDetail }
  catch (error) { if (current === detailSequence) detailError.value = error instanceof Error ? error.message : String(error) }
  finally { if (current === detailSequence) detailLoading.value = false }
}
function closeDetail() { modalOpen.value = false; detailSequence++; detailLoading.value = false; detail.value = null; detailError.value = ''; window.setTimeout(() => { input.value?.focus({ preventScroll: true }); input.value?.select() }, 40) }
async function searchNow() {
  window.clearTimeout(timer)
  const term = query.value.trim()
  if (!term || !props.api) return
  if (rows.value.length === 1) { select(rows.value[0]!); return }
  panelOpen.value = true
  loading.value = true
  searched.value = false
  try { rows.value = await props.api.search(term); searched.value = true; activeIndex.value = rows.value.length === 1 ? 0 : -1 }
  finally { loading.value = false }
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' && rows.value.length) { event.preventDefault(); activeIndex.value = (activeIndex.value + 1) % rows.value.length }
  else if (event.key === 'ArrowUp' && rows.value.length) { event.preventDefault(); activeIndex.value = activeIndex.value <= 0 ? rows.value.length - 1 : activeIndex.value - 1 }
  else if (event.key === 'Enter') { if (activeIndex.value >= 0 && rows.value[activeIndex.value]) { event.preventDefault(); select(rows.value[activeIndex.value]!) } else if (rows.value.length === 1) { event.preventDefault(); select(rows.value[0]!) } }
  else if (event.key === 'Escape') { if (modalOpen.value) closeDetail(); else panelOpen.value = false; activeIndex.value = -1 }
}
function outsideClick(event: PointerEvent) { if (wrap.value && !wrap.value.contains(event.target as Node)) panelOpen.value = false }
function lockPage(value: boolean) { if (value) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' } else document.body.style.overflow = previousOverflow }
watch(query, value => {
  window.clearTimeout(timer)
  const term = value.trim()
  const current = ++sequence
  rows.value = []; searched.value = false; activeIndex.value = -1
  if (term.length < 2 || !props.api) { loading.value = false; return }
  panelOpen.value = true
  loading.value = true
  timer = window.setTimeout(async () => {
    try { const result = await props.api!.search(term); if (current === sequence) { rows.value = result; searched.value = true } }
    finally { if (current === sequence) loading.value = false }
  }, 240)
})
onMounted(() => document.addEventListener('pointerdown', outsideClick))
watch(modalOpen, lockPage)
onUnmounted(() => { window.clearTimeout(timer); sequence++; detailSequence++; document.body.style.overflow = previousOverflow; document.removeEventListener('pointerdown', outsideClick) })
</script>

<template>
  <section class="ryn-validator" aria-label="Validador de unidad">
    <div class="ryn-validator-heading"><span class="ryn-validator-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2M8.5 10.8h4.6M10.8 8.5v4.6"/></svg></span><div><span class="ryn-validator-kicker">BÚSQUEDA RÁPIDA</span><h2>Validador de unidad</h2><p>Unidad, placa o Panapass</p></div></div>
    <div ref="wrap" class="uv-search-wrap">
      <label class="uv-search-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/></svg><input id="v101ValidatorQ" ref="input" v-model="query" type="search" placeholder="Escribe unidad, placa o número Panapass" autocomplete="off" aria-label="Buscar unidad, placa o Panapass" aria-controls="v101ValidatorList" :aria-expanded="visible" @focus="panelOpen = true" @keydown="onKeydown"><kbd v-if="query">ESC</kbd></label>
      <button id="v101ValidatorGo" class="uv-search-button" type="button" :disabled="!query.trim()" @click="searchNow">Buscar unidad <span aria-hidden="true">→</span></button>
      <div v-if="visible" id="v101ValidatorList" class="uv-results" role="listbox" aria-label="Unidades encontradas">
        <div v-if="loading" class="uv-state"><span class="uv-spinner"></span>Buscando en la flota…</div>
        <div v-else-if="!rows.length" class="uv-state">Sin coincidencias para “{{ query.trim() }}”. Revisa el dato e intenta otra vez.</div>
        <button v-for="(item, index) in rows" v-else :key="`${unit(item)}-${plate(item)}`" type="button" class="uv-result v101-validator-item" :class="{ active: index === activeIndex }" role="option" :aria-selected="index === activeIndex" @click="select(item)" @mouseenter="activeIndex = index">
          <span class="uv-unit-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7.5h16v12H4zM8 7.5V5h8v2.5M8 12h8M8 15.5h5"/></svg></span>
          <span class="uv-result-copy"><strong>{{ unit(item) }}</strong><span><b>EMPRESA</b>{{ company(item) }}</span><span class="uv-result-meta"><span><b>PLACA</b>{{ plate(item) }}</span><span><b>PANAPASS</b>{{ panapass(item) }}</span></span></span>
          <span class="uv-status" :class="/activo|activa|operativo/i.test(status(item)) ? 'ok' : 'warn'">{{ status(item) }}</span><span class="uv-chevron" aria-hidden="true">→</span>
        </button>
      </div>
    </div>
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
                <article v-for="card in detail.cards" :key="card.key" class="uv-check-card" :class="[card.key, card.tone]"><header><span class="uv-check-icon"><ModuleIcon :name="card.key" /></span><strong>{{ card.title }}</strong><span class="uv-check-badge"><i aria-hidden="true">{{ card.tone === 'ok' ? '✓' : card.tone === 'pending' ? '·' : '!' }}</i>{{ card.badge }}</span></header><b class="uv-check-value">{{ card.value }}</b><div class="uv-check-details"><div v-for="item in card.details" :key="item.label"><span>{{ item.label }}</span><b>{{ item.value }}</b></div></div><p>{{ card.note }}</p></article>
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
@media(prefers-reduced-motion:reduce){.uv-modal-enter-active,.uv-modal-leave-active,.uv-modal-enter-active .uv-dialog,.uv-modal-leave-active .uv-dialog{transition:none}}
</style>
