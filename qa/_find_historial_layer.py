c = open('index.html', 'r', encoding='utf-8', errors='ignore').read()
for target in ['Limpiar filtros', 'PENDIENTE COBRA', 'Historial / Pendiente a Cobra']:
    idx = -1
    print('=== Target:', target)
    while True:
        idx = c.find(target, idx + 1)
        if idx == -1: break
        start = max(0, idx - 400)
        end = min(len(c), idx + 400)
        print('--- Encontrado en byte:', idx)
        print(c[start:end])
