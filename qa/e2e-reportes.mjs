// Prueba integral E2E en Google Chrome de ReportesView (Centro de Reportes)
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
const modules = ['dashboard', 'ranking', 'historial', 'operaciones', 'pagos_hoy', 'negativos_hoy', 'cargar_pagos', 'recurrentes', 'reportes', 'portal.panapass']

// Mocks de Reportes
const mockEstados = [
  { tipo: 'RESUMEN_FONDEO', ultimo_envio: '2026-10-21T10:00:00Z', desde: '2026-10-01', hasta: '2026-10-21' }
]

const mockFondeo = [
  { empresa: 'Transp S.A.', monto: 1450.00, registros: 25 },
  { empresa: 'Logist S.A.', monto: 820.50, registros: 14 }
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
    if (url.pathname.endsWith('/rpc/panapass_reportes_estado')) return json(mockEstados)
    if (url.pathname.endsWith('/rpc/panapass_reporte_fondeo')) return json(mockFondeo)
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

  // Clic en Reportes
  const repBtn = page.locator('[data-m="reportes"]').first()
  await repBtn.click()
  await page.waitForSelector('[data-testid="vue-reportes"]', { timeout: 15000 })
  check('Reportes se renderiza con componente Vue nativo', true)

  const title = await page.innerText('[data-testid="vue-reportes"] h2')
  check('Título de Centro de Reportes presente', title.includes('Centro de Reportes Panapass'), title)

  // Disparar Vista Previa de Fondeo
  await page.click('#btnRepFondeo')
  await page.waitForSelector('table', { timeout: 10000 })
  await page.waitForTimeout(500)
  check('Reporte interactivo de fondeo desplegado', true)

  const fondeoText = await page.innerText('[data-testid="vue-reportes"]')
  check('Total fondeado y empresas calculados correctamente', fondeoText.includes('$2,270.50') && fondeoText.includes('TOTAL EMPRESAS'))

  // Captura de pantalla de evidencia
  await page.screenshot({ path: path.join(ROOT, 'qa/screenshot-vue-reportes.png') })
  check('Captura guardada en qa/screenshot-vue-reportes.png', true)

} catch (e) {
  check('Flujo completo sin interrupciones', false, e.message.split('\n')[0])
} finally {
  check('0 excepciones JavaScript en consola', pageErrors.length === 0, pageErrors.join(' | '))
  await browser.close()
  const failed = results.filter(r => !r.ok).length
  console.log(`\nResumen: ${results.length - failed}/${results.length} comprobaciones OK`)
  process.exitCode = failed ? 1 : 0
}
