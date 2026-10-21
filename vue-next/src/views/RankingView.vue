<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { callPortalRpc, portalViewContext } from '../portalApi'

interface RankItem {
  puesto?: number | string
  entidad?: string
  galera?: string
  monto?: number | string
  registros?: number | string
  unidades_pagadas?: number | string
  dias_con_pago?: number | string
  participa?: boolean
  rankEligible?: boolean
}

const GALS = ['VCARS', 'VCOMP', 'VIPCO', 'VINDU']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const loading = ref(true)
const error = ref('')
const rows = ref<RankItem[]>([])

const scope = ref('GLOBAL')
const criterion = ref<'MONTO' | 'PAGOS'>('MONTO')
const dateFrom = ref('')
const dateTo = ref('')
const cycleMonth = ref('')
const copied = ref(false)

const medals = ['🥇', '🥈', '🥉']

const formatMoney = (n: any) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const scopeLabel = computed(() => {
  if (scope.value === 'GLOBAL') return 'Todas las supervisoras'
  if (scope.value === 'TODAS') return '4 galeras'
  return scope.value
})

const activeRows = computed(() => {
  return rows.value
    .filter(x => x.rankEligible ?? !!x.participa)
    .map((x, idx) => ({ ...x, puesto: idx + 1 }))
})

const inactiveRows = computed(() => {
  return rows.value.filter(x => !(x.rankEligible ?? !!x.participa))
})

const podium = computed(() => activeRows.value.slice(0, 3))
const rest = computed(() => activeRows.value.slice(3))

const summary = computed(() => {
  const list = activeRows.value
  const total = list.reduce((a, x) => a + Number(x.monto || 0), 0)
  const regs = list.reduce((a, x) => a + Number(x.registros || 0), 0)
  const units = list.reduce((a, x) => a + Number(x.unidades_pagadas || 0), 0)
  return {
    participantes: list.length,
    totalMonto: total,
    totalRegs: regs,
    totalUnits: units
  }
})

async function initDates() {
  try {
    const x = await callPortalRpc<any>('panapass_ultima_fecha_pago')
    const raw = Array.isArray(x) ? x[0] : x
    let lastDate = ''
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) lastDate = raw.slice(0, 10)
    else if (raw && typeof raw === 'object') lastDate = String(raw.ultima_fecha || raw.max_pago || raw.fecha || '').slice(0, 10)
    if (!lastDate) lastDate = new Date().toISOString().slice(0, 10)

    const dt = new Date(lastDate.slice(0, 10) + 'T12:00:00')
    const desde = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`
    const hasta = lastDate.slice(0, 10)
    
    dateFrom.value = desde
    dateTo.value = hasta
    cycleMonth.value = `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`
  } catch {
    const now = new Date()
    dateFrom.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    dateTo.value = now.toISOString().slice(0, 10)
    cycleMonth.value = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`
  }
}

async function loadRanking() {
  loading.value = true
  error.value = ''
  try {
    const dt = new Date(dateFrom.value + 'T12:00:00')
    if (!isNaN(dt.getTime())) cycleMonth.value = `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`

    const data = await callPortalRpc<RankItem[]>('panapass_reporte_competencia_cobrador_v2', {
      p_desde: dateFrom.value,
      p_hasta: dateTo.value,
      p_modo: scope.value,
      p_criterio: criterion.value
    })
    rows.value = data || []
  } catch (err: any) {
    error.value = err.message || 'Error al obtener datos del ranking.'
  } finally {
    loading.value = false
  }
}

async function copyWhatsApp() {
  let txt = `🏆 *CIERRE DE PAGOS*\n📅 ${dateFrom.value} → ${dateTo.value}\n📍 ${scopeLabel.value}\n📌 ${criterion.value === 'PAGOS' ? 'Menor cantidad de pagos' : 'Menor monto pagado'} = mejor posición\n\n`
  activeRows.value.forEach(x => {
    const p = Number(x.puesto)
    const med = p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '#' + p
    txt += `${med} *${x.entidad}*${scope.value === 'TODAS' ? '' : ' · ' + (x.galera || '')}\n💵 *B/. ${formatMoney(x.monto)}* · ${x.registros} pagos · ${x.unidades_pagadas} unidades\n\n`
  })
  txt += `📊 *TOTAL:* B/. ${formatMoney(summary.value.totalMonto)} · ${summary.value.totalRegs} pagos`

  try {
    await navigator.clipboard.writeText(txt)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    prompt('Copia el reporte:', txt)
  }
}

onMounted(async () => {
  await initDates()
  await loadRanking()
})
</script>

<template>
  <div class="rym-tw space-y-6" data-testid="vue-ranking">
    <!-- Hero Banner Card -->
    <div class="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-6 shadow-xl">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl shadow-inner">
            🏆
          </div>
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-white">Cierre competitivo de pagos</h2>
            <p class="text-xs text-slate-300 mt-1 max-w-xl">
              Ranking por galera o supervisoras con dos criterios: monto pagado o cantidad de pagos. El monto siempre se destaca visualmente.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-700 bg-slate-800/80 text-xs font-semibold text-slate-200">
            📅 {{ cycleMonth }}
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-semibold text-blue-400">
            👥 {{ scopeLabel }}
          </span>
        </div>
      </div>
    </div>

    <!-- Filtros de Control -->
    <div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
      <!-- Vista -->
      <div>
        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Vista</label>
        <select
          v-model="scope"
          data-testid="rrpScope"
          class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs font-medium text-white outline-none focus:border-blue-500 transition-colors"
        >
          <option value="GLOBAL">Todas las supervisoras</option>
          <option value="TODAS">4 galeras</option>
          <option v-for="g in GALS" :key="g" :value="g">{{ g }} · supervisoras</option>
        </select>
      </div>

      <!-- Criterio -->
      <div class="lg:col-span-2">
        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Ranking Por</label>
        <div class="flex bg-slate-800 p-1 rounded-xl border border-slate-700 h-10 items-center">
          <button
            type="button"
            @click="criterion = 'MONTO'"
            :class="criterion === 'MONTO' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'"
            class="flex-1 h-8 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1"
          >
            💵 Menor monto
          </button>
          <button
            type="button"
            @click="criterion = 'PAGOS'"
            :class="criterion === 'PAGOS' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'"
            class="flex-1 h-8 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1"
          >
            🔢 Menor pagos
          </button>
        </div>
      </div>

      <!-- Desde -->
      <div>
        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Desde</label>
        <input
          type="date"
          v-model="dateFrom"
          class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-blue-500"
        />
      </div>

      <!-- Hasta -->
      <div>
        <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Hasta</label>
        <input
          type="date"
          v-model="dateTo"
          class="w-full h-10 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs text-white outline-none focus:border-blue-500"
        />
      </div>

      <!-- Acciones -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="loadRanking"
          class="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1"
        >
          Generar
        </button>
        <button
          type="button"
          @click="copyWhatsApp"
          class="h-10 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-all flex items-center justify-center"
          title="Copiar WhatsApp"
        >
          {{ copied ? '✓' : '📲' }}
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" role="alert" class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
      {{ error }}
    </div>

    <!-- KPIs Row -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <span class="text-2xl p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">👥</span>
        <div>
          <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Participantes</span>
          <b class="text-lg font-bold text-white block">{{ summary.participantes }}</b>
        </div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <span class="text-2xl p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">💳</span>
        <div>
          <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pagos del ciclo</span>
          <b class="text-lg font-bold text-white block">{{ summary.totalRegs }}</b>
        </div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <span class="text-2xl p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">💰</span>
        <div>
          <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Pagado</span>
          <b class="text-lg font-bold text-emerald-400 block">B/. {{ formatMoney(summary.totalMonto) }}</b>
        </div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <span class="text-2xl p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">📦</span>
        <div>
          <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Unidades</span>
          <b class="text-lg font-bold text-white block">{{ summary.totalUnits }}</b>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="h-40 bg-slate-800/50 rounded-2xl animate-pulse"></div>
    </div>

    <template v-else>
      <!-- Podium Top 3 -->
      <div v-if="podium.length" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="(x, idx) in podium"
          :key="String(x.entidad) + idx"
          class="rounded-2xl border p-5 bg-slate-900 relative shadow-lg"
          :class="[
            'border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-slate-900',
            'border-slate-400/30 bg-gradient-to-b from-slate-400/10 to-slate-900',
            'border-amber-700/30 bg-gradient-to-b from-amber-700/10 to-slate-900'
          ][idx]"
        >
          <div class="flex items-center justify-between">
            <span class="text-3xl">{{ medals[idx] }}</span>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
              {{ scope === 'TODAS' ? 'GALERA' : (x.galera || '—') }}
            </span>
          </div>

          <h3 class="text-base font-bold text-white mt-3 truncate" :title="x.entidad">
            #{{ x.puesto }} {{ x.entidad }}
          </h3>

          <div class="text-xl font-extrabold text-amber-300 mt-1">
            B/. {{ formatMoney(x.monto) }}
          </div>

          <div class="flex gap-2 text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-800/80">
            <span><b>{{ x.registros }}</b> pagos</span>
            <span>·</span>
            <span><b>{{ x.unidades_pagadas }}</b> unidades</span>
            <span>·</span>
            <span><b>{{ x.dias_con_pago }}</b> días</span>
          </div>
        </div>
      </div>

      <!-- Rest of Table / List -->
      <div v-if="rest.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <div
          v-for="x in rest"
          :key="String(x.entidad)"
          class="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm hover:border-slate-700 transition-colors"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
              #{{ x.puesto }}
            </span>
            <div class="min-w-0">
              <b class="text-xs text-white truncate block">{{ x.entidad }}</b>
              <small class="text-[10px] text-slate-400">{{ scope === 'TODAS' ? 'GALERA' : (x.galera || '—') }}</small>
            </div>
          </div>
          <div class="text-right shrink-0">
            <strong class="text-xs text-white block">B/. {{ formatMoney(x.monto) }}</strong>
            <small class="text-[10px] text-slate-400">{{ x.registros }} pagos</small>
          </div>
        </div>
      </div>

      <!-- Inactive items -->
      <div v-if="inactiveRows.length" class="p-3.5 rounded-xl border border-dashed border-slate-800 bg-slate-900/60 text-xs text-slate-400">
        <b class="text-slate-300">Sin terminaciones asignadas · no compiten:</b>
        <div class="flex flex-wrap gap-1.5 mt-2">
          <span v-for="x in inactiveRows" :key="String(x.entidad)" class="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-300">
            {{ x.entidad }}{{ scope === 'TODAS' ? '' : ' · ' + (x.galera || '') }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>
