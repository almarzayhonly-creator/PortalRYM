p = 'vue-next/src/bridge.ts'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

target = "  ranking: () => import('./views/RankingView.vue'),"
replacement = "  ranking: () => import('./views/RankingView.vue'),\n  historial: () => import('./views/HistorialView.vue'),"

if target in c and "historial:" not in c:
    c = c.replace(target, replacement)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Historial registrado en bridge.ts')
else:
    print('Ya estaba registrado o no se encontro el target')
