import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const previewUrl = process.env.QA_URL;
const productionUrl = 'https://portal-ena-rym.almarzayhonly.workers.dev/';
assert.ok(previewUrl, 'QA_URL missing');

const browser = await chromium.launch({ headless: true });

async function inspect(url, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  const failed = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('requestfailed', request => failed.push(request.url()));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  const result = await page.evaluate(() => {
    const pick = (selector, properties) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      return Object.fromEntries(properties.map(property => [property, style.getPropertyValue(property)]));
    };
    return {
      title: document.title,
      appHtml: document.querySelector('#app')?.innerHTML || '',
      visibleText: document.body.innerText.replace(/\s+/g, ' ').trim(),
      styles: {
        login: pick('.login', ['min-height', 'display', 'padding', 'background-image']),
        card: pick('.login-card', ['width', 'padding', 'border-radius', 'background-color', 'box-shadow']),
        button: pick('#loginBtn', ['background-image', 'border-radius', 'color', 'font-weight']),
      },
      coreCss: [...document.styleSheets].some(sheet => String(sheet.href || '').includes('/css/core/production-base.css')),
      coreRuntime: [...document.scripts].some(script => String(script.src || '').includes('/modules/core/runtime.js')),
    };
  });
  await page.close();
  return { ...result, errors, failed };
}

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

for (const { name, ...viewport } of viewports) {
  const [production, preview] = await Promise.all([
    inspect(productionUrl, viewport),
    inspect(previewUrl, viewport),
  ]);
  assert.equal(preview.title, production.title, `${name}: título distinto`);
  assert.equal(preview.appHtml, production.appHtml, `${name}: DOM público distinto`);
  assert.equal(preview.visibleText, production.visibleText, `${name}: texto público distinto`);
  assert.deepEqual(preview.styles, production.styles, `${name}: estilos calculados distintos`);
  assert.equal(preview.coreCss, true, `${name}: CSS Core externo no cargó`);
  assert.equal(preview.coreRuntime, true, `${name}: Runtime Core externo no cargó`);
  assert.deepEqual(preview.errors, [], `${name}: errores JavaScript en preview`);
  const previewOrigin = new URL(previewUrl).origin;
  assert.deepEqual(
    preview.failed.filter(url => url.startsWith(previewOrigin)),
    [],
    `${name}: recursos internos fallidos en preview`,
  );
}

console.log('V174 preview parity: exacta');
await browser.close();
