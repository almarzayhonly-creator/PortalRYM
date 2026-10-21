const fs = require('fs')
const p = 'qa/e2e-historial.mjs'
let c = fs.readFileSync(p, 'utf8')
const target = "await page.waitForSelector('[data-testid=\"vue-historial\"]', { timeout: 15000 })"
const repl = "await page.waitForTimeout(1000); await page.screenshot({ path: path.join(ROOT, 'qa/screenshot-debug-historial.png') });\n  await page.waitForSelector('[data-testid=\"vue-historial\"]', { timeout: 15000 })"
c = c.replace(target, repl)
fs.writeFileSync(p, c, 'utf8')
console.log('debug screenshot added')
