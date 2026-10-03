<script setup lang="ts">
const migrationLane = 'Stitch -> DESIGN.md -> Vue 3 -> Sandbox'
</script>

<template>
  <main class="rym-migration-shell">
    <section>
      <p class="eyebrow">Portal RYM</p>
      <h1>Vue migration lane</h1>
      <p>{{ migrationLane }}</p>
      <p>
        This isolated Vue entrypoint exists for incremental screen migration.
        It does not replace or modify the current production application.
      </p>
    </section>
  </main>
</template>

<style scoped>
.rym-migration-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  background: #f6f8fb;
  color: #172033;
}
section {
  width: min(760px, 100%);
  padding: 2rem;
  border: 1px solid #dfe5ee;
  border-radius: 12px;
  background: white;
}
.eyebrow {
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
h1 { margin: .5rem 0 1rem; }
</style>
