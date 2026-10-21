p = 'index.html'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace("'panapass_supervisora_perfil']", "'panapass_supervisora_perfil','panapass_historial','panapass_historial_resumen']")
c = c.replace("'admin-users'", "'admin-users','validar-cobra'")

with open(p, 'w', encoding='utf-8') as f:
    f.write(c)

print('Allowlist OK')
