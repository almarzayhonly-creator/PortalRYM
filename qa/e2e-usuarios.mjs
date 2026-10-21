// Prueba integral E2E en Google Chrome de UsuariosView (Administración de Usuarios)
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/almar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')

const HOST = 'https://rym-login-preview-portal-ena-rym.almarzayhonly.workers.dev'
const SB = 'https://avczyvcpmicpuhdkmxzx.supabase.co'
const ROOT = process.cwd()
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }

const profile = { id: 'u1', nombre: 'Admin Pruebas', email: 'admin@test.pa', usuario: 'admin', rol: 'ADMIN_TOTAL', activo: true, supervisora_id: 's2', must_change_password: false }
const modules = ['dashboard', 'ranking', 'historial', 'operaciones', 'pagos_hoy', 'negativos_hoy', 'cargar_pagos', 'recurrentes', 'reportes', 'usuarios', 'portal.panapass']

// Mocks de Usuarios
const mockAdminUsers = {
  ok: true,
  users: [
    { id: 'u1', nombre: 'Admin Pruebas', email: 'admin@test.pa', usuario: 'admin', rol: 'ADMIN_TOTAL', activo: true, must_change_password: false, galeras_scope: ['VCARS', 'VIPCO'], supervisoras: [] },
    { id: 'u2', nombre: 'Dayana Prieto', email: 'dayana@empresa.com', usuario: 'dayana', rol: 'SUPERVISORA', activo: true, must_change_password: false, galeras_scope: ['VCARS'], supervisoras: [{ id: 's1', nombre: 'Dayana Prieto', galera: 'VCARS' }] },
    { id: 'u3', nombre: 'Carlos Pagador', email: 'carlos@empresa.com', usuario: 'carlos', rol: 'PAGADOR', activo: false, must_change_password: true, galeras_scope: [], supervisoras: [] }
  ],
  supervisoras: [
    { id: 's1', nombre: 'Dayana Prieto', galera: 'VCARS' },
    { id: 's2', nombre: 'Ana Gómez', galera: 'VIPCO' }
  ],
  galeras: ['VCARS', 'VCOMP', 'VIPCO', 'VINDU'],
  modulos: [
    { codigo: 'ranking', nombre: 'Ranking' },
    { codigo: 'historial', nombre: 'Historial / Pendientes' },
    { codigo: 'pagos_hoy', nombre: 'Pagos Hoy' },
    { codigo: 'recurrentes', nombre: 'Recurrentes' },
    { codigo: 'reportes', nombre: 'Reportes' }
  ],
  rol_permisos: [
    { rol: 'ADMIN_TOTAL', modulo_codigo: 'ranking', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true }
  ],
  usuario_permisos: [],
  supervisoras_detectadas: [
    {
      id: 'det-1',
      nombre_detectado: 'Maria Lopez',
      total_unidades: 12,
      galera_sugerida: 'VIPCO',
      unidades: ['V100', 'V101', 'V102', 'V103']
    }
  ]
}

const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' -> ' + detail : ''}`) }

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
const page = await context.newPage()

const consoleErrors = []
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', err => consoleErrors.push(err.message))

await page.route('**/*', async route => {
  const url = new URL(route.request().url())
  if (url.origin === HOST) {
    const p = url.pathname === '/' ? '/index.html' : url.pathname
    const fp = path.join(ROOT, p.replace(/^\//, ''))
    if (fs.existsSync(fp) && !fs.statSync(fp).isDirectory()) {
      const ext = path.extname(fp)
      return route.fulfill({ status: 200, contentType: MIME[ext] || 'application/octet-stream', body: fs.readFileSync(fp) })
    }
  }
  if (url.origin === SB) {
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
    if (url.pathname.endsWith('/functions/v1/auth-username')) return json({ ok: true, access_token: 'tok', refresh_token: 'ref', expires_at: Math.floor(Date.now() / 1000) + 3600, profile, modules })
    if (url.pathname.endsWith('/functions/v1/admin-users')) {
      const postData = route.request().postDataJSON() || {}
      if (postData.action === 'list') return json(mockAdminUsers)
      if (postData.action === 'create') return json({ ok: true, usuario: 'nuevo_user' })
      return json({ ok: true })
    }
    return json(url.pathname.includes('/functions/') ? { ok: true } : [])
  }
  return route.abort()
})

try {
  await page.goto(`${HOST}/?vueNext=1`, { waitUntil: 'load', timeout: 30000 })
  await page.waitForSelector('form#f', { timeout: 15000 })
  check('1. Login Vue montado', true)

  await page.fill('input[name="usuario"]', 'admin')
  await page.fill('input[name="password"]', 'secreto')
  await page.click('#loginBtn')
  await page.waitForSelector('[data-testid="vue-next-home"], .shell', { timeout: 20000 })
  check('2. Sesión iniciada con Dashboard montado', true)

  // Abrir Panapass shell donde reside #view
  await page.evaluate(() => {
    if (typeof window.v70OpenPanapass === 'function') window.v70OpenPanapass()
  })
  await page.waitForSelector('#view', { timeout: 10000 })
  check('3. Shell Panapass con contenedor #view listo', true)

  // Montar UsuariosView
  const mounted = await page.evaluate(async () => {
    const view = document.querySelector('#view')
    if (!view) return false
    if (window.__RYM_VUE_NEXT_VIEWS && window.__RYM_VUE_NEXT_VIEWS.mount) {
      return await window.__RYM_VUE_NEXT_VIEWS.mount('usuarios', view)
    }
    return false
  })
  check('4. Montaje de UsuariosView.vue vía bridge', mounted === true)

  // 5. Verificar scoping .rym-tw
  await page.waitForSelector('.rym-tw', { timeout: 6000 })
  const rymTw = await page.$('.rym-tw')
  check('5. Scoping Tailwind .rym-tw activo', !!rymTw)

  // 6. Título del módulo
  const title = await page.textContent('.rym-tw h1')
  check('6. Título "Administración de Usuarios" presente', title?.includes('Administración de Usuarios'))

  // 7. Panel de supervisoras detectadas
  const detPanel = await page.textContent('.rym-tw')
  check('7. Panel de supervisoras detectadas presente', detPanel?.includes('Nuevas Supervisoras Detectadas') && detPanel?.includes('Maria Lopez'))

  // 8. Formulario de creación de usuario y generación de username reactiva
  const createForm = await page.$('.rym-tw form')
  check('8. Formulario de creación de usuario renderizado', !!createForm)

  await page.fill('.rym-tw input[placeholder="Ej. Dayana Prieto"]', 'Roberto Sanchez')
  await page.waitForTimeout(300)
  const usernameVal = await page.inputValue('.rym-tw input[placeholder="Se genera automáticamente"]')
  check('9. Generación reactiva de username (@roberto)', usernameVal === 'roberto', `valor: ${usernameVal}`)

  // 10. Tabla de usuarios
  const tableText = await page.textContent('.rym-tw table')
  check('10. Tabla de usuarios lista Dayana Prieto y Carlos Pagador', tableText?.includes('Dayana Prieto') && tableText?.includes('Carlos Pagador'))

  // 11. Modal de usuario
  await page.click('.rym-tw button:has-text("Administrar")')
  await page.waitForSelector('.rym-tw .fixed', { timeout: 3000 })
  const modalTitle = await page.textContent('.rym-tw .fixed h3')
  check('11. Modal de edición de usuario se abre correctamente', !!modalTitle)

  // 12. Cero excepciones de consola críticas
  const fatalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('404') && !e.includes('net::ERR_FAILED'))
  check('12. Cero excepciones de consola no controladas', fatalErrors.length === 0, fatalErrors.join(' | '))

  await page.screenshot({ path: 'qa/screenshot-vue-usuarios.png', fullPage: true })
  console.log('Captura guardada en qa/screenshot-vue-usuarios.png')
} finally {
  await browser.close()
}

const failed = results.filter(r => !r.ok)
console.log(`\nResultado UsuariosView: ${results.length - failed.length}/${results.length} pruebas superadas.`)
if (failed.length > 0) process.exit(1)
