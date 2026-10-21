const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const dq = String.fromCharCode(34);
const sq = String.fromCharCode(39);

const target = "d.addEventListener('click',e=>{const nav=e.target?.closest?.('[data-m=" + dq + "reportes" + dq + "]');if(!nav)return;e.preventDefault();e.stopImmediatePropagation();try{state.active='reportes';if(typeof shell==='function')shell()}catch(_){}if(window.__RYM_VUE_NEXT_VIEWS&&window.__RYM_VUE_NEXT_VIEWS.mount){window.__RYM_VUE_NEXT_VIEWS.mount('reportes',d.querySelector('#view'))}else if(typeof reportes==='function'){reportes(d.querySelector('#view'))}},true)}";

const addition = ";d.addEventListener('click',e=>{const nav=e.target?.closest?.('[data-m=" + dq + "usuarios" + dq + "]');if(!nav)return;e.preventDefault();e.stopImmediatePropagation();try{state.active='usuarios';if(typeof shell==='function')shell()}catch(_){}if(window.__RYM_VUE_NEXT_VIEWS&&window.__RYM_VUE_NEXT_VIEWS.mount){window.__RYM_VUE_NEXT_VIEWS.mount('usuarios',d.querySelector('#view'))}else if(typeof usuarios==='function'){usuarios(d.querySelector('#view'))}},true);d.addEventListener('click',e=>{const nav=e.target?.closest?.('#v118NavUsers, #v70Users');if(!nav)return;e.preventDefault();e.stopImmediatePropagation();try{state.active='usuarios';if(typeof shell==='function')shell()}catch(_){}if(window.__RYM_VUE_NEXT_VIEWS&&window.__RYM_VUE_NEXT_VIEWS.mount){window.__RYM_VUE_NEXT_VIEWS.mount('usuarios',d.querySelector('#view'))}else if(typeof window.v70OpenUsers==='function'){window.v70OpenUsers()}},true)}";

if (!html.includes(target)) {
  console.error('Target string not found in index.html');
  process.exit(1);
}

// Note target ends with '}' so we replace target with target.slice(0, -1) + addition
const targetWithoutBrace = target.slice(0, -1);
html = html.replace(target, targetWithoutBrace + addition);
fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully wired usuarios interceptors in index.html!');
