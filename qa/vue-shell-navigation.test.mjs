import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

test('Vue modular shell uses state.modules & rymHasModule and correctly delegates between Vue and legacy modules via real navigation helper with profile sync and null guard', async () => {
  const indexHtmlPath = path.resolve('index.html')
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8')

  assert.ok(indexHtml.includes('function shell()'), 'shell function exists in index.html')
  assert.ok(indexHtml.includes('async function render()'), 'render function exists in index.html')
  assert.ok(indexHtml.includes('window.__RYM_VUE_NEXT_HOME_ENABLED'), 'Vue Next flag exists')
  assert.ok(indexHtml.includes('setSession:(profile,moduleId)=>{if(profile)state.profile=profile;if(moduleId)state.active=moduleId'), 'index.html exposes setSession to sync profile and active module')

  // Verificamos que AppSidebar.vue emita 'users'
  const sidebarCode = fs.readFileSync(path.resolve('vue-next/src/components/layout/AppSidebar.vue'), 'utf8')
  assert.ok(sidebarCode.includes("items.push({ id: 'users', label: LABELS.usuarios, group: 'admin', icon: 'users' })"), 'Sidebar uses id: users for admin panel')

  // Verificamos que HomeView.vue mapee users hacia el módulo Vue
  const homeViewCode = fs.readFileSync(path.resolve('vue-next/src/views/HomeView.vue'), 'utf8')
  assert.ok(homeViewCode.includes("moduleId === 'users' || moduleId === 'usuarios'"), 'HomeView maps users to Vue operational module')

  // Leemos el archivo real vue-next/src/navigation.ts y verificamos que sea importable/usable
  const navigationFilePath = path.resolve('vue-next/src/navigation.ts')
  assert.ok(fs.existsSync(navigationFilePath), 'navigation.ts exists')
  const navigationFileContent = fs.readFileSync(navigationFilePath, 'utf8')

  // Limpiamos únicamente tipos TS
  const navigationJs = navigationFileContent
    .replace(/import type[\s\S]*?\n/g, '').replace(/export interface[\s\S]*?}\n/g, '')
    .replace(/export async function navigateToLegacyView\([\s\S]*?\): Promise<void>/, 'async function navigateToLegacyView(moduleId, callbacks, profile)')
    .replace(/\(window as any\)/g, 'window')
    .replace(/\(globalThis as any\)/g, 'globalThis')
    .replace(/as any/g, '')
    .replace(/: unknown/g, '')
    .trim()

  let renderedView = null
  let shellRenderCount = 0
  let loginViewCalled = false

  const domElements = new Map()

  const sandbox = {
    window: {},
    document: {
      querySelector: (sel) => domElements.get(sel) || null,
      createElement: (tag) => ({ tagName: tag, innerHTML: '', append: () => {}, remove: () => {} }),
    },
    createLegacyScope: () => {
      const state = { profile: null, active: 'dashboard', modules: ['dashboard', 'ranking', 'historial'] }
      function shell() {
        shellRenderCount++
        if (!state.profile || !state.profile.nombre) {
          throw new TypeError("Cannot read properties of null (reading 'nombre')")
        }
        for (const m of state.modules) {
          const btn = {
            dataset: { m },
            onclick: async () => {
              state.active = m
              shell()
              await render()
            }
          }
          domElements.set(`[data-m="${m}"]`, btn)
        }
      }
      async function render() {
        renderedView = state.active
      }
      const __RYM_VUE_NEXT_API = {
        setSession: (profile, moduleId) => {
          if (profile) state.profile = profile
          if (moduleId) state.active = moduleId
        }
      }
      return { shell, render, __RYM_VUE_NEXT_API, getState: () => state }
    }
  }
  sandbox.window = sandbox
  sandbox.globalThis = sandbox

  const vmContext = vm.createContext(sandbox)
  vm.runInContext(`
    const legacy = createLegacyScope();
    window.shell = legacy.shell;
    window.render = legacy.render;
    window.__RYM_VUE_NEXT_API = legacy.__RYM_VUE_NEXT_API;
    window.loginView = () => { globalThis.loginViewCalled = true; };

    // Ejecutamos el helper real de navigation.ts
    ${navigationJs}
    window.navigateToLegacyView = navigateToLegacyView;
  `, vmContext)

  // 1. Probar salvaguarda sin sesión (profile = null): debe llamar loginView sin lanzar excepción
  await vm.runInContext(`
    window.navigateToLegacyView('historial', {}, null);
  `, vmContext)
  assert.equal(sandbox.globalThis.loginViewCalled, true, 'Null profile redirects cleanly to loginView without error')

  // 2. Probar navegación con perfil autenticado completo
  const testProfile = { nombre: 'Administrador Pruebas', rol: 'ADMIN_TOTAL', email: 'admin@test.pa' }
  await vm.runInContext(`
    window.navigateToLegacyView('historial', {
      disposeHome: () => { globalThis.disposedHome = true; },
      disposePanapass: () => { globalThis.disposedPanapass = true; },
      disposeValidatorApp: () => { globalThis.disposedValidator = true; },
    }, ${JSON.stringify(testProfile)})
  `, vmContext)

  const legacyState = vm.runInContext(`legacy.getState()`, vmContext)
  assert.equal(legacyState.profile.nombre, 'Administrador Pruebas', 'state.profile was synchronized to closed legacy scope')
  assert.equal(legacyState.active, 'historial', 'state.active was updated to historial')
  assert.equal(renderedView, 'historial', 'window.render() was successfully executed without null error')
  assert.equal(sandbox.disposedHome, true, 'disposeHome callback was called')

  // 3. Probar navegación hacia Ranking
  await vm.runInContext(`
    window.navigateToLegacyView('ranking', {}, ${JSON.stringify(testProfile)})
  `, vmContext)
  assert.equal(legacyState.active, 'ranking', 'state.active was updated to ranking')
  assert.equal(renderedView, 'ranking', 'window.render() was successfully executed for ranking')
})
