import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { stitch } from '@google/stitch-sdk';

const root = path.resolve(process.cwd(), '../..');
const out = path.join(root, '.stitch');
const projectId = String(process.env.STITCH_PROJECT_ID || '').trim();
const projectTitle = String(process.env.STITCH_PROJECT_TITLE || 'Revisados RYM Operations Hub').trim();
const catalogOnly = process.argv.includes('--catalog');

await fs.mkdir(out, { recursive: true });

const titleOf = (item) => String(
  item?.title || item?.displayName || item?.name ||
  item?.data?.title || item?.data?.displayName || item?.data?.name || ''
).trim();

const slug = (value) => String(value || 'screen')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '').slice(0, 80) || 'screen';

const projects = await stitch.projects();
const catalog = [];

for (const project of projects) {
  const screens = await project.screens();
  catalog.push({
    id: String(project.projectId || project.id),
    title: titleOf(project),
    screens: screens.map((screen) => ({
      id: String(screen.screenId || screen.id),
      title: titleOf(screen)
    }))
  });
}

await fs.writeFile(
  path.join(out, 'catalog.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), projects: catalog }, null, 2) + '\n'
);

await fs.writeFile(
  path.join(out, 'CATALOG.md'),
  [
    '# Stitch catalog',
    '',
    ...catalog.flatMap((project) => [
      '## ' + (project.title || '(untitled project)'),
      '- Project ID: ' + project.id,
      ...project.screens.map((screen) => '  - ' + (screen.title || '(untitled screen)') + ' — ' + screen.id),
      ''
    ])
  ].join('\n') + '\n'
);

console.log('Stitch projects:', catalog.length);
for (const project of catalog) {
  console.log('-', project.title || '(untitled)', '[' + project.id + ']', project.screens.length, 'screens');
}

if (catalogOnly) process.exit(0);

let selected;
if (projectId) {
  selected = stitch.project(projectId);
} else {
  const wanted = projectTitle.toLowerCase();
  const exact = catalog.findIndex((item) => item.title.toLowerCase() === wanted);
  const partial = catalog.findIndex((item) => item.title && (
    item.title.toLowerCase().includes(wanted) || wanted.includes(item.title.toLowerCase())
  ));
  const index = exact >= 0 ? exact : partial;
  if (index >= 0) selected = projects[index];
}

if (!selected) {
  console.log('No matching Stitch project selected. Catalog sync completed.');
  process.exit(0);
}

const selectedId = String(selected.projectId || selected.id);
const selectedMeta = catalog.find((item) => item.id === selectedId);
const selectedTitle = selectedMeta?.title || projectTitle || selectedId;
const projectDir = path.join(out, 'projects', slug(selectedTitle));
const screensDir = path.join(projectDir, 'screens');
await fs.mkdir(screensDir, { recursive: true });

const screens = await selected.screens();
const manifest = {
  generatedAt: new Date().toISOString(),
  projectId: selectedId,
  projectTitle: selectedTitle,
  screens: []
};

for (let i = 0; i < screens.length; i++) {
  const screen = screens[i];
  const screenId = String(screen.screenId || screen.id);
  const screenTitle = titleOf(screen);
  const base = String(i + 1).padStart(2, '0') + '-' + slug(screenTitle || screenId);
  const entry = { id: screenId, title: screenTitle, html: null, image: null, error: null };

  try {
    const htmlUrl = await screen.getHtml();
    const response = await fetch(htmlUrl);
    if (!response.ok) throw new Error('HTML download failed: ' + response.status);
    const rel = path.join('screens', base + '.html');
    await fs.writeFile(path.join(projectDir, rel), await response.text());
    entry.html = rel.split(path.sep).join('/');
  } catch (error) {
    entry.error = 'HTML: ' + (error instanceof Error ? error.message : String(error));
  }

  try {
    const imageUrl = await screen.getImage();
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Image download failed: ' + response.status);
    const rel = path.join('screens', base + '.png');
    await fs.writeFile(path.join(projectDir, rel), Buffer.from(await response.arrayBuffer()));
    entry.image = rel.split(path.sep).join('/');
  } catch (error) {
    const msg = 'Image: ' + (error instanceof Error ? error.message : String(error));
    entry.error = [entry.error, msg].filter(Boolean).join(' | ');
  }

  manifest.screens.push(entry);
  console.log('Synced', i + 1, '/', screens.length, ':', screenTitle || screenId);
}

const systems = await selected.listDesignSystems().catch(() => []);
manifest.designSystems = systems.map((system) => ({ id: String(system.assetId || system.id) }));

await fs.writeFile(path.join(projectDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(
  path.join(out, 'active-project.json'),
  JSON.stringify({
    projectId: selectedId,
    projectTitle: selectedTitle,
    path: path.relative(out, projectDir).split(path.sep).join('/')
  }, null, 2) + '\n'
);

console.log('Stitch sync complete:', selectedTitle);
