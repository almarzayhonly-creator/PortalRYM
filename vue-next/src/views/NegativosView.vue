<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { callPortalRpc, portalViewContext } from '../portalApi'

export interface NegativoRow {
  status?: string
  unidad?: string
  placa?: string
  panapass_numero?: string | number
  galera?: string
  supervisora?: string
  empresa?: string
  neg7?: number | string
  saldo?: number | string
}

const loading = ref(false)
const errorMsg = ref('')
const rows = ref<NegativoRow[]>([])
const filterDate = ref(new Date().toISOString().slice(0, 10))
const searchQuery = ref('')
const filterGalera = ref('TODAS')
const filterRiesgo = ref('TODOS')

function formatMoney(amount?: number | string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0'))
  return isNaN(num) ? '$0.00' : `$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const galeras = ['TODAS', 'VCARS', 'VCOMP', 'TRANS', 'INTER']

const filteredRows = computed(() => {
  let list = rows.value
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(r =>
      [r.unidad, r.placa, r.panapass_numero, r.empresa, r.galera, r.supervisora]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }
  if (filterGalera.value !== 'TODAS') {
    list = list.filter(r => (r.galera || '').toUpperCase() === filterGalera.value.toUpperCase())
  }
  if (filterRiesgo.value !== 'TODOS') {
    list = list.filter(r => {
      const n = parseInt(String(r.neg7 || 0)) || 0
      if (filterRiesgo.value === 'ALERTA') return n >= 3
      if (filterRiesgo.value === 'CUIDADO') return n === 2
      if (filterRiesgo.value === 'OK') return n <= 1
      return true
    })
  }
  return list
})

const kpiSummary = computed(() => {
  const list = filteredRows.value
  const totalSaldo = list.reduce((acc, r) => acc + (parseFloat(String(r.saldo || 0)) || 0), 0)
  const maxNeg7 = list.reduce((acc, r) => Math.max(acc, parseInt(String(r.neg7 || 0)) || 0), 0)
  const riesgo = maxNeg7 >= 3 ? 'ALERTA' : maxNeg7 === 2 ? 'CUIDADO' : 'OK'
  return {
    unidades: list.length,
    totalSaldo: Math.abs(totalSaldo),
    maxNeg7,
    riesgo
  }
})

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const payload: Record<string, any> = {
      p_fecha: filterDate.value || null,
      p_galera: filterGalera.value === 'TODAS' ? null : filterGalera.value,
      p_supervisora_id: null
    }
    const data = await callPortalRpc<NegativoRow[]>('panapass_negativos_fecha_v2', payload)
    rows.value = data || []
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al consultar negativos del día.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const ctx = portalViewContext()
  if (ctx.today) filterDate.value = ctx.today
  await load()
})
</script>

<template>
  <div class="rym-tw space-y-6" data-testid="vue-negativos">
    <!-- Header Hero Card -->
    <div class="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950 p-6 shadow-xl">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold tracking-wider uppercase mb-2">
            ⚠️ Auditoría de Saldo Negativo
          </span>
          <h2 class="text-2xl font-bold tracking-tight text-white">Negativos Panapass Hoy</h2>
          <p class="text-slate-300 text-xs mt-1 max-w-xl">
            Detalle consolidado de unidades con saldo deudor en Panapass, semáforo de reincidencia a 7 días y alertas por flota.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="load"
            :disabled="loading"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-300 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>🔄 Recargar</span>
          </button>
        </div>
      </div>

      <!-- Filtros Toolbar -->
      <div class="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Fecha</label>
          <input
            type="date"
            v-model="filterDate"
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-rose-500"
          />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Galera</label>
          <select
            id="negGaleraSelect"
            v-model="filterGalera"
            @change="load"
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-rose-500"
          >
            <option v-for="g in galeras" :key="g" :value="g">{{ g === 'TODAS' ? 'Todas las galeras' : g }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Riesgo 7D</label>
          <select
            id="negRiesgoSelect"
            v-model="filterRiesgo"
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-rose-500"
          >
            <option value="TODOS">Todos los niveles</option>
            <option value="ALERTA">ALERTA (≥ 3 días)</option>
            <option value="CUIDADO">CUIDADO (2 días)</option>
            <option value="OK">OK (≤ 1 día)</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Buscar</label>
          <input
            v-model="searchQuery"
            placeholder="Unidad, placa, empresa..."
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
          />
        </div>
        <div class="flex items-end">
          <button
            type="button"
            @click="load"
            :disabled="loading"
            class="w-full h-10 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <span>{{ loading ? 'Buscando...' : 'Consultar' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMsg" role="alert" class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
      {{ errorMsg }}
    </div>

    <!-- Resumen KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Unidades en Deuda</span>
        <b class="text-xl font-bold text-white block mt-1">{{ kpiSummary.unidades }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Saldo Total Deudor</span>
        <b class="text-xl font-bold text-rose-400 block mt-1">-{{ formatMoney(kpiSummary.totalSaldo) }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Máx Negativo 7D</span>
        <b class="text-xl font-bold text-amber-400 block mt-1">{{ kpiSummary.maxNeg7 }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Nivel de Riesgo</span>
        <b
          class="text-xl font-bold block mt-1"
          :class="kpiSummary.riesgo === 'ALERTA' ? 'text-rose-500' : kpiSummary.riesgo === 'CUIDADO' ? 'text-amber-400' : 'text-emerald-400'"
        >
          {{ kpiSummary.riesgo }}
        </b>
      </div>
    </div>

    <!-- Tabla de Resultados -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-800/60 font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th class="py-3 px-4">Estatus</th>
              <th class="py-3 px-4">Unidad</th>
              <th class="py-3 px-4">Placa</th>
              <th class="py-3 px-4">Panapass</th>
              <th class="py-3 px-4">Galera</th>
              <th class="py-3 px-4">Supervisora</th>
              <th class="py-3 px-4">Empresa</th>
              <th class="py-3 px-4 text-center">Neg. 7D</th>
              <th class="py-3 px-4 text-right">Saldo Deudor</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-slate-300">
            <tr v-if="filteredRows.length === 0 && !loading">
              <td colspan="9" class="py-8 text-center text-slate-500">
                No hay unidades con saldo negativo para los filtros seleccionados.
              </td>
            </tr>
            <tr v-for="(row, idx) in filteredRows" :key="idx" class="hover:bg-slate-800/30 transition-colors">
              <td class="py-3 px-4">
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  :class="(row.status || '').toUpperCase() === 'ACTIVO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'"
                >
                  {{ row.status || 'ACTIVO' }}
                </span>
              </td>
              <td class="py-3 px-4 font-bold text-white whitespace-nowrap">{{ row.unidad || '—' }}</td>
              <td class="py-3 px-4 text-slate-400 font-mono">{{ row.placa || '—' }}</td>
              <td class="py-3 px-4 text-slate-300 font-mono">{{ row.panapass_numero || '—' }}</td>
              <td class="py-3 px-4 text-slate-400 font-medium">{{ row.galera || '—' }}</td>
              <td class="py-3 px-4 text-slate-200 font-medium truncate max-w-[140px]">{{ row.supervisora || 'SIN SUPERVISORA' }}</td>
              <td class="py-3 px-4 text-slate-400 truncate max-w-[140px]">{{ row.empresa || '—' }}</td>
              <td class="py-3 px-4 text-center">
                <span
                  class="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold"
                  :class="Number(row.neg7 || 0) >= 3 ? 'bg-rose-500/20 text-rose-300' : Number(row.neg7 || 0) === 2 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'"
                >
                  {{ row.neg7 ?? 0 }}
                </span>
              </td>
              <td class="py-3 px-4 text-right font-bold text-rose-400 font-mono">
                -{{ formatMoney(row.saldo) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
