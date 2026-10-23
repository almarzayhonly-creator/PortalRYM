<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import KpiStatCard from '../components/KpiStatCard.vue'
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
const filterDesde = ref(new Date().toISOString().slice(0, 8) + '01')
const filterHasta = ref(new Date().toISOString().slice(0, 10))
const isAdmin = ref(false)
const paidPct = computed(() => {
  const total = Number(resumen.value.total_a_pagar || 0)
  const pend = Number(resumen.value.total_pendiente || 0)
  return total > 0 ? Math.round(((total - pend) / total) * 100) : 0
})
const pendingPct = computed(() => 100 - paidPct.value)

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
  if (view.today) { filterHasta.value = view.today; filterDesde.value = view.today.slice(0, 8) + '01' }
  await search()
})
</script>

<template>
  <div class="rym-tw w-full min-w-0 space-y-5" data-testid="vue-historial">
    <!-- Hero: claro, con acento naranja/azul -->
    <section class="relative overflow-hidden rounded-2xl border border-rym-gray-200 bg-white p-5 shadow-sm animate-rym-fade-up">
      <span class="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-rym-blue-500 via-rym-orange-500 to-rym-yellow-400" aria-hidden="true"></span>
      <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div class="min-w-0">
          <span class="mb-2 inline-flex items-center gap-1.5 rounded-full bg-rym-orange-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-rym-orange-600">
            <span class="h-1.5 w-1.5 rounded-full bg-rym-orange-500 animate-rym-glow"></span> Auditoría histórica
          </span>
          <h2 class="text-2xl font-black tracking-tight text-rym-black-800">Historial y Pendiente a Cobra</h2>
          <p class="mt-1 max-w-xl text-xs font-medium text-rym-gray-500">
            Consulta consolidada de cobros y pagos por unidad o conductor con sincronización directa a Cobra.
          </p>
        </div>
        <div v-if="isAdmin" class="flex flex-col items-start gap-1 md:items-end">
          <button
            type="button"
            @click="handleValidateCobra"
            class="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rym-orange-500 to-rym-orange-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-rym-orange-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
          >
            ⚡ Validar Cobra Hoy
          </button>
          <span v-if="cobraStatus" class="text-[10px] font-bold text-rym-green-600">{{ cobraStatus }}</span>
        </div>
      </div>

      <!-- Filtros -->
      <div class="mt-5 grid grid-cols-1 gap-3 border-t border-rym-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label class="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-rym-gray-500">Unidad</label>
          <input v-model="filterUnidad" placeholder="Ej: 1045" class="h-10 w-full rounded-xl border border-rym-gray-200 bg-rym-gray-50 px-3 text-xs font-semibold text-rym-black-800 outline-none transition focus:border-rym-blue-500 focus:bg-white focus:ring-2 focus:ring-rym-blue-500/20" />
        </div>
        <div>
          <label class="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-rym-gray-500">Operador / N_OP</label>
          <input v-model="filterOperador" placeholder="Conductor o N_OP" class="h-10 w-full rounded-xl border border-rym-gray-200 bg-rym-gray-50 px-3 text-xs font-semibold text-rym-black-800 outline-none transition focus:border-rym-blue-500 focus:bg-white focus:ring-2 focus:ring-rym-blue-500/20" />
        </div>
        <div>
          <label class="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-rym-gray-500">Desde</label>
          <input type="date" v-model="filterDesde" class="h-10 w-full rounded-xl border border-rym-gray-200 bg-rym-gray-50 px-3 text-xs font-semibold text-rym-black-800 outline-none transition focus:border-rym-blue-500 focus:bg-white focus:ring-2 focus:ring-rym-blue-500/20" />
        </div>
        <div>
          <label class="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-rym-gray-500">Hasta</label>
          <input type="date" v-model="filterHasta" class="h-10 w-full rounded-xl border border-rym-gray-200 bg-rym-gray-50 px-3 text-xs font-semibold text-rym-black-800 outline-none transition focus:border-rym-blue-500 focus:bg-white focus:ring-2 focus:ring-rym-blue-500/20" />
        </div>
        <div class="flex items-end">
          <button
            type="button"
            @click="search"
            :disabled="loading"
            class="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rym-blue-600 to-rym-blue-500 text-xs font-extrabold text-white shadow-lg shadow-rym-blue-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
          >
            <span>{{ loading ? 'Buscando…' : 'Consultar' }}</span>
          </button>
        </div>
      </div>
    </section>

    <div v-if="errorMsg" role="alert" class="rounded-xl border border-rym-orange-100 bg-rym-orange-50 p-4 text-sm font-semibold text-rym-orange-700">
      {{ errorMsg }}
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiStatCard label="Total registros" :amount="Number(resumen.registros ?? 0)" icon="🧾" tone="blue" hint="en el período" :delay="0" />
      <KpiStatCard label="Unidades" :amount="Number(resumen.unidades ?? 0)" icon="🚌" tone="black" hint="con movimiento" :delay="60" />
      <KpiStatCard label="Total a pagar" :amount="Number(resumen.total_a_pagar ?? 0)" prefix="$" :decimals="2" icon="💰" tone="green" hint="monto del período" :progress="paidPct" :delay="120" />
      <KpiStatCard label="Pendiente Cobra" :amount="Number(resumen.total_pendiente ?? 0)" prefix="$" :decimals="2" icon="⏳" tone="orange" :pulse="Number(resumen.total_pendiente ?? 0) > 0" hint="por conciliar" :progress="pendingPct" :delay="180" />
    </div>

    <!-- Tabla -->
    <section class="overflow-hidden rounded-2xl border border-rym-gray-200 bg-white shadow-sm animate-rym-fade-up" style="animation-delay:220ms">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-rym-blue-900 text-[10px] font-extrabold uppercase tracking-wider text-white">
            <tr>
              <th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3">Unidad</th>
              <th class="px-4 py-3">Panapass</th>
              <th class="px-4 py-3 text-right">A pagar</th>
              <th class="px-4 py-3">Boleta</th>
              <th class="px-4 py-3">Operador</th>
              <th class="px-4 py-3">Cobrador</th>
              <th class="px-4 py-3 text-center">Estado Cobra</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-rym-gray-100 text-rym-gray-700">
            <tr v-if="rows.length === 0 && !loading">
              <td colspan="8" class="py-10 text-center font-semibold text-rym-gray-400">No hay registros con los filtros seleccionados.</td>
            </tr>
            <tr v-for="(row, idx) in rows" :key="idx" class="transition-colors hover:bg-rym-blue-50/60">
              <td class="whitespace-nowrap px-4 py-3 text-rym-gray-500">{{ row.fecha || '—' }}</td>
              <td class="px-4 py-3 font-black text-rym-black-800">{{ row.unidad || '—' }}</td>
              <td class="px-4 py-3 font-mono text-rym-gray-700">{{ row.panapass_numero || '—' }}</td>
              <td class="px-4 py-3 text-right font-extrabold tabular-nums text-rym-green-700">{{ formatMoney(row.a_pagar) }}</td>
              <td class="px-4 py-3 font-mono text-rym-gray-500">{{ row.boleta || '—' }}</td>
              <td class="max-w-xs truncate px-4 py-3 font-semibold text-rym-black-700">{{ row.operador || '—' }}</td>
              <td class="max-w-xs truncate px-4 py-3 text-rym-gray-700">{{ row.cobrador || '—' }}</td>
              <td class="px-4 py-3 text-center">
                <span
                  class="rounded-full px-2.5 py-1 text-[10px] font-extrabold"
                  :class="row.estado_cobra === 'PAGADO' ? 'bg-rym-green-50 text-rym-green-700 ring-1 ring-rym-green-400/40' : 'bg-rym-orange-50 text-rym-orange-700 ring-1 ring-rym-orange-400/40'"
                >{{ row.estado_cobra || 'PENDIENTE' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
