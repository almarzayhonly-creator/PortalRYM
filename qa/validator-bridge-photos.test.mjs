import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('integrated validator bridge omits Fotos field on initial load and enrichment', async () => {
  const html = fs.readFileSync('index.html', 'utf8');

  // 1. Verificación estática sobre el código fuente de index.html
  const loadStart = html.indexOf('function loadValidatorDetail99(');
  const bindStart = html.indexOf('function bindValidator99(');
  assert.ok(loadStart > 0 && bindStart > loadStart);
  const initialLoadSection = html.slice(loadStart, bindStart);
  assert.equal(initialLoadSection.includes("label:'Fotos'"), false, 'El campo Fotos no debe existir en loadValidatorDetail99');

  const enrichStart = html.indexOf('async function enrichValidatorDetail99(');
  const bridgeStart = html.indexOf('window.__RYM_VUE_NEXT_HOME_MAIN=');
  assert.ok(enrichStart > 0 && bridgeStart > enrichStart);
  const enrichmentSection = html.slice(enrichStart, bridgeStart);
  assert.equal(enrichmentSection.includes("label:'Fotos'"), false, 'El campo Fotos no debe existir en enrichValidatorDetail99');

  // 2. Verificación en tiempo de ejecución extrayendo las funciones de detalle y el puente
  const scriptContent = html.slice(
    html.indexOf('function companyOwner99('),
    html.indexOf('function card99(')
  );

  const testUnitSeed = {
    unidad: '100',
    placa: '123456',
    panapass_numero: '1129235',
    estatus: 'ACTIVO',
    estatus2: 'ACTIVO',
    mes_revisado: 'OCTUBRE',
  };

  const context = {
    window: {},
    document: { removeEventListener: () => {}, addEventListener: () => {} },
    state: { profile: { rol: 'ADMIN_TOTAL' } },
    refreshExecutiveCards99: () => {},
    N99: (v) => String(v || '').trim().toUpperCase(),
    fmt99: (v) => String(v || ''),
    panDebtMaybe99: (v) => `$${v}`,
    gpsDate116: (v) => String(v || ''),
    loadRevisados99: async () => ({
      rows: [{
        unidad: '100',
        estado: 'VIGENTE',
        emitido: true,
        ultimo_revisado: '2026-10-01',
        fotos_disponibles: true,
        cantidad_fotos: 3,
      }]
    }),
    findRevisado99: (rows) => rows[0],
    req: async () => ({ data: { ok: true, results: [] } }),
    rpc: async () => [testUnitSeed],
  };
  vm.createContext(context);
  vm.runInContext(scriptContent, context);

  // Verificar estado inicial (loadValidator)
  const initialDetail = await context.window.__RYM_VUE_NEXT_HOME_MAIN.loadValidator(testUnitSeed);
  assert.ok(initialDetail, 'El objeto de detalle de unidad debe retornar');
  const revCard = initialDetail.cards.find(c => c.key === 'revisados');
  assert.ok(revCard, 'Tarjeta de Revisado presente en carga inicial');
  assert.equal(
    revCard.details.some(d => d.label === 'Fotos'),
    false,
    'Carga inicial no debe contener el campo Fotos'
  );

  // Verificar estado enriquecido (enrichValidator)
  const enrichedDetail = await context.window.__RYM_VUE_NEXT_HOME_MAIN.enrichValidator(initialDetail);
  const enrichedRevCard = enrichedDetail.cards.find(c => c.key === 'revisados');
  assert.ok(enrichedRevCard, 'Tarjeta de Revisado presente en estado enriquecido');
  assert.equal(
    enrichedRevCard.details.some(d => d.label === 'Fotos'),
    false,
    'Estado enriquecido no debe contener el campo Fotos'
  );
});
