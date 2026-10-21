with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

idx = c.find('historial=async function(v){')
snippet = c[idx:idx+4000]
with open('qa/_real_historial_code.js', 'w', encoding='utf-8') as out:
    out.write(snippet)
print('Real historial code saved to qa/_real_historial_code.js')
