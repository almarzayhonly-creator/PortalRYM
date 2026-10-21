with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

idx = c.find('historial=async function(v){')
print(c[idx+1500:idx+3500])
