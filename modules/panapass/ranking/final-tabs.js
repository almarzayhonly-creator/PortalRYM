/* Portal RYM - canonical final Ranking + Recurrentes V2 */
(function(w,d){
'use strict';
if(w.__RYM_PANAPASS_FINAL_TABS_V2__) return;
w.__RYM_PANAPASS_FINAL_TABS_V2__=true;

const E=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const N=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const M=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const DATE_LABEL=date=>{try{return new Intl.DateTimeFormat('es-PA',{timeZone:'America/Panama',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00'))}catch(_){return date}};
const GALS=['VCARS','VCOMP','VIPCO','VINDU'];
function context(){return w.RYM_CONTEXT&&typeof w.RYM_CONTEXT.create==='function'?w.RYM_CONTEXT.create('panapass-final-tabs'):null}
async function call(name,params){const c=context();if(!c)throw new Error('Panapass final tabs context unavailable');return c.api.call(name,params||{})}
function session(){return context()?.session||{profile:null,role:'',today:'',meta:{maxPago:'',galeras:[]}}}
function isAdmin(){return ['ADMIN_TOTAL','ADMIN','SISTEMA','PAGADOR'].includes(N(session().role))}

function addCss(){
  if(d.getElementById('rym-final-tabs-v2-css')) return;
  const s=d.createElement('style');
  s.id='rym-final-tabs-v2-css';
  s.textContent=`.rym2-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 15px;border:1px solid #d2e0ef;border-radius:16px;background:linear-gradient(135deg,#f8fbff,#eef5ff)}.rym2-tools{display:grid;gap:8px;align-items:end;margin-top:9px;padding:10px;border:1px solid #d8e4f0;border-radius:14px;background:#fff}.rym2-rank-tools{grid-template-columns:minmax(210px,1.2fr) 145px 145px minmax(145px,.7fr) minmax(145px,.7fr)}.rym2-rec-tools{grid-template-columns:minmax(150px,.8fr) minmax(150px,.8fr) 135px minmax(135px,.65fr)}.rym2-tools select,.rym2-tools input{width:100%;height:36px;padding:6px 9px;border:1px solid #cddbeb;border-radius:9px}.rym2-primary{background:#225db3!important;color:#fff!important}.rym2-secondary{background:#eef5ff!important;color:#245797!important}.rym2-rec-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.rym2-rec-table{overflow:hidden;border:1px solid #d4e0ed;border-radius:13px;background:#fff}.rym2-rec-table table{width:100%;border-collapse:separate;border-spacing:0;min-width:790px}.rym2-rec-table th{padding:8px 10px;background:#174a8b;color:#fff;font-size:8px}.rym2-rec-table td{padding:8px 10px;border-bottom:1px solid #e7eef6;font-size:9px}.rym2-pager{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;background:#f8fbff}@media(max-width:820px){.rym2-rank-tools,.rym2-rec-tools,.rym2-rec-summary{grid-template-columns:1fr}}`;
  d.head.appendChild(s);
}

async function lastPayDate(){
  try{
    const x=await call('panapass_ultima_fecha_pago');
    const raw=Array.isArray(x)?x[0]:x;
    if(typeof raw==='string'&&/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0,10);
    if(raw&&typeof raw==='object'){
      const v=raw.ultima_fecha||raw.max_pago||raw.fecha;
      if(v) return String(v).slice(0,10);
    }
  }catch(_){}
  const s=session();
  return s.meta?.maxPago||s.today||new Date().toISOString().slice(0,10);
}
function monthBounds(date){const x=new Date(String(date).slice(0,10)+'T12:00:00'),y=x.getFullYear(),m=x.getMonth();return {desde:`${y}-${String(m+1).padStart(2,'0')}-01`,hasta:new Date(y,m+1,0).toISOString().slice(0,10),month:`${y}-${String(m+1).padStart(2,'0')}`}}
function scopeLabel(scope){return scope==='GLOBAL'?'Todas las supervisoras':scope==='TODAS'?'4 galeras':scope}

async function finalRanking(v){
  if(!v)return;addCss();const last=await lastPayDate(),b=monthBounds(last);
  v.innerHTML=`<section data-rym-final="ranking"><div class="rym2-head"><div><h2>Ranking de cobranza</h2><p>Comparación por resultado diario.</p></div><span>${E(DATE_LABEL(last))}</span></div><div class="rym2-tools rym2-rank-tools"><label>Vista<select id="rym2RankScope"><option value="GLOBAL">Todas las supervisoras</option><option value="TODAS">4 galeras</option>${GALS.map(g=>`<option value="${g}">${g}</option>`).join('')}</select></label><label>Desde<input id="rym2RankFrom" type="date" value="${b.desde}"></label><label>Hasta<input id="rym2RankTo" type="date" value="${last}"></label><button id="rym2RankGo" class="rym2-primary">Actualizar</button><button id="rym2RankCopy" class="rym2-secondary">Copiar WhatsApp</button></div><div id="rym2RankOut"><div class="card">Calculando ranking…</div></div></section>`;
  let rows=[];
  const load=async()=>{const out=v.querySelector('#rym2RankOut'),scope=v.querySelector('#rym2RankScope').value,desde=v.querySelector('#rym2RankFrom').value,hasta=v.querySelector('#rym2RankTo').value;try{rows=await call('panapass_reporte_competencia_cobrador',{p_desde:desde,p_hasta:hasta,p_modo:scope});const active=rows.filter(x=>x.participa);out.innerHTML=active.length?active.map(x=>`<div class="card">#${x.puesto} ${E(x.entidad)} · B/. ${M(x.monto_por_dia)} / día</div>`).join(''):'<div class="card">Sin participantes.</div>'}catch(e){out.innerHTML=`<div class="alert">${E(e.message||e)}</div>`}};
  v.querySelector('#rym2RankGo').onclick=load;v.querySelector('#rym2RankScope').onchange=load;v.querySelector('#rym2RankCopy').onclick=()=>{};await load();
}

async function finalRecurrentes(v){
  if(!v)return;addCss();const last=await lastPayDate(),b=monthBounds(last),s=session(),visible=Array.isArray(s.meta?.galeras)?s.meta.galeras.filter(Boolean):[],gals=isAdmin()?GALS:[...new Set(visible)];
  v.innerHTML=`<section data-rym-final="recurrentes"><div class="rym2-head"><div><h2>Pagos recurrentes</h2><p>Operadores o unidades con múltiples pagos.</p></div></div><div class="rym2-tools rym2-rec-tools"><label>Galera<select id="rym2RecGal"><option value="">Todas las visibles</option>${gals.map(g=>`<option value="${E(g)}">${E(g)}</option>`).join('')}</select></label><label>Mes<input id="rym2RecMonth" type="month" value="${b.month}"></label><label>Mínimo<input id="rym2RecMin" type="number" min="2" max="20" value="5"></label><button id="rym2RecGo" class="rym2-primary">Analizar</button></div><div id="rym2RecOut"><div class="card">Cargando recurrentes…</div></div></section>`;
  const load=async()=>{const out=v.querySelector('#rym2RecOut'),[y,m]=v.querySelector('#rym2RecMonth').value.split('-').map(Number),desde=`${y}-${String(m).padStart(2,'0')}-01`,hasta=new Date(y,m,0).toISOString().slice(0,10),gal=v.querySelector('#rym2RecGal').value||null;try{const all=await call('panapass_recurrentes_entidad',{p_desde:desde,p_hasta:hasta,p_galera:gal,p_min_pagos:Number(v.querySelector('#rym2RecMin').value||5),p_limit:2000});out.innerHTML=all.length?all.map(x=>`<div class="card">${E(x.nombre||x.identificador||x.unidad)} · ${Number(x.pagos||0)} pagos · B/. ${M(x.total_pagado)}</div>`).join(''):'<div class="card">Sin recurrentes.</div>'}catch(e){out.innerHTML=`<div class="alert">${E(e.message||e)}</div>`}};
  v.querySelector('#rym2RecGo').onclick=load;v.querySelector('#rym2RecGal').onchange=load;await load();
}

function install(){
  addCss();
  w.recurrentes=finalRecurrentes;
  if(typeof w.render==='function'&&!w.__RYM_FINAL_RENDER_WRAPPED__){const oldRender=w.render;w.render=async function(){const c=context();if(c?.session&&c?.router&&d.querySelector('[data-m="recurrentes"].active'))return finalRecurrentes(d.querySelector('#view'));return oldRender.apply(this,arguments)};w.__RYM_FINAL_RENDER_WRAPPED__=true}
  d.addEventListener('click',e=>{const nav=e.target?.closest?.('[data-m="recurrentes"]');if(!nav)return;e.preventDefault();e.stopImmediatePropagation();context()?.router?.open?.('recurrentes');finalRecurrentes(d.querySelector('#view'))},true);
}
install();
})(window,document);
