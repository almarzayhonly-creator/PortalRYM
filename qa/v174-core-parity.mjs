import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const production = execFileSync('git', ['show', 'origin/main:index.html'], {
  encoding: 'utf8',
  maxBuffer: 4 * 1024 * 1024,
});
const current = readFileSync('index.html', 'utf8');
const css = readFileSync('css/core/production-base.css', 'utf8').replace(/\n$/, '');
const runtime = readFileSync('modules/core/runtime.js', 'utf8').replace(/\n$/, '');

const reconstructed = current
  .replace(
    '<link rel="stylesheet" href="/css/core/production-base.css?v=174">',
    `<style>\n${css}\n</style>`,
  )
  .replace(
    '<script src="/modules/core/runtime.js?v=174"></script>\n<script>\n',
    `<script>\n${runtime}\n`,
  );

assert.equal(reconstructed, production, 'La extracción modificó el HTML/CSS/JS de producción');
assert.equal((current.match(/<link[^>]+stylesheet/g) || []).length, 1, 'CSS base no conectado una sola vez');
assert.equal((current.match(/src="\/modules\/core\/runtime\.js\?v=174"/g) || []).length, 1, 'Runtime no conectado una sola vez');

console.log('V174 Core parity: exacta');
