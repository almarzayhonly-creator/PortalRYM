import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const current = readFileSync('index.html', 'utf8');
const cssFiles = [...current.matchAll(/href="\/css\/legacy\/v174\/([^"?]+)\?v=174"/g)].map(match => match[1]);
const scriptFiles = [...current.matchAll(/src="\/modules\/legacy\/v174\/([^"?]+)\?v=174"/g)].map(match => match[1]);

assert.equal(cssFiles.length, 86, 'CSS legacy incompleto');
assert.equal(scriptFiles.length, 68, 'Scripts legacy incompletos');
assert.equal((current.match(/<style\b/gi) || []).length, 0, 'Quedan estilos inline');
assert.equal((current.match(/<script\b(?![^>]*\bsrc=)/gi) || []).length, 0, 'Quedan scripts inline');

for (const file of cssFiles) {
  assert.ok(readFileSync(`css/legacy/v174/${file}`, 'utf8').trim(), `CSS vacío: ${file}`);
}
for (const file of scriptFiles) {
  assert.ok(readFileSync(`modules/legacy/v174/${file}`, 'utf8').trim(), `Script vacío: ${file}`);
}

console.log('V174 modular structure: exacta');
