const fs = require('fs')
const c = fs.readFileSync('index.html', 'utf8')
const all = k => { const r = []; let i = -1; while ((i = c.indexOf(k, i + 1)) >= 0) r.push(i); return r }
const line = p => c.slice(0, p).split('\n').length

console.log('--- Buscando definiciones e interceptores de Historial ---')
for (const k of ['historial(v)', 'historial(', 'renderHistorial', 'data-m="historial"', 'state.active===\'historial\'']) {
  const r = all(k)
  console.log(JSON.stringify(k), '->', r.length, 'lineas:', r.slice(0, 10).map(line).join(','))
}

const s = c.indexOf('async function historial(v)')
console.log('\n=== async function historial(v) (linea ' + line(s) + ') ===')
console.log(c.slice(s, s + 1200))
