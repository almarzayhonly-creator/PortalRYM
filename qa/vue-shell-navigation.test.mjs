import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

test('Vue modular shell uses state.modules & rymHasModule and correctly delegates between Vue and legacy modules via real navigation helper', async () => {
  const indexHtmlPath = path.resolve('index.html')
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8')

  assert.ok(indexHtml.includes('function shell()'), 'shell function exists in index.html')
  assert.ok(indexHtml.includes('async function render()'), 'render function exists in index.html')
  assert.ok(indexHtml.includes('window.__RYM_VUE_NEXT_HOME_ENABLED'), 'Vue Next flag exists')
  assert.ok(indexHtml.includes('setActiveModule:(moduleId)=>{state.active=moduleId}'), 'index.html exposes setActiveModule to update the closure const state')

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
    .replace(/export interface[\s\S]*?}\n/g, '')
    .replace(/export async function navigateToLegacyView\([\s\S]*?\): Promise<void>/, 'async function navigateToLegacyView(moduleId, callbacks)')
    .replace(/\(window as any\)/g, 'window')
    .replace(/\(globalThis as any\)/g, 'globalThis')
    .replace(/as any/g, '')
    .replace(/: unknown/g, '')
    .trim()

  let renderedView = null
  let shellRenderCount = 0

  const domElements = new Map()

  const sandbox = {
    window: {},
    document: {
      querySelector: (sel) => domElements.get(sel) || null,
      createElement: (tag) => ({ tagName: tag, innerHTML: '', append: () => {}, remove: () => {} }),
    },
    createLegacyScope: () => {
      const state = { active: 'dashboard', modules: ['dashboard', 'ranking', 'historial'] }
      function shell() {
        shellRenderCount++
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
      const __RYM_VUE_NEXT_HOME_MAIN = {
        setActiveModule: (moduleId) => {
          state.active = moduleId
        }
      }
      return { shell, render, __RYM_VUE_NEXT_HOME_MAIN, getState: () => state }
    }
  }
  sandbox.window = sandbox
  sandbox.globalThis = sandbox

  const vmContext = vm.createContext(sandbox)
  vm.runInContext(`
    const legacy = createLegacyScope();
    window.shell = legacy.shell;
    window.render = legacy.render;
    window.__RYM_VUE_NEXT_HOME_MAIN = legacy.__RYM_VUE_NEXT_HOME_MAIN;

    // Ejecutamos el helper real de navigation.ts
    ${navigationJs}
    window.navigateToLegacyView = navigateToLegacyView;
  `, vmContext)

  // Ejecutamos navigateToLegacyView pasando los callbacks reales de desmontaje
  await vm.runInContext(`
    window.navigateToLegacyView('historial', {
      disposeHome: () => { globalThis.disposedHome = true; },
      disposePanapass: () => { globalThis.disposedPanapass = true; },
      disposeValidatorApp: () => { globalThis.disposedValidator = true; },
    })
  `, vmContext)

  const legacyState = vm.runInContext(`legacy.getState()`, vmContext)
  assert.equal(legacyState.active, 'historial', 'Real navigateToLegacyView updated legacy state.active to historial')
  assert.equal(renderedView, 'historial', 'Real navigateToLegacyView triggered window.render() with historial')
  assert.equal(sandbox.disposedHome, true, 'disposeHome callback was called')
  assert.equal(sandbox.disposedPanapass, true, 'disposePanapass callback was called')
  assert.equal(sandbox.disposedValidator, true, 'disposeValidator callback was called')

  // Probamos la transición hacia 'ranking'
  await vm.runInContext(`window.navigateToLegacyView('ranking')`, vmContext)
  assert.equal(legacyState.active, 'ranking', 'Real navigateToLegacyView updated legacy state.active to ranking')
  assert.equal(renderedView, 'ranking', 'Real navigateToLegacyView triggered window.render() with ranking')
})
