import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { stitch, StitchError } from '@google/stitch-sdk';

const root = path.resolve(process.cwd(), '../..');
const activeProjectPath = path.join(root, '.stitch', 'active-project.json');
let projectId = String(process.env.STITCH_PROJECT_ID || '').trim();
if (!projectId) {
  const active = JSON.parse(await fs.readFile(activeProjectPath, 'utf8'));
  projectId = String(active?.projectId || '').trim();
}
if (!projectId) throw new Error('No Stitch project ID found in env or .stitch/active-project.json');

const contractPath = path.join(process.cwd(), 'revisados-dashboard-contract.md');
const mainHtmlPath = process.env.MAIN_INDEX_HTML || path.join(root, '.stitch', 'main-index-reference.html');

const contract = await fs.readFile(contractPath, 'utf8');
const mainHtml = await fs.readFile(mainHtmlPath, 'utf8');

const mustExist = [
  'Unidades en tu alcance',
  'Al día',
  'Pendientes ahora',
  'Sin fotos',
  'Emitidos hoy',
  'Estado por galera',
  'Avance por mes',
  'Atender pendientes'
];

for (const label of mustExist) {
  if (!mainHtml.includes(label)) {
    throw new Error('main functional contract changed; missing label: ' + label);
  }
}

const paletteMatch = mainHtml.match(/:root\{[^}]*--navy:#0A1B4D[^}]*--blue:#244AA5[^}]*--sky:#53B7E8[^}]*--orange:#F47C20[^}]*--soft:#F4F7FB[^}]*--border:#D8E3F2[^}]*--text:#10224E[^}]*--muted:#62708C[^}]*\}/i);
if (!paletteMatch) {
  throw new Error('main visual tokens changed; review Stitch contract before generating');
}

const prompt = `
Redesign ONLY the existing Portal RYM Revisados Dashboard. This is a visual reskin of a working production screen, not a product redesign.

HARD RULES:
- Preserve existing business logic, processes, labels, actions, metrics and navigation.
- Do not invent data, KPIs, filters, states, buttons, workflows, sources or terminology.
- Light sidebar is mandatory.
- No dark shell, Mission Control, RUV, Gateway, Telemetry, Node, Station, Dispatch, Core Online, Vehicle Operations Workspace, Bahías, fiscalización, trazabilidad or command-center language.
- Keep the existing navigation names: Dashboard, Operaciones, Avance mensual, Reporte diario, Historial, Estadísticas, Boletas, Cupos.
- Existing Dashboard content only: hero state "{N} unidades necesitan atención" or "Todo al día"; hero detail for pendientes antiguos, mes anterior, mes actual and unidades al día; actions Atender pendientes/Ver detalle and Revisar alertas when applicable.
- Existing KPI labels only: Unidades en tu alcance, Al día, Pendientes ahora, Alertas reales/Sin alertas, Pendientes Revisado Taxi when applicable, Sin fotos, Emitidos hoy.
- Existing sections only: Estado por galera/Tu avance, Avance por mes, Qué atender primero when applicable.
- Existing actions only: Abrir Operaciones, Ver completo, Abrir cola de trabajo and the current KPI drill-down actions.
- Use realistic placeholder numbers only for layout. Never create a new metric.

PORTAL RYM VISUAL IDENTITY:
Navy #0A1B4D, blue #244AA5, sky #53B7E8, orange accent #F47C20, background #F4F7FB, border #D8E3F2, text #10224E, muted #62708C, green #047857, red #DC2626.
Use white surfaces, subtle shadows, 14-18px radii, strong hierarchy, restrained enterprise styling, desktop 1366-1920. Blue is primary interaction color; orange is only an accent.

Goal: the same functional Portal RYM Dashboard, significantly more polished and easier to scan. Generate ONE desktop Dashboard screen only.
`.trim();

const project = stitch.project(projectId);

async function generateWithClarification(p) {
  try {
    return await project.generate(p);
  } catch (error) {
    if (error instanceof StitchError && error.code === 'CLARIFICATION_REQUIRED') {
      const reply = [
        'Keep the existing Portal RYM functionality exactly as specified.',
        'Make only visual/layout improvements.',
        'Use a light sidebar and the supplied Portal RYM palette.',
        'Do not add any new data, controls, metrics, workflows or terminology.'
      ].join(' ');
      return await project.generate(reply);
    }
    throw error;
  }
}

const generation = await generateWithClarification(prompt);
if (!generation?.first) throw new Error('Stitch returned no screen');

const screen = generation.first;
const outDir = path.join(root, '.stitch', 'generated');
await fs.mkdir(outDir, { recursive: true });

const html = await screen.getHtml();
const image = await screen.getImage();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const base = 'revisados-dashboard-main-locked-' + stamp;

await fs.writeFile(path.join(outDir, base + '.html'), html);
await fs.writeFile(path.join(outDir, base + '.png'), Buffer.from(image));
await fs.writeFile(
  path.join(outDir, 'latest-revisados-dashboard.json'),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    projectId,
    screenId: String(screen.screenId || screen.id || ''),
    sourceBranch: 'main',
    scope: 'dashboard-only',
    contract: 'tools/stitch/revisados-dashboard-contract.md'
  }, null, 2) + '\n'
);

console.log('Generated Stitch Dashboard screen:', String(screen.screenId || screen.id || 'unknown'));
