<script setup lang="ts">
import { computed } from 'vue'
import { canOpen, mainKpis, moduleCards } from '../dashboard'
import type { DashboardState } from '../dashboard'
import type { ModuleAction } from '../types'

const props = defineProps<{ state: DashboardState; actions: ModuleAction; hasModule: (code: string) => boolean }>()
const summary = computed(() => props.state.summary)
const cards = computed(() => summary.value ? moduleCards(summary.value) : [])
const kpis = computed(() => summary.value ? mainKpis(summary.value) : [])
const first = computed(() => String(props.state.session.profile.nombre || props.state.session.profile.email || 'Usuario').trim().split(/\s+/)[0])
const role = computed(() => String(props.state.session.profile.rol || '').toUpperCase())
const canQuickValidator = computed(() => ['ADMIN_TOTAL', 'GERENTE_GALERA', 'ADMIN', 'SUPERVISORA'].includes(role.value))
const galera = computed(() => String(props.state.session.profile.galera || ''))
const rank = computed(() => summary.value?.panapass?.rank)
const allowedGps = computed(() => canOpen(props.state.session, 'gps', props.hasModule))
const allowedUsers = computed(() => canOpen(props.state.session, 'users', props.hasModule))
const alerts = computed(() => (summary.value?.alerts || []).slice(0, 3))
const updated = computed(() => {
  const value = summary.value?.generated_at
  if (!value) return '—'
  try { return new Intl.DateTimeFormat('es-PA', { timeZone: 'America/Panama', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) } catch { return value }
})
const greeting = (() => {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Panama', hour: '2-digit', hourCycle: 'h23' }).format(new Date()))
  return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'
})()
function open(key?: keyof ModuleAction) { if (key) props.actions[key]?.() }
</script>

<template>
  <main class="ryn-shell" data-testid="vue-next-home">
    <aside class="ryn-sidebar">
      <div class="ryn-brand"><span class="ryn-mark">R</span><div><b>Portal RYM</b><small>Centro de Control</small></div></div>
      <nav aria-label="Módulos disponibles">
        <button class="active" data-testid="nav-home">Inicio</button>
        <button v-for="card in cards" :key="card.key" @click="open(card.action)">{{ card.title }}</button>
        <button v-if="allowedGps" @click="open('gps')">GPS</button>
        <button v-if="allowedUsers" @click="open('users')">Usuarios</button>
      </nav>
      <div class="ryn-user"><b>{{ state.session.profile.nombre || state.session.profile.email || 'Usuario' }}</b><span>{{ role }}</span><button @click="open('logout')">Cerrar sesión</button></div>
    </aside>
    <section class="ryn-main">
      <header class="ryn-header"><div><span class="ryn-eyebrow">PORTAL RYM · INICIO</span><h1>Centro de Control</h1></div><div class="ryn-updated">Última actualización<strong>{{ updated }}</strong></div></header>
      <section v-if="canQuickValidator" class="v101-validator ryn-validator" aria-label="Validador rápido de unidad">
        <div class="v101-validator-head"><div><h3>Búsqueda rápida de unidad</h3><p>Busca por unidad, empresa, placa o Panapass y revisa el checklist de MAIN.</p></div><span class="v101-validator-badge">Checklist express</span></div>
        <div class="v101-validator-tools"><div class="v101-validator-box"><input id="v101ValidatorQ" class="v101-validator-input" placeholder="Unidad, empresa, placa o Panapass" autocomplete="off"><div id="v101ValidatorList" class="v101-validator-list"></div></div><button id="v101ValidatorGo" class="v101-validator-go" type="button">Validar unidad</button></div>
        <div class="v101-validator-note">Muestra empresa, Panapass, revisado y estado operativo según las fuentes actuales de MAIN.</div>
      </section>
      <div v-if="state.state === 'loading'" class="ryn-state" role="status">Cargando el resumen de tu alcance…</div>
      <div v-else-if="state.state === 'error'" class="ryn-state error" role="alert"><b>No se pudo cargar el resumen.</b><span>{{ state.error }}</span><button @click="open('retry')">Reintentar</button></div>
      <div v-else>
        <div v-if="state.state === 'stale'" class="ryn-state stale" role="status">No se pudo actualizar. Se conserva la última información válida. {{ state.error }} <button @click="open('retry')">Reintentar</button></div>
        <section class="ryn-welcome"><div><span class="ryn-eyebrow">{{ greeting }}</span><h2>{{ first }}, así va tu operación hoy</h2><p>Resumen y accesos dentro de los permisos de tu sesión{{ galera ? ` en ${galera}` : '' }}.</p></div><div v-if="rank" class="ryn-rank"><span>🏆</span><div><small>Posición en ranking</small><strong>#{{ rank.posicion_galera }} de {{ rank.total_galera }}</strong><small>Este mes</small></div></div><div class="ryn-avatar">{{ first.slice(0, 1).toUpperCase() }}</div></section>
        <section v-if="kpis.length" class="ryn-kpis" aria-label="Indicadores principales">
          <article v-for="metric in kpis" :key="metric.label" class="ryn-kpi" :class="metric.tone"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.detail }}</small></article>
        </section>
        <section class="ryn-section-head"><div><span class="ryn-eyebrow">OPERACIÓN</span><h2>Módulos disponibles</h2></div><span class="ryn-data-state">Datos de MAIN</span></section>
        <section v-if="cards.length" class="ryn-modules">
          <article v-for="card in cards" :key="card.key" class="ryn-module" :class="card.key">
            <header><span class="ryn-module-icon">{{ card.title.slice(0, 1) }}</span><span class="ryn-badge">{{ card.badge }}</span></header>
            <h3>{{ card.title }}</h3><p>{{ card.description }}</p>
            <div class="ryn-module-metrics"><div v-for="metric in card.metrics" :key="metric.label" :class="metric.tone"><span>{{ metric.label }}</span><b>{{ metric.value }}</b><small>{{ metric.detail }}</small></div></div>
            <div v-if="card.key === 'control'" class="ryn-secondary-kpis" data-indicator="control" :data-state="state.controlState">
              <small v-if="state.controlState === 'loading'" role="status">Cargando indicadores operativos…</small>
              <p v-if="state.controlState === 'error'" role="alert">Control: {{ state.controlError }} <button @click="open('retryIndicators')">Reintentar</button></p>
              <p v-if="state.controlState === 'stale'" role="status">No se pudo actualizar Control; se conservan los valores anteriores. {{ state.controlError }}</p>
              <div v-if="state.controlIndicators" class="ryn-secondary-grid"><div><span>Unidades activas</span><b>{{ state.controlIndicators.totals?.activas ?? 0 }}</b></div><div><span>Unidades paradas</span><b>{{ state.controlIndicators.totals?.paradas ?? 0 }}</b></div><div><span>Abono adicional</span><b>{{ state.controlIndicators.totals?.abono_adicional ?? 0 }}</b></div></div>
            </div>
            <button class="ryn-open" @click="open(card.action)">Abrir {{ card.title }} <span aria-hidden="true">→</span></button>
          </article>
        </section>
        <section v-if="role === 'ADMIN_TOTAL'" class="ryn-gps-kpis" data-indicator="gps" :data-state="state.gpsState" aria-label="Indicadores GPS">
          <div><span class="ryn-eyebrow">GPS · RESUMEN EJECUTIVO</span><h3>Estado de la flota</h3></div>
          <small v-if="state.gpsState === 'loading'" role="status">Cargando indicadores GPS…</small>
          <p v-if="state.gpsState === 'error'" role="alert">GPS: {{ state.gpsError }} <button @click="open('retryIndicators')">Reintentar</button></p>
          <p v-if="state.gpsState === 'stale'" role="status">No se pudo actualizar GPS; se conservan los valores anteriores. {{ state.gpsError }}</p>
          <div v-if="state.gpsIndicators" class="ryn-secondary-grid"><div><span>Críticas</span><b>{{ state.gpsIndicators.kpis?.criticos ?? 0 }}</b></div><div><span>Alertas</span><b>{{ state.gpsIndicators.kpis?.alertas ?? 0 }}</b></div><div><span>Pendientes hoy</span><b>{{ state.gpsIndicators.kpis?.pending ?? 0 }}</b></div><div v-if="state.gpsIndicators.kpis?.sin_gps != null"><span>Sin GPS</span><b>{{ state.gpsIndicators.kpis.sin_gps }}</b></div></div>
        </section>
        <section v-else class="ryn-state">No hay módulos con resumen disponible para esta sesión.</section>
        <section class="ryn-section-head"><div><span class="ryn-eyebrow">SEGUIMIENTO</span><h2>Prioridades de hoy</h2></div><span class="ryn-count">{{ alerts.length }} prioridades</span></section>
        <section v-if="alerts.length" class="ryn-alerts"><article v-for="(alert, i) in alerts" :key="`${alert.title}-${i}`" :class="alert.level"><b>{{ alert.title }}</b><p>{{ alert.text }}</p></article></section>
        <section v-else class="ryn-state empty">Sin prioridades reportadas dentro de tu alcance.</section>
      </div>
    </section>
  </main>
</template>
