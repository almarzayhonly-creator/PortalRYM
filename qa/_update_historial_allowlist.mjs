import fs from 'node:fs'

const path = 'index.html'
let c = fs.readFileSync(path, 'utf8')

// Actualizar la lista blanca de rpc
const oldRpc = "'panapass_supervisora_perfil']"
const newRpc = "'panapass_supervisora_perfil','panapass_historial','panapass_historial_resumen']"
if (c.includes(oldRpc) && !c.includes('panapass_historial')) {
  c = c.replace(oldRpc, newRpc)
}

// Actualizar la lista blanca de Edge Functions (para validar-cobra)
const oldFunc = "'admin-users'"
const newFunc = "'admin-users','validar-cobra'"
if (c.includes(oldFunc) && !c.includes('validar-cobra')) {
  c = c.replace(oldFunc, newFunc)
}

fs.writeFileSync(path, c, 'utf8')
console.log('Allowlist actualizada para Historial (RPC y Edge Functions)')
