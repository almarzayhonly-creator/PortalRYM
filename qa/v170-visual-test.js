const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.QA_URL || 'https://visual-polish-v170-portal-ena-rym.almarzayhonly.workers.dev';
const EMAIL = process.env.QA_EMAIL;
const PASSWORD = process.env.QA_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error('QA_EMAIL/QA_PASSWORD secrets are required');

const outDir = path.join(process.cwd(), 'qa-results');
fs.mkdirSync(outDir, { recursive: true });
const results = { url: URL, startedAt: new Date().toISOString(), screens: [], consoleErrors: [], requestFailures: [], login: {}, global: {} };

const safe = s => String(s || '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function firstVisible(locator) {
  const n = await locator.count();
  for (let i = 0; i < n; i++) if (await locator.nth(i).isVisible().catch(() => false)) return locator.nth(i);
  return null;
}

async function login(page, mode) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, `${mode}-00-login.png`), fullPage: true });

  const pass = await firstVisible(page.locator('input[type="password"]'));
  if (!pass) {
    results.login[mode] = { ok: true, note: 'No password field visible; session may already be active.' };
    return;
  }

  const userSelectors = [
    'input[type="email"]',
    'input[name*="email" i]',
    'input[name*="user" i]',
    'input[autocomplete="username"]',
    'input[placeholder*="correo" i]',
    'input[placeholder*="usuario" i]',
    'input[type="text"]'
  ];
  let user = null;
  for (const sel of userSelectors) {
    user = await firstVisible(page.locator(sel));
    if (user) break;
  }
  if (!user) throw new Error(`No login user/email field found in ${mode}`);

  await user.fill(EMAIL);
  await pass.fill(PASSWORD);

  const loginButtons = [
    page.getByRole('button', { name: /iniciar\s*sesión|iniciar\s*sesion|entrar|acceder|login|ingresar/i }),
    page.locator('button[type="submit"]'),
    page.locator('input[type="submit"]')
  ];
  let clicked = false;
  for (const loc of loginButtons) {
    const b = await firstVisible(loc);
    if (b) { await b.click(); clicked = true; break; }
  }
  if (!clicked) await pass.press('Enter');

  await page.waitForTimeout(3500);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  const stillPass = await firstVisible(page.locator('input[type="password"]'));
  if (stillPass) {
    const msg = await page.locator('body').innerText().catch(() => '');
    throw new Error(`Login did not leave the login screen (${mode}). Visible text: ${msg.slice(0, 400)}`);
  }
  results.login[mode] = { ok: true };
}

async function openMenuIfNeeded(page) {
  const menus = [
    page.locator('button[aria-label*="menu" i]'),
    page.locator('button[title*="menu" i]'),
    page.locator('button').filter({ hasText: /^\s*☰\s*$/ }),
    page.locator('.hamburger, .menu-toggle, .mobile-menu-btn')
  ];
  for (const loc of menus) {
    const b = await firstVisible(loc);
    if (b) { await b.click().catch(() => {}); await page.waitForTimeout(400); return true; }
  }
  return false;
}

async function clickLabel(page, label) {
  const rx = new RegExp(`^\\s*${esc(label)}\\s*$`, 'i');
  const candidates = [
    page.getByRole('tab', { name: rx }),
    page.getByRole('button', { name: rx }),
    page.getByRole('link', { name: rx }),
    page.locator('[role="button"]').filter({ hasText: rx }),
    page.getByText(rx)
  ];
  for (let round = 0; round < 2; round++) {
    for (const loc of candidates) {
      const el = await firstVisible(loc);
      if (el) {
        await el.click({ timeout: 7000 }).catch(async () => { await el.click({ force: true, timeout: 3000 }); });
        await page.waitForTimeout(1400);
        return true;
      }
    }
    if (round === 0) await openMenuIfNeeded(page);
  }
  return false;
}

async function scan(page, mode, name) {
  const metrics = await page.evaluate(() => {
    const cssLink = document.querySelector('#rym-v170-visual-polish');
    const root = getComputedStyle(document.documentElement);
    const sampleSelectors = ['.card','.v99-module','.v157-card','.v157-kpi','.v66-card','.ca6-card','.kpi','.stat-card'];
    let sample = null;
    for (const sel of sampleSelectors) {
      const el = [...document.querySelectorAll(sel)].find(e => {
        const r = e.getBoundingClientRect(); return r.width > 10 && r.height > 10;
      });
      if (el) {
        const cs = getComputedStyle(el);
        sample = { selector: sel, background: cs.backgroundColor, color: cs.color, borderColor: cs.borderColor, boxShadow: cs.boxShadow, borderRadius: cs.borderRadius };
        break;
      }
    }
    const overflow = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.position === 'sticky') continue;
      if (r.right > window.innerWidth + 4 || r.left < -4) {
        overflow.push({ tag: el.tagName, cls: String(el.className || '').slice(0,100), text: String(el.textContent || '').trim().replace(/\s+/g,' ').slice(0,80), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) });
        if (overflow.length >= 15) break;
      }
    }
    const active = [...document.querySelectorAll('.active,[aria-selected="true"]')].filter(e => {
      const r=e.getBoundingClientRect(); return r.width>0&&r.height>0;
    }).slice(0,10).map(e => { const cs=getComputedStyle(e); return {text:String(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,60), color:cs.color, background:cs.backgroundColor, borderColor:cs.borderColor}; });
    return {
      title: document.title,
      href: location.href,
      viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
      hasVisualCssLink: !!cssLink,
      visualCssHref: cssLink ? cssLink.href : null,
      vars: { blue: root.getPropertyValue('--rym-blue').trim(), orange: root.getPropertyValue('--rym-orange').trim(), green: root.getPropertyValue('--rym-green').trim(), gps: root.getPropertyValue('--rym-gps').trim(), bg: root.getPropertyValue('--rym-bg').trim() },
      bodyBg: getComputedStyle(document.body).backgroundColor,
      sample,
      active,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 4,
      overflow
    };
  });

  let contrast = { violations: 0, nodes: [] };
  try {
    const axe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    const v = axe.violations || [];
    contrast.violations = v.reduce((n, x) => n + x.nodes.length, 0);
    contrast.nodes = v.flatMap(x => x.nodes.slice(0,5).map(n => ({ target: n.target, html: n.html.slice(0,180), summary: n.failureSummary }))).slice(0,15);
  } catch (e) { contrast.error = String(e.message || e); }

  const filename = `${mode}-${String(results.screens.length + 1).padStart(2,'0')}-${safe(name)}.png`;
  await page.screenshot({ path: path.join(outDir, filename), fullPage: true });
  const record = { mode, name, screenshot: filename, metrics, contrast };
  results.screens.push(record);
  console.log(`QA_SCREEN ${JSON.stringify({mode,name,href:metrics.href,css:metrics.hasVisualCssLink,vars:metrics.vars,overflow:metrics.horizontalOverflow,contrast:contrast.violations,sample:metrics.sample,active:metrics.active.slice(0,4)})}`);
}

async function runMode(browser, mode, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on('console', m => { if (m.type() === 'error') results.consoleErrors.push({ mode, text: m.text().slice(0,500) }); });
  page.on('requestfailed', r => results.requestFailures.push({ mode, url: r.url(), error: r.failure()?.errorText || '' }));
  await login(page, mode);
  await scan(page, mode, 'portal');

  const flows = [
    { module: 'Panapass', tabs: ['Dashboard','Ranking','Recurrentes','Bajas'] },
    { module: 'Revisados', tabs: ['Dashboard','Operaciones','Historial','Estadísticas'] },
    { module: 'Control de Auto', tabs: ['Dashboard','Unidades','Auditoría'] },
    { module: 'GPS', tabs: ['Dashboard','Flota','Reporte ejecutivo'] },
    { module: 'Usuarios', tabs: [] }
  ];

  for (const f of flows) {
    const opened = await clickLabel(page, f.module);
    if (!opened) { console.log(`QA_NAV_MISSING ${mode} module=${f.module}`); continue; }
    await scan(page, mode, f.module);
    for (const tab of f.tabs) {
      const ok = await clickLabel(page, tab);
      if (!ok) { console.log(`QA_TAB_MISSING ${mode} module=${f.module} tab=${tab}`); continue; }
      await scan(page, mode, `${f.module}-${tab}`);
    }
  }
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await runMode(browser, 'desktop', { width: 1440, height: 1000 });
    await runMode(browser, 'mobile', { width: 390, height: 844 });
  } finally { await browser.close(); }

  results.finishedAt = new Date().toISOString();
  results.global = {
    screens: results.screens.length,
    screensWithCss: results.screens.filter(s => s.metrics.hasVisualCssLink).length,
    screensWithOverflow: results.screens.filter(s => s.metrics.horizontalOverflow).map(s => `${s.mode}:${s.name}`),
    contrastViolationsTotal: results.screens.reduce((n,s) => n + (s.contrast.violations || 0), 0),
    consoleErrors: results.consoleErrors.length,
    requestFailures: results.requestFailures.length
  };
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(results, null, 2));
  const md = [
    '# V170 Visual QA',
    `- URL: ${URL}`,
    `- Screens tested: ${results.global.screens}`,
    `- Screens with V170 CSS loaded: ${results.global.screensWithCss}/${results.global.screens}`,
    `- Horizontal overflow: ${results.global.screensWithOverflow.length ? results.global.screensWithOverflow.join(', ') : 'none detected'}`,
    `- Color contrast violation nodes: ${results.global.contrastViolationsTotal}`,
    `- Console errors: ${results.global.consoleErrors}`,
    `- Failed requests: ${results.global.requestFailures}`,
    '',
    '## Screens',
    ...results.screens.map(s => `- ${s.mode} / ${s.name}: css=${s.metrics.hasVisualCssLink}, overflow=${s.metrics.horizontalOverflow}, contrast=${s.contrast.violations || 0}, screenshot=${s.screenshot}`)
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'summary.md'), md);
  console.log('QA_RESULT ' + JSON.stringify(results.global));
})().catch(err => {
  console.error('QA_FATAL ' + (err && err.stack ? err.stack : err));
  try { fs.writeFileSync(path.join(outDir, 'fatal.txt'), String(err && err.stack ? err.stack : err)); } catch {}
  process.exit(1);
});
