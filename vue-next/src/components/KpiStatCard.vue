<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

type Tone = 'orange' | 'blue' | 'green' | 'yellow' | 'gray' | 'black'

const props = withDefaults(defineProps<{
  label: string
  /** Texto ya formateado. Si se envía `amount`, se anima y este valor se ignora. */
  value?: string | number
  /** Número a animar (count-up). */
  amount?: number
  prefix?: string
  decimals?: number
  hint?: string
  icon?: string
  tone?: Tone
  /** 0-100: barra de progreso viva. */
  progress?: number
  /** Latido de atención (alertas). */
  pulse?: boolean
  delay?: number
}>(), { tone: 'blue', decimals: 0, prefix: '', delay: 0 })

/* Clases literales para que Tailwind las detecte. */
const TONES: Record<Tone, { card: string; icon: string; value: string; bar: string; glow: string }> = {
  orange: { card: 'border-rym-orange-100 bg-gradient-to-br from-white to-rym-orange-50', icon: 'bg-gradient-to-br from-rym-orange-400 to-rym-orange-600 text-white shadow-rym-orange-500/40', value: 'text-rym-orange-600', bar: 'bg-gradient-to-r from-rym-orange-400 to-rym-yellow-400', glow: 'hover:shadow-rym-orange-500/25' },
  blue: { card: 'border-rym-blue-100 bg-gradient-to-br from-white to-rym-blue-50', icon: 'bg-gradient-to-br from-rym-blue-400 to-rym-blue-600 text-white shadow-rym-blue-500/40', value: 'text-rym-blue-800', bar: 'bg-gradient-to-r from-rym-blue-500 to-rym-blue-400', glow: 'hover:shadow-rym-blue-500/25' },
  green: { card: 'border-rym-green-100 bg-gradient-to-br from-white to-rym-green-50', icon: 'bg-gradient-to-br from-rym-green-400 to-rym-green-600 text-white shadow-rym-green-500/40', value: 'text-rym-green-700', bar: 'bg-gradient-to-r from-rym-green-500 to-rym-green-400', glow: 'hover:shadow-rym-green-500/25' },
  yellow: { card: 'border-rym-yellow-100 bg-gradient-to-br from-white to-rym-yellow-50', icon: 'bg-gradient-to-br from-rym-yellow-400 to-rym-yellow-600 text-white shadow-rym-yellow-500/40', value: 'text-rym-yellow-600', bar: 'bg-gradient-to-r from-rym-yellow-500 to-rym-yellow-400', glow: 'hover:shadow-rym-yellow-500/25' },
  gray: { card: 'border-rym-gray-200 bg-gradient-to-br from-white to-rym-gray-100', icon: 'bg-gradient-to-br from-rym-gray-400 to-rym-gray-500 text-white shadow-rym-gray-500/30', value: 'text-rym-gray-700', bar: 'bg-gradient-to-r from-rym-gray-500 to-rym-gray-400', glow: 'hover:shadow-rym-gray-500/20' },
  black: { card: 'border-rym-black-700 bg-gradient-to-br from-rym-black-800 to-rym-black-900 text-white', icon: 'bg-gradient-to-br from-rym-orange-400 to-rym-orange-600 text-white shadow-rym-orange-500/40', value: 'text-white', bar: 'bg-gradient-to-r from-rym-orange-500 to-rym-yellow-400', glow: 'hover:shadow-rym-black-900/40' },
}
const t = computed(() => TONES[props.tone])
const isDark = computed(() => props.tone === 'black')

/* Count-up suave */
const shown = ref(0)
let raf = 0
function animate(to: number) {
  cancelAnimationFrame(raf)
  const from = shown.value
  const start = performance.now()
  const dur = 800
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / dur)
    shown.value = from + (to - from) * (1 - Math.pow(1 - p, 3))
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}
const display = computed(() => {
  if (props.amount === undefined) return String(props.value ?? '—')
  return props.prefix + shown.value.toLocaleString('en-US', { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals })
})
onMounted(() => { if (props.amount !== undefined) animate(props.amount) })
watch(() => props.amount, v => { if (v !== undefined) animate(v) })
const pct = computed(() => Math.max(0, Math.min(100, props.progress ?? 0)))
</script>

<template>
  <article
    class="group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl animate-rym-fade-up"
    :class="[t.card, t.glow]"
    :style="{ animationDelay: `${delay}ms` }"
  >
    <!-- brillo animado -->
    <span class="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/30 opacity-0 group-hover:opacity-100 group-hover:animate-rym-shine" aria-hidden="true"></span>
    <div class="relative flex items-start justify-between gap-3">
      <div class="min-w-0">
        <span class="block text-[10px] font-extrabold uppercase tracking-[.12em]" :class="isDark ? 'text-rym-gray-400' : 'text-rym-gray-500'">{{ label }}</span>
        <b class="mt-1.5 block truncate text-[28px] font-black leading-none tracking-tight tabular-nums" :class="t.value">{{ display }}</b>
        <small v-if="hint" class="mt-2 block text-[11px] font-semibold" :class="isDark ? 'text-rym-gray-400' : 'text-rym-gray-500'">{{ hint }}</small>
      </div>
      <span
        v-if="icon"
        class="grid h-11 w-11 flex-none place-items-center rounded-xl text-xl shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
        :class="[t.icon, pulse ? 'animate-rym-glow' : '']"
        aria-hidden="true"
      >{{ icon }}</span>
    </div>
    <div v-if="progress !== undefined" class="relative mt-3 h-1.5 w-full overflow-hidden rounded-full" :class="isDark ? 'bg-white/10' : 'bg-rym-gray-200'">
      <div class="h-full rounded-full animate-rym-bar" :class="t.bar" :style="{ width: pct + '%' }"></div>
    </div>
  </article>
</template>
