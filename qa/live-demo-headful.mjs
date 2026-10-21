// Lanzador de Chrome Visible (Headful) para visualización interactiva del usuario
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/almar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')

const HOST = 'https://rym-login-preview-portal-ena-rym.almarzayhonly.workers.dev'
const SB = 'https://avczyvcpmicpuhdkmxzx.supabase.co'
const ROOT = process.cwd()
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }

const profile = { id: 'u1', nombre: 'Auditor Demostración RYM', email: 'auditor@portalrym.pa', usuario: 'auditor', rol: 'ADMIN_TOTAL', activo: true, supervisora_id: 's1', must_change_password: false }
const modules = ['dashboard', 'ranking', 'historial', 'operaciones', 'pagos_hoy', 'negativos_hoy', 'cargar_pagos', 'recurrentes', 'reportes', 'usuarios', 'portal.panapass']

console.log('Lanzando Google Chrome visible en tu pantalla...')

const browser = await chromium.launch({
  headless: false, // ¡Visible en tu monitor!
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--start-maximized']
})

const context = await browser.newContext({ viewport: null })
const page = await context.newPage()

// Ruteo local para que use los archivos compilados en vivo de tu rama
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
          { id: 'u1', nombre: 'Auditor Demostración RYM', email: 'auditor@portalrym.pa', usuario: 'auditor', rol: 'ADMIN_TOTAL', activo: true, must_change_password: false, galeras_scope: ['VCARS'], supervisoras: [] },
          { id: 'u2', nombre: 'Dayana Prieto (Supervisora)', email: 'dayana@portalrym.pa', usuario: 'dayana', rol: 'SUPERVISORA', activo: true, must_change_password: false, galeras_scope: ['VCARS'], supervisoras: [{ id: 's1', nombre: 'Dayana Prieto', galera: 'VCARS' }] }
        ],
        supervisoras: [{ id: 's1', nombre: 'Dayana Prieto', galera: 'VCARS' }],
        galeras: ['VCARS', 'VCOMP', 'VIPCO', 'VINDU'],
        modulos: [{ codigo: 'ranking', nombre: 'Ranking' }, { codigo: 'historial', nombre: 'Historial' }],
        supervisoras_detectadas: [
          { id: 'det-1', nombre_detectado: 'Maria Lopez', total_unidades: 14, galera_sugerida: 'VIPCO', unidades: ['V100', 'V101', 'V102'] }
        ]
      })
    }
    if (url.pathname.endsWith('/rpc/panapass_ranking_pagos') || url.pathname.endsWith('/rpc/panapass_reporte_competencia_cobrador_v2')) {
      return json([
        { cobrador: 'Carlos Mendez', supervisoras: 'Dayana Prieto', monto: 18500.50, registros: 120, saldo: 450, a_pagar: 18050.50 },
        { cobrador: 'Elena Rodriguez', supervisoras: 'Dayana Prieto', monto: 14200.00, registros: 95, saldo: 200, a_pagar: 14000.00 }
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
  console.log('1. Abriendo pantalla de Login...')
  await page.goto(`${HOST}/?vueNext=1`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)

  console.log('2. Escribiendo credenciales e ingresando...')
  await page.fill('input[name="usuario"]', 'auditor')
  await page.waitForTimeout(600)
  await page.fill('input[name="password"]', 'auditor123')
  await page.waitForTimeout(600)
  await page.click('#loginBtn')

  await page.waitForSelector('[data-testid="vue-next-home"], .shell', { timeout: 20000 })
  console.log('3. Sesión activa. Mostrando Dashboard...')
  await page.waitForTimeout(2500)

  console.log('4. Entrando a Panapass...')
  await page.evaluate(() => {
    if (typeof window.v70OpenPanapass === 'function') window.v70OpenPanapass()
  })
  await page.waitForTimeout(2000)

  const views = [
    { id: 'ranking', label: '1. Ranking de Cobradores' },
    { id: 'historial', label: '2. Historial / Pendientes' },
    { id: 'operaciones', label: '3. Operaciones AM/PM' },
    { id: 'pagos_hoy', label: '4. Pagos Hoy' },
    { id: 'negativos_hoy', label: '5. Negativos Hoy' },
    { id: 'cargar_pagos', label: '6. Cargar Pagos' },
    { id: 'recurrentes', label: '7. Recurrentes' },
    { id: 'reportes', label: '8. Centro de Reportes' },
    { id: 'usuarios', label: '9. Administración de Usuarios' }
  ]

  for (const v of views) {
    console.log(`Navegando a -> ${v.label}`)
    await page.evaluate(async (modId) => {
      const view = document.querySelector('#view')
      if (window.__RYM_VUE_NEXT_VIEWS && window.__RYM_VUE_NEXT_VIEWS.mount) {
        await window.__RYM_VUE_NEXT_VIEWS.mount(modId, view)
      }
    }, v.id)
    await page.waitForTimeout(3000) // 3 segundos para que aprecies cada vista en pantalla
  }

  console.log('\nTour completado. Dejaré la ventana abierta 30 segundos para que interactúes libremente...')
  await page.waitForTimeout(30000)
} finally {
  await browser.close()
}
