/* Portal RYM - Negativos Hoy: ultima consulta y ultimo saldo */
(function(w,d){'use strict';
if(w.__RYM_NEGATIVOS_LAST_QUERY_V1__)return;w.__RYM_NEGATIVOS_LAST_QUERY_V1__=true;
const norm=s=>String(s||'').trim().toUpperCase();
function ensureStyles(){
  if(d.querySelector('#rym-negativos-last-query-style'))return;
  const s=d.createElement('style');s.id='rym-negativos-last-query-style';
  s.textContent='.phase3-neg-table .rym-neg-last-query{display:grid;gap:2px;margin-top:5px;line-height:1.25;white-space:normal;text-align:center}.phase3-neg-table .rym-neg-last-age{font-size:10px;font-weight:850;color:#8a5200}.phase3-neg-table .rym-neg-last-balance{font-size:11px;font-weight:1000;color:var(--red,#dc2626)}.phase3-neg-table .rym-neg-last-balance.is-positive{color:var(--green,#047857)}.phase3-neg-table .rym-neg-last-balance.is-empty{color:var(--muted,#62708c);font-weight:800}.phase3-neg-table [data-saldo-express-info],.phase3-neg-table .ena-age{display:none!important}@media(max-width:650px){.phase3-neg-table .rym-neg-last-query{text-align:right}}';
  d.head.appendChild(s);
}
function agoText(row){
  let sec=Number(row&&row.edad_segundos);
  if(!Number.isFinite(sec)&&row&&row.saldo_ultima_consulta){const ts=new Date(row.saldo_ultima_consulta).getTime();if(Number.isFinite(ts))sec=Math.max(0,Math.floor((Date.now()-ts)/1000))}
  if(!Number.isFinite(sec))return '';
  sec=Math.max(0,Math.floor(sec));if(sec<60)return 'hace '+sec+' s';
  const min=Math.floor(sec/60);if(min<60)return 'hace '+min+' min';
  const hr=Math.floor(min/60);if(hr<24)return 'hace '+hr+' hora'+(hr===1?'':'s');
  const day=Math.floor(hr/24);return 'hace '+day+' dia'+(day===1?'':'s');
}
function saldoText(v){const n=Number(v);return Number.isFinite(n)?n.toFixed(2):'--'}
function paint(box,row){
  if(!row||!row.saldo_ultima_consulta){box.innerHTML='<span class="rym-neg-last-age">Sin consulta reciente</span><span class="rym-neg-last-balance is-empty">Saldo --</span>';return}
  const n=Number(row.saldo),cls=Number.isFinite(n)&&n>=0?' is-positive':'';
  box.innerHTML='<span class="rym-neg-last-age">Ultima consulta '+agoText(row)+'</span><span class="rym-neg-last-balance'+cls+'">Saldo '+saldoText(row.saldo)+'</span>';
}
let timer=0;
function schedule(ms){clearTimeout(timer);timer=setTimeout(enhance,ms||80)}
async function enhance(){
  try{
    ensureStyles();
    const table=d.querySelector('#p3NegOut .phase3-neg-table');if(!table)return;
    const buttons=[...table.querySelectorAll('button[data-ena-saldo]')];if(!buttons.length)return;
    const th=[...table.querySelectorAll('thead th')].pop();if(th&&['SALDO ACTUAL','SALDO','SALDO ENA','SALDO EXPRESS','ENA'].includes(norm(th.textContent)))th.textContent='Ultima consulta';
    buttons.forEach(b=>{const cell=b.closest('td');if(!cell)return;const old=cell.querySelector('[data-saldo-express-info]');if(old)old.style.display='none';const age=cell.querySelector('.ena-age');if(age)age.style.display='none';if(!cell.querySelector('.rym-neg-last-query')){const box=d.createElement('div');box.className='rym-neg-last-query';box.innerHTML='<span class="rym-neg-last-age">Cargando...</span>';cell.appendChild(box)}if(!b.dataset.rymNegHistoryBound){b.dataset.rymNegHistoryBound='1';b.addEventListener('click',()=>{const started=Date.now();const watch=setInterval(()=>{if(!b.isConnected){clearInterval(watch);return}const done=!b.disabled&&!norm(b.textContent).includes('CONSULTANDO');if(done||Date.now()-started>20000){clearInterval(watch);delete b.dataset.rymNegHistoryReady;schedule(150)}},400)},true)}});
    const pending=buttons.filter(b=>b.dataset.rymNegHistoryReady!=='1'&&b.dataset.rymNegHistoryReady!=='loading');if(!pending.length||typeof rpc!=='function')return;
    pending.forEach(b=>b.dataset.rymNegHistoryReady='loading');const nums=[...new Set(pending.map(b=>Number(b.dataset.enaSaldo)).filter(Boolean))];
    let rows=[];try{rows=await rpc('panapass_saldo_disponibilidad',{p_panapass:nums})}catch(e){pending.forEach(b=>delete b.dataset.rymNegHistoryReady);return}
    const map=new Map((rows||[]).map(x=>[String(x.panapass_numero),x]));pending.forEach(b=>{const box=b.closest('td')&&b.closest('td').querySelector('.rym-neg-last-query');if(box)paint(box,map.get(String(b.dataset.enaSaldo)));b.dataset.rymNegHistoryReady='1'});
  }catch(_){ }
}
new MutationObserver(()=>schedule(60)).observe(d.documentElement,{childList:true,subtree:true});
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',()=>schedule(120),{once:true});else schedule(120);
})(window,document);
