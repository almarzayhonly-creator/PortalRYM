<script setup lang="ts">
import { computed, ref } from 'vue'

type DemoRow = {
  unidad: string
  placa: string
  galera: string
  supervisora: string
  estado: 'VIGENTE' | 'PENDIENTE' | 'CAMBIO_COLOR' | 'INCIDENCIA'
  ultimo: string
  detalle: string
}

const demoRows = ref<DemoRow[]>([
  { unidad:'CU9475', placa:'CU9475', galera:'VCARS', supervisora:'Michelle', estado:'VIGENTE', ultimo:'28 sep 2026', detalle:'Ciclo vigente cubierto' },
  { unidad:'I236', placa:'I236', galera:'VINDU', supervisora:'Yani', estado:'CAMBIO_COLOR', ultimo:'11 sep 2026', detalle:'Cambio de color · requiere nuevo revisado' },
  { unidad:'CK7588', placa:'CK7588', galera:'VCOMP', supervisora:'Aracelys', estado:'INCIDENCIA', ultimo:'19 sep 2026', detalle:'Boleta asociada a placa' },
  { unidad:'EU2460', placa:'EU2460', galera:'VIPCO', supervisora:'Yani', estado:'PENDIENTE', ultimo:'14 ago 2026', detalle:'Pendiente por ciclo' },
  { unidad:'AB1023', placa:'AB1023', galera:'VCARS', supervisora:'Michelle', estado:'PENDIENTE', ultimo:'31 ago 2026', detalle:'Pendiente por ciclo' },
])

const q = ref('')
const galera = ref('TODAS')
const estado = ref('TODOS')

const rows = computed(() => demoRows.value.filter(r => {
  const matchesQ = !q.value || [r.unidad,r.placa,r.supervisora,r.detalle].join(' ').toLowerCase().includes(q.value.toLowerCase())
  const matchesG = galera.value === 'TODAS' || r.galera === galera.value
  const matchesE = estado.value === 'TODOS' || r.estado === estado.value
  return matchesQ && matchesG && matchesE
}))

const total = computed(() => rows.value.length)
const vigentes = computed(() => rows.value.filter(r=>r.estado==='VIGENTE').length)
const pendientes = computed(() => rows.value.filter(r=>r.estado==='PENDIENTE').length)
const cambios = computed(() => rows.value.filter(r=>r.estado==='CAMBIO_COLOR').length)
const incidencias = computed(() => rows.value.filter(r=>r.estado==='INCIDENCIA').length)
const cobertura = computed(() => total.value ? Math.round((vigentes.value/total.value)*100) : 0)

function badgeClass(estado: DemoRow['estado']) {
  return {
    VIGENTE:'ok',
    PENDIENTE:'pending',
    CAMBIO_COLOR:'color',
    INCIDENCIA:'issue',
  }[estado]
}

function badgeLabel(estado: DemoRow['estado']) {
  return {
    VIGENTE:'Vigente',
    PENDIENTE:'Pendiente',
    CAMBIO_COLOR:'Cambio de color',
    INCIDENCIA:'Incidencia',
  }[estado]
}
</script>

<template>
  <main class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">RYM</div>
        <div>
          <strong>Revisados</strong>
          <small>Control legal</small>
        </div>
      </div>

      <nav>
        <button class="active"><span>01</span>Resumen</button>
        <button><span>02</span>Operaciones</button>
        <button><span>03</span>Avance</button>
        <button><span>04</span>Historial</button>
      </nav>

      <div class="sandbox">
        <small>DEMO VISUAL</small>
        <strong>Vue 3 · Sandbox</strong>
        <span>Sin impacto en producción</span>
      </div>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">PORTAL RYM · REVISADOS VUE</p>
          <h1>Centro de control</h1>
          <p>Una vista operativa más clara, densa y moderna.</p>
        </div>
        <div class="actions">
          <button class="ghost">Exportar</button>
          <button class="primary">Actualizar</button>
        </div>
      </header>

      <section class="hero">
        <div>
          <span class="hero-kicker">ESTADO DEL ALCANCE</span>
          <h2>{{ pendientes + cambios + incidencias }} unidades requieren atención</h2>
          <p>{{ vigentes }} están al día en este filtro.</p>
        </div>
        <div class="coverage">
          <span>Cobertura</span>
          <strong>{{ cobertura }}%</strong>
          <div class="track"><i :style="{width:cobertura+'%'}"></i></div>
        </div>
      </section>

      <section class="metrics">
        <article><span>Total filtrado</span><strong>{{ total }}</strong><small>unidades visibles</small></article>
        <article class="ok-card"><span>Vigentes</span><strong>{{ vigentes }}</strong><small>ciclo cubierto</small></article>
        <article class="pending-card"><span>Pendientes</span><strong>{{ pendientes }}</strong><small>gestión del ciclo</small></article>
        <article class="color-card"><span>Cambio de color</span><strong>{{ cambios }}</strong><small>nuevo revisado</small></article>
        <article class="issue-card"><span>Incidencias</span><strong>{{ incidencias }}</strong><small>requieren revisión</small></article>
      </section>

      <section class="filters">
        <div class="filters-head">
          <div>
            <span>EXPLORAR FLOTA</span>
            <h3>Filtros operativos</h3>
          </div>
          <b>{{ rows.length }} resultados</b>
        </div>

        <div class="filter-grid">
          <label>
            <span>Buscar unidad, placa o supervisora</span>
            <input v-model="q" placeholder="Ej. CU9475" />
          </label>
          <label>
            <span>Galera</span>
            <select v-model="galera">
              <option>TODAS</option>
              <option>VCARS</option>
              <option>VCOMP</option>
              <option>VIPCO</option>
              <option>VINDU</option>
            </select>
          </label>
          <label>
            <span>Estatus</span>
            <select v-model="estado">
              <option>TODOS</option>
              <option value="VIGENTE">Vigente</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="CAMBIO_COLOR">Cambio de color</option>
              <option value="INCIDENCIA">Incidencia</option>
            </select>
          </label>
        </div>
      </section>

      <section class="table-card">
        <div class="table-title">
          <div>
            <span>DETALLE</span>
            <h3>Unidades</h3>
          </div>
          <small>Datos de muestra para validar diseño</small>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Unidad</th>
                <th>Placa</th>
                <th>Galera</th>
                <th>Supervisora</th>
                <th>Último revisado</th>
                <th>Estatus</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.unidad">
                <td class="unit">{{ r.unidad }}</td>
                <td>{{ r.placa }}</td>
                <td><span class="galera">{{ r.galera }}</span></td>
                <td>{{ r.supervisora }}</td>
                <td>{{ r.ultimo }}</td>
                <td><span class="badge" :class="badgeClass(r.estado)">{{ badgeLabel(r.estado) }}</span></td>
                <td class="detail">{{ r.detalle }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  </main>
</template>

<style>
*{box-sizing:border-box}
html,body,#app{margin:0;min-height:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;background:#f3f6fb;color:#111827}
button,input,select{font:inherit}
button{cursor:pointer}
.app-shell{min-height:100vh;display:grid;grid-template-columns:220px minmax(0,1fr)}
.sidebar{position:sticky;top:0;height:100vh;background:#0b1422;color:white;padding:22px 14px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:11px;padding:4px 7px 26px}
.brand-mark{width:38px;height:38px;border-radius:12px;background:#f7c948;color:#0b1422;display:grid;place-items:center;font-weight:950;letter-spacing:-.05em}
.brand strong{display:block;font-size:15px}
.brand small{display:block;margin-top:2px;color:#7388a4;font-size:10px;text-transform:uppercase;letter-spacing:.08em}
nav{display:grid;gap:6px}
nav button{display:flex;gap:10px;align-items:center;height:44px;border:0;border-radius:11px;background:transparent;color:#8da0b8;padding:0 11px;text-align:left}
nav button span{font-size:10px;color:#53667f}
nav button.active{background:#16263b;color:#fff}
nav button.active span{color:#7facff}
.sandbox{margin-top:auto;padding:14px 10px;border-top:1px solid rgba(255,255,255,.08);display:grid;gap:3px}
.sandbox small{font-size:9px;letter-spacing:.12em;color:#6d829d}
.sandbox strong{font-size:12px}
.sandbox span{font-size:10px;color:#6d829d}

.workspace{padding:30px 34px 46px;min-width:0}
.topbar{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:20px}
.eyebrow{margin:0 0 6px;color:#4d78bd;font-size:10px;font-weight:900;letter-spacing:.14em}
.topbar h1{margin:0;font-size:42px;letter-spacing:-.055em}
.topbar p:last-child{margin:6px 0 0;color:#667085}
.actions{display:flex;gap:8px}
.actions button{height:40px;padding:0 14px;border-radius:10px;font-weight:800}
.ghost{border:1px solid #d7dde6;background:#fff;color:#344054}
.primary{border:1px solid #111827;background:#111827;color:#fff}

.hero{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:28px;align-items:end;padding:30px;border-radius:24px;background:linear-gradient(135deg,#10223a,#152d4b);color:#fff;box-shadow:0 24px 60px rgba(16,34,58,.14)}
.hero-kicker{font-size:10px;font-weight:900;letter-spacing:.14em;color:#82adff}
.hero h2{margin:8px 0 7px;font-size:clamp(30px,4vw,52px);line-height:.95;letter-spacing:-.055em;max-width:820px}
.hero p{margin:0;color:#a6b7cc}
.coverage{display:grid;gap:7px}
.coverage span{font-size:11px;color:#96aac4;font-weight:800}
.coverage strong{font-size:48px;letter-spacing:-.06em}
.track{height:8px;background:#263e5c;border-radius:999px;overflow:hidden}
.track i{display:block;height:100%;background:#82adff;border-radius:inherit}

.metrics{display:grid;grid-template-columns:1.15fr repeat(4,1fr);gap:10px;margin:12px 0 18px}
.metrics article{position:relative;display:grid;gap:5px;padding:17px 18px;border:1px solid #e2e7ed;border-radius:16px;background:#fff;overflow:hidden}
.metrics article:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#7d8ca0}
.metrics .ok-card:before{background:#2f9b68}
.metrics .pending-card:before{background:#e24d5b}
.metrics .color-card:before{background:#e69a2a}
.metrics .issue-card:before{background:#765bc0}
.metrics span{font-size:11px;color:#667085;font-weight:800}
.metrics strong{font-size:30px;letter-spacing:-.04em}
.metrics small{color:#98a2b3}

.filters,.table-card{border:1px solid #e1e6ed;border-radius:18px;background:#fff}
.filters{padding:18px;margin-bottom:12px}
.filters-head,.table-title{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:14px}
.filters-head span,.table-title span{font-size:9px;font-weight:900;letter-spacing:.14em;color:#7b8ca3}
.filters-head h3,.table-title h3{margin:3px 0 0;font-size:20px;letter-spacing:-.03em}
.filters-head b,.table-title small{font-size:12px;color:#667085}
.filter-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px}
label{display:grid;gap:7px}
label span{font-size:11px;font-weight:800;color:#475467}
input,select{height:44px;border:1px solid #d6dde6;border-radius:11px;padding:0 12px;background:#fff;color:#111827;outline:none}
input:focus,select:focus{border-color:#6c9ae7;box-shadow:0 0 0 4px rgba(108,154,231,.1)}

.table-card{padding:16px 0 0;overflow:hidden}
.table-title{padding:0 18px}
.table-wrap{overflow:auto}
table{width:100%;border-collapse:collapse;min-width:1020px;font-size:13px}
th{padding:12px 14px;text-align:left;background:#f8fafc;border-top:1px solid #edf0f3;border-bottom:1px solid #e2e7ed;color:#667085;font-size:10px;letter-spacing:.05em;text-transform:uppercase}
td{padding:14px;border-bottom:1px solid #eef1f4;color:#344054}
tbody tr:hover{background:#fbfcfe}
.unit{font-weight:850;color:#111827}
.galera{font-size:11px;font-weight:800;color:#3e5f92}
.badge{display:inline-flex;align-items:center;min-height:26px;padding:0 10px;border-radius:999px;font-size:11px;font-weight:850}
.badge.ok{background:#edf9f2;color:#23724d}
.badge.pending{background:#fff0f1;color:#b33d49}
.badge.color{background:#fff5e8;color:#a36213}
.badge.issue{background:#f3efff;color:#6650a8}
.detail{min-width:250px}

@media(max-width:1050px){
  .app-shell{grid-template-columns:82px minmax(0,1fr)}
  .brand>div:last-child,nav button:not(.active){font-size:0}
  nav button{justify-content:center}
  .sandbox{display:none}
  .metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .hero{grid-template-columns:1fr}
}
@media(max-width:720px){
  .app-shell{display:block}
  .sidebar{display:none}
  .workspace{padding:18px}
  .topbar{align-items:start;flex-direction:column}
  .filter-grid{grid-template-columns:1fr}
  .metrics{grid-template-columns:1fr 1fr}
}
</style>
