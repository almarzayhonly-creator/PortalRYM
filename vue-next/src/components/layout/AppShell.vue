<script setup lang="ts">
import { computed } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppTopBar from './AppTopBar.vue'
import type { PortalProfile } from '../../types'

const props = defineProps<{
  profile: PortalProfile
  modules: string[]
  activeModule: string
  title: string
  subtitle?: string
  updatedAt?: string
  hasModule: (code: string) => boolean
}>()

const emit = defineEmits<{
  (e: 'navigate', moduleId: string): void
  (e: 'logout'): void
}>()
</script>

<template>
  <div class="ryn-shell rym-vue-modular-shell" data-testid="modular-shell">
    <AppSidebar
      :profile="profile"
      :modules="modules"
      :active-module="activeModule"
      :has-module="hasModule"
      @navigate="m => emit('navigate', m)"
      @logout="emit('logout')"
    />

    <section class="ryn-workspace">
      <AppTopBar
        :profile="profile"
        :title="title"
        :subtitle="subtitle"
        :updated-at="updatedAt"
        @logout="emit('logout')"
      />

      <main class="ryn-main">
        <slot />
      </main>
    </section>
  </div>
</template>
