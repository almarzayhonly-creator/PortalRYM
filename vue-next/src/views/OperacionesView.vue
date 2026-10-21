<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callPortalRpc, callPortalFunction, portalViewContext } from '../portalApi'

export interface EnaRun {
  tipo: '6AM' | '11AM' | string
  estado?: string
  iniciado_en?: string
  finalizado_en?: string
  filas_validas?: number
  error?: string
}

export interface EstadoOperativo {
  fuente_es_hoy?: boolean
  fuente_registros?: number
  fuente_negativos?: number
  puede_am?: boolean
  motivo_am?: string
  puede_pm?: boolean
  motivo_pm?: string
  am_negativos?: number
  pm_pendientes?: number
  pm_pagados?: number
}

const loading = ref(false)
const verifying = ref(false)
const processingAM = ref(false)
const processingPM = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const estado = ref<EstadoOperativo>({})
const runs = ref<EnaRun[]>([])
const isAdmin = ref(false)

function fmtDT(val?: string): string {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return `${d.toLocaleDateString('es-PA')} ${d.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}`
}

function getRun(type: '6AM' | '11AM'): EnaRun | undefined {
  return runs.value.find(r => r.tipo === type)
}

function statusBadge(estado?: string): { text: string; bgClass: string; textClass: string; borderClass: string } {
  const norm = String(estado || '').toUpperCase()
  if (norm === 'LISTO') {
    return { text: 'LISTO', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/30' }
  }
  if (norm === 'ESPERANDO' || norm === 'DISPARADO') {
    return { text: 'ENA PROCESANDO', bgClass: 'bg-cyan-500/10', textClass: 'text-cyan-400', borderClass: 'border-cyan-500/30' }
  }
  if (['ERROR', 'EXPIRADO', 'FUENTE_INCOMPLETA'].includes(norm)) {
    return { text: norm, bgClass: 'bg-rose-500/10', textClass: 'text-rose-400', borderClass: 'border-rose-500/30' }
  }
  return { text: norm || 'PENDIENTE', bgClass: 'bg-slate-800', textClass: 'text-slate-400', borderClass: 'border-slate-700' }
}

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [opsData, runsData] = await Promise.all([
      callPortalRpc<EstadoOperativo[]>('panapass_v10_estado_operativo'),
      callPortalRpc<EnaRun[]>('panapass_ena_estado')
    ])
    estado.value = opsData?.[0] || {}
    runs.value = runsData || []
  } catch (err: any) {
    errorMsg.value = err.message || 'Error cargando estado operativo.'
  } finally {
    loading.value = false
  }
}

async function verifyNow() {
  verifying.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const c6 = getRun('6AM')
    const c11 = getRun('11AM')
    const pending = [c11, c6].find(c => c && ['DISPARADO', 'ESPERANDO', 'OBSERVANDO', 'FUENTE_INCOMPLETA', 'ERROR'].includes(c.estado || ''))

    if (pending) {
      const resp = await callPortalFunction<any>('panapass-ena-finalize', {
        tipo: pending.tipo,
        modo: 'MANUAL_VERIFICAR'
      })
      if (resp?.estado === 'LISTO') {
        const verified = await callPortalRpc<any[]>('panapass_v10_verificar')
        await load()
        successMsg.value = verified?.[0]?.mensaje || `Corte ${pending.tipo} validado con éxito.`
        return
      }
      if (resp?.estado === 'OBSERVANDO') {
        errorMsg.value = 'Fuente nueva detectada. Se necesita una segunda lectura; espera 3 minutos y vuelve a verificar.'
        return
      }
      errorMsg.value = resp?.mensaje || resp?.error || 'La fuente ENA aún no está lista.'
      return
    }

    const verified = await callPortalRpc<any[]>('panapass_v10_verificar')
    await load()
    successMsg.value = verified?.[0]?.mensaje || 'Fuente verificada correctamente.'
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al verificar la fuente ENA.'
  } finally {
    verifying.value = false
  }
}

async function runAM() {
  if (!confirm('¿Procesar AM con el corte válido de hoy?')) return
  processingAM.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const res = await callPortalRpc<any[]>('panapass_v10_procesar_am')
    successMsg.value = res?.[0]?.mensaje || 'Operación AM procesada exitosamente.'
    await load()
  } catch (err: any) {
    errorMsg.value = err.message || 'Error procesando AM.'
  } finally {
    processingAM.value = false
  }
}

async function runPM() {
  if (!confirm('¿Procesar PM contra el corte nuevo de las 11AM?')) return
  processingPM.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const res = await callPortalRpc<any[]>('panapass_v10_procesar_pm')
    successMsg.value = res?.[0]?.mensaje || 'Operación PM procesada exitosamente.'
    await load()
  } catch (err: any) {
    errorMsg.value = err.message || 'Error procesando PM.'
  } finally {
    processingPM.value = false
  }
}

onMounted(async () => {
  const ctx = portalViewContext()
  isAdmin.value = ctx.isAdmin
  await load()
})
</script>

<template>
  <div class="rym-tw space-y-6" data-testid="vue-operaciones">
    <!-- Header Hero Card -->
    <div class="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 p-6 shadow-xl">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-2">
            ⚙️ Auditoría y Orquestación ENA
          </span>
          <h2 class="text-2xl font-bold tracking-tight text-white">Operaciones AM / PM</h2>
          <p class="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
            Monitoreo en tiempo real de cortes ENA automáticos (6:05 AM y 11:05 AM). Sincroniza y congela deuda con validación cruzada sobre la flota activa.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="load"
            :disabled="loading"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>🔄 Actualizar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Alertas de estado -->
    <div v-if="errorMsg" role="alert" class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300 flex items-start gap-2">
      <span class="text-base">⚠️</span>
      <div>{{ errorMsg }}</div>
    </div>
    <div v-if="successMsg" role="status" class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-start gap-2">
      <span class="text-base">✓</span>
      <div>{{ successMsg }}</div>
    </div>

    <!-- Alert si fuente no es de hoy -->
    <div v-if="!estado.fuente_es_hoy" class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-center gap-3">
      <span class="text-lg">⏳</span>
      <div>
        <b class="font-semibold text-amber-300">AM/PM BLOQUEADOS:</b> La fuente validada todavía no corresponde a un corte aceptado de hoy. Espera que ENA termine o utiliza el verificador automático.
      </div>
    </div>

    <!-- Cron Status Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- 6AM Card -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Corte AM · 6:05</span>
          <span
            class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
            :class="[statusBadge(getRun('6AM')?.estado).bgClass, statusBadge(getRun('6AM')?.estado).textClass, statusBadge(getRun('6AM')?.estado).borderClass]"
          >
            {{ statusBadge(getRun('6AM')?.estado).text }}
          </span>
        </div>
        <div>
          <div class="text-sm font-semibold text-white">
            {{ getRun('6AM')?.filas_validas ? `${getRun('6AM')?.filas_validas} filas válidas` : 'Pendiente' }}
          </div>
          <p class="text-[11px] text-slate-400 mt-1 truncate">
            {{ fmtDT(getRun('6AM')?.finalizado_en || getRun('6AM')?.iniciado_en) }}
          </p>
        </div>
      </div>

      <!-- 11AM Card -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Corte PM · 11:05</span>
          <span
            class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
            :class="[statusBadge(getRun('11AM')?.estado).bgClass, statusBadge(getRun('11AM')?.estado).textClass, statusBadge(getRun('11AM')?.estado).borderClass]"
          >
            {{ statusBadge(getRun('11AM')?.estado).text }}
          </span>
        </div>
        <div>
          <div class="text-sm font-semibold text-white">
            {{ getRun('11AM')?.filas_validas ? `${getRun('11AM')?.filas_validas} filas válidas` : 'Pendiente' }}
          </div>
          <p class="text-[11px] text-slate-400 mt-1 truncate">
            {{ fmtDT(getRun('11AM')?.finalizado_en || getRun('11AM')?.iniciado_en) }}
          </p>
        </div>
      </div>

      <!-- Fuente Operativa -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fuente Operativa</span>
          <span
            class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
            :class="estado.fuente_es_hoy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'"
          >
            {{ estado.fuente_es_hoy ? 'DATA DE HOY' : 'BLOQUEADA' }}
          </span>
        </div>
        <div>
          <div class="text-sm font-semibold text-white">
            {{ estado.fuente_registros || 0 }} registros
          </div>
          <p class="text-[11px] text-slate-400 mt-1">
            {{ estado.fuente_negativos || 0 }} unidades en saldo negativo
          </p>
        </div>
      </div>
    </div>

    <!-- Tarjetas de Acciones Operativas -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Verificar Fuente -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <span>🛡️</span> Verificar Fuente
          </h3>
          <p class="text-xs text-slate-400 mt-1">
            Revisa nuevamente ENA y aprueba el corte de hoy sin relanzar el extractor.
          </p>
        </div>
        <button
          type="button"
          @click="verifyNow"
          :disabled="verifying"
          class="w-full h-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-semibold text-xs rounded-xl shadow-sm transition-all"
        >
          {{ verifying ? 'Verificando...' : 'Verificar ahora' }}
        </button>
      </div>

      <!-- 2. Operación AM -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <span>🌅</span> Operación AM
          </h3>
          <p class="text-xs text-slate-400 mt-1">
            Genera el snapshot de partida de deuda usando el corte matutino validado.
          </p>
          <span v-if="estado.motivo_am" class="text-[10px] text-amber-400/90 block mt-2">
            {{ estado.motivo_am }}
          </span>
        </div>
        <button
          type="button"
          @click="runAM"
          :disabled="!estado.puede_am || processingAM"
          class="w-full h-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
        >
          {{ processingAM ? 'Procesando AM...' : 'Procesar AM' }}
        </button>
      </div>

      <!-- 3. Operación PM -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <span>🌇</span> Operación PM
          </h3>
          <p class="text-xs text-slate-400 mt-1">
            Compara el corte nuevo de las 11 AM contra el snapshot AM para conciliar pagos.
          </p>
          <span v-if="estado.motivo_pm" class="text-[10px] text-amber-400/90 block mt-2">
            {{ estado.motivo_pm }}
          </span>
        </div>
        <button
          type="button"
          @click="runPM"
          :disabled="!estado.puede_pm || processingPM"
          class="w-full h-10 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
        >
          {{ processingPM ? 'Procesando PM...' : 'Procesar PM' }}
        </button>
      </div>

      <!-- 4. Métricas / Resultados -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-3">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <span>📊</span> Resumen Operativo
        </h3>
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs py-1 border-b border-slate-800">
            <span class="text-slate-400">AM Negativos</span>
            <b class="text-white font-mono">{{ estado.am_negativos ?? 0 }}</b>
          </div>
          <div class="flex items-center justify-between text-xs py-1 border-b border-slate-800">
            <span class="text-slate-400">PM Pendientes</span>
            <b class="text-rose-400 font-mono">{{ estado.pm_pendientes ?? 0 }}</b>
          </div>
          <div class="flex items-center justify-between text-xs py-1">
            <span class="text-slate-400">Pagados Hoy</span>
            <b class="text-emerald-400 font-mono">{{ estado.pm_pagados ?? 0 }}</b>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
