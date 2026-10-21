// Actualización de qa/e2e-ranking.mjs adaptado
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
const modules = ['dashboard', 'ranking', 'historial', 'negativos_hoy', 'pagos_hoy', 'operaciones', 'reportes', 'portal.panapass']

const rkItem = (entidad, galera, monto, regs, units, dias, participa = true) => ({
  entidad, galera, monto, registros: regs, unidades_pagadas: units, dias_con_pago: dias, participa, rankEligible: participa
})

const rankingGlobalMonto = [
  rkItem('Maria Gomez', 'VCARS', 150.00, 5, 4, 3),
  rkItem('Ana Lopez', 'VCOMP', 240.50, 8, 7, 5),
  rkItem('Carla Rios', 'VIPCO', 320.00, 10, 8, 6),
  rkItem('Elena Ruiz', 'VINDU', 410.00, 12, 11, 7)
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
    if (url.pathname.endsWith('/rpc/panapass_ultima_fecha_pago')) return json(['2026-10-21'])
    if (url.pathname.endsWith('/rpc/panapass_reporte_competencia_cobrador_v2')) return json(rankingGlobalMonto)
    return json(url.pathname.includes('/functions/') ? { ok: true } : [])
  }
  return route.abort()
})

try {
  await page.goto(`${HOST}/?vueNext=1`, { waitUntil: 'load', timeout: 30000 })
  await page.waitForSelector('form#f', { timeout: 15000 })
  check('Login Vue visible en el host del preview', true)

  await page.fill('input[name="usuario"]', 'admin')
  await page.fill('input[name="password"]', 'secreto')
  await page.click('#loginBtn')
  await page.waitForSelector('[data-testid="vue-next-home"], .shell', { timeout: 20000 })
  check('Login real completado y dashboard montado', true)

  // Clic en Ranking
  const rankingBtn = page.locator('[data-m="ranking"]').first()
  await rankingBtn.click()
  await page.waitForSelector('[data-testid="vue-ranking"]', { timeout: 15000 })
  check('Ranking se renderiza con el componente Vue nativo', true)

  // Comprobar elementos visuales
  const title = await page.innerText('[data-testid="vue-ranking"] h2')
  check('Título de Cierre competitivo presente', title.includes('Cierre competitivo de pagos'), title)

  // El podio renderiza exactamente a los 3 primeros en tarjetas destacadas
  const podiumCards = await page.$$eval('[data-testid="vue-ranking"] .p-5', els => els.length)
  check('Podio de 3 ganadores renderizado', podiumCards === 3, `Encontradas: ${podiumCards}`)

  // El 4to puesto (#4 Elena Ruiz) va al bloque de lista inferior
  const restCard = await page.locator('[data-testid="vue-ranking"] b:has-text("Elena Ruiz")').count()
  check('Participantes restantes renderizados en lista', restCard === 1)

  // Comprobar botón de WhatsApp
  const waBtn = await page.locator('[title="Copiar WhatsApp"]').count()
  check('Botón de Copiar WhatsApp disponible', waBtn > 0)

  // Comprobar estilos Tailwind aplicados en el podio (color de fondo de tarjeta #1)
  const p1Bg = await page.$eval('[data-testid="vue-ranking"] .p-5', el => getComputedStyle(el).backgroundColor)
  check('Estilos Tailwind activos en tarjetas', p1Bg === 'rgb(15, 23, 42)', p1Bg)

} catch (e) {
  check('Flujo completo sin interrupciones', false, e.message.split('\n')[0])
} finally {
  check('0 excepciones JavaScript en consola', pageErrors.length === 0, pageErrors.join(' | '))
  await browser.close()
  const failed = results.filter(r => !r.ok).length
  console.log(`\nResumen: ${results.length - failed}/${results.length} comprobaciones OK`)
  process.exitCode = failed ? 1 : 0
}
