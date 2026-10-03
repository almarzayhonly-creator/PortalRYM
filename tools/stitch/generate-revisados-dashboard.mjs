import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { stitch, StitchError } from '@google/stitch-sdk';

const projectId = String(process.env.STITCH_PROJECT_ID || '').trim();
if (!projectId) throw new Error('STITCH_PROJECT_ID is required');

const root = path.resolve(process.cwd(), '../..');
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
You are visually redesigning an EXISTING, WORKING enterprise dashboard.

The production codebase is the source of truth. Do not invent product behavior.
This generation is VISUAL ONLY.

${contract}

Additional hard constraints verified directly from production main:
- All labels listed in the contract exist in main today.
- Portal RYM main uses the exact palette declared in the contract.
- Preserve the same business meaning and navigation.
- Use realistic placeholder counts only to demonstrate hierarchy; do not create new metrics.
- Light sidebar is mandatory.
- Do not use dark shell, terminal aesthetics, telemetry, command-center language or technical decorative status panels.
- Do not add any control that is not in the contract.
- Make the screen feel like the same Portal RYM product, only significantly more polished.

Create ONE desktop Dashboard screen only.
`.trim();

const project = stitch.project(projectId);

async function generateWithClarification(p) {
  try {
    return await project.generate(p, { deviceType: 'DESKTOP' });
  } catch (error) {
    if (error instanceof StitchError && error.code === 'CLARIFICATION_REQUIRED') {
      const reply = [
        'Keep the existing Portal RYM functionality exactly as specified.',
        'Make only visual/layout improvements.',
        'Use a light sidebar and the supplied Portal RYM palette.',
        'Do not add any new data, controls, metrics, workflows or terminology.'
      ].join(' ');
      return await project.generate(reply, { deviceType: 'DESKTOP' });
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
