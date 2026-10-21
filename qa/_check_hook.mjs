import fs from 'node:fs'

const path = 'index.html'
let c = fs.readFileSync(path, 'utf8')

// El gancho en render():
// try{if(await window.__RYM_VUE_NEXT_VIEWS?.mount?.(state.active,v))return;
// Ya está instalado globalmente en render() en la línea ~8990!

console.log('Gancho global en render() verificado:', c.includes('window.__RYM_VUE_NEXT_VIEWS?.mount?.(state.active,v)'))
