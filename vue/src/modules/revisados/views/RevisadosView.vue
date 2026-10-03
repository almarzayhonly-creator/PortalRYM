<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { RevisadoRecord } from '../types/revisados.types'
import { revisadosService } from '../services/revisados.service'
import { useRevisados } from '../composables/useRevisados'
import MissionControlSummary from '../components/MissionControlSummary.vue'
import GaleraComparison from '../components/GaleraComparison.vue'
import RevisadosFilterBar from '../components/RevisadosFilterBar.vue'
import RevisadosTable from '../components/RevisadosTable.vue'

const records = ref<RevisadoRecord[]>([])
const loading = ref(true)
const error = ref('')
const previewMode = ref(false)

const demoRows: RevisadoRecord[] = [
  { id:'demo-1', unidad:'CU9475', placa:'CU9475', galera:'VCARS', supervisora:'Michelle', estado:'vigente', fechaUltimoRevisado:'2026-09-28', prioridad:'NORMAL', detalleEstado:'Ciclo vigente cubierto', vigente:true, requiereAtencion:false, cambioColor:false, tieneAlertas:false },
  { id:'demo-2', unidad:'I236', placa:'I236', galera:'VINDU', supervisora:'Yani', estado:'pendiente_cambio_color', fechaUltimoRevisado:'2026-09-11', prioridad:'ALTA', detalleEstado:'Cambio de color · requiere nuevo revisado', vigente:false, requiereAtencion:true, cambioColor:true, tieneAlertas:true },
  { id:'demo-3', unidad:'CK7588', placa:'CK7588', galera:'VCOMP', supervisora:'Aracelys', estado:'pendiente_ciclo', fechaUltimoRevisado:'2026-09-19', prioridad:'CRITICA', detalleEstado:'Boleta asociada a placa', vigente:false, requiereAtencion:true, cambioColor:false, tieneAlertas:true },
  { id:'demo-4', unidad:'EU2460', placa:'EU2460', galera:'VIPCO', supervisora:'Yani', estado:'pendiente_ciclo', fechaUltimoRevisado:'2026-08-14', prioridad:'ACTUAL', detalleEstado:'Pendiente por ciclo', vigente:false, requiereAtencion:true, cambioColor:false, tieneAlertas:false },
  { id:'demo-5', unidad:'AB1023', placa:'AB1023', galera:'VCARS', supervisora:'Michelle', estado:'pendiente_ciclo', fechaUltimoRevisado:'2026-08-31', prioridad:'ACTUAL', detalleEstado:'Pendiente por ciclo', vigente:false, requiereAtencion:true, cambioColor:false, tieneAlertas:false },
]

const { filters, filtered, metrics, options, clearFilters } = useRevisados(records)

async function load() {
  loading.value = true
  error.value = ''
  previewMode.value = false
  try {
    records.value = await revisadosService.list()
  } catch (cause) {
    previewMode.value = true
    records.value = demoRows
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">RYM</div>
        <div><strong>Revisados</strong><small>Control legal</small></div>
      </div>
      <nav>
        <button class="active"><span>01</span>Mission Control</button>
        <button><span>02</span>Operaciones</button>
        <button><span>03</span>Avance y Auditoría</button>
        <button><span>04</span>Ficha de Unidad</button>
      </nav>
      <div class="sidebar-foot">
        <small>{{ previewMode ? 'VISTA DE DISEÑO' : 'DATOS REALES' }}</small>
        <strong>Vue 3 · Sandbox</strong>
        <span>{{ previewMode ? 'Sin impacto en producción' : 'Contrato canónico activo' }}</span>
      </div>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">PORTAL RYM · REVISADOS</p>
          <h1>Mission Control</h1>
          <p>Control de cobertura, pendientes e incidencias de la flota.</p>
        </div>
        <div class="actions">
          <button class="ghost" type="button" @click="clearFilters">Limpiar filtros</button>
          <button class="primary" type="button" :disabled="loading" @click="load">{{ loading ? 'Actualizando…' : 'Actualizar' }}</button>
        </div>
      </header>

      <div v-if="previewMode" class="preview-banner">
        <div><strong>Modo visual</strong><span>Esta ruta no está dentro del shell autenticado; se muestran datos de prueba solo para validar diseño.</span></div>
      </div>

      <section class="attention-strip">
        <div>
          <span>REQUIEREN ATENCIÓN</span>
          <strong>{{ metrics.pendientesCiclo }}</strong>
          <small>unidades en el filtro actual</small>
        </div>
        <div class="attention-copy">
          <b>{{ metrics.vigentes }} al día</b>
          <span>Cambio de color y alertas pueden ser subconjuntos de los pendientes.</span>
        </div>
      </section>

      <MissionControlSummary
        :total="metrics.total"
        :vigentes="metrics.vigentes"
        :pendientes="metrics.pendientesCiclo"
        :cambios-color="metrics.cambiosColor"
        :incidencias="metrics.incidencias"
      />

      <RevisadosFilterBar v-model="filters" :galeras="options.galeras" :supervisoras="options.supervisoras" />
      <GaleraComparison :rows="filtered" />

      <div v-if="loading" class="loading-card">Cargando Revisados…</div>
      <RevisadosTable v-else :rows="filtered" />
      <div v-if="error && !previewMode" class="error-card">{{ error }}</div>
    </section>
  </main>
</template>

<style>
*{box-sizing:border-box}
html,body,#app{margin:0;min-height:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;background:#f4f6fa;color:#0f172a}
button,input,select{font:inherit}button{cursor:pointer}
.app-shell{min-height:100vh;display:grid;grid-template-columns:220px minmax(0,1fr)}
.sidebar{position:sticky;top:0;height:100vh;padding:20px 13px;background:#0a1120;color:#fff;display:flex;flex-direction:column;border-right:1px solid rgba(255,255,255,.04)}
.brand{display:flex;align-items:center;gap:10px;padding:3px 8px 24px}.brand-mark{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:#0062ff;color:#fff;font-size:12px;font-weight:950}.brand strong{display:block;font-size:14px}.brand small{display:block;margin-top:2px;color:#71849f;font-size:9px;text-transform:uppercase;letter-spacing:.08em}
nav{display:grid;gap:5px}nav button{display:flex;align-items:center;gap:10px;min-height:42px;padding:0 10px;border:0;border-radius:9px;background:transparent;color:#8da0ba;text-align:left;font-size:12px}nav button span{font-size:9px;color:#526782}nav button.active{background:#10243e;color:#fff}nav button.active span{color:#4e8fff}
.sidebar-foot{margin-top:auto;padding:13px 9px;border-top:1px solid rgba(255,255,255,.08);display:grid;gap:3px}.sidebar-foot small{font-size:8px;letter-spacing:.12em;color:#6e829f}.sidebar-foot strong{font-size:11px}.sidebar-foot span{font-size:9px;color:#6e829f}
.workspace{padding:26px 30px 42px;min-width:0;display:grid;gap:12px}
.topbar{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:4px}.eyebrow{margin:0 0 5px;color:#0062ff;font-size:9px;font-weight:900;letter-spacing:.15em}.topbar h1{margin:0;font-size:38px;letter-spacing:-.05em}.topbar p:last-child{margin:5px 0 0;color:#64748b;font-size:13px}.actions{display:flex;gap:8px}.actions button{height:38px;padding:0 13px;border-radius:9px;font-weight:800;font-size:11px}.ghost{border:1px solid #d8e0ea;background:#fff;color:#334155}.primary{border:1px solid #0062ff;background:#0062ff;color:#fff}.primary:disabled{opacity:.6;cursor:progress}
.preview-banner{padding:11px 14px;border:1px solid #cfe0ff;border-radius:12px;background:#f4f8ff}.preview-banner>div{display:flex;gap:8px;align-items:center}.preview-banner strong{font-size:11px;color:#0062ff}.preview-banner span{font-size:10px;color:#64748b}
.attention-strip{display:flex;justify-content:space-between;align-items:end;gap:20px;padding:16px 18px;border:1px solid #e2e8f0;border-radius:14px;background:#fff}.attention-strip>div:first-child{display:flex;align-items:end;gap:8px}.attention-strip span{font-size:9px;font-weight:900;letter-spacing:.13em;color:#64748b}.attention-strip strong{font-size:27px;letter-spacing:-.04em}.attention-strip small{padding-bottom:4px;color:#94a3b8}.attention-copy{display:grid;justify-items:end}.attention-copy b{font-size:11px;color:#16a34a}.attention-copy span{font-size:9px;letter-spacing:0;text-transform:none;font-weight:600;color:#94a3b8}
.loading-card,.error-card{padding:14px;border-radius:12px}.loading-card{border:1px solid #e2e8f0;background:#fff;color:#64748b}.error-card{border:1px solid #fecaca;background:#fff1f2;color:#b91c1c}
@media(max-width:950px){.app-shell{grid-template-columns:78px minmax(0,1fr)}.brand>div:last-child,nav button:not(.active),.sidebar-foot{display:none}.brand{justify-content:center}.sidebar nav button{justify-content:center}.workspace{padding:20px}.topbar{align-items:start;flex-direction:column}.attention-strip{align-items:start;flex-direction:column}.attention-copy{justify-items:start}}
@media(max-width:650px){.app-shell{display:block}.sidebar{display:none}.workspace{padding:16px}}
</style>
