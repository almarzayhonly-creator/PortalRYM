<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { callPortalRpc, portalViewContext } from '../portalApi'

export interface PagoRow {
  unidad?: string
  panapass_numero?: string | number
  galera?: string
  supervisora?: string
  empresa?: string
  a_pagar?: number | string
  boleta?: number | string
  pag7?: number | string
  n_op?: string
  operador?: string
  tipo?: string
  estado_cobra?: string
}

const loading = ref(false)
const errorMsg = ref('')
const rows = ref<PagoRow[]>([])
const filterDate = ref(new Date().toISOString().slice(0, 10))
const searchQuery = ref('')
const filterGalera = ref('TODAS')
const filterCobra = ref('TODOS')

function formatMoney(amount?: number | string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0'))
  return isNaN(num) ? '$0.00' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const galeras = ['TODAS', 'VCARS', 'VCOMP', 'TRANS', 'INTER']

const filteredRows = computed(() => {
  let list = rows.value
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(r =>
      [r.unidad, r.panapass_numero, r.empresa, r.galera, r.supervisora, r.operador, r.n_op, r.tipo, r.estado_cobra]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }
  if (filterGalera.value !== 'TODAS') {
    list = list.filter(r => (r.galera || '').toUpperCase() === filterGalera.value.toUpperCase())
  }
  if (filterCobra.value !== 'TODOS') {
    list = list.filter(r => (r.estado_cobra || '').toUpperCase() === filterCobra.value.toUpperCase())
  }
  return list
})

const kpiSummary = computed(() => {
  const list = filteredRows.value
  const totalPagado = list.reduce((acc, r) => acc + (parseFloat(String(r.a_pagar || 0)) || 0), 0)
  const totalBoleta = list.reduce((acc, r) => acc + (parseFloat(String(r.boleta || 0)) || 0), 0)
  const maxPag7 = list.reduce((acc, r) => Math.max(acc, parseInt(String(r.pag7 || 0)) || 0), 0)
  return {
    pagos: list.length,
    totalPagado,
    totalBoleta,
    maxPag7
  }
})

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const payload: Record<string, any> = {
      p_fecha: filterDate.value || null,
      p_galera: filterGalera.value === 'TODAS' ? null : filterGalera.value,
      p_supervisora: null
    }
    const data = await callPortalRpc<PagoRow[]>('panapass_pagos_fecha_v2', payload)
    rows.value = data || []
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al consultar pagos del día.'
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
  <div class="rym-tw space-y-6" data-testid="vue-pagos">
    <!-- Header Hero Card -->
    <div class="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 p-6 shadow-xl">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold tracking-wider uppercase mb-2">
            💵 Liquidación Diaria
          </span>
          <h2 class="text-2xl font-bold tracking-tight text-white">Pagos Registrados</h2>
          <p class="text-slate-300 text-xs mt-1 max-w-xl">
            Detalle en vivo de pagos procesados por unidad, supervisora y empresa con validación cruzada de boletas.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="load"
            :disabled="loading"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
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
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Galera</label>
          <select
            v-model="filterGalera"
            @change="load"
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-emerald-500"
          >
            <option v-for="g in galeras" :key="g" :value="g">{{ g === 'TODAS' ? 'Todas las galeras' : g }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Estado Cobra</label>
          <select
            v-model="filterCobra"
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-emerald-500"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="PAGADO">PAGADO</option>
            <option value="PENDIENTE">PENDIENTE</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Buscar</label>
          <input
            v-model="searchQuery"
            placeholder="Unidad, N_OP, operador..."
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
          />
        </div>
        <div class="flex items-end">
          <button
            type="button"
            @click="load"
            :disabled="loading"
            class="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
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
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Pagos</span>
        <b class="text-xl font-bold text-white block mt-1">{{ kpiSummary.pagos }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Pagado</span>
        <b class="text-xl font-bold text-emerald-400 block mt-1">{{ formatMoney(kpiSummary.totalPagado) }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Boleta</span>
        <b class="text-xl font-bold text-cyan-400 block mt-1">{{ formatMoney(kpiSummary.totalBoleta) }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Máx Pagos 7D</span>
        <b class="text-xl font-bold text-purple-400 block mt-1">{{ kpiSummary.maxPag7 }}</b>
      </div>
    </div>

    <!-- Tabla de Resultados -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-800/60 font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th class="py-3 px-4">Unidad</th>
              <th class="py-3 px-4">Panapass</th>
              <th class="py-3 px-4">Galera</th>
              <th class="py-3 px-4">Supervisora</th>
              <th class="py-3 px-4">Empresa</th>
              <th class="py-3 px-4 text-right">A Pagar</th>
              <th class="py-3 px-4 text-right">Boleta</th>
              <th class="py-3 px-4 text-center">Pag. 7D</th>
              <th class="py-3 px-4">N_OP</th>
              <th class="py-3 px-4">Operador</th>
              <th class="py-3 px-4">Tipo</th>
              <th class="py-3 px-4 text-center">Estado Cobra</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-slate-300">
            <tr v-if="filteredRows.length === 0 && !loading">
              <td colspan="12" class="py-8 text-center text-slate-500">
                No hay pagos registrados para la fecha seleccionada.
              </td>
            </tr>
            <tr v-for="(row, idx) in filteredRows" :key="idx" class="hover:bg-slate-800/30 transition-colors">
              <td class="py-3 px-4 font-bold text-white whitespace-nowrap">{{ row.unidad || '—' }}</td>
              <td class="py-3 px-4 text-slate-300 font-mono">{{ row.panapass_numero || '—' }}</td>
              <td class="py-3 px-4 text-slate-400 font-medium">{{ row.galera || '—' }}</td>
              <td class="py-3 px-4 text-slate-200 font-medium truncate max-w-[120px]">{{ row.supervisora || 'SIN SUPERVISORA' }}</td>
              <td class="py-3 px-4 text-slate-400 truncate max-w-[120px]">{{ row.empresa || '—' }}</td>
              <td class="py-3 px-4 text-right font-semibold text-emerald-400">{{ formatMoney(row.a_pagar) }}</td>
              <td class="py-3 px-4 text-right font-semibold text-cyan-400">{{ formatMoney(row.boleta) }}</td>
              <td class="py-3 px-4 text-center font-mono">{{ row.pag7 ?? 0 }}</td>
              <td class="py-3 px-4 text-slate-400 font-mono">{{ row.n_op || '—' }}</td>
              <td class="py-3 px-4 text-slate-200 truncate max-w-[140px]">{{ row.operador || '—' }}</td>
              <td class="py-3 px-4 text-slate-400">{{ row.tipo || '—' }}</td>
              <td class="py-3 px-4 text-center">
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  :class="row.estado_cobra === 'PAGADO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'"
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
