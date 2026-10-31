<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ error: string; onSubmit: (event: SubmitEvent) => Promise<void> | void }>()
const submitting = ref(false)
const sandboxHost = 'rym-login-preview-portal-ena-rym-sandbox.almarzayhonly.workers.dev'
const isSandbox = typeof window !== 'undefined' && window.location.hostname.toLowerCase() === sandboxHost
const logo = '/assets/rym-logo.png'

async function submit(event: SubmitEvent, handler: (event: SubmitEvent) => Promise<void> | void) {
  submitting.value = true
  try {
    await handler(event)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="rym-living-light-login">
    <!-- Fondos Vivos en Movimiento (Luminosos y Claros) -->
    <div class="light-mesh-backdrop" aria-hidden="true">
      <div class="gradient-blob blob-royal-blue"></div>
      <div class="gradient-blob blob-emerald-green"></div>
      <div class="gradient-blob blob-warm-gold"></div>
      <div class="gradient-blob blob-sky-cyan"></div>
      <div class="topographic-grid"></div>
    </div>

    <!-- Red de Tráfico y Rutas en Movimiento Suave (Luz Clara) -->
    <svg class="fleet-traffic-network" viewBox="0 0 1600 1000" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="traffic-line path-1" d="M-100 250 C350 150 450 550 850 420 S1350 850 1700 700" stroke="url(#bluePulseGrad)" stroke-width="3" stroke-dasharray="10 16"/>
      <path class="traffic-line path-2" d="M-80 820 C320 850 620 480 1050 580 S1320 180 1680 120" stroke="url(#greenPulseGrad)" stroke-width="2.5" stroke-dasharray="8 14"/>
      <path class="traffic-line path-3" d="M200 -50 C400 350 750 250 1100 650 S1500 450 1650 950" stroke="url(#goldPulseGrad)" stroke-width="2" stroke-dasharray="6 12"/>

      <!-- Nodos de vehículos activos en movimiento -->
      <circle class="moving-car car-1" r="5" fill="#2563eb">
        <animateMotion path="M-100 250 C350 150 450 550 850 420 S1350 850 1700 700" dur="20s" repeatCount="indefinite" />
      </circle>
      <circle class="moving-car car-2" r="5" fill="#10b981">
        <animateMotion path="M-80 820 C320 850 620 480 1050 580 S1320 180 1680 120" dur="25s" repeatCount="indefinite" />
      </circle>
      <circle class="moving-car car-3" r="5" fill="#f59e0b">
        <animateMotion path="M200 -50 C400 350 750 250 1100 650 S1500 450 1650 950" dur="22s" repeatCount="indefinite" />
      </circle>

      <defs>
        <linearGradient id="bluePulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2"/>
          <stop offset="50%" stop-color="#1d4ed8" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.2"/>
        </linearGradient>
        <linearGradient id="greenPulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#34d399" stop-opacity="0.2"/>
          <stop offset="50%" stop-color="#059669" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#34d399" stop-opacity="0.2"/>
        </linearGradient>
        <linearGradient id="goldPulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.2"/>
          <stop offset="50%" stop-color="#d97706" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.2"/>
        </linearGradient>
      </defs>
    </svg>

    <!-- Tarjeta Principal Cristal Cristalino (Superficie Blanca Pura & Reflejos Vivos) -->
    <div class="crystal-portal-card">
      <!-- Lado Izquierdo: Hero Operativo Claro y Vibrante -->
      <section class="portal-brand-panel">
        <div class="brand-top-bar">
          <div class="brand-logo-pod">
            <img :src="logo" alt="RYM Logo" class="brand-img" />
          </div>
          <div class="live-status-pill">
            <span class="radar-ping">
              <span class="ping-circle"></span>
              <span class="ping-center"></span>
            </span>
            <span class="status-title">OPERACIÓN EN VIVO</span>
          </div>
        </div>

        <div class="brand-headline">
          <span class="brand-tag">PORTAL OPERATIVO RYM</span>
          <h1 class="brand-title">Tu flota,<br><span class="highlight-energy">en movimiento</span></h1>
          <p class="brand-lead">
            Auditoría Panapass, gestión vehicular y monitoreo logístico en una experiencia rápida e inteligente.
          </p>
        </div>

        <!-- Módulos Interactivos con Destellos de Color -->
        <div class="feature-chips-grid">
          <div class="feature-chip chip-blue">
            <span class="chip-icon">🛣️</span>
            <div><strong>Panapass</strong><small>Negativos & Pagos</small></div>
          </div>
          <div class="feature-chip chip-green">
            <span class="chip-icon">📋</span>
            <div><strong>Revisados</strong><small>eCarCheck & ATTT</small></div>
          </div>
          <div class="feature-chip chip-cyan">
            <span class="chip-icon">📡</span>
            <div><strong>GPS Activo</strong><small>Monitoreo 24/7</small></div>
          </div>
          <div class="feature-chip chip-gold">
            <span class="chip-icon">🚗</span>
            <div><strong>Control Flota</strong><small>Gestión Unificada</small></div>
          </div>
        </div>
      </section>

      <!-- Lado Derecho: Formulario Limpio, Pulcro y Moderno -->
      <section class="portal-form-panel">
        <div class="form-title-group">
          <span class="eyebrow-accent">ACCESO SEGURO</span>
          <h2>Iniciar sesión</h2>
          <p>Ingresa tus datos autorizados para continuar</p>
        </div>

        <!-- Selector de Entorno con Acabado Claro Táctil -->
        <div class="environment-switcher">
          <a href="https://portal-ena-rym.almarzayhonly.workers.dev/" class="env-toggle" :class="{ 'is-active': !isSandbox }">
            <span class="env-badge-light p-badge">P</span>
            <div class="env-text-group">
              <span class="env-name">Producción</span>
              <span class="env-desc">Portal oficial</span>
            </div>
            <span v-if="!isSandbox" class="env-current-indicator">ACTUAL</span>
          </a>
          <a href="https://rym-login-preview-portal-ena-rym-sandbox.almarzayhonly.workers.dev/?vueNext=1" class="env-toggle" :class="{ 'is-active': isSandbox }">
            <span class="env-badge-light s-badge">S</span>
            <div class="env-text-group">
              <span class="env-name">Sandbox</span>
              <span class="env-desc">Solo ADMIN_TOTAL</span>
            </div>
            <span v-if="isSandbox" class="env-current-indicator">ACTUAL</span>
          </a>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="login-alert-box" role="alert">
          <span class="alert-icon">⚠️</span>
          <span>{{ error }}</span>
        </div>

        <!-- Formulario -->
        <form id="f" class="form-body" @submit.prevent="submit($event, $props.onSubmit)">
          <div class="field-item">
            <label for="user-field">Usuario asignado</label>
            <div class="input-control">
              <span class="input-symbol">👤</span>
              <input 
                id="user-field" 
                name="usuario" 
                autocomplete="username" 
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                placeholder="ej: yhonly" 
                required 
              />
            </div>
          </div>

          <div class="field-item">
            <label for="pass-field">Contraseña de acceso</label>
            <div class="input-control">
              <span class="input-symbol">🔒</span>
              <input 
                id="pass-field" 
                name="password" 
                type="password" 
                autocomplete="current-password" 
                placeholder="Ingresa tu contraseña" 
                required 
              />
            </div>
          </div>

          <button id="loginBtn" type="submit" class="vitality-btn" :disabled="submitting">
            <span class="btn-ripple"></span>
            <span class="btn-text-row">
              <span>{{ submitting ? 'Verificando credenciales…' : 'Entrar al sistema' }}</span>
              <span class="arrow-motion">→</span>
            </span>
          </button>
        </form>

        <div class="form-bottom-note">
          <span>© 2026 RYM · Repuestos & Multiservicios</span>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
/* Contenedor Principal Luminoso y Vivo */
.rym-living-light-login {
  min-height: 100vh;
  width: 100vw;
  background: #f0f4f9;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  padding: 1.5rem;
}

/* Malla de Fondo Fluida (Tonos Vivos y Brillantes) */
.light-mesh-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  background: radial-gradient(circle at 10% 20%, #ffffff 0%, #e2e8f0 100%);
}

.gradient-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.65;
  animation: dynamicMeshFlow 16s ease-in-out infinite alternate;
}

.blob-royal-blue {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, #38bdf8 0%, #2563eb 100%);
  top: -15%;
  left: 5%;
  animation-duration: 14s;
}

.blob-emerald-green {
  width: 550px;
  height: 550px;
  background: radial-gradient(circle, #34d399 0%, #059669 100%);
  bottom: -10%;
  left: -5%;
  animation-duration: 18s;
}

.blob-warm-gold {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, #fde047 0%, #f59e0b 100%);
  top: 35%;
  right: -5%;
  opacity: 0.55;
  animation-duration: 20s;
}

.blob-sky-cyan {
  width: 450px;
  height: 450px;
  background: radial-gradient(circle, #a5f3fc 0%, #0284c7 100%);
  bottom: 10%;
  right: 25%;
  opacity: 0.45;
  animation-duration: 16s;
}

@keyframes dynamicMeshFlow {
  0% { transform: translate(0, 0) scale(1) rotate(0deg); }
  50% { transform: translate(70px, 50px) scale(1.12) rotate(15deg); }
  100% { transform: translate(-50px, 70px) scale(0.92) rotate(-10deg); }
}

.topographic-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148, 163, 184, 0.12) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at center, black 50%, transparent 85%);
}

/* Red de Tráfico y Rutas en Movimiento */
.fleet-traffic-network {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.75;
}

.traffic-line {
  animation: streamRays 30s linear infinite;
}

.path-2 {
  animation-direction: reverse;
  animation-duration: 38s;
}

@keyframes streamRays {
  to { stroke-dashoffset: 1200; }
}

.moving-car {
  filter: drop-shadow(0 0 6px currentColor);
}

/* Tarjeta Cristalina Elevada (Superficie Blanca Translúcida) */
.crystal-portal-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 1020px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 32px;
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  box-shadow: 
    0 25px 50px -12px rgba(15, 23, 42, 0.12),
    0 12px 24px -8px rgba(37, 99, 235, 0.08),
    0 0 0 1px rgba(255, 255, 255, 0.8),
    inset 0 1px 2px rgba(255, 255, 255, 1);
  overflow: hidden;
  animation: cardElevate 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cardElevate {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Panel Izquierdo: Hero de Marca y Estado */
.portal-brand-panel {
  padding: 3.5rem 3rem;
  background: linear-gradient(145deg, #0f2c59 0%, #0c4a6e 60%, #065f46 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #ffffff;
  position: relative;
  overflow: hidden;
}

.portal-brand-panel::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.15), transparent 60%);
  pointer-events: none;
}

.brand-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  position: relative;
  z-index: 2;
}

.brand-logo-pod {
  width: 72px;
  height: 72px;
  max-width: 72px;
  max-height: 72px;
  background: #ffffff;
  border-radius: 20px;
  padding: 8px;
  box-shadow: 0 12px 25px -4px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-img {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.live-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 9999px;
  background: rgba(16, 185, 129, 0.22);
  border: 1px solid rgba(52, 211, 153, 0.4);
  color: #a7f3d0;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.radar-ping {
  position: relative;
  width: 10px;
  height: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ping-circle {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #34d399;
  opacity: 0.75;
  animation: pingExpand 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.ping-center {
  position: relative;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

@keyframes pingExpand {
  75%, 100% {
    transform: scale(2.4);
    opacity: 0;
  }
}

.brand-headline {
  position: relative;
  z-index: 2;
}

.brand-tag {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #7dd3fc;
  display: block;
  margin-bottom: 0.5rem;
}

.brand-title {
  font-size: 2.8rem;
  font-weight: 900;
  line-height: 1.12;
  margin: 0 0 1rem 0;
  letter-spacing: -0.02em;
}

.highlight-energy {
  background: linear-gradient(135deg, #fde047 0%, #38bdf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-lead {
  font-size: 0.98rem;
  color: #cbd5e1;
  line-height: 1.6;
  margin: 0;
}

/* Feature Chips Grid */
.feature-chips-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 2rem;
  position: relative;
  z-index: 2;
}

.feature-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.13);
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  animation: chipFloat 5s ease-in-out infinite alternate;
}

.chip-blue { animation-delay: 0s; }
.chip-green { animation-delay: 1.25s; }
.chip-cyan { animation-delay: 2.5s; }
.chip-gold { animation-delay: 3.75s; }

@keyframes chipFloat {
  0% { transform: translateY(0); }
  100% { transform: translateY(-6px); }
}

.feature-chip::before {
  content: '';
  position: absolute;
  top: 0;
  left: -120%;
  width: 70%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
  transform: skewX(-20deg);
  animation: chipShine 4.5s infinite;
}

.chip-blue::before { animation-delay: 0.5s; }
.chip-green::before { animation-delay: 1.8s; }
.chip-cyan::before { animation-delay: 3.1s; }
.chip-gold::before { animation-delay: 4.4s; }

@keyframes chipShine {
  0% { left: -120%; }
  35%, 100% { left: 180%; }
}

.feature-chip:hover {
  background: rgba(255, 255, 255, 0.26);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-8px) scale(1.04);
  box-shadow: 0 16px 32px -4px rgba(0, 0, 0, 0.35);
}

.chip-icon {
  font-size: 1.5rem;
  display: inline-block;
  animation: iconBounce 3s ease-in-out infinite;
}

.chip-blue .chip-icon { animation-delay: 0s; }
.chip-green .chip-icon { animation-delay: 0.75s; }
.chip-cyan .chip-icon { animation-delay: 1.5s; }
.chip-gold .chip-icon { animation-delay: 2.25s; }

@keyframes iconBounce {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.18) rotate(4deg); }
}

.feature-chip strong {
  display: block;
  font-size: 0.85rem;
  color: #ffffff;
}

.feature-chip small {
  font-size: 0.7rem;
  color: #94a3b8;
}

/* Panel Derecho: Formulario */
.portal-form-panel {
  padding: 3.5rem 3.2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: #ffffff;
}

.form-title-group .eyebrow-accent {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #0284c7;
  text-transform: uppercase;
}

.form-title-group h2 {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0.2rem 0 0.35rem 0;
  letter-spacing: -0.01em;
}

.form-title-group p {
  font-size: 0.92rem;
  color: #64748b;
  margin: 0 0 1.6rem 0;
}

/* Selector de Entornos */
.environment-switcher {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 1.5rem;
}

.env-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  text-decoration: none;
  color: inherit;
  transition: all 0.25s ease;
}

.env-toggle:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.env-toggle.is-active {
  background: #f0fdf4;
  border-color: #10b981;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.12);
}

.env-badge-light {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.78rem;
  color: #ffffff;
}

.p-badge { background: linear-gradient(135deg, #f97316, #ea580c); }
.s-badge { background: linear-gradient(135deg, #10b981, #059669); }

.env-text-group {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.env-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: #0f172a;
}

.env-desc {
  font-size: 0.68rem;
  color: #64748b;
}

.env-current-indicator {
  margin-left: auto;
  font-size: 0.62rem;
  font-weight: 800;
  background: #d1fae5;
  color: #065f46;
  padding: 3px 6px;
  border-radius: 6px;
}

/* Alerta de Error */
.login-alert-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 0.85rem;
  margin-bottom: 1.2rem;
}

/* Campos de Entrada */
.form-body {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-item label {
  font-size: 0.84rem;
  font-weight: 600;
  color: #334155;
}

.input-control {
  position: relative;
  display: flex;
  align-items: center;
}

.input-symbol {
  position: absolute;
  left: 14px;
  font-size: 1.1rem;
  pointer-events: none;
  opacity: 0.7;
}

.input-control input {
  width: 100%;
  padding: 14px 14px 14px 44px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  color: #0f172a;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.25s ease;
}

.input-control input:focus {
  background: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

/* Botón de Entrada Dinámico y Energético */
.vitality-btn {
  position: relative;
  margin-top: 0.6rem;
  padding: 15px 22px;
  background: linear-gradient(135deg, #0284c7 0%, #16a34a 100%);
  border: none;
  border-radius: 16px;
  color: #ffffff;
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.01em;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 10px 24px -4px rgba(2, 132, 199, 0.35);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.vitality-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px -4px rgba(22, 163, 74, 0.4);
}

.vitality-btn:active:not(:disabled) {
  transform: translateY(0);
}

.vitality-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-ripple {
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transform: skewX(-20deg);
  animation: rippleGlow 3s infinite;
}

@keyframes rippleGlow {
  0% { left: -100%; }
  35%, 100% { left: 160%; }
}

.btn-text-row {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.arrow-motion {
  display: inline-block;
  transition: transform 0.25s ease;
}

.vitality-btn:hover .arrow-motion {
  transform: translateX(4px);
}

.form-bottom-note {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.76rem;
  color: #94a3b8;
}

/* Responsive */
/* --- TABLET / PANTALLAS MEDIANAS (iPad, Tablets Android, Laptops pequeñas: 768px a 1024px) --- */
@media (max-width: 1024px) {
  .crystal-portal-card {
    max-width: 900px;
    border-radius: 28px;
  }
  .portal-brand-panel {
    padding: 2.8rem 2.2rem;
  }
  .portal-form-panel {
    padding: 2.8rem 2.4rem;
  }
  .brand-title {
    font-size: 2.3rem;
  }
  .feature-chips-grid {
    gap: 10px;
  }
  .feature-chip {
    padding: 10px 12px;
  }
}

/* --- TABLET VERTICAL Y MÓVILES GRANDES (max-width: 880px) --- */
@media (max-width: 880px) {
  .rym-living-light-login {
    padding: 1.2rem;
    align-items: flex-start;
    overflow-y: auto;
  }
  .crystal-portal-card {
    grid-template-columns: 1fr;
    max-width: 520px;
    margin: auto 0;
    border-radius: 24px;
  }
  /* En lugar de ocultar la marca en tablet/móvil, la adaptamos con un banner superior vibrante */
  .portal-brand-panel {
    display: flex;
    flex-direction: column;
    padding: 2rem 1.8rem;
    gap: 1.5rem;
  }
  .brand-top-bar {
    margin-bottom: 0.5rem;
  }
  .brand-logo-pod {
    width: 58px;
    height: 58px;
    max-width: 58px;
    max-height: 58px;
    border-radius: 16px;
    padding: 6px;
  }
  .brand-title {
    font-size: 1.9rem;
    margin-bottom: 0.5rem;
  }
  .brand-lead {
    font-size: 0.88rem;
    line-height: 1.45;
  }
  /* Chips en 2 columnas compactas en móvil */
  .feature-chips-grid {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 0.5rem;
  }
  .feature-chip {
    padding: 8px 10px;
    border-radius: 14px;
    gap: 8px;
  }
  .chip-icon {
    font-size: 1.2rem;
  }
  .feature-chip strong {
    font-size: 0.78rem;
  }
  .feature-chip small {
    font-size: 0.64rem;
  }
  .portal-form-panel {
    padding: 2.2rem 1.8rem;
  }
  .form-title-group h2 {
    font-size: 1.7rem;
  }
}

/* --- MÓVILES PEQUEÑOS Y ESTRECHOS (iPhone SE, Galaxy A, pantallas < 480px) --- */
@media (max-width: 480px) {
  .rym-living-light-login {
    padding: 0.75rem;
  }
  .crystal-portal-card {
    border-radius: 20px;
    max-width: 100%;
  }
  .portal-brand-panel {
    padding: 1.6rem 1.2rem;
  }
  .brand-title {
    font-size: 1.6rem;
  }
  .brand-lead {
    font-size: 0.82rem;
  }
  /* En teléfonos pequeños los 4 chips se organizan en scroll o 2 columnas ultra compactas */
  .feature-chips-grid {
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .feature-chip {
    padding: 6px 8px;
    border-radius: 12px;
    gap: 6px;
  }
  .chip-icon {
    font-size: 1.05rem;
  }
  .feature-chip strong {
    font-size: 0.72rem;
  }
  .feature-chip small {
    display: none; /* Ocultar subtítulo para máxima limpieza táctil en móvil */
  }
  .portal-form-panel {
    padding: 1.8rem 1.2rem;
  }
  .form-title-group h2 {
    font-size: 1.5rem;
  }
  .environment-switcher {
    gap: 8px;
  }
  .env-toggle {
    padding: 8px 10px;
    border-radius: 12px;
    gap: 8px;
  }
  .env-badge-light {
    width: 24px;
    height: 24px;
    border-radius: 8px;
    font-size: 0.72rem;
  }
  .env-name {
    font-size: 0.76rem;
  }
  .env-desc {
    display: none;
  }
  .input-control input {
    padding: 12px 12px 12px 40px;
    font-size: 0.9rem;
  }
  .input-symbol {
    left: 12px;
    font-size: 1rem;
  }
  .vitality-btn {
    padding: 13px 18px;
    font-size: 0.95rem;
    border-radius: 14px;
  }
}
</style>
