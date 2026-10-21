p = 'vue-next/src/bridge.ts'
c = open(p, 'r', encoding='utf-8').read()
target = "ranking: () => import('./views/RankingView.vue'),\n"
repl = "ranking: () => import('./views/RankingView.vue'),\n  historial: () => import('./views/HistorialView.vue'),\n"
assert target in c, 'target not found'
open(p, 'w', encoding='utf-8').write(c.replace(target, repl))
print('Added historial successfully')
