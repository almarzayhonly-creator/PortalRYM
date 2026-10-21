<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callPortalRpc, callPortalFunction, portalViewContext } from '../portalApi'

export interface HistorialRow {
  fecha?: string
  unidad?: string
  panapass_numero?: string | number
  a_pagar?: number | string
  boleta?: string
  n_op?: string
  operador?: string
  cobrador?: string
  tipo?: string
  estado_cobra?: string
}

export interface HistorialResumen {
  registros?: number
  unidades?: number
  total_a_pagar?: number
  total_pendiente?: number
}

const loading = ref(false)
const errorMsg = ref('')
const cobraStatus = ref('')
const rows = ref<HistorialRow[]>([])
const resumen = ref<HistorialResumen>({ registros: 0, unidades: 0, total_a_pagar: 0, total_pendiente: 0 })

const filterUnidad = ref('')
const filterOperador = ref('')
const filterDesde = ref('2025-01-02')
const filterHasta = ref(new Date().toISOString().slice(0, 10))
const isAdmin = ref(false)

function formatMoney(amount?: number | string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0'))
  return isNaN(num) ? '$0.00' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function search() {
  loading.value = true
  errorMsg.value = ''
  try {
    const payload = {
      p_unidad: filterUnidad.value.trim() || null,
      p_operador: filterOperador.value.trim() || null,
      p_desde: filterDesde.value || null,
      p_hasta: filterHasta.value || null,
      p_limit: 500
    }

    const [dataRows, sum] = await Promise.all([
      callPortalRpc<HistorialRow[]>('panapass_historial', payload),
      callPortalRpc<HistorialResumen[]>('panapass_historial_resumen', {
        p_unidad: payload.p_unidad,
        p_operador: payload.p_operador,
        p_desde: payload.p_desde,
        p_hasta: payload.p_hasta
      })
    ])

    rows.value = dataRows || []
    resumen.value = sum?.[0] || { registros: 0, unidades: 0, total_a_pagar: 0, total_pendiente: 0 }
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al consultar el historial.'
  } finally {
    loading.value = false
  }
}

async function handleValidateCobra() {
  const hoy = filterHasta.value || new Date().toISOString().slice(0, 10)
  if (!confirm(`¿Validar en Cobra los pagos PRE DIARIO y PRE NO DIARIO no validados del ${hoy}?`)) return

  cobraStatus.value = 'Validando pagos en Cobra...'
  try {
    const resp = await callPortalFunction<any>('validar-cobra', {
      desde: hoy,
      hasta: hoy,
      soloPendientes: false,
      persistir: true,
      soloNoValidados: true
    })
    cobraStatus.value = `✓ ${resp.mensaje || 'Validado'} — guardados ${resp.guardados || 0}`
    await search()
  } catch (err: any) {
    cobraStatus.value = `Error: ${err.message || err}`
  }
}

onMounted(async () => {
  const view = portalViewContext()
  isAdmin.value = view.isAdmin
  if (view.today) filterHasta.value = view.today
  await search()
})
</script>

<template>
  <div class="rym-tw space-y-6" data-testid="vue-historial">
    <!-- Header Hero Card -->
    <div class="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950 p-6 shadow-xl">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-2">
            📊 Auditoría Histórica
          </span>
          <h2 class="text-2xl font-bold tracking-tight text-white">Historial y Pendiente a Cobra</h2>
          <p class="text-slate-300 text-xs mt-1 max-w-xl">
            Consulta consolidada de cobros y pagos por unidad o conductor con sincronización directa a Cobra.
          </p>
        </div>

        <div v-if="isAdmin" class="flex flex-col items-end gap-1">
          <button
            type="button"
            @click="handleValidateCobra"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            ⚡ Validar Cobra Hoy
          </button>
          <span v-if="cobraStatus" class="text-[10px] text-cyan-400">{{ cobraStatus }}</span>
        </div>
      </div>

      <!-- Filtros Toolbar -->
      <div class="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Unidad</label>
          <input
            v-model="filterUnidad"
            placeholder="Ej: 1045"
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Operador / N_OP</label>
          <input
            v-model="filterOperador"
            placeholder="Conductor o N_OP"
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Desde</label>
          <input
            type="date"
            v-model="filterDesde"
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Hasta</label>
          <input
            type="date"
            v-model="filterHasta"
            class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-cyan-500"
          />
        </div>
        <div class="flex items-end">
          <button
            type="button"
            @click="search"
            :disabled="loading"
            class="w-full h-10 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
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
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Registros</span>
        <b class="text-xl font-bold text-white block mt-1">{{ resumen.registros ?? 0 }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Unidades</span>
        <b class="text-xl font-bold text-cyan-400 block mt-1">{{ resumen.unidades ?? 0 }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total a Pagar</span>
        <b class="text-xl font-bold text-emerald-400 block mt-1">{{ formatMoney(resumen.total_a_pagar) }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pendiente Cobra</span>
        <b class="text-xl font-bold text-rose-400 block mt-1">{{ formatMoney(resumen.total_pendiente) }}</b>
      </div>
    </div>

    <!-- Tabla de Resultados -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-800/60 font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th class="py-3 px-4">Fecha</th>
              <th class="py-3 px-4">Unidad</th>
              <th class="py-3 px-4">Panapass</th>
              <th class="py-3 px-4 text-right">A Pagar</th>
              <th class="py-3 px-4">Boleta</th>
              <th class="py-3 px-4">Operador</th>
              <th class="py-3 px-4">Cobrador</th>
              <th class="py-3 px-4 text-center">Estado Cobra</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-slate-300">
            <tr v-if="rows.length === 0 && !loading">
              <td colspan="8" class="py-8 text-center text-slate-500">
                No hay registros con los filtros seleccionados.
              </td>
            </tr>
            <tr v-for="(row, idx) in rows" :key="idx" class="hover:bg-slate-800/30 transition-colors">
              <td class="py-3 px-4 text-slate-400 whitespace-nowrap">{{ row.fecha || '—' }}</td>
              <td class="py-3 px-4 font-bold text-white">{{ row.unidad || '—' }}</td>
              <td class="py-3 px-4 text-slate-300 font-mono">{{ row.panapass_numero || '—' }}</td>
              <td class="py-3 px-4 text-right font-semibold text-emerald-400">{{ formatMoney(row.a_pagar) }}</td>
              <td class="py-3 px-4 text-slate-400 font-mono">{{ row.boleta || '—' }}</td>
              <td class="py-3 px-4 text-slate-200 truncate max-w-xs">{{ row.operador || '—' }}</td>
              <td class="py-3 px-4 text-slate-300 truncate max-w-xs">{{ row.cobrador || '—' }}</td>
              <td class="py-3 px-4 text-center">
                <span
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
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
