// Prueba integral E2E en Google Chrome de OperacionesView
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
const modules = ['dashboard', 'ranking', 'historial', 'operaciones', 'negativos_hoy', 'pagos_hoy', 'reportes', 'portal.panapass']

// Mock de Operaciones
const mockEstadoOps = [{
  fuente_es_hoy: true,
  fuente_registros: 1420,
  fuente_negativos: 185,
  puede_am: true,
  motivo_am: 'Listo para procesar corte AM',
  puede_pm: true,
  motivo_pm: 'Listo para conciliar corte PM',
  am_negativos: 185,
  pm_pendientes: 42,
  pm_pagados: 143
}]

const mockEnaEstado = [
  { tipo: '6AM', estado: 'LISTO', iniciado_en: '2026-10-21T06:05:00Z', finalizado_en: '2026-10-21T06:42:00Z', filas_validas: 1420 },
  { tipo: '11AM', estado: 'LISTO', iniciado_en: '2026-10-21T11:05:00Z', finalizado_en: '2026-10-21T11:38:00Z', filas_validas: 1420 }
]

const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' -> ' + detail : ''}`) }

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const pageErrors = []

page.on('pageerror', e => pageErrors.push(e.message))

await page.route('**/*', async route => {
  const url = new URL(route.request().url())
  if (url.origin === HOST) {
    let p = decodeURIComponent(url.pathname)
    if (p === '/' || p === '') p = '/index.html'
    const file = path.join(ROOT, p)
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: 'not found' })
    return route.fulfill({ status: 200, contentType: MIME[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) })
  }
  if (url.origin === SB) {
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
    if (url.pathname.endsWith('/functions/v1/auth-username')) return json({ ok: true, access_token: 'tok', refresh_token: 'ref', expires_at: Math.floor(Date.now() / 1000) + 3600, profile, modules })
    if (url.pathname.endsWith('/rpc/panapass_v10_estado_operativo')) return json(mockEstadoOps)
    if (url.pathname.endsWith('/rpc/panapass_ena_estado')) return json(mockEnaEstado)
    if (url.pathname.endsWith('/rpc/panapass_ultima_fecha_pago')) return json(['2026-10-21'])
    return json(url.pathname.includes('/functions/') ? { ok: true } : [])
  }
  return route.abort()
})

try {
  await page.goto(`${HOST}/?vueNext=1`, { waitUntil: 'load', timeout: 30000 })
  await page.waitForSelector('form#f', { timeout: 15000 })
  check('Login Vue montado', true)

  await page.fill('input[name="usuario"]', 'admin')
  await page.fill('input[name="password"]', 'secreto')
  await page.click('#loginBtn')
  await page.waitForSelector('[data-testid="vue-next-home"], .shell', { timeout: 20000 })
  check('Sesión iniciada con Dashboard montado', true)

  // Clic en Operaciones
  const opBtn = page.locator('[data-m="operaciones"]').first()
  await opBtn.click()
  await page.waitForSelector('[data-testid="vue-operaciones"]', { timeout: 15000 })
  check('Operaciones se renderiza con componente Vue nativo', true)

  const title = await page.innerText('[data-testid="vue-operaciones"] h2')
  check('Título de Operaciones presente', title.includes('Operaciones AM / PM'), title)

  const content = await page.innerText('[data-testid="vue-operaciones"]')
  check('Muestra estatus de corte 6AM y 11AM', content.toUpperCase().includes('CORTE AM') && content.toUpperCase().includes('CORTE PM'))
  check('Muestra métricas operativas (1420 registros, 185 negativos, 143 pagados)', content.includes('1420') && content.includes('185') && content.includes('143'))

  // Botones de acción AM y PM habilitados
  const procAM = await page.locator('[data-testid="vue-operaciones"] button:has-text("Procesar AM")').isEnabled()
  check('Botón Procesar AM habilitado', procAM)

  const procPM = await page.locator('[data-testid="vue-operaciones"] button:has-text("Procesar PM")').isEnabled()
  check('Botón Procesar PM habilitado', procPM)

  // Captura de pantalla de evidencia
  await page.screenshot({ path: path.join(ROOT, 'qa/screenshot-vue-operaciones.png') })
  check('Captura guardada en qa/screenshot-vue-operaciones.png', true)

} catch (e) {
  check('Flujo completo sin interrupciones', false, e.message.split('\n')[0])
} finally {
  check('0 excepciones JavaScript en consola', pageErrors.length === 0, pageErrors.join(' | '))
  await browser.close()
  const failed = results.filter(r => !r.ok).length
  console.log(`\nResumen: ${results.length - failed}/${results.length} comprobaciones OK`)
  process.exitCode = failed ? 1 : 0
}
