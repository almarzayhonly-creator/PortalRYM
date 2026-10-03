<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { RevisadoRecord } from '../types/revisados.types'
import { revisadosService, type RevisadosNavItem } from '../services/revisados.service'
import { useRevisados } from '../composables/useRevisados'
import MissionControlSummary from '../components/MissionControlSummary.vue'
import GaleraComparison from '../components/GaleraComparison.vue'
import RevisadosFilterBar from '../components/RevisadosFilterBar.vue'
import RevisadosTable from '../components/RevisadosTable.vue'

const records = ref<RevisadoRecord[]>([])
const loading = ref(true)
const error = ref('')
const previewMode = ref(false)
const profileName = ref('Portal RYM')
const profileRole = ref('')
const scopeLabel = ref('')
const navItems = ref<RevisadosNavItem[]>([{id:'dashboard',label:'Dashboard',icon:'⌂'}])
const logoUrl = 'https://drive.google.com/thumbnail?id=1f65vwdwsAraUrK2h7cb5l_eVOQKuHsL8&sz=w1000'

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
    const context = revisadosService.context()
    profileName.value = context.profile?.nombre || 'Portal RYM'
    profileRole.value = context.profile?.rol || ''
    scopeLabel.value = context.profile?.scope_label || ''
    navItems.value = context.tabs
  } catch (cause) {
    previewMode.value = true
    records.value = demoRows
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    loading.value = false
  }
}

function openTab(id:string){
  if(id==='dashboard') return
  revisadosService.navigate(id)
}

onMounted(load)
</script>

<template>
  <main class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <img class="brand-logo" :src="logoUrl" alt="RYM">
        <div><strong>Revisados RYM</strong><small>Control legal vehicular</small></div>
      </div>

      <div class="user-card">
        <strong>{{ profileName }}</strong>
        <span>{{ profileRole }}</span>
        <small>{{ scopeLabel }}</small>
      </div>

      <nav>
        <span class="nav-label">REVISADOS</span>
        <button v-for="item in navItems" :key="item.id" :class="{active:item.id==='dashboard'}" @click="openTab(item.id)">
          <span class="nav-icon">{{ item.icon }}</span>{{ item.label }}
        </button>
      </nav>

      <div class="sidebar-foot">
        <small>VUE 3 · SANDBOX</small>
        <span>Sin impacto en producción</span>
      </div>
    </aside>

    <section class="main-area">
      <header class="product-bar">
        <div class="product-left">
          <strong>Revisados RYM</strong>
          <span></span>
          <button class="top-link active">Dashboard</button>
          <button v-if="navItems.some(x=>x.id==='operations')" class="top-link" @click="openTab('operations')">Operaciones</button>
          <button v-if="navItems.some(x=>x.id==='monthly')" class="top-link" @click="openTab('monthly')">Avance mensual</button>
        </div>
        <div class="product-right">
          <span class="status-pill">SANDBOX</span>
          <span class="user-pill">{{ profileName }}</span>
        </div>
      </header>

      <section class="workspace">
        <header class="topbar">
          <div>
            <p class="breadcrumb">Portal RYM / Revisados</p>
            <p class="eyebrow">PANEL DE CONTROL / CONTROL LEGAL</p>
            <h1>Mission Control</h1>
            <p>Supervisión operativa de cobertura, pendientes e incidencias de la flota.</p>
          </div>
          <div class="actions">
            <button class="ghost" type="button" @click="clearFilters">Limpiar filtros</button>
            <button class="primary" type="button" :disabled="loading" @click="load">{{ loading ? 'Actualizando…' : 'Actualizar vista' }}</button>
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
    </section>
  </main>
</template>

<style>
*{box-sizing:border-box}
html,body,#app{margin:0;min-height:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f6f7fb;color:#13203a}
button,input,select{font:inherit}button{cursor:pointer}
.app-shell{min-height:100vh;display:grid;grid-template-columns:236px minmax(0,1fr)}
.sidebar{position:sticky;top:0;height:100vh;padding:18px 12px;background:#fff;color:#27364f;display:flex;flex-direction:column;border-right:1px solid #e5e9f0;overflow:hidden}
.brand{display:flex;align-items:center;gap:10px;padding:2px 7px 18px;min-width:0}.brand-logo{width:44px;height:44px;max-width:44px;max-height:44px;flex:0 0 44px;display:block;object-fit:contain;border-radius:10px}.brand>div{min-width:0}.brand strong{display:block;font-size:14px;color:#16243b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.brand small{display:block;margin-top:2px;color:#8a97aa;font-size:9px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.env-card{display:flex;gap:9px;align-items:flex-start;margin:0 0 18px;padding:12px;border:1px solid #f0d6a8;border-radius:12px;background:#fffaf0}.env-card .dot{width:7px;height:7px;margin-top:4px;border-radius:50%;background:#ff9800}.env-card div{display:grid;gap:2px}.env-card b{font-size:10px;color:#bd6400;letter-spacing:.04em}.env-card small{font-size:9px;color:#7a8799}
nav{display:grid;gap:4px}.nav-label{padding:0 9px 6px;font-size:9px;font-weight:850;letter-spacing:.08em;color:#98a3b3}nav button{display:flex;align-items:center;gap:10px;min-height:42px;padding:0 10px;border:0;border-radius:9px;background:transparent;color:#59677d;text-align:left;font-size:12px;font-weight:650}.nav-icon{width:18px;color:#7c8aa0;font-size:13px}nav button.active{position:relative;background:#fff1f1;color:#c4522a;box-shadow:inset 0 0 0 1px #ffc7a8}nav button.active:before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:999px;background:#ff9800}nav button.active .nav-icon{color:#ff9800}
.sidebar-foot{margin-top:auto;padding:13px 9px;border-top:1px solid #edf0f5;display:grid;gap:3px}.sidebar-foot small{font-size:8px;letter-spacing:.1em;color:#8290a4}.sidebar-foot span{font-size:9px;color:#9aa5b5}
.main-area{min-width:0}
.product-bar{height:58px;display:flex;justify-content:space-between;align-items:center;padding:0 26px;background:#fff;border-bottom:1px solid #e6e9ef;box-shadow:0 1px 0 rgba(16,24,40,.02)}
.product-left,.product-right{display:flex;align-items:center;gap:14px}.product-left>strong{font-size:13px;color:#17243a}.product-left>span{width:1px;height:24px;background:#e4e8ee}.top-link{height:58px;border:0;background:transparent;color:#66758b;font-size:11px;font-weight:700;position:relative}.top-link.active{color:#c65c13}.top-link.active:after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:#ff9800}.status-pill{padding:5px 10px;border:1px solid #f4c889;border-radius:999px;background:#fff7e8;color:#a65c12;font-size:9px;font-weight:850}.user-pill{padding:7px 10px;border-radius:999px;background:#f2f4f8;color:#526075;font-size:10px;font-weight:750}
.workspace{padding:26px 30px 42px;min-width:0;display:grid;gap:12px}
.topbar{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:4px}.breadcrumb{margin:0 0 17px;color:#54637a;font-size:10px}.eyebrow{margin:0 0 5px;color:#0062ff;font-size:9px;font-weight:900;letter-spacing:.11em}.topbar h1{margin:0;font-size:36px;letter-spacing:-.045em}.topbar p:last-child{margin:5px 0 0;color:#66758b;font-size:13px}.actions{display:flex;gap:8px}.actions button{height:38px;padding:0 13px;border-radius:9px;font-weight:800;font-size:11px}.ghost{border:1px solid #d8dee8;background:#fff;color:#41506a}.primary{border:1px solid #0062ff;background:#0062ff;color:#fff;box-shadow:0 7px 18px rgba(0,98,255,.16)}.primary:disabled{opacity:.6;cursor:progress}
.preview-banner{padding:10px 13px;border:1px solid #d7e5ff;border-radius:10px;background:#f7faff}.preview-banner>div{display:flex;gap:8px;align-items:center}.preview-banner strong{font-size:10px;color:#0062ff}.preview-banner span{font-size:10px;color:#6c7a90}
.attention-strip{display:flex;justify-content:space-between;align-items:end;gap:20px;padding:14px 16px;border:1px solid #e1e5ec;border-radius:12px;background:#fff}.attention-strip>div:first-child{display:flex;align-items:end;gap:8px}.attention-strip span{font-size:9px;font-weight:900;letter-spacing:.11em;color:#69778d}.attention-strip strong{font-size:25px;letter-spacing:-.04em}.attention-strip small{padding-bottom:3px;color:#96a1b1}.attention-copy{display:grid;justify-items:end}.attention-copy b{font-size:10px;color:#16a34a}.attention-copy span{font-size:9px;letter-spacing:0;text-transform:none;font-weight:600;color:#98a3b3}
.loading-card,.error-card{padding:14px;border-radius:12px}.loading-card{border:1px solid #e2e8f0;background:#fff;color:#64748b}.error-card{border:1px solid #fecaca;background:#fff1f2;color:#b91c1c}
@media(max-width:1000px){.app-shell{grid-template-columns:80px minmax(0,1fr)}.brand>div:last-child,.env-card div,nav button:not(.active),.sidebar-foot{display:none}.brand{justify-content:center}.env-card{justify-content:center;padding:10px}.sidebar nav button{justify-content:center}.product-bar{padding:0 18px}.workspace{padding:20px}.topbar{align-items:start;flex-direction:column}.attention-strip{align-items:start;flex-direction:column}.attention-copy{justify-items:start}}
@media(max-width:700px){.app-shell{display:block}.sidebar{display:none}.product-left .top-link{display:none}.workspace{padding:16px}}
</style>
