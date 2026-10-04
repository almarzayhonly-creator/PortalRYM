<script setup lang="ts">
import { computed } from 'vue'
import type { CanonicalRevisadoRow } from '../types/revisados.types'
import RymIcon from '../components/RymIcon.vue'
import OperationsTable from './OperationsTable.vue'

type QuickOp = {
  key: string
  label: string
  value: number
  tone: string
}

const props = defineProps<{
  rows: CanonicalRevisadoRow[]
  total: number
  upToDate: number
  galeras: string[]
  statuses: string[]
  selectedGalera: string
  selectedStatus: string
  quickFilter: string
  quickOps: QuickOp[]
  search: string
  syncBusy: boolean
  syncState: string
  manualPlate: string
  manualBusy: boolean
  manualState: string
  manualResult: Record<string, any> | null
}>()

const emit = defineEmits<{
  'search-change': [value: string]
  'galera-change': [value: string]
  'status-change': [value: string]
  'quick-change': [value: string]
  'manual-plate-change': [value: string]
  sync: []
  lookup: []
  copy: []
  open: [row: CanonicalRevisadoRow]
}>()

const coverage = computed(() => props.total ? Math.round(props.upToDate * 100 / props.total) : 0)

function num(value: unknown) {
  return new Intl.NumberFormat('es-PA').format(Number(value) || 0)
}

function onInput(event: Event, type: 'search' | 'plate') {
  const value = (event.target as HTMLInputElement).value
  if (type === 'search') emit('search-change', value)
  else emit('manual-plate-change', value.toUpperCase())
}

function onSelect(event: Event, type: 'galera' | 'status') {
  const value = (event.target as HTMLSelectElement).value
  if (type === 'galera') emit('galera-change', value)
  else emit('status-change', value)
}
</script>

<template>
  <section class="ops-v2" data-ui-source="stitch-reference-v2">
    <div class="ops-heading">
      <div>
        <span class="ops-eyebrow"><RymIcon name="fact_check" :size="14" /> OPERACIONES</span>
        <h2>Qué debes atender primero</h2>
        <p>Unidades pendientes, bloqueos críticos y estado de eCarCheck dentro de tu alcance.</p>
      </div>
      <div class="ops-heading-metrics">
        <span><small>Total flota</small><b>{{ num(total) }}</b></span>
        <i></i>
        <span><small>Al día</small><b>{{ num(upToDate) }}</b><em>{{ coverage }}%</em></span>
      </div>
    </div>

    <section class="ops-command-center">
      <header>
        <div>
          <span>CENTRO DE OPERACIÓN</span>
          <h3>Consulta y sincronización eCarCheck</h3>
          <p>Usa los procesos V2 existentes sin alterar la lógica operativa del portal.</p>
        </div>
        <span class="ops-live"><i></i> Datos reales</span>
      </header>

      <div class="ops-actions">
        <button type="button" class="ops-action-card" :disabled="syncBusy" @click="emit('sync')">
          <span class="ops-action-icon"><RymIcon name="sync" :size="19" /></span>
          <span class="ops-action-copy">
            <small>ACTUALIZACIÓN GENERAL</small>
            <b>{{ syncBusy ? 'Actualizando eCarCheck…' : 'Actualizar eCarCheck' }}</b>
            <em>{{ syncState }}</em>
          </span>
          <span class="ops-action-cta">{{ syncBusy ? 'Procesando' : 'Sincronizar' }} <RymIcon name="arrow_forward" :size="15" /></span>
        </button>

        <div class="ops-lookup-card">
          <span class="ops-action-icon"><RymIcon name="manage_search" :size="20" /></span>
          <span class="ops-action-copy">
            <small>CONSULTA PUNTUAL V2</small>
            <b>Verificar una placa</b>
            <em>{{ manualState }}</em>
          </span>
          <div class="ops-lookup-form">
            <input
              :value="manualPlate"
              maxlength="12"
              autocomplete="off"
              spellcheck="false"
              placeholder="PLACA"
              aria-label="Placa para consulta puntual"
              @input="onInput($event, 'plate')"
              @keydown.enter="emit('lookup')"
            >
            <button type="button" :disabled="manualBusy || !manualPlate.trim()" @click="emit('lookup')">
              {{ manualBusy ? '…' : 'Consultar' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="manualResult?.result" class="ops-query-result">
        <div class="ops-query-id">
          <small>RESULTADO ECARCHECK</small>
          <b>{{ manualResult.result?.vehiculo?.nroPlaca || manualPlate }}</b>
          <span>
            {{ manualResult.result?.vehiculo?.nombrePropietario || 'Propietario no disponible' }}
            · {{ manualResult.result?.vehiculo?.colorVehiculo || 'Color —' }}
            · Revisado {{ manualResult.result?.vehiculo?.fechaRevisado || '—' }}
          </span>
        </div>
        <div class="ops-query-signals">
          <span><small>ENA</small><b>{{ num(manualResult.result?.boletas?.infraccionesEna?.cantidad) }}</b></span>
          <span><small>Documento</small><b>{{ num(manualResult.result?.boletas?.boletasPorDocumento?.cantidad) }}</b></span>
          <span><small>Placa</small><b>{{ num(manualResult.result?.boletas?.boletasPorPlaca?.cantidad) }}</b></span>
        </div>
      </div>
    </section>

    <section class="ops-filter-panel">
      <div class="ops-search">
        <RymIcon name="search" :size="18" />
        <input
          :value="search"
          placeholder="Buscar unidad, placa, galera o supervisora…"
          aria-label="Buscar en operaciones"
          @input="onInput($event, 'search')"
        >
        <kbd>⌘K</kbd>
      </div>

      <div class="ops-quick">
        <button
          v-for="item in quickOps"
          :key="item.key"
          type="button"
          :class="{ active: quickFilter === item.key }"
          :data-tone="item.tone"
          @click="emit('quick-change', item.key)"
        >
          <i></i>
          <span>{{ item.label }}</span>
          <b>{{ num(item.value) }}</b>
        </button>
      </div>

      <div class="ops-selects">
        <label>
          <span>Galera</span>
          <select :value="selectedGalera" @change="onSelect($event, 'galera')">
            <option value="">Todas las galeras</option>
            <option v-for="item in galeras" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <label>
          <span>Estatus</span>
          <select :value="selectedStatus" @change="onSelect($event, 'status')">
            <option value="">Todos los estatus</option>
            <option v-for="item in statuses" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <div class="ops-filter-summary">
          <small>RESULTADO ACTUAL</small>
          <b>{{ num(rows.length) }}</b>
          <span>unidades visibles</span>
        </div>
      </div>
    </section>

    <div class="ops-list-head">
      <div>
        <span>PADRÓN OPERATIVO</span>
        <b>{{ num(rows.length) }} unidades visibles</b>
        <small>Selecciona una unidad para abrir su ficha legal completa.</small>
      </div>
      <button type="button" class="ops-copy" @click="emit('copy')">
        <RymIcon name="content_copy" :size="15" /> Copiar lista
      </button>
    </div>

    <OperationsTable :rows="rows" @open="emit('open', $event)" />
  </section>
</template>

<style scoped>
.ops-v2{
  --ops-blue:#244AA5;
  --ops-blue-dark:#173A88;
  --ops-navy:#10224E;
  --ops-text:#203253;
  --ops-muted:#62708C;
  --ops-border:#D8E3F2;
  --ops-soft:#F4F7FB;
  display:grid;
  gap:14px;
  padding-bottom:10px;
  color:var(--ops-text);
}
.ops-heading{
  display:flex;align-items:flex-end;justify-content:space-between;gap:18px;
  padding:2px 2px 4px;
}
.ops-heading>div:first-child{display:grid;gap:5px}
.ops-eyebrow{
  width:max-content;display:inline-flex;align-items:center;gap:6px;
  padding:5px 8px;border:1px solid #C9DCF4;border-radius:7px;
  background:#EAF4FF;color:var(--ops-blue);
  font-size:9px;font-weight:850;letter-spacing:.07em;
}
.ops-heading h2{margin:0;color:var(--ops-navy);font:850 25px/1.15 Inter,system-ui,sans-serif;letter-spacing:-.025em}
.ops-heading p{margin:0;color:var(--ops-muted);font-size:11px}
.ops-heading-metrics{
  display:flex;align-items:center;gap:12px;
  padding:9px 12px;border:1px solid var(--ops-border);border-radius:11px;background:#fff;
}
.ops-heading-metrics>span{display:grid;grid-template-columns:auto auto;gap:2px 7px;align-items:baseline}
.ops-heading-metrics small{grid-column:1/-1;color:#7B899C;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
.ops-heading-metrics b{color:var(--ops-navy);font-size:16px}
.ops-heading-metrics em{color:var(--ops-blue);font-size:9px;font-style:normal;font-weight:800}
.ops-heading-metrics>i{width:1px;height:28px;background:var(--ops-border)}

.ops-command-center{
  display:grid;gap:13px;
  padding:16px;
  border:1px solid #C9DCF4;border-radius:16px;
  background:linear-gradient(180deg,#F7FAFF 0%,#FFFFFF 76%);
  box-shadow:0 12px 30px rgba(10,27,77,.045);
}
.ops-command-center>header{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}
.ops-command-center>header>div{display:grid;gap:3px}
.ops-command-center>header>div>span{color:var(--ops-blue);font-size:9px;font-weight:850;letter-spacing:.07em}
.ops-command-center h3{margin:0;color:var(--ops-navy);font:800 17px/1.2 Inter,system-ui,sans-serif}
.ops-command-center p{margin:0;color:#71809A;font-size:10px}
.ops-live{
  display:inline-flex;align-items:center;gap:6px;padding:6px 8px;
  border:1px solid #ABEFC6;border-radius:999px;background:#ECFDF3;color:#067647;
  font-size:9px;font-weight:800;white-space:nowrap;
}
.ops-live i{width:6px;height:6px;border-radius:50%;background:#17B26A;box-shadow:0 0 0 3px rgba(23,178,106,.12)}
.ops-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ops-action-card,.ops-lookup-card{
  min-height:82px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;
  padding:12px;border:1px solid var(--ops-border);border-radius:12px;background:#fff;
}
.ops-action-card{text-align:left;cursor:pointer}
.ops-action-card:hover:not(:disabled){border-color:#AFC9EB;background:#FBFDFF}
.ops-action-card:disabled{opacity:.7;cursor:wait}
.ops-action-icon{
  width:38px;height:38px;display:grid;place-items:center;
  border:1px solid #C9DCF4;border-radius:10px;background:#EAF4FF;color:var(--ops-blue);
}
.ops-action-copy{min-width:0;display:grid;gap:2px}
.ops-action-copy small{color:#8290A4;font-size:8px;font-weight:800;letter-spacing:.055em}
.ops-action-copy b{color:var(--ops-navy);font-size:12px}
.ops-action-copy em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#71809A;font-size:9px;font-style:normal}
.ops-action-cta{
  display:inline-flex;align-items:center;gap:4px;
  color:var(--ops-blue);font-size:9px;font-weight:850;white-space:nowrap;
}
.ops-lookup-form{display:flex;gap:6px;align-items:center}
.ops-lookup-form input{
  width:94px;padding:8px 9px;border:1px solid #C9D5E5;border-radius:8px;outline:0;
  background:#F8FAFD;color:var(--ops-navy);
  font:800 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;
}
.ops-lookup-form input:focus{border-color:#7DA7DF;box-shadow:0 0 0 3px rgba(36,74,165,.08)}
.ops-lookup-form button{
  padding:9px 10px;border:1px solid var(--ops-blue);border-radius:8px;
  background:var(--ops-blue);color:#fff;font-size:9px;font-weight:850;cursor:pointer;
}
.ops-lookup-form button:disabled{opacity:.5;cursor:not-allowed}
.ops-query-result{
  display:flex;justify-content:space-between;gap:14px;align-items:center;
  padding:10px 12px;border:1px solid #C9DCF4;border-radius:10px;background:#EEF5FF;
}
.ops-query-id{min-width:0;display:grid;grid-template-columns:auto 1fr;gap:2px 8px;align-items:baseline}
.ops-query-id small{grid-column:1/-1;color:#66758E;font-size:8px;font-weight:800}
.ops-query-id b{color:var(--ops-navy);font:850 15px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
.ops-query-id span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#62708C;font-size:9px}
.ops-query-signals{display:flex;gap:6px}
.ops-query-signals>span{min-width:62px;display:grid;gap:2px;padding:7px 8px;border-radius:8px;background:#fff;text-align:center}
.ops-query-signals small{color:#7B899C;font-size:8px}
.ops-query-signals b{color:var(--ops-navy);font-size:13px}

.ops-filter-panel{
  display:grid;gap:10px;padding:12px;
  border:1px solid var(--ops-border);border-radius:14px;background:#fff;
  box-shadow:0 8px 22px rgba(10,27,77,.035);
}
.ops-search{
  height:42px;display:flex;align-items:center;gap:8px;padding:0 11px;
  border:1px solid #D8E3F2;border-radius:10px;background:#F8FAFD;color:#8290A4;
}
.ops-search:focus-within{border-color:#AFC9EB;box-shadow:0 0 0 3px rgba(36,74,165,.06)}
.ops-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--ops-text);font-size:11px}
.ops-search input::placeholder{color:#98A4B5}
.ops-search kbd{padding:3px 5px;border:1px solid #D8E3F2;border-radius:5px;background:#fff;color:#7B899C;font:700 8px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
.ops-quick{display:flex;flex-wrap:wrap;gap:6px}
.ops-quick button{
  display:inline-flex;align-items:center;gap:6px;padding:7px 9px;
  border:1px solid #D8E3F2;border-radius:999px;background:#fff;color:#52627A;
  font-size:9px;font-weight:800;cursor:pointer;
}
.ops-quick button i{width:6px;height:6px;border-radius:50%;background:#AEB9C8}
.ops-quick button b{padding-left:2px;color:#10224E}
.ops-quick button.active{background:#244AA5;border-color:#244AA5;color:#fff}
.ops-quick button.active b{color:#fff}
.ops-quick button[data-tone="green"] i{background:#17B26A}
.ops-quick button[data-tone="amber"] i{background:#F79009}
.ops-quick button[data-tone="red"] i{background:#F04438}
.ops-quick button[data-tone="blue"] i{background:#2E90FA}
.ops-selects{display:grid;grid-template-columns:minmax(180px,1fr) minmax(180px,1fr) auto;gap:8px;align-items:end}
.ops-selects label{display:grid;gap:4px}
.ops-selects label>span{color:#7B899C;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
.ops-selects select{
  width:100%;padding:9px 10px;border:1px solid #D8E3F2;border-radius:9px;outline:0;
  background:#fff;color:#203253;font:700 10px Inter,system-ui,sans-serif;
}
.ops-selects select:focus{border-color:#AFC9EB;box-shadow:0 0 0 3px rgba(36,74,165,.06)}
.ops-filter-summary{
  min-width:118px;display:grid;grid-template-columns:auto 1fr;gap:1px 6px;align-items:baseline;
  padding:8px 10px;border:1px solid #D8E3F2;border-radius:9px;background:#F8FAFD;
}
.ops-filter-summary small{grid-column:1/-1;color:#7B899C;font-size:7px;font-weight:800}
.ops-filter-summary b{color:#10224E;font-size:15px}
.ops-filter-summary span{color:#62708C;font-size:9px}

.ops-list-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:2px 2px 0}
.ops-list-head>div{display:grid;grid-template-columns:auto 1fr;gap:2px 7px;align-items:baseline}
.ops-list-head span{grid-column:1/-1;color:#244AA5;font-size:8px;font-weight:850;letter-spacing:.07em}
.ops-list-head b{color:#10224E;font-size:12px}
.ops-list-head small{color:#7B899C;font-size:9px}
.ops-copy{
  display:inline-flex;align-items:center;gap:6px;padding:8px 10px;
  border:1px solid #C9DCF4;border-radius:8px;background:#fff;color:#244AA5;
  font-size:9px;font-weight:850;cursor:pointer;
}
.ops-copy:hover{background:#EEF5FF}

@media(max-width:1120px){
  .ops-actions{grid-template-columns:1fr}
  .ops-heading{align-items:flex-start}
  .ops-heading-metrics{flex:0 0 auto}
}
@media(max-width:760px){
  .ops-heading{flex-direction:column}
  .ops-heading-metrics{width:100%;box-sizing:border-box}
  .ops-actions{grid-template-columns:1fr}
  .ops-action-card,.ops-lookup-card{grid-template-columns:auto minmax(0,1fr)}
  .ops-action-cta,.ops-lookup-form{grid-column:2}
  .ops-lookup-form{justify-content:flex-start}
  .ops-query-result{align-items:flex-start;flex-direction:column}
  .ops-selects{grid-template-columns:1fr}
  .ops-filter-summary{min-width:0}
  .ops-list-head{align-items:flex-start;flex-direction:column}
}
</style>
