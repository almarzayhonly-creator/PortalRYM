<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { callPortalRpc } from '../portalApi'

export interface RecurrenteRow {
  tipo_entidad?: 'OPERADOR' | 'UNIDAD' | string
  identificador?: string
  nombre?: string
  unidad?: string
  supervisora?: string
  galera?: string
  pagos?: number | string
  dias_con_pago?: number | string
  total_pagado?: number | string
  nivel?: 'CRITICO' | 'RECURRENTE' | string
}

const loading = ref(false)
const errorMsg = ref('')
const rows = ref<RecurrenteRow[]>([])
const mode = ref<'OPERADOR' | 'UNIDAD'>('OPERADOR')
const filterMonth = ref(new Date().toISOString().slice(0, 7))
const filterGalera = ref('')
const minPagos = ref(5)
const searchQuery = ref('')
const page = ref(1)
const pageSize = 20

const galeras = ['', 'VCARS', 'VCOMP', 'VIPCO', 'VINDU', 'TRANS', 'INTER']

function formatMoney(amount?: number | string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0'))
  return isNaN(num) ? '$0.00' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const filteredList = computed(() => {
  const q = searchQuery.value.trim().toUpperCase()
  return rows.value.filter(r => {
    if (r.tipo_entidad !== mode.value) return false
    if (!q) return true
    return [r.identificador, r.nombre, r.unidad, r.supervisora, r.galera]
      .filter(Boolean)
      .join(' ')
      .toUpperCase()
      .includes(q)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredList.value.length / pageSize)))

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredList.value.slice(start, start + pageSize)
})

const kpiSummary = computed(() => {
  const list = filteredList.value
  const criticos = list.filter(r => (r.nivel || '').toUpperCase() === 'CRITICO').length
  const total = list.reduce((acc, r) => acc + (parseFloat(String(r.total_pagado || 0)) || 0), 0)
  return {
    totalRecurrentes: list.length,
    criticos,
    totalPagado: total
  }
})

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [y, m] = filterMonth.value.split('-').map(Number)
    const desde = `${y}-${String(m).padStart(2, '0')}-01`
    const hasta = new Date(y, m, 0).toISOString().slice(0, 10)

    const data = await callPortalRpc<RecurrenteRow[]>('panapass_recurrentes_entidad', {
      p_desde: desde,
      p_hasta: hasta,
      p_galera: filterGalera.value || null,
      p_min_pagos: Number(minPagos.value || 5),
      p_limit: 2000
    })
    rows.value = data || []
    page.value = 1
  } catch (err: any) {
    errorMsg.value = err.message || 'Error consultando pagos recurrentes.'
  } finally {
    loading.value = false
  }
}

function setMode(m: 'OPERADOR' | 'UNIDAD') {
  mode.value = m
  page.value = 1
}

onMounted(load)
</script>

<template>
  <div class="rym-tw space-y-6" data-testid="vue-recurrentes">
    <!-- Header Hero Card -->
    <div class="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 p-6 shadow-xl">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-2">
            🔄 Frecuencia y Concentración de Pagos
          </span>
          <h2 class="text-2xl font-bold tracking-tight text-white">Pagos Recurrentes</h2>
          <p class="text-slate-300 text-xs mt-1 max-w-xl">
            Detecta operadores o unidades que requirieron múltiples pagos durante el ciclo mensual para auditar anomalías de saldo.
          </p>
        </div>

        <!-- Modo Switcher (Operador vs Unidad) -->
        <div class="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
          <button
            type="button"
            id="recModeOp"
            @click="setMode('OPERADOR')"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            :class="mode === 'OPERADOR' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'"
          >
            👤 Por Operador
          </button>
          <button
            type="button"
            id="recModeUnit"
            @click="setMode('UNIDAD')"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            :class="mode === 'UNIDAD' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'"
          >
            🚗 Por Unidad
          </button>
        </div>
      </div>

      <!-- Filtros Toolbar -->
      <div class="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Galera</label>
          <select
            v-model="filterGalera"
            @change="load"
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-indigo-500"
          >
            <option value="">Todas las galeras</option>
            <option v-for="g in galeras.filter(Boolean)" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Mes</label>
          <input
            type="month"
            v-model="filterMonth"
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Mínimo de pagos</label>
          <input
            type="number"
            min="2"
            max="30"
            v-model="minPagos"
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Buscar</label>
          <input
            v-model="searchQuery"
            placeholder="Nombre, cédula, unidad..."
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
          />
        </div>
        <div class="flex items-end">
          <button
            type="button"
            @click="load"
            :disabled="loading"
            class="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <span>{{ loading ? 'Analizando...' : 'Analizar' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMsg" role="alert" class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
      {{ errorMsg }}
    </div>

    <!-- Resumen KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {{ mode === 'OPERADOR' ? 'Operadores Recurrentes' : 'Unidades Recurrentes' }}
        </span>
        <b class="text-xl font-bold text-white block mt-1">{{ kpiSummary.totalRecurrentes }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Casos Críticos (≥ 8 Pagos)</span>
        <b class="text-xl font-bold text-rose-400 block mt-1">{{ kpiSummary.criticos }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Liquidado en Ciclo</span>
        <b class="text-xl font-bold text-emerald-400 block mt-1">{{ formatMoney(kpiSummary.totalPagado) }}</b>
      </div>
    </div>

    <!-- Tabla de Resultados -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-800/60 font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th class="py-3 px-4">{{ mode === 'OPERADOR' ? 'Operador' : 'Unidad' }}</th>
              <th v-if="mode === 'OPERADOR'" class="py-3 px-4 text-center">Unidad</th>
              <th class="py-3 px-4 text-center">Supervisora</th>
              <th class="py-3 px-4 text-center">Galera</th>
              <th class="py-3 px-4 text-center">Pagos / Días</th>
              <th class="py-3 px-4 text-right">Total Pagado</th>
              <th class="py-3 px-4 text-center">Nivel</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-slate-300">
            <tr v-if="filteredList.length === 0 && !loading">
              <td :colspan="mode === 'OPERADOR' ? 7 : 6" class="py-8 text-center text-slate-500">
                Sin registros recurrentes para estos filtros.
              </td>
            </tr>
            <tr v-for="(row, idx) in pagedRows" :key="idx" class="hover:bg-slate-800/30 transition-colors">
              <td class="py-3 px-4">
                <b class="text-white block">{{ mode === 'OPERADOR' ? (row.nombre || row.identificador) : (row.identificador || row.unidad) }}</b>
                <small v-if="mode === 'OPERADOR'" class="text-slate-400 font-mono text-[10px]">ID: {{ row.identificador || '—' }}</small>
              </td>
              <td v-if="mode === 'OPERADOR'" class="py-3 px-4 text-center font-bold text-cyan-400">
                {{ row.unidad || '—' }}
              </td>
              <td class="py-3 px-4 text-center text-slate-300 truncate max-w-[130px]">{{ row.supervisora || '—' }}</td>
              <td class="py-3 px-4 text-center text-slate-400 font-medium">{{ row.galera || '—' }}</td>
              <td class="py-3 px-4 text-center">
                <b class="text-white block">{{ row.pagos }} pagos</b>
                <small class="text-slate-400 text-[10px]">{{ row.dias_con_pago }} días con pago</small>
              </td>
              <td class="py-3 px-4 text-right font-bold text-emerald-400">
                {{ formatMoney(row.total_pagado) }}
              </td>
              <td class="py-3 px-4 text-center">
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
                  :class="(row.nivel || '').toUpperCase() === 'CRITICO' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'"
                >
                  {{ row.nivel || 'RECURRENTE' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginador -->
      <div v-if="filteredList.length > 0" class="px-4 py-3 bg-slate-800/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Página {{ page }} de {{ totalPages }} ({{ filteredList.length }} resultados)</span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="page--"
            :disabled="page <= 1"
            class="px-3 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <button
            type="button"
            @click="page++"
            :disabled="page >= totalPages"
            class="px-3 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
