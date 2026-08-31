import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const production = execFileSync('git', ['show', 'origin/main:index.html'], {
  encoding: 'utf8',
  maxBuffer: 4 * 1024 * 1024,
});
const current = readFileSync('index.html', 'utf8');
const coreCss = readFileSync('css/core/production-base.css', 'utf8').replace(/\n$/, '');
const coreRuntime = readFileSync('modules/core/runtime.js', 'utf8').replace(/\n$/, '');

let reconstructed = current
  .replace(
    '<link rel="stylesheet" href="/css/core/production-base.css?v=174">',
    `<style>\n${coreCss}\n</style>`,
  )
  .replace(
    '<script src="/modules/core/runtime.js?v=174"></script>',
    `<script>\n${coreRuntime}</script>`,
  );

reconstructed = reconstructed
  .replace(/<link rel="stylesheet"([^>]*?) href="\/css\/legacy\/v174\/([^"?]+)\?v=174">/g, (_, attrs, file) =>
    `<style${attrs}>${readFileSync(`css/legacy/v174/${file}`, 'utf8')}</style>`,
  )
  .replace(/<script([^>]*) src="\/modules\/legacy\/v174\/([^"?]+)\?v=174"><\/script>/g, (_, attrs, file) =>
    `<script${attrs}>${readFileSync(`modules/legacy/v174/${file}`, 'utf8')}</script>`,
  );

assert.equal(reconstructed, production, 'La extracción modificó el HTML/CSS/JS de producción');
assert.equal((current.match(/<link[^>]+\/css\/legacy\/v174\//g) || []).length, 86, 'CSS legacy incompleto');
assert.equal((current.match(/src="\/modules\/legacy\/v174\//g) || []).length, 68, 'Scripts legacy incompletos');
assert.equal((current.match(/<style\b/gi) || []).length, 0, 'Quedan estilos inline');
assert.equal((current.match(/<script\b(?![^>]*\bsrc=)/gi) || []).length, 0, 'Quedan scripts inline');

console.log('V174 modular parity: exacta');
