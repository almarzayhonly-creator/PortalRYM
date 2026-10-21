with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

idx = c.find('hclear')
start = c.rfind('historial', 0, idx)
print('Historial assigned at byte:', start)
print(c[start:start+1800])
