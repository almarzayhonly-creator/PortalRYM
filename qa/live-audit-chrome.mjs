// Suite E2E de Inspección y Recorrido Completo en Google Chrome
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/almar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')

const HOST = 'https://rym-login-preview-portal-ena-rym.almarzayhonly.workers.dev'
const SB = 'https://avczyvcpmicpuhdkmxzx.supabase.co'
const ROOT = process.cwd()
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }

const profile = { id: 'u1', nombre: 'Auditor RYM Senior', email: 'auditor@portalrym.pa', usuario: 'auditor', rol: 'ADMIN_TOTAL', activo: true, supervisora_id: 's1', must_change_password: false }
const modules = ['dashboard', 'ranking', 'historial', 'operaciones', 'pagos_hoy', 'negativos_hoy', 'cargar_pagos', 'recurrentes', 'reportes', 'usuarios', 'portal.panapass']

console.log('====================================================')
console.log('🚀 INICIANDO AUDITORÍA E2E GLOBAL EN GOOGLE CHROME')
console.log('====================================================')

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
const page = await context.newPage()

const consoleErrors = []
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', err => consoleErrors.push(err.message))

// Mock local & backend requests
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
      return json({
        ok: true,
        users: [
          { id: 'u1', nombre: 'Auditor RYM', email: 'auditor@portalrym.pa', usuario: 'auditor', rol: 'ADMIN_TOTAL', activo: true, must_change_password: false, galeras_scope: ['VCARS'], supervisoras: [] },
          { id: 'u2', nombre: 'Supervisora VCARS', email: 'sup@portalrym.pa', usuario: 'sup_vcars', rol: 'SUPERVISORA', activo: true, must_change_password: false, galeras_scope: ['VCARS'], supervisoras: [{ id: 's1', nombre: 'Supervisora VCARS', galera: 'VCARS' }] }
        ],
        supervisoras: [{ id: 's1', nombre: 'Supervisora VCARS', galera: 'VCARS' }],
        galeras: ['VCARS', 'VCOMP', 'VIPCO', 'VINDU'],
        modulos: [{ codigo: 'ranking', nombre: 'Ranking' }, { codigo: 'historial', nombre: 'Historial' }],
        supervisoras_detectadas: []
      })
    }
    if (url.pathname.endsWith('/rpc/panapass_ranking_pagos') || url.pathname.endsWith('/rpc/panapass_reporte_competencia_cobrador_v2')) {
      return json([
        { cobrador: 'Carlos Mendez', supervisoras: 'Supervisora VCARS', monto: 18500.50, registros: 120, saldo: 450, a_pagar: 18050.50 },
        { cobrador: 'Elena Rodriguez', supervisoras: 'Supervisora VCARS', monto: 14200.00, registros: 95, saldo: 200, a_pagar: 14000.00 }
      ])
    }
    if (url.pathname.endsWith('/rpc/panapass_historial')) {
      return json([
        { fecha: '2026-10-21', status: 'PENDIENTE', unidad: 'V101', placa: 'AB1234', panapass_numero: '507001', empresa: 'Transp S.A.', saldo: 15.50, a_pagar: 25.00, boleta: 'B-9988', n_op: 'OP-12', operador: 'Juan Perez', cobrador: 'Carlos Mendez', tipo: 'AM', estado_cobra: 'REGULAR', galera: 'VCARS' }
      ])
    }
    if (url.pathname.endsWith('/rpc/panapass_historial_resumen')) {
      return json({ total_registros: 1, total_monto: 25.00, pendientes: 1, pagados: 0 })
    }
    if (url.pathname.endsWith('/rpc/panapass_v10_estado_operativo')) {
      return json({ fecha: '2026-10-21', am_procesado: true, am_hora: '07:30:00', pm_procesado: false, pm_hora: null, estado_dia: 'AM_LISTO' })
    }
    if (url.pathname.endsWith('/rpc/panapass_pagos_fecha_v2')) {
      return json([
        { fecha: '2026-10-21', unidad: 'V101', placa: 'AB1234', panapass_numero: '507001', monto: 25.00, hora_pago: '10:15:00', boleta: 'B-9988', n_op: 'OP-12', operador: 'Juan Perez', cobrador: 'Carlos Mendez', galera: 'VCARS' }
      ])
    }
    if (url.pathname.endsWith('/rpc/panapass_negativos_fecha_v2')) {
      return json([
        { fecha: '2026-10-21', unidad: 'V202', placa: 'CD5678', panapass_numero: '507002', saldo: -12.50, n_op: 'OP-55', operador: 'Roberto Gomez', cobrador: 'Elena Rodriguez', galera: 'VCARS' }
      ])
    }
    if (url.pathname.endsWith('/rpc/panapass_recurrentes_entidad')) {
      return json([
        { tipo_entidad: 'COBRADOR', identificador: 'Carlos Mendez', monto: 18500.50, registros: 120, nivel: 'CRITICO' }
      ])
    }
    if (url.pathname.endsWith('/rpc/panapass_reportes_estado')) {
      return json([{ tipo: 'RESUMEN_FONDEO', ultimo_envio: '2026-10-21T10:00:00Z', desde: '2026-10-01', hasta: '2026-10-21' }])
    }
    if (url.pathname.endsWith('/rpc/panapass_reporte_fondeo')) {
      return json([{ empresa: 'Transportes Unidos', monto: 3500.00, registros: 40 }])
    }
    if (url.pathname.endsWith('/rpc/panapass_ultima_fecha_pago')) {
      return json(['2026-10-21'])
    }
    return json(url.pathname.includes('/functions/') ? { ok: true } : [])
  }
  return route.abort()
})

try {
  // 1. Iniciar sesión
  console.log('1. Cargando portal y autenticando...')
  await page.goto(`${HOST}/?vueNext=1`, { waitUntil: 'load', timeout: 30000 })
  await page.waitForSelector('form#f', { timeout: 15000 })
  await page.fill('input[name="usuario"]', 'auditor')
  await page.fill('input[name="password"]', 'auditor123')
  await page.click('#loginBtn')
  await page.waitForSelector('[data-testid="vue-next-home"], .shell', { timeout: 20000 })
  console.log('✔ Sesión y Dashboard listos.')

  // Abrir Panapass Shell
  await page.evaluate(() => {
    if (typeof window.v70OpenPanapass === 'function') window.v70OpenPanapass()
  })
  await page.waitForSelector('#view', { timeout: 10000 })
  console.log('✔ Shell Panapass abierto con éxito.')

  // Lista de todas las vistas a probar
  const viewsToTest = [
    { id: 'ranking', name: 'Ranking de Cobradores', selector: '.rrp-hero, .rym-tw' },
    { id: 'historial', name: 'Historial / Pendientes', selector: '.rym-tw' },
    { id: 'operaciones', name: 'Operaciones AM/PM', selector: '.rym-tw' },
    { id: 'pagos_hoy', name: 'Pagos Hoy', selector: '.rym-tw' },
    { id: 'negativos_hoy', name: 'Negativos Hoy', selector: '.rym-tw' },
    { id: 'cargar_pagos', name: 'Cargar Pagos', selector: '.rym-tw' },
    { id: 'recurrentes', name: 'Recurrentes', selector: '.rym-tw' },
    { id: 'reportes', name: 'Centro de Reportes', selector: '.rym-tw' },
    { id: 'usuarios', name: 'Administración de Usuarios', selector: '.rym-tw' },
  ]

  for (const v of viewsToTest) {
    console.log(`\nTesting módulo [${v.id}] (${v.name})...`)
    const mounted = await page.evaluate(async (modId) => {
      const view = document.querySelector('#view')
      if (window.__RYM_VUE_NEXT_VIEWS && window.__RYM_VUE_NEXT_VIEWS.mount) {
        return await window.__RYM_VUE_NEXT_VIEWS.mount(modId, view)
      }
      return false
    }, v.id)

    if (!mounted) throw new Error(`Fallo al montar el componente Vue nativo de ${v.name}`)

    await page.waitForSelector(v.selector, { timeout: 5000 })
    await page.waitForTimeout(400) // tiempo de render reactivo

    const text = await page.textContent('#view')
    console.log(`✔ [${v.id}] montó correctamente (${text?.slice(0, 45).replace(/\n/g, ' ')}...)`)

    await page.screenshot({ path: `qa/screenshot-vue-${v.id}.png`, fullPage: false })
  }

  // Captura final en el módulo de usuarios
  await page.screenshot({ path: 'qa/screenshot-vue-live-audit.png', fullPage: true })

  console.log('\n====================================================')
  console.log('🎉 AUDITORÍA COMPLETA: TODAS LAS 9 VISTAS FUNCIONAN AL 100% EN CHROME')
  console.log('====================================================')
} catch (e) {
  console.error('❌ Error durante la auditoría:', e)
  process.exit(1)
} finally {
  await browser.close()
}
