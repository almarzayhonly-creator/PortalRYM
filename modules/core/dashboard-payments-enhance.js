/* Portal RYM - dashboard payment summaries */
(function(w,d){'use strict';if(w.__RYM_DASH_PAYMENTS__)return;w.__RYM_DASH_PAYMENTS__=true;
const GALS=['VCARS','VCOMP','VIPCO','VINDU'];let cache=null,cacheAt=0,loading=false;
const norm=s=>String(s||'').trim().toUpperCase();
const money=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
async function home(){if(cache&&Date.now()-cacheAt<15000)return cache;if(loading)return cache;loading=true;try{const r=await req('/functions/v1/portal-home-resumen',{method:'POST',body:'{}'});cache=r?.data||null;cacheAt=Date.now();return cache}catch(_){return null}finally{loading=false}}
function monthLabel(){const m=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];const x=new Date();return m[x.getMonth()]||'este mes'}
function all(root,sel='*'){return [...root.querySelectorAll(sel)]}
function findText(root,txt){const t=norm(txt);return all(root).find(el=>norm(el.textContent)===t)||null}
function closestCard(el){if(!el)return null;let x=el;for(let i=0;i<7&&x;i++,x=x.parentElement){const z=norm(x.textContent);if(GALS.some(g=>z.startsWith(g))&&z.includes('UNIDADES'))return x}return el.parentElement}
function setLabelValue(card,label,newLabel,value){if(!card)return;const lab=all(card).find(el=>norm(el.textContent)===norm(label));if(!lab)return;lab.textContent=newLabel;let box=lab.parentElement;for(let i=0;i<3&&box;i++,box=box.parentElement){const candidates=[...box.querySelectorAll('b,strong')].filter(x=>x!==lab);if(candidates.length){candidates[0].textContent=value;return}}
}
async function enhanceDashboard(){if(!d.body||!norm(d.body.textContent).includes('RESUMEN POR GALERA'))return;const data=await home();const p=data?.panapass;if(!p)return;
 const mes=monthLabel();const pagado=all(d).find(el=>norm(el.textContent)==='PAGADO ESTE MES');if(pagado){pagado.textContent='PAGADO EN '+mes.toUpperCase();const card=pagado.parentElement?.parentElement||pagado.parentElement;const muted=card?[...card.querySelectorAll('*')].find(el=>/Monto visible según tu alcance/i.test(el.textContent||'')):null;if(muted)muted.textContent=`Mes actual · desde 01/${String(new Date().getMonth()+1).padStart(2,'0')}/${new Date().getFullYear()}`}
 const rows=Array.isArray(p.galeras_7d)?p.galeras_7d:[];for(const g of GALS){const title=findText(d,g);const card=closestCard(title);const r=rows.find(x=>norm(x.galera)===g)||{registros_7d:0,monto_7d:0};setLabelValue(card,'PAGADAS HOY','PAGOS 7 DÍAS',String(r.registros_7d||0));setLabelValue(card,'MONTO PAGADO','PAGADO 7 DÍAS',money(r.monto_7d||0))}}
function bindReport(){const b=d.querySelector('#r4');if(!b||b.dataset.rymTotalBound==='1')return;b.dataset.rymTotalBound='1';b.onclick=async()=>{const desde=d.querySelector('#repDesde')?.value,hasta=d.querySelector('#repHasta')?.value;if(!desde||!hasta)return;const rows=await rpc('panapass_reporte_pagos_4_galeras',{p_desde:desde,p_hasta:hasta});const totalReg=rows.reduce((a,x)=>a+Number(x.registros||0),0),totalMonto=rows.reduce((a,x)=>a+Number(x.monto||0),0);const out=[...rows,{galera:'TOTAL',registros:totalReg,monto:totalMonto.toFixed(2)}];openDataWindow('Pagos · 4 Galeras',`${desde} → ${hasta}`,rowsTable(out,['galera','registros','monto']))}}
function tick(){try{enhanceDashboard();bindReport()}catch(_){}}
setInterval(tick,900);new MutationObserver(tick).observe(d.documentElement,{childList:true,subtree:true});if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
})(window,document);
