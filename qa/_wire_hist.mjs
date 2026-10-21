import fs from 'node:fs'

const path = 'vue-next/src/bridge.ts'
let c = fs.readFileSync(path, 'utf8')
const target = "ranking: () => import('./views/RankingView.vue'),"
const repl = "ranking: () => import('./views/RankingView.vue'),\n  historial: () => import('./views/HistorialView.vue'),"

if (!c.includes('historial: () =>')) {
  c = c.replace(target, repl)
  fs.writeFileSync(path, c, 'utf8')
  console.log('Historial añadido a nativeViews')
} else {
  console.log('Historial ya estaba añadido')
}
