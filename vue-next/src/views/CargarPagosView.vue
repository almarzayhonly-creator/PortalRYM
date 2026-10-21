<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { callPortalRpc } from '../portalApi'

export interface PagoTrabajoRow {
  id?: number | string
  unidad?: string
  panapass_numero?: string | number
  placa?: string
  saldo_pm?: number | string
  a_pagar?: number | string
  con_boleta?: number | string
  numero_operador?: string
  nombre_operador?: string
  tipo?: string
  cobrador?: string
  origen_registro?: string
  status?: string
  motivo_extraordinario?: string
  solicitado_por?: string
  guardado_en?: string
  updated_at?: string
  // UI state
  _dirty?: boolean
  _saving?: boolean
  _saved?: boolean
}

const loading = ref(false)
const actionLoading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const rows = ref<PagoTrabajoRow[]>([])
const searchQuery = ref('')

function formatMoney(amount?: number | string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0'))
  return isNaN(num) ? '$0.00' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const filteredRows = computed(() => {
  let list = rows.value
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(r =>
      [r.unidad, r.panapass_numero, r.placa, r.numero_operador, r.nombre_operador, r.cobrador, r.tipo]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }
  return list
})

const kpis = computed(() => {
  const totalCargados = rows.value.length
  const pagados = rows.value.filter(r => (parseFloat(String(r.a_pagar || 0)) || 0) > 0)
  const totalPagado = pagados.reduce((acc, r) => acc + (parseFloat(String(r.a_pagar || 0)) || 0), 0)
  const totalBoleta = pagados.reduce((acc, r) => acc + (parseFloat(String(r.con_boleta || 0)) || 0), 0)
  return {
    cargados: totalCargados,
    marcados: pagados.length,
    totalPagado,
    totalBoleta
  }
})

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await callPortalRpc<PagoTrabajoRow[]>('panapass_v10_pagos_hoy')
    rows.value = (data || []).map(r => ({
      ...r,
      _dirty: false,
      _saving: false,
      _saved: !!r.guardado_en
    }))
  } catch (err: any) {
    errorMsg.value = err.message || 'Error cargando la hoja online de pagos.'
  } finally {
    loading.value = false
  }
}

function markDirty(row: PagoTrabajoRow) {
  row._dirty = true
  row._saved = false
}

async function saveRow(row: PagoTrabajoRow) {
  if (row._saving) return
  row._saving = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const res = await callPortalRpc<any>('panapass_pagos_hoy_editar', {
      p_id: Number(row.id),
      p_a_pagar: Number(row.a_pagar || 0),
      p_numero_operador: row.numero_operador || null,
      p_nombre_operador: row.nombre_operador || null,
      p_cobrador: row.cobrador || null,
      p_tipo: row.tipo || 'DIARIO'
    })
    const saved = Array.isArray(res) ? res[0] : res
    if (saved?.con_boleta !== undefined) row.con_boleta = saved.con_boleta
    row._dirty = false
    row._saved = true
    successMsg.value = `Fila ${row.unidad} guardada ✓`
  } catch (err: any) {
    errorMsg.value = err.message || `Error al guardar ${row.unidad}`
  } finally {
    row._saving = false
  }
}

async function prepareFromPM() {
  actionLoading.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const res = await callPortalRpc<any[]>('panapass_pagos_hoy_cargar_desde_pm')
    successMsg.value = res?.[0]?.mensaje || 'Pagos Hoy preparado desde pendientes PM.'
    await load()
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al preparar pagos desde PM.'
  } finally {
    actionLoading.value = false
  }
}

async function validatePayments() {
  actionLoading.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const res = await callPortalRpc<any[]>('panapass_v10_validar_pagos_hoy')
    const r = res?.[0]
    if (r?.ok) {
      successMsg.value = `Validación OK: ${r.registros} pagos · ${formatMoney(r.total_a_pagar)}`
    } else {
      errorMsg.value = `Errores de validación: ${JSON.stringify(r?.errores || 'Verifica los datos')}`
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Error validando pagos.'
  } finally {
    actionLoading.value = false
  }
}

async function archivePayments() {
  if (!confirm('¿Archivar definitivamente los pagos marcados en el historial?')) return
  actionLoading.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const res = await callPortalRpc<any[]>('panapass_v10_archivar_pagos_hoy')
    const r = res?.[0]
    successMsg.value = `${r?.mensaje || 'Pagos archivados'} · ${r?.registros ?? 0} registros guardados.`
    await load()
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al archivar pagos.'
  } finally {
    actionLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="rym-tw space-y-6" data-testid="vue-cargar-pagos">
    <!-- Header Hero Card -->
    <div class="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950 p-6 shadow-xl">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs font-semibold tracking-wider uppercase mb-2">
            📝 Hoja Online de Liquidación
          </span>
          <h2 class="text-2xl font-bold tracking-tight text-white">Cargar Pagos Hoy</h2>
          <p class="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
            Gestión en tiempo real de la cobranza diaria. Carga los pendientes PM, registra importes pagados y archiva los cierres verificados directamente al historial.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            @click="load"
            :disabled="loading || actionLoading"
            class="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            🔄 Recargar
          </button>
          <button
            type="button"
            id="btnPreparePM"
            @click="prepareFromPM"
            :disabled="loading || actionLoading"
            class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            ⚡ Cargar desde PM
          </button>
          <button
            type="button"
            id="btnValidatePayments"
            @click="validatePayments"
            :disabled="loading || actionLoading"
            class="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            ✓ Validar
          </button>
          <button
            type="button"
            id="btnArchivePayments"
            @click="archivePayments"
            :disabled="loading || actionLoading"
            class="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            📦 Archivar Pagos
          </button>
        </div>
      </div>

      <!-- Filtro Búsqueda Rápida -->
      <div class="mt-6 pt-5 border-t border-slate-800/80 max-w-md">
        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Buscar en la Hoja</label>
        <input
          v-model="searchQuery"
          placeholder="Unidad, operador, placa o N_OP..."
          class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
        />
      </div>
    </div>

    <!-- Mensajes de estado -->
    <div v-if="errorMsg" role="alert" class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" role="status" class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
      {{ successMsg }}
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pendientes Cargados</span>
        <b class="text-xl font-bold text-white block mt-1">{{ kpis.cargados }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Marcados Pagados</span>
        <b class="text-xl font-bold text-cyan-400 block mt-1">{{ kpis.marcados }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Pagado</span>
        <b class="text-xl font-bold text-emerald-400 block mt-1">{{ formatMoney(kpis.totalPagado) }}</b>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Boleta</span>
        <b class="text-xl font-bold text-amber-400 block mt-1">{{ formatMoney(kpis.totalBoleta) }}</b>
      </div>
    </div>

    <!-- Tabla de Hoja de Trabajo -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-800/60 font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th class="py-3 px-4">Unidad</th>
              <th class="py-3 px-4">Panapass</th>
              <th class="py-3 px-4">Placa</th>
              <th class="py-3 px-4 text-right">Saldo PM</th>
              <th class="py-3 px-4 w-28 text-right">A Pagar</th>
              <th class="py-3 px-4 text-right">Boleta</th>
              <th class="py-3 px-4 w-24">N_OP</th>
              <th class="py-3 px-4">Operador</th>
              <th class="py-3 px-4 w-28">Tipo</th>
              <th class="py-3 px-4">Cobrador</th>
              <th class="py-3 px-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-slate-300">
            <tr v-if="filteredRows.length === 0 && !loading">
              <td colspan="11" class="py-8 text-center text-slate-500">
                La hoja online está vacía. Pulsa “Cargar desde PM” para iniciar la jornada.
              </td>
            </tr>
            <tr
              v-for="row in filteredRows"
              :key="row.id"
              class="hover:bg-slate-800/30 transition-colors"
              :class="{ 'bg-emerald-950/10': row._saved, 'bg-amber-950/10': row._dirty }"
            >
              <td class="py-3 px-4 font-bold text-white whitespace-nowrap">
                {{ row.unidad || '—' }}
                <span v-if="row.origen_registro === 'EXTRAORDINARIO'" class="ml-1 text-[10px] text-amber-400 font-normal">
                  (Extra)
                </span>
              </td>
              <td class="py-3 px-4 text-slate-300 font-mono">{{ row.panapass_numero || '—' }}</td>
              <td class="py-3 px-4 text-slate-400 font-mono">{{ row.placa || '—' }}</td>
              <td class="py-3 px-4 text-right font-semibold text-rose-400">{{ formatMoney(row.saldo_pm) }}</td>
              <td class="py-3 px-4">
                <input
                  type="number"
                  step="0.01"
                  v-model="row.a_pagar"
                  @input="markDirty(row)"
                  class="w-full h-8 px-2 rounded-lg border border-slate-700 bg-slate-800 text-right text-emerald-400 font-semibold focus:border-emerald-500 outline-none"
                />
              </td>
              <td class="py-3 px-4 text-right font-medium text-cyan-400">{{ formatMoney(row.con_boleta) }}</td>
              <td class="py-3 px-4">
                <input
                  v-model="row.numero_operador"
                  @input="markDirty(row)"
                  placeholder="N_OP"
                  class="w-full h-8 px-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs focus:border-cyan-500 outline-none"
                />
              </td>
              <td class="py-3 px-4">
                <input
                  v-model="row.nombre_operador"
                  @input="markDirty(row)"
                  placeholder="Operador"
                  class="w-full h-8 px-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs focus:border-cyan-500 outline-none truncate"
                />
              </td>
              <td class="py-3 px-4">
                <select
                  v-model="row.tipo"
                  @change="markDirty(row)"
                  class="w-full h-8 px-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs focus:border-cyan-500 outline-none"
                >
                  <option value="DIARIO">DIARIO</option>
                  <option value="NO DIARIO">NO DIARIO</option>
                  <option value="EXTRAORDINARIO">EXTRAORDINARIO</option>
                </select>
              </td>
              <td class="py-3 px-4">
                <input
                  v-model="row.cobrador"
                  @input="markDirty(row)"
                  placeholder="Supervisora"
                  class="w-full h-8 px-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs focus:border-cyan-500 outline-none truncate"
                />
              </td>
              <td class="py-3 px-4 text-center">
                <button
                  type="button"
                  @click="saveRow(row)"
                  :disabled="row._saving || (!row._dirty && row._saved)"
                  class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border"
                  :class="[
                    row._saving ? 'bg-slate-800 text-slate-500 border-slate-700' :
                    row._saved && !row._dirty ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    row._dirty ? 'bg-amber-600 hover:bg-amber-500 text-white border-transparent' :
                    'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  ]"
                >
                  {{ row._saving ? '...' : row._saved && !row._dirty ? '✓ Guardado' : 'Guardar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
