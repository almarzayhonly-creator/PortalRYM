<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callPortalRpc, portalViewContext } from '../portalApi'

export interface ReporteEstado {
  tipo?: string
  ultimo_envio?: string
  desde?: string
  hasta?: string
}

export interface FondeoRow {
  empresa?: string
  monto?: number | string
  registros?: number | string
}

export interface NoPreDiarioRow {
  unidad?: string
  panapass_numero?: string | number
  empresa?: string
  a_pagar?: number | string
  boleta?: number | string
  tipo?: string
  estado_cobra?: string
}

const loading = ref(false)
const errorMsg = ref('')
const activeSection = ref<'INDEX' | 'FONDEO' | 'NO_PRE'>('INDEX')

const estados = ref<ReporteEstado[]>([])
const filterDesde = ref(new Date().toISOString().slice(0, 8) + '01')
const filterHasta = ref(new Date().toISOString().slice(0, 10))

const fondeoRows = ref<FondeoRow[]>([])
const noPreRows = ref<NoPreDiarioRow[]>([])

function formatMoney(amount?: number | string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0'))
  return isNaN(num) ? '$0.00' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDT(val?: string): string {
  if (!val) return 'Sin envíos registrados'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return `${d.toLocaleDateString('es-PA')} ${d.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}`
}

function getLastStatus(type: string): string {
  const x = estados.value.find(z => z.tipo === type)
  if (!x || !x.ultimo_envio) return 'Sin envíos registrados todavía'
  return `Último envío: ${fmtDT(x.ultimo_envio)}${x.desde ? ` · ${x.desde} → ${x.hasta}` : ''}`
}

async function loadStatus() {
  try {
    const data = await callPortalRpc<ReporteEstado[]>('panapass_reportes_estado')
    estados.value = data || []
  } catch {}
}

async function previewFondeo() {
  loading.value = true
  errorMsg.value = ''
  activeSection.value = 'FONDEO'
  try {
    const data = await callPortalRpc<FondeoRow[]>('panapass_reporte_fondeo', {
      p_desde: filterDesde.value,
      p_hasta: filterHasta.value
    })
    fondeoRows.value = data || []
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al calcular reporte de fondeo.'
  } finally {
    loading.value = false
  }
}

async function previewNoPre() {
  loading.value = true
  errorMsg.value = ''
  activeSection.value = 'NO_PRE'
  try {
    const data = await callPortalRpc<NoPreDiarioRow[]>('panapass_reporte_no_pre_diario', {
      p_desde: filterDesde.value,
      p_hasta: filterHasta.value
    })
    noPreRows.value = data || []
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al consultar reporte No PRE Diario.'
  } finally {
    loading.value = false
  }
}

const totalFondeo = () => fondeoRows.value.reduce((acc, r) => acc + (parseFloat(String(r.monto || 0)) || 0), 0)
const totalNoPre = () => noPreRows.value.reduce((acc, r) => acc + (parseFloat(String(r.a_pagar || 0)) || 0), 0)

onMounted(async () => {
  const ctx = portalViewContext()
  if (ctx.today) {
    filterHasta.value = ctx.today
    filterDesde.value = ctx.today.slice(0, 8) + '01'
  }
  await loadStatus()
})
</script>

<template>
  <div class="rym-tw space-y-6" data-testid="vue-reportes">
    <!-- Header Hero Card -->
    <div class="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950 p-6 shadow-xl">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-400 text-xs font-semibold tracking-wider uppercase mb-2">
            📊 Inteligencia y Consolidación
          </span>
          <h2 class="text-2xl font-bold tracking-tight text-white">Centro de Reportes Panapass</h2>
          <p class="text-slate-300 text-xs mt-1 max-w-xl">
            Generación y auditoría de informes digitales: fondeo por empresa, transacciones especiales No PRE y conciliación de envíos.
          </p>
        </div>

        <!-- Rango de Fechas -->
        <div class="flex flex-wrap items-center gap-3">
          <div>
            <label class="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Desde</label>
            <input
              type="date"
              v-model="filterDesde"
              class="h-9 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Hasta</label>
            <input
              type="date"
              v-model="filterHasta"
              class="h-9 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMsg" role="alert" class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
      {{ errorMsg }}
    </div>

    <!-- Catálogo de Reportes Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Fondeo Administración -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">🏦</span>
            <h3 class="text-sm font-bold text-white">Fondeo Administración</h3>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Consolidado por empresa con montos netos pagados para reposición de saldo.
          </p>
          <small class="block text-[10px] text-slate-500 mt-3">{{ getLastStatus('RESUMEN_FONDEO') }}</small>
        </div>
        <button
          type="button"
          id="btnRepFondeo"
          @click="previewFondeo"
          :disabled="loading"
          class="w-full h-9 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
        >
          Vista previa Fondeo
        </button>
      </div>

      <!-- 2. No PRE Diario / Cobra -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">⚡</span>
            <h3 class="text-sm font-bold text-white">No PRE Diario / Cobra</h3>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Transacciones no regulares que requieren sincronización por la pasarela especial Cobra.
          </p>
          <small class="block text-[10px] text-slate-500 mt-3">Exclusivo pagos no estándar</small>
        </div>
        <button
          type="button"
          id="btnRepNoPre"
          @click="previewNoPre"
          :disabled="loading"
          class="w-full h-9 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-semibold text-xs rounded-xl shadow-sm transition-all"
        >
          Vista previa No PRE
        </button>
      </div>

      <!-- 3. Negativos AM por Galera -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">🌅</span>
            <h3 class="text-sm font-bold text-white">Negativos Galera</h3>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Snapshot AM validado para distribución directa entre supervisoras y gerentes.
          </p>
          <small class="block text-[10px] text-slate-500 mt-3">{{ getLastStatus('NEGATIVOS_GALERA') }}</small>
        </div>
        <div class="text-[11px] text-sky-400 font-semibold text-center py-2 bg-slate-800/40 rounded-xl border border-slate-800">
          Disponible en Negativos Hoy
        </div>
      </div>

      <!-- 4. Desempeño 4 Galeras -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">🏆</span>
            <h3 class="text-sm font-bold text-white">Cierre 4 Galeras</h3>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Consolidado por ciclo para evaluar el rendimiento de VCARS, VCOMP, VIPCO y VINDU.
          </p>
          <small class="block text-[10px] text-slate-500 mt-3">{{ getLastStatus('PAGOS_4_GALERAS') }}</small>
        </div>
        <div class="text-[11px] text-sky-400 font-semibold text-center py-2 bg-slate-800/40 rounded-xl border border-slate-800">
          Disponible en Ranking
        </div>
      </div>
    </div>

    <!-- Resultados Fondeo -->
    <div v-if="activeSection === 'FONDEO'" class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <span>🏦</span> Resumen Fondeo por Empresa
        </h3>
        <span class="text-xs text-slate-400">{{ filterDesde }} → {{ filterHasta }}</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Empresas</span>
          <b class="text-xl font-bold text-white block mt-1">{{ fondeoRows.length }}</b>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Fondeado</span>
          <b class="text-xl font-bold text-emerald-400 block mt-1">{{ formatMoney(totalFondeo()) }}</b>
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-800/60 font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th class="py-3 px-4">Empresa</th>
              <th class="py-3 px-4 text-center">Registros de Pago</th>
              <th class="py-3 px-4 text-right">Monto Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-slate-300">
            <tr v-if="fondeoRows.length === 0 && !loading">
              <td colspan="3" class="py-6 text-center text-slate-500">Sin datos de fondeo en el rango seleccionado.</td>
            </tr>
            <tr v-for="(row, idx) in fondeoRows" :key="idx" class="hover:bg-slate-800/30 transition-colors">
              <td class="py-3 px-4 font-bold text-white">{{ row.empresa || '—' }}</td>
              <td class="py-3 px-4 text-center font-mono">{{ row.registros ?? 0 }}</td>
              <td class="py-3 px-4 text-right font-bold text-emerald-400">{{ formatMoney(row.monto) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Resultados No PRE Diario -->
    <div v-if="activeSection === 'NO_PRE'" class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <span>⚡</span> Detalle Pagos No PRE Diario / Cobra
        </h3>
        <span class="text-xs text-slate-400">{{ filterDesde }} → {{ filterHasta }}</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Registros Especiales</span>
          <b class="text-xl font-bold text-white block mt-1">{{ noPreRows.length }}</b>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total a Pagar</span>
          <b class="text-xl font-bold text-cyan-400 block mt-1">{{ formatMoney(totalNoPre()) }}</b>
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-800/60 font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th class="py-3 px-4">Unidad</th>
              <th class="py-3 px-4">Panapass</th>
              <th class="py-3 px-4">Empresa</th>
              <th class="py-3 px-4 text-right">A Pagar</th>
              <th class="py-3 px-4 text-right">Boleta</th>
              <th class="py-3 px-4">Tipo</th>
              <th class="py-3 px-4 text-center">Estado Cobra</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-slate-300">
            <tr v-if="noPreRows.length === 0 && !loading">
              <td colspan="7" class="py-6 text-center text-slate-500">Sin pagos no PRE en el rango seleccionado.</td>
            </tr>
            <tr v-for="(row, idx) in noPreRows" :key="idx" class="hover:bg-slate-800/30 transition-colors">
              <td class="py-3 px-4 font-bold text-white">{{ row.unidad || '—' }}</td>
              <td class="py-3 px-4 text-slate-300 font-mono">{{ row.panapass_numero || '—' }}</td>
              <td class="py-3 px-4 text-slate-400 truncate max-w-[150px]">{{ row.empresa || '—' }}</td>
              <td class="py-3 px-4 text-right font-semibold text-emerald-400">{{ formatMoney(row.a_pagar) }}</td>
              <td class="py-3 px-4 text-right font-medium text-cyan-400">{{ formatMoney(row.boleta) }}</td>
              <td class="py-3 px-4 text-slate-300">{{ row.tipo || '—' }}</td>
              <td class="py-3 px-4 text-center">
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  :class="row.estado_cobra === 'PAGADO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'"
                >
                  {{ row.estado_cobra || 'PENDIENTE' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
