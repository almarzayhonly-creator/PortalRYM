<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ error: string; onSubmit: (event: SubmitEvent) => Promise<void> | void }>()
const submitting = ref(false)
const sandboxHost = 'rym-login-preview-portal-ena-rym.almarzayhonly.workers.dev'
const isSandbox = window.location.hostname.toLowerCase() === sandboxHost
const routeArt = '/assets/rym-login-routes.svg?v=1'
const logo = '/assets/rym-logo.png'

async function submit(event: SubmitEvent, handler: (event: SubmitEvent) => Promise<void> | void) {
  submitting.value = true
  try { await handler(event) } finally { submitting.value = false }
}
</script>

<template>
  <main class="login login-rym">
    <img class="login-rym-route-art" :src="routeArt" alt="" aria-hidden="true">
    <div class="login-rym-layout">
      <header class="login-rym-head">
        <div class="login-rym-logo"><img :src="logo" alt="R&M Repuestos & Multiservicios"></div>
        <p class="login-rym-kicker">Portal RYM · Gestión de flota</p>
        <h1>Tu flota,<br><span>en movimiento</span></h1>
        <p class="login-rym-subtitle">Plataforma unificada para la administración y monitoreo operativo de vehículos.</p>
        <div class="login-rym-modules" aria-label="Módulos de gestión">
          <span class="login-rym-module"><i></i>Panapass</span>
          <span class="login-rym-module"><i></i>Revisados</span>
          <span class="login-rym-module"><i></i>GPS</span>
          <span class="login-rym-module"><i></i>Control de flota</span>
        </div>
      </header>
      <section class="login-card login-rym-card">
        <div class="login-rym-form-head"><small>Acceso de operación</small><h2>Iniciar sesión</h2><p>Ingresa tus credenciales autorizadas para continuar.</p></div>
        <nav class="rym-login-environments" aria-label="Selecciona el entorno">
          <span class="rym-login-env-caption">ENTORNO DE ACCESO</span>
          <div class="rym-login-env-options">
            <a class="rym-login-env-option" href="https://portal-ena-rym.almarzayhonly.workers.dev/" :aria-current="!isSandbox ? 'page' : undefined" :class="{ active: !isSandbox }">
              <span class="rym-login-env-symbol production" aria-hidden="true">P</span><span class="rym-login-env-copy"><b>Producción</b><small>Portal oficial</small></span><span v-if="!isSandbox" class="rym-login-env-status">ACTUAL</span>
            </a>
            <a class="rym-login-env-option" href="https://rym-login-preview-portal-ena-rym.almarzayhonly.workers.dev/?vueNext=1" :aria-current="isSandbox ? 'page' : undefined" :class="{ active: isSandbox }">
              <span class="rym-login-env-symbol sandbox" aria-hidden="true">S</span><span class="rym-login-env-copy"><b>Sandbox</b><small>Solo ADMIN_TOTAL</small></span><span v-if="isSandbox" class="rym-login-env-status">ACTUAL</span>
            </a>
          </div>
        </nav>
        <div v-if="error" class="alert" role="alert">{{ error }}</div>
        <form id="f" class="login-rym-form" @submit.prevent="submit($event, $props.onSubmit)">
          <label class="login-rym-field">Usuario<input name="usuario" autocomplete="username" placeholder="Usuario asignado" required></label>
          <label class="login-rym-field">Contraseña<input name="password" type="password" autocomplete="current-password" placeholder="Contraseña" required></label>
          <button id="loginBtn" type="submit" :disabled="submitting"><span>{{ submitting ? 'Ingresando…' : 'Entrar al sistema' }}</span><span aria-hidden="true">→</span></button>
        </form>
        <p class="login-rym-footer">© 2026 RYM · Gestión de flota</p>
      </section>
      <svg class="login-rym-flow" viewBox="0 0 920 78" role="presentation" aria-hidden="true">
        <path class="flow-fine" d="M18 51 C104 51 91 20 170 20 S270 58 338 43 S445 15 510 28 S623 63 698 47 S820 24 902 33"/>
        <path class="flow-blue flow-dash" d="M10 61 C104 58 115 35 194 36 S286 60 358 49 S457 26 530 39 S650 65 722 51 S823 38 910 44"/>
        <path class="flow-cyan flow-dash reverse" d="M22 39 C95 40 127 56 203 54 S300 32 375 34 S465 55 540 51 S645 29 710 32 S830 53 900 56"/>
        <path class="flow-gold flow-dash" d="M70 70 C146 66 168 47 238 47 S334 69 405 62 S490 42 564 45 S680 70 748 64 S840 52 890 60"/>
        <circle class="flow-node" cx="194" cy="36" r="4" fill="#355FF5"/><circle class="flow-node" cx="375" cy="34" r="4" fill="#00C7D4"/><circle class="flow-node" cx="564" cy="45" r="4" fill="#FFD24A"/><circle class="flow-node" cx="722" cy="51" r="4" fill="#355FF5"/>
      </svg>
    </div>
  </main>
</template>
