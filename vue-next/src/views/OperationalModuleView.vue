<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { callPortalFunction, hasPortalModule, portalContext } from '../portalApi'

type ModuleKey = 'revisados' | 'control' | 'gps' | 'users'
type Row = Record<string, unknown>
const props = defineProps<{ module: ModuleKey; onBack: () => void; onOpenLegacy: () => void }>()

const configs: Record<ModuleKey, { title: string; eyebrow: string; description: string; service: string; body: Row; collection: string; code: string; icon: string }> = {
  revisados: { title: 'Revisados', eyebrow: 'GESTIÓN VEHICULAR', description: 'Estado y seguimiento de revisados dentro de tu alcance.', service: 'revisados-final', body: {}, collection: 'rows', code: 'portal.revisados', icon: 'revisados' },
  control: { title: 'Control de Auto', eyebrow: 'ADMINISTRACIÓN DE FLOTA', description: 'Consulta de unidades operativas y estado de la flota.', service: 'control-auto-unidades-operativas', body: {}, collection: 'rows', code: 'portal.control', icon: 'auto' },
  gps: { title: 'GPS', eyebrow: 'CENTRO DE MONITOREO', description: 'Estado de reporte y prioridades GPS dentro de tu alcance.', service: 'gps-rym-admin', body: { q: '', galera: 'TODAS', estado: 'TODOS', nivel: 'TODOS', onlyProblems: false }, collection: 'rows', code: 'portal.gps', icon: 'gps' },
  users: { title: 'Usuarios', eyebrow: 'ADMINISTRACIÓN', description: 'Usuarios y estado de acceso del portal.', service: 'admin-users', body: { action: 'list' }, collection: 'users', code: 'admin.usuarios', icon: 'users' },
}

const config = computed(() => configs[props.module])
const context = portalContext()
const loading = ref(true)
const error = ref('')
const payload = ref<Row>({})
const query = ref('')
const rows = computed(() => Array.isArray(payload.value[config.value.collection]) ? payload.value[config.value.collection] as Row[] : [])
const visibleRows = computed(() => {
  const q = query.value.trim().toLocaleLowerCase()
  if (!q) return rows.value
  return rows.value.filter(row => Object.values(row).some(value => primitive(value).toLocaleLowerCase().includes(q)))
})
const columns = computed(() => {
  const first = visibleRows.value.find(row => row && typeof row === 'object')
  if (!first) return []
  return Object.keys(first).filter(key => !/(password|token|secret|permiso|auth|credential)/i.test(key) && typeof first[key] !== 'object').slice(0, 7)
})
const stats = computed(() => {
  const sources = [payload.value.kpis, payload.value.totals, payload.value.scope].filter((value): value is Row => !!value && typeof value === 'object')
  const values: Array<{ label: string; value: string }> = []
  for (const source of sources) for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'number' && values.length < 4) values.push({ label: labelOf(key), value: new Intl.NumberFormat('es-PA').format(value) })
  }
  if (!values.length) values.push({ label: 'Registros en vista', value: new Intl.NumberFormat('es-PA').format(rows.value.length) })
  return values
})
const profileName = context.profile?.nombre || 'Usuario'
const profileRole = context.profile?.rol || '—'

function primitive(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'object') return '—'
  return String(value)
}
function labelOf(value: string): string { return value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toLocaleUpperCase()) }
function statusClass(value: unknown): string {
  const text = String(value || '').toLocaleLowerCase()
  if (/pendient|cr[ií]tic|alert|bloque|vencid|inactiv|sin gps/.test(text)) return 'warning'
  if (/activo|vigente|reportando|listo|ok|operativo/.test(text)) return 'good'
  return ''
}
async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    if (!hasPortalModule(config.value.code)) throw new Error('Tu perfil no tiene permiso para consultar este módulo.')
    const response = await callPortalFunction<Row>(config.value.service, config.value.body)
    if (!response?.ok) throw new Error(String(response?.error || `No se pudo cargar ${config.value.title}.`))
    payload.value = response
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    loading.value = false
  }
}
onMounted(() => { void load() })
</script>

<template>
  <main class="op-workspace" data-testid="vue-operational-module">
    <header class="op-topbar">
      <button class="op-back" type="button" @click="onBack">← <span>Portal</span></button>
      <div class="op-account"><span class="op-avatar">{{ profileName.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase() }}</span><span><b>{{ profileName }}</b><small>{{ profileRole }}</small></span></div>
    </header>
    <section class="op-content">
      <div class="op-heading"><div><span class="op-eyebrow">{{ config.eyebrow }}</span><h1>{{ config.title }}</h1><p>{{ config.description }}</p></div><button class="op-refresh" type="button" :disabled="loading" @click="load">{{ loading ? 'Actualizando…' : 'Actualizar' }}</button></div>
      <div class="op-stats" aria-label="Resumen del módulo"><article v-for="stat in stats" :key="stat.label"><span>{{ stat.label }}</span><b>{{ stat.value }}</b></article></div>
      <section class="op-panel">
        <div class="op-panel-head"><div><span class="op-eyebrow">INFORMACIÓN OPERATIVA</span><h2>Registros del módulo</h2></div><span class="op-count">{{ visibleRows.length.toLocaleString('es-PA') }} registros</span></div>
        <label class="op-search"><span aria-hidden="true">⌕</span><input v-model="query" type="search" :placeholder="`Buscar en ${config.title.toLocaleLowerCase()}…`"><kbd>⌕</kbd></label>
        <div v-if="loading" class="op-state"><span class="op-spinner"></span><b>Cargando información…</b></div>
        <div v-else-if="error" class="op-state op-error" role="alert"><b>No se pudo consultar el módulo</b><span>{{ error }}</span><button type="button" @click="load">Reintentar</button></div>
        <div v-else-if="!visibleRows.length" class="op-state"><b>{{ query ? 'No encontramos coincidencias' : 'No hay registros para mostrar' }}</b><span>{{ query ? 'Prueba otro número, placa o nombre.' : 'El servicio respondió correctamente, pero no devolvió filas.' }}</span></div>
        <div v-else class="op-table-wrap"><table><thead><tr><th v-for="column in columns" :key="column">{{ labelOf(column) }}</th></tr></thead><tbody><tr v-for="(row, index) in visibleRows.slice(0, 100)" :key="String(row.id || row.unidad_id || row.unidad || row.usuario || index)"><td v-for="column in columns" :key="column"><span :class="['op-value', statusClass(row[column])]">{{ primitive(row[column]) }}</span></td></tr></tbody></table></div>
        <p v-if="visibleRows.length > 100" class="op-limit">Mostrando 100 de {{ visibleRows.length.toLocaleString('es-PA') }} registros. Usa la búsqueda para acotar resultados.</p>
      </section>
      <div class="op-footer"><span>Los permisos y el alcance los valida el servicio del portal.</span><button type="button" @click="onOpenLegacy">Abrir herramientas operativas actuales <span aria-hidden="true">→</span></button></div>
    </section>
  </main>
</template>

<style scoped>
.op-workspace{min-height:100vh;background:radial-gradient(ellipse at 4% 0%,#e9f3ff 0,transparent 34%),#f3f6fa;color:#173858;font-family:inherit}.op-topbar{height:68px;padding:0 30px;background:#fff;border-bottom:1px solid #dce5ef;display:flex;align-items:center;justify-content:space-between}.op-back{height:38px;padding:0 13px;border:1px solid #dce5ef;border-radius:11px;background:#fff;color:#23466b;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer}.op-back:hover,.op-refresh:hover{border-color:#7ca9df;background:#f7faff}.op-account{display:flex;align-items:center;gap:10px}.op-avatar{display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:#fff2d7;color:#a85b00;font-size:11px;font-weight:900}.op-account b,.op-account small{display:block}.op-account b{font-size:11px}.op-account small{margin-top:3px;color:#71839a;font-size:9px}.op-content{max-width:1480px;margin:auto;padding:36px 42px 48px}.op-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:24px}.op-eyebrow{color:#7890ad;font-size:9px;font-weight:900;letter-spacing:.16em}.op-heading h1{margin:7px 0 5px;color:#133657;font-size:clamp(26px,3vw,38px);letter-spacing:-.045em}.op-heading p{margin:0;color:#71839a;font-size:12px}.op-refresh{height:39px;padding:0 15px;border:1px solid #d6e2ef;border-radius:11px;background:#fff;color:#23466b;font-size:11px;font-weight:800;cursor:pointer}.op-refresh:disabled{opacity:.65;cursor:wait}.op-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}.op-stats article{min-height:82px;padding:16px 18px;border:1px solid #dce5ef;border-radius:15px;background:linear-gradient(135deg,#fff,#f8fbff);box-shadow:0 8px 20px #1a3a5c08}.op-stats span,.op-stats b{display:block}.op-stats span{color:#7488a0;font-size:10px;font-weight:700;text-transform:capitalize}.op-stats b{margin-top:8px;color:#163c62;font-size:23px;letter-spacing:-.03em}.op-panel{overflow:hidden;border:1px solid #d8e3ef;border-radius:18px;background:#fff;box-shadow:0 16px 40px #17395d0b}.op-panel-head{min-height:79px;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #edf1f6}.op-panel-head h2{margin:5px 0 0;color:#193c5e;font-size:16px}.op-count{padding:7px 10px;border:1px solid #dbe7f5;border-radius:999px;background:#f4f8fd;color:#54718f;font-size:9px;font-weight:900}.op-search{height:42px;margin:16px 20px;display:flex;align-items:center;gap:9px;padding:0 12px;border:1px solid #d9e4ef;border-radius:11px;background:#f8fafd;color:#607c99}.op-search:focus-within{border-color:#6597eb;box-shadow:0 0 0 3px #3078e51c}.op-search>span{font-size:20px}.op-search input{width:100%;height:100%;border:0;outline:0;background:transparent;color:#163858;font-family:inherit;font-size:12px;font-weight:500}.op-search input::placeholder{color:#8a9aae}.op-search kbd{font-size:10px}.op-table-wrap{max-height:56vh;overflow:auto;border-top:1px solid #edf1f6}table{width:100%;border-collapse:collapse;text-align:left}th{position:sticky;top:0;z-index:1;padding:12px 16px;background:#f5f8fc;color:#7086a0;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}td{max-width:300px;padding:12px 16px;border-top:1px solid #edf1f6;color:#365571;font-size:11px}tr:hover td{background:#f9fbfe}.op-value{display:inline-flex;max-width:100%;align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.op-value.good{color:#078452;font-weight:800}.op-value.warning{color:#a86000;font-weight:800}.op-state{min-height:170px;padding:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#6f839a;text-align:center;font-size:11px}.op-state b{color:#2e4e6c;font-size:13px}.op-state button{margin-top:5px;padding:9px 13px;border:0;border-radius:9px;background:#1b6bba;color:white;font-weight:800;cursor:pointer}.op-error span{max-width:580px}.op-spinner{width:22px;height:22px;border:3px solid #dce9f7;border-top-color:#2879cf;border-radius:50%;animation:op-spin .8s linear infinite}.op-limit{margin:0;padding:10px 18px;border-top:1px solid #edf1f6;color:#7c8da1;font-size:10px}.op-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:17px;color:#788ba1;font-size:10px}.op-footer button{padding:10px 13px;border:1px solid #d9e3ef;border-radius:10px;background:#fff;color:#375b7e;font-size:10px;font-weight:800;cursor:pointer}.op-footer button span{margin-left:7px;color:#1673c7}.op-footer button:hover{border-color:#f28b28;color:#143b5f}@keyframes op-spin{to{transform:rotate(360deg)}}
@media(max-width:800px){.op-content{padding:26px 18px 34px}.op-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.op-footer{align-items:flex-start;flex-direction:column}.op-table-wrap{max-height:none}td,th{padding:10px 11px}}
@media(max-width:520px){.op-topbar{height:58px;padding:0 14px}.op-content{padding:22px 12px 28px}.op-heading{align-items:flex-start;flex-direction:column}.op-refresh{align-self:stretch}.op-panel-head{padding:15px}.op-search{margin:12px}.op-table-wrap{overflow-x:auto}table{min-width:600px}}
@media(prefers-reduced-motion:reduce){.op-spinner{animation:none}}
</style>
