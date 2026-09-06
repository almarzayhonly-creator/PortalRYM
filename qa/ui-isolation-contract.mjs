import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const read = path => readFileSync(path, 'utf8');
const cssRoot = join(root, 'css');

function files(path, predicate = () => true) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const target = join(path, entry.name);
    return entry.isDirectory() ? files(target, predicate) : predicate(target) ? [target] : [];
  });
}

function fail(message) { failures.push(message); }
function assertNoCrossReference(directory, forbidden, label) {
  for (const file of files(directory, path => path.endsWith('.css'))) {
    const content = read(file);
    if (forbidden.test(content)) {
      fail(`${label}: ${relative(root, file)} references another module namespace`);
    }
  }
}

const moduleCss = {
  panapass: join(cssRoot, 'panapass'),
  gps: join(cssRoot, 'gps'),
  revisados: join(cssRoot, 'revisados'),
  usuarios: join(cssRoot, 'usuarios'),
  'control-auto': join(cssRoot, 'control-auto')
};

for (const [name, directory] of Object.entries(moduleCss)) {
  if (!existsSync(directory)) fail(`Missing CSS directory: css/${name}`);
}

assertNoCrossReference(moduleCss.panapass, /(?:rym-gps|\bgps\b)/i, 'Panapass isolation');
assertNoCrossReference(moduleCss.gps, /(?:rym-panapass|\bpanapass\b)/i, 'GPS isolation');
assertNoCrossReference(moduleCss.revisados, /(?:rym-usuarios|\busuarios\b)/i, 'Revisados isolation');
assertNoCrossReference(moduleCss.usuarios, /(?:rym-revisados|\brevisados\b)/i, 'Usuarios isolation');

const dangerousGlobal = /(^|\n)\s*(?:table|button|input|select|textarea|h1|h2|h3|\.card|\.panel|\.grid)\b[^,{]*\{/gm;
for (const [name, directory] of Object.entries(moduleCss)) {
  for (const file of files(directory, path => path.endsWith('.css'))) {
    if (dangerousGlobal.test(read(file))) {
      fail(`Unsafe global selector in ${name}: ${relative(root, file)}`);
    }
  }
}

for (const file of files(cssRoot)) {
  if (/(?:patch|hotfix|final2|proposal)/i.test(relative(cssRoot, file))) {
    fail(`Forbidden patch-style filename: ${relative(root, file)}`);
  }
}

// Known pre-V2 debt. Each file is allowed at most this exact number of static
// style injections until its dedicated migration phase removes it. Do not add
// files here to bypass the contract.
const legacyStaticInjectionBaseline = new Map([
  ['modules/core/aracelys-messages-v4.js', 1],
  ['modules/core/aracelys-messages.js', 1],
  ['modules/core/dashboard-payments-enhance.js', 1],
  ['modules/core/panapass-ranking-criteria-final.js', 1],
  ['modules/core/panapass-ranking-recurrentes-final.js', 1],
  ['modules/core/yhonly-change-alerts.js', 1]
]);
const staticInjection = /createElement\s*\(\s*['"]style|\.style\.(?:textContent|cssText)\s*=|\.insertRule\s*\(|(?:innerHTML\s*[+.]*=|insertAdjacentHTML\s*\()[\s\S]{0,200}?<style\b/gi;
for (const file of files(join(root, 'modules'), path => path.endsWith('.js'))) {
  const path = relative(root, file).replaceAll('\\', '/');
  const count = (read(file).match(staticInjection) || []).length;
  const permitted = legacyStaticInjectionBaseline.get(path);
  if (permitted !== undefined) {
    if (count > permitted) fail(`Legacy static CSS injection count increased in ${path}: ${count} > ${permitted}`);
  } else if (count > 0) {
    fail(`Static CSS injection in module JavaScript: ${relative(root, file)}`);
  }
}

const loader = read(join(root, 'modules', 'v171-loader.js'));
const index = read(join(root, 'index.html'));
const expectedCss = [
  'core/tokens.css', 'core/reset.css', 'core/layout.css', 'core/sidebar.css', 'core/components.css',
  'panapass/base.css', 'panapass/bajas.css', 'revisados/base.css', 'control-auto/base.css', 'gps/base.css', 'usuarios/base.css'
];
for (const path of expectedCss) {
  if (!index.includes(`href="/css/${path}?v=172"`)) fail(`Head is missing CSS entry: ${path}`);
  if (!existsSync(join(cssRoot, path))) fail(`Missing CSS entry file: ${path}`);
}

const headEntries = [...index.matchAll(/<link\s+rel="stylesheet"\s+href="\/css\/([^?"']+)\?v=172">/g)].map(match => match[1]);
if (new Set(headEntries).size !== headEntries.length) fail('Head includes the same CSS entry more than once');
if (loader.includes("'/css/") || loader.includes('createElement(\'link\')')) fail('JavaScript loader must not load CSS');
const visitedStyles = new Set();
const activeStyles = new Set();
function inspectImports(cssPath) {
  const absolute = resolve(cssPath);
  if (activeStyles.has(absolute)) {
    fail(`Circular CSS import: ${relative(root, absolute)}`);
    return;
  }
  if (visitedStyles.has(absolute)) {
    fail(`CSS loaded more than once through imports: ${relative(root, absolute)}`);
    return;
  }
  if (!existsSync(absolute)) {
    fail(`Missing imported CSS: ${relative(root, absolute)}`);
    return;
  }
  visitedStyles.add(absolute);
  activeStyles.add(absolute);
  for (const match of read(absolute).matchAll(/@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)\s*;/g)) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) fail(`Unsupported non-relative CSS import in ${relative(root, absolute)}: ${specifier}`);
    else inspectImports(resolve(dirname(absolute), specifier));
  }
  activeStyles.delete(absolute);
}
for (const entry of headEntries) inspectImports(join(cssRoot, entry));

const permittedBridges = new Map([
  ['css/panapass/base.css', '../panapass.css'],
  ['css/panapass/bajas.css', '../panapass-bajas.css'],
  ['css/revisados/base.css', '../revisados.css'],
  ['css/control-auto/base.css', '../control-auto.css'],
  ['css/gps/base.css', '../gps.css'],
  ['css/usuarios/base.css', '../usuarios.css']
]);
for (const [path, legacy] of permittedBridges) {
  const content = read(join(root, path));
  if (!content.includes('COMPATIBILITY BRIDGE') || !content.includes('TODO: migrate legacy selectors after visual baseline approval') || !content.includes(`@import url('${legacy}')`)) {
    fail(`Invalid compatibility bridge: ${path}`);
  }
}
for (const file of files(cssRoot, path => path.endsWith('.css'))) {
  const path = relative(root, file).replaceAll('\\', '/');
  if (read(file).includes('@import') && !permittedBridges.has(path)) fail(`Unauthorized CSS bridge: ${path}`);
}
for (const path of ['css/panapass/dashboard.css', 'css/panapass/ranking.css', 'css/panapass/pagos.css', 'css/panapass/negativos.css', 'css/panapass/recurrentes.css']) {
  if (!read(join(root, path)).includes('RESERVED FOR ISOLATED MIGRATION AFTER BASELINE APPROVAL')) fail(`Invalid Panapass placeholder: ${path}`);
}

for (const file of files(join(cssRoot, 'core'), path => path.endsWith('.css'))) {
  if (/\.rym-(?:panapass|gps|revisados|control-auto|usuarios)|\.v171-/i.test(read(file))) {
    fail(`Core contains a domain selector: ${relative(root, file)}`);
  }
}

const expectedNamespaces = ['panapass', 'revisados', 'control-auto', 'gps', 'usuarios'];
for (const name of expectedNamespaces) {
  const file = join(root, 'modules', name, 'index.js');
  if (!existsSync(file) || !read(file).includes(`rymModule='${name}'`)) {
    fail(`Missing visual namespace for module: ${name}`);
  }
}

if (failures.length) {
  console.error('UI isolation contract failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log('UI isolation contract passed.');
