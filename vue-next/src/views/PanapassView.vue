<script setup lang="ts">
import { computed } from 'vue'
import type { PanapassSnapshot } from '../panapass'

const props = defineProps<{
  state: { snapshot: PanapassSnapshot | null; loading: boolean; error: string; stale: boolean }
  retry: () => void
}>()
const snapshot = computed(() => props.state.snapshot)
const number = (value: number | null | undefined) => value == null ? '—' : Number(value).toLocaleString('es-PA')
const money = (value: number | null | undefined) => value == null ? '—' : `B/. ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateLabel = (date: string) => new Intl.DateTimeFormat('es-PA', { timeZone: 'America/Panama', weekday: 'short', day: '2-digit' }).format(new Date(`${date}T12:00:00-05:00`))
const updatedDate = computed(() => snapshot.value ? new Intl.DateTimeFormat('es-PA', { timeZone: 'America/Panama', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(snapshot.value.updatedAt)) : '')
const trendDays = computed(() => {
  const byDate = new Map<string, { date: string; amount: number; units: number; weekend: boolean }>()
  for (const gallery of snapshot.value?.galleries || []) for (const day of gallery.days) {
    const total = byDate.get(day.date) || { date: day.date, amount: 0, units: 0, weekend: true }
    total.amount += day.amount
    total.units += day.units
    total.weekend &&= day.weekend
    byDate.set(day.date, total)
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-7)
})
const chartX = (index: number) => index * 40 + 20
const galleryX = (index: number) => index * 20 + 10
const chartY = (days: { units: number }[], index: number) => {
  const max = Math.max(1, ...days.map(day => day.units))
  return 70 - (days[index].units / max) * 52
}
const unitLine = (days: { units: number }[]) => days.map((_, index) => `${chartX(index)},${chartY(days, index)}`).join(' ')
const galleryUnitLine = (days: { units: number }[]) => days.map((_, index) => `${galleryX(index)},${chartY(days, index)}`).join(' ')
const amountBar = (days: { amount: number }[], index: number) => {
  const max = Math.max(1, ...days.map(day => day.amount))
  return Math.max(days[index].amount > 0 ? 3 : 0, (days[index].amount / max) * 54)
}
const shortAmount = (value: number) => value > 0 ? Number(value).toFixed(2) : '—'
</script>

<template>
  <main class="pan-dashboard" data-testid="vue-next-panapass">
    <header class="pan-head">
      <div><span class="pan-eyebrow">PANAPASS</span><h1>Dashboard Panapass</h1><p>Resumen de actividad dentro de tu alcance autorizado.</p></div>
      <div class="pan-head-meta"><span class="pan-readonly">Solo lectura · Operaciones en MAIN</span><div v-if="snapshot" class="pan-today"><small><b>HOY</b>{{ updatedDate }}</small><span>● Datos actualizados · {{ snapshot.role }}</span></div><button type="button" class="pan-refresh" :disabled="state.loading" @click="retry">Actualizar</button></div>
    </header>

    <div v-if="state.loading && !snapshot" class="pan-state" role="status"><i></i><span>Cargando indicadores Panapass…</span></div>
    <section v-else-if="state.error && !snapshot" class="pan-state pan-error" role="alert"><div><b>No se pudo cargar Panapass</b><span>{{ state.error }}</span></div><button type="button" @click="retry">Reintentar</button></section>
    <template v-if="snapshot">
      <div v-if="state.stale" class="pan-state pan-stale" role="status"><span>Mostrando los últimos datos válidos. {{ state.error || 'La actualización no se completó.' }}</span><button type="button" @click="retry">Actualizar</button></div>
      <section class="pan-overview" aria-label="Resumen Panapass">
        <div class="pan-primary" aria-label="Indicadores principales">
          <article class="pan-card blue"><div class="pan-card-title"><span>Unidades activas</span><i aria-hidden="true">↗</i></div><strong>{{ number(snapshot.metrics.activeUnits) }}</strong><small>Unidades visibles en tu alcance</small></article>
          <article class="pan-card green"><div class="pan-card-title"><span>Requirieron pago hoy</span><i aria-hidden="true">$</i></div><strong>{{ number(snapshot.metrics.paidUnits) }}</strong><small>{{ money(snapshot.metrics.paidAmount) }} · solo pagos positivos</small></article>
          <article v-if="snapshot.metrics.controlActive !== null" class="pan-card orange"><div class="pan-card-title"><span>Control Panapass / ENA</span><i aria-hidden="true">◎</i></div><strong>{{ number(snapshot.metrics.controlActive) }}</strong><small>{{ number(snapshot.metrics.controlOther) }} otros estados de Control</small></article>
          <article class="pan-card violet"><div class="pan-card-title"><span>Bajas Panapass pendientes</span><i aria-hidden="true">↓</i></div><strong>{{ number(snapshot.metrics.pendingBajas) }}</strong><small>{{ number(snapshot.metrics.processedBajas) }} procesadas</small></article>
        </div>
        <aside class="pan-top-aside" aria-label="Indicadores de contexto">
          <article><i>↻</i><div><span>Recurrentes</span><b>{{ number(snapshot.metrics.recurrentes) }}</b><small>5+ pagos en el mes · criterio MAIN</small></div></article>
          <article class="negative"><i>!</i><div><span>Negativos hoy · referencia MAIN</span><b>{{ number(snapshot.metrics.negatives) }}</b><small>No se infiere fase AM/PM</small></div></article>
        </aside>
      </section>

      <section v-if="snapshot.ranking.length" class="pan-panel">
        <div class="pan-panel-head"><div><span class="pan-eyebrow">RENDIMIENTO</span><h2>{{ snapshot.rankingKind === 'supervisor' ? 'Tu ranking de hoy' : 'Desempeño por galera' }}</h2></div><small>{{ snapshot.rankingKind === 'supervisor' ? 'Posición y alcance publicados por MAIN' : 'Criterio MAIN: menos pagos; desempate por promedio y monto' }}</small></div>
        <div class="pan-rank-list"><article v-for="row in snapshot.ranking" :key="row.id" :class="{ mine: row.mine }"><b class="pan-rank-pos">#{{ number(row.position) }}</b><div><strong>{{ row.name }}</strong><small>{{ row.gallery }}</small></div><div class="pan-rank-value"><b>{{ number(row.paidUnits) }} pagadas</b><small>{{ money(row.amount) }}</small></div></article></div>
      </section>

      <section class="pan-ops-row" aria-label="Contexto y actividad reciente">
        <article class="pan-ops-card pan-pending">
          <header><div><b>Pendientes secundarios</b><small>Indicadores informativos dentro del alcance autorizado.</small></div><span>!</span></header>
          <div class="pan-ops-items"><div><i>{{ number(snapshot.metrics.noPanapass) }}</i><div><b>Sin Panapass</b><small>Alertas de número no asignado</small></div></div><div><i>{{ number(snapshot.metrics.processedBajas) }}</i><div><b>Bajas procesadas</b><small>Historial y operaciones en MAIN</small></div></div></div>
        </article>
        <article class="pan-ops-card pan-payments">
          <header><div><b>Actividad de pagos</b><small>Importes y unidades agregados por galera · 7 días</small></div><span>$</span></header>
          <div v-if="trendDays.length" class="pan-trend-chart" role="img" aria-label="Pagos y unidades agregados de los últimos siete días">
            <div class="pan-trend-plot"><svg viewBox="0 0 280 84" preserveAspectRatio="none" aria-hidden="true"><rect v-for="(day,index) in trendDays" :key="day.date" :x="chartX(index)-9" :y="70-amountBar(trendDays,index)" width="18" :height="amountBar(trendDays,index)" rx="4"><title>{{ dateLabel(day.date) }} · {{ money(day.amount) }}</title></rect><polyline :points="unitLine(trendDays)" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle v-for="(day,index) in trendDays" :key="`trend-${day.date}`" :cx="chartX(index)" :cy="chartY(trendDays,index)" r="3"><title>{{ dateLabel(day.date) }} · {{ number(day.units) }} unidades</title></circle></svg></div>
            <div class="pan-chart-labels"><span v-for="day in trendDays" :key="`trend-label-${day.date}`">{{ dateLabel(day.date).split(' ')[0] }}</span></div>
            <div class="pan-trend-total"><span>Total del periodo · {{ money(trendDays.reduce((sum, day) => sum + day.amount, 0)) }}</span><b>{{ number(trendDays.reduce((sum, day) => sum + day.units, 0)) }} unidades</b></div>
          </div>
          <div v-else class="pan-empty">No hay actividad disponible en este periodo.</div>
        </article>
        <article class="pan-ops-card pan-context">
          <header><div><b>Contexto</b><small>Volumen y recurrencia</small></div><span>▤</span></header>
          <div class="pan-context-metrics"><div><small>Perfil</small><b>{{ snapshot.role }}</b><small>Permisos publicados por MAIN</small></div><div><small>Galeras con datos</small><b>{{ number(snapshot.galleries.length) }}</b><small>Alcance autorizado</small></div></div>
        </article>
      </section>

      <section class="pan-panel">
        <div class="pan-panel-head"><div><span class="pan-eyebrow">ALCANCE AUTORIZADO</span><h2>{{ snapshot.role === 'SUPERVISORA' ? 'Resumen de tus unidades' : 'Resumen por galera' }}</h2></div><small>Negativos, pagos y actividad reciente</small></div>
        <div v-if="!snapshot.galleries.length" class="pan-empty">No hay galeras con datos para este alcance.</div>
        <div v-else class="pan-gallery-grid">
          <article v-for="gallery in snapshot.galleries" :key="gallery.name" class="pan-gallery" :class="gallery.rank">
            <header><div class="pan-gallery-title"><b>{{ gallery.name }}</b><span v-if="gallery.rank === 'best'">Menor incidencia</span><span v-else-if="gallery.rank === 'watch'">Mayor incidencia</span></div><small v-if="gallery.days.length">HOY · {{ gallery.days[gallery.days.length - 1].date.slice(5) }}</small></header>
            <div class="pan-gallery-metrics"><div><small>Unidades</small><b>{{ number(gallery.units) }}</b></div><div class="negative"><small>Negativos</small><b>{{ number(gallery.negatives) }}</b><small>{{ money(Math.abs(gallery.negativeBalance)) }}</small></div><div class="paid"><small>Pagadas</small><b>{{ number(gallery.paidUnits) }}</b><small>{{ money(gallery.paidAmount) }}</small></div></div>
            <div class="pan-days-head"><b>Pagos de los últimos 7 días</b></div>
            <template v-if="gallery.days.length"><div class="pan-gallery-viz" :aria-label="`Actividad de ${gallery.name}: línea de unidades y barras de pagos de los últimos siete días`">
              <div class="pan-unit-viz"><svg viewBox="0 0 140 84" preserveAspectRatio="none" role="img" :aria-label="`Unidades diarias de ${gallery.name}`"><polyline :points="galleryUnitLine(gallery.days)" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle v-for="(day,index) in gallery.days" :key="`point-${day.date}`" :cx="galleryX(index)" :cy="chartY(gallery.days,index)" r="3.5"><title>{{ dateLabel(day.date) }} · {{ number(day.units) }} unidades</title></circle></svg><div class="pan-chart-labels"><span v-for="day in gallery.days" :key="`units-${day.date}`">{{ dateLabel(day.date).split(' ')[0] }}</span></div></div>
              <div class="pan-amount-viz"><div class="pan-day-values"><span v-for="day in gallery.days" :key="`amount-${day.date}`">{{ shortAmount(day.amount) }}</span></div><svg viewBox="0 0 280 84" preserveAspectRatio="none" role="img" :aria-label="`Importes diarios de pagos de ${gallery.name}`"><rect v-for="(day,index) in gallery.days" :key="`bar-${day.date}`" :x="chartX(index)-9" :y="70-amountBar(gallery.days,index)" width="18" :height="amountBar(gallery.days,index)" rx="4" :class="{weekend:day.weekend}"><title>{{ dateLabel(day.date) }} · {{ money(day.amount) }}</title></rect></svg><div class="pan-chart-labels"><span v-for="day in gallery.days" :key="`days-${day.date}`" :class="{weekend:day.weekend}">{{ dateLabel(day.date).split(' ')[0] }}</span></div></div>
            </div><footer class="pan-gallery-footer"><small>Línea: unidades · Barras: monto</small><b>Prom. {{ number(gallery.averageUnits) }} unid./día</b></footer></template>
            <div v-else class="pan-empty">Sin actividad disponible en este periodo.</div>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>
