// Prueba integral E2E en Google Chrome de PagosView (Pagos Hoy)
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
const modules = ['dashboard', 'ranking', 'historial', 'operaciones', 'pagos_hoy', 'negativos_hoy', 'reportes', 'portal.panapass']

// Mock de Pagos Fecha V2
const mockPagosRows = [
  { unidad: '1011', panapass_numero: '88776655', galera: 'VCARS', supervisora: 'Laura Mendoza', empresa: 'Transp S.A.', a_pagar: 25.00, boleta: 25.00, pag7: 4, n_op: 'OP-101', operador: 'Esteban Ruiz', tipo: 'DIARIO', estado_cobra: 'PAGADO' },
  { unidad: '1022', panapass_numero: '88776699', galera: 'VCOMP', supervisora: 'Carmen Batista', empresa: 'Logist S.A.', a_pagar: 15.00, boleta: 0.00, pag7: 1, n_op: 'OP-102', operador: 'Manuel Ortiz', tipo: 'NO DIARIO', estado_cobra: 'PENDIENTE' }
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
    if (url.pathname.endsWith('/rpc/panapass_pagos_fecha_v2')) return json(mockPagosRows)
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

  // Clic en Pagos Hoy
  const payBtn = page.locator('[data-m="pagos_hoy"]').first()
  await payBtn.click()
  await page.waitForSelector('[data-testid="vue-pagos"]', { timeout: 15000 })
  check('Pagos Hoy se renderiza con componente Vue nativo', true)

  const title = await page.innerText('[data-testid="vue-pagos"] h2')
  check('Título de Pagos Registrados presente', title.includes('Pagos Registrados'), title)

  const rowsCount = await page.$$eval('[data-testid="vue-pagos"] tbody tr', els => els.length)
  check('Filas de pagos cargadas desde Supabase RPC', rowsCount === 2, `Cargadas: ${rowsCount}`)

  const totalText = await page.innerText('[data-testid="vue-pagos"]')
  check('Resumen de KPI con montos calculados correctamente', totalText.includes('$40.00') && totalText.includes('$25.00'))

  // Filtros interactivos
  await page.selectOption('[data-testid="vue-pagos"] select', 'VCARS')
  await page.waitForTimeout(300)
  const filteredCount = await page.$$eval('[data-testid="vue-pagos"] tbody tr', els => els.length)
  check('Filtro por Galera interactivo funcional', filteredCount === 1, `Mostrando tras filtro: ${filteredCount}`)

  // Captura de pantalla de evidencia
  await page.screenshot({ path: path.join(ROOT, 'qa/screenshot-vue-pagos.png') })
  check('Captura guardada en qa/screenshot-vue-pagos.png', true)

} catch (e) {
  check('Flujo completo sin interrupciones', false, e.message.split('\n')[0])
} finally {
  check('0 excepciones JavaScript en consola', pageErrors.length === 0, pageErrors.join(' | '))
  await browser.close()
  const failed = results.filter(r => !r.ok).length
  console.log(`\nResumen: ${results.length - failed}/${results.length} comprobaciones OK`)
  process.exitCode = failed ? 1 : 0
}
