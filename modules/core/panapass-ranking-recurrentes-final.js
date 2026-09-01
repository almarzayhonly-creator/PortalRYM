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

function addCss(){
  if(d.getElementById('rym-final-tabs-v2-css')) return;
  const s=d.createElement('style');
  s.id='rym-final-tabs-v2-css';
  s.textContent=`
  .rym2-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 15px;border:1px solid #d2e0ef;border-radius:16px;background:linear-gradient(135deg,#f8fbff,#eef5ff);box-shadow:0 7px 20px rgba(20,61,112,.05)}
  .rym2-head-copy{min-width:0}.rym2-eyebrow{display:block;margin-bottom:3px;color:#4c719c;font-size:8px;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}.rym2-head h2{margin:0;color:#0d376f;font-size:19px;line-height:1.1}.rym2-head p{margin:5px 0 0;color:#667b94;font-size:9.5px;line-height:1.35}.rym2-head-meta{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.rym2-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid #d2deec;border-radius:999px;background:#fff;color:#476783;font-size:8px;font-weight:900;white-space:nowrap}.rym2-chip b{color:#184f91}
  .rym2-tools{display:grid;gap:8px;align-items:end;margin-top:9px;padding:10px;border:1px solid #d8e4f0;border-radius:14px;background:#fff}.rym2-rank-tools{grid-template-columns:minmax(210px,1.2fr) 145px 145px minmax(145px,.7fr) minmax(145px,.7fr)}.rym2-rec-tools{grid-template-columns:minmax(150px,.8fr) minmax(150px,.8fr) 135px minmax(135px,.65fr)}.rym2-tools label{display:grid;gap:4px;margin:0;color:#5b718c;font-size:8px;font-weight:1000;text-transform:uppercase;letter-spacing:.025em}.rym2-tools select,.rym2-tools input{width:100%;height:36px;min-height:36px;padding:6px 9px;border:1px solid #cddbeb;border-radius:9px;background:#fbfdff;color:#173f6e;font-size:10px;box-sizing:border-box}.rym2-tools button{height:36px;min-height:36px!important;padding:6px 11px!important;border-radius:9px!important;font-size:9px!important;font-weight:1000!important}.rym2-primary{background:#225db3!important;color:#fff!important;border-color:#225db3!important}.rym2-secondary{background:#eef5ff!important;color:#245797!important;border:1px solid #ccddf0!important}
  .rym2-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:8px}.rym2-kpi{position:relative;overflow:hidden;padding:8px 10px;border:1px solid #d9e4ef;border-radius:11px;background:#fff}.rym2-kpi span{display:block;color:#718198;font-size:7.5px;font-weight:1000;text-transform:uppercase;letter-spacing:.025em}.rym2-kpi b{display:block;margin-top:2px;color:#103b76;font-size:16px;line-height:1.05}.rym2-kpi small{display:block;margin-top:2px;color:#8491a2;font-size:7.5px}.rym2-kpi:before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:#2a67bd}.rym2-kpi.good:before{background:#19a36b}.rym2-kpi.warn:before{background:#e2a12c}
  .rym2-podium{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:9px}.rym2-pod{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:9px;min-height:72px;padding:10px 11px;border:1px solid #d8e3ef;border-radius:14px;background:#fff;box-shadow:0 5px 15px rgba(18,62,113,.04)}.rym2-pod.p1{border-color:#e5ce76;background:linear-gradient(135deg,#fffbe8,#fff)}.rym2-pod.p2{border-color:#d9dfe7;background:linear-gradient(135deg,#f6f8fb,#fff)}.rym2-pod.p3{border-color:#ecc7ad;background:linear-gradient(135deg,#fff2e9,#fff)}.rym2-medal{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#edf4ff;font-size:18px}.rym2-pod.p1 .rym2-medal{background:#fff1b8}.rym2-pod.p3 .rym2-medal{background:#ffe0cc}.rym2-pod-name{min-width:0}.rym2-pod-name b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#0b376f;font-size:12px}.rym2-pod-name small{display:block;margin-top:2px;color:#718198;font-size:8px;font-weight:900}.rym2-pod-metric{text-align:right}.rym2-pod-metric b{display:block;color:#0c3c78;font-size:16px;white-space:nowrap}.rym2-pod-metric small{display:block;margin-top:2px;color:#6f8198;font-size:7.5px;white-space:nowrap}
  .rym2-rank-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:7px}.rym2-rank-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:8px;min-height:53px;padding:7px 9px;border:1px solid #dce5ef;border-radius:11px;background:#fff}.rym2-rank-pos{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:#edf4fd;color:#174f91;font-size:9px;font-weight:1000}.rym2-rank-person{min-width:0}.rym2-rank-person b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#113b72;font-size:10px}.rym2-rank-person small{display:block;margin-top:2px;color:#718198;font-size:7.5px;font-weight:850}.rym2-rank-side{text-align:right}.rym2-rank-side strong{display:block;color:#124580;font-size:11px;white-space:nowrap}.rym2-rank-side small{display:block;margin-top:1px;color:#73839a;font-size:7px;white-space:nowrap}.rym2-rank-sub{grid-column:2/4;display:flex;gap:5px;flex-wrap:wrap;margin-top:-2px}.rym2-mini{padding:3px 5px;border-radius:6px;background:#f3f6fa;color:#6b7d92;font-size:7px;font-weight:850}.rym2-mini b{color:#2b527f}
  .rym2-empty-note{margin-top:8px;padding:9px 10px;border:1px dashed #cedbeb;border-radius:11px;background:#f8fbff;color:#667c96;font-size:8.5px}.rym2-inactive{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.rym2-inactive span{padding:4px 6px;border:1px solid #dce4ed;border-radius:999px;background:#f5f7fa;color:#6e7b8c;font-size:7.5px;font-weight:850}
  .rym2-rec{display:grid;gap:8px}.rym2-rec-head .rym2-mode{display:inline-flex;gap:4px;padding:4px;border:1px solid #cbdcf0;border-radius:11px;background:#fff}.rym2-mode button{min-width:118px;min-height:32px!important;height:32px!important;margin:0!important;padding:5px 10px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:#496684!important;font-size:9px!important;font-weight:1000!important;box-shadow:none!important}.rym2-mode button.active{background:#205daf!important;color:#fff!important;box-shadow:0 4px 10px rgba(31,95,181,.14)!important}.rym2-rec-query{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.55fr);gap:8px}.rym2-search{padding:9px 10px;border:1px solid #d8e4f0;border-radius:12px;background:#fff}.rym2-search label{display:grid;gap:4px;color:#5b718c;font-size:8px;font-weight:1000;text-transform:uppercase}.rym2-search input{width:100%;height:34px;padding:6px 9px;border:1px solid #cddbeb;border-radius:9px;background:#fbfdff;box-sizing:border-box}.rym2-context{display:flex;flex-direction:column;justify-content:center;padding:9px 11px;border:1px solid #d8e4f0;border-radius:12px;background:#f7fbff;color:#6a7d93;font-size:8px;line-height:1.35}.rym2-context b{color:#174b8b;font-size:8.5px}.rym2-rec-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.rym2-rec-summary article{position:relative;padding:9px 10px 9px 42px;border:1px solid #d9e4ef;border-radius:12px;background:#fff}.rym2-rec-summary article:before{position:absolute;left:10px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:25px;height:25px;border-radius:8px;background:#eaf2ff;color:#205daf;font-weight:1000}.rym2-rec-summary article:nth-child(1):before{content:'↻';font-size:13px}.rym2-rec-summary article:nth-child(2):before{content:'!';background:#fff0ef;color:#c9382f}.rym2-rec-summary article:nth-child(3):before{content:'B/.';background:#edf8f1;color:#15824b;font-size:8px}.rym2-rec-summary span{display:block;color:#6c7d92;font-size:7.5px;font-weight:1000;text-transform:uppercase}.rym2-rec-summary b{display:block;margin-top:2px;color:#0d3972;font-size:17px}.rym2-rec-summary .bad b{color:#c9382f}
  .rym2-rec-table{overflow:hidden;border:1px solid #d4e0ed;border-radius:13px;background:#fff;box-shadow:0 5px 16px rgba(18,62,113,.04)}.rym2-rec-table .table-wrap{overflow:auto}.rym2-rec-table table{width:100%;border-collapse:separate;border-spacing:0;min-width:790px}.rym2-rec-table th{position:sticky;top:0;z-index:1;padding:8px 10px;border:0;background:#174a8b;color:#fff;font-size:8px;font-weight:1000;text-transform:uppercase;white-space:nowrap}.rym2-rec-table th:first-child{text-align:left}.rym2-rec-table th:not(:first-child){text-align:center}.rym2-rec-table td{padding:8px 10px;border:0;border-bottom:1px solid #e7eef6;background:#fff;color:#294a70;font-size:9px;vertical-align:middle}.rym2-rec-table tbody tr:nth-child(even) td{background:#fbfdff}.rym2-rec-table tbody tr:hover td{background:#f2f7fd}.rym2-rec-table tbody tr:last-child td{border-bottom:0}.rym2-rec-name b{display:block;color:#0b376f;font-size:10px}.rym2-rec-name small,.rym2-rec-metric small{display:block;margin-top:2px;color:#8391a3;font-size:7.5px}.rym2-rec-metric b{color:#174a8b;font-size:9.5px}.rym2-level{display:inline-flex;align-items:center;justify-content:center;min-width:68px;padding:4px 7px;border-radius:999px;background:#edf3fb;color:#245e9f;font-size:7.5px;font-weight:1000;text-transform:uppercase}.rym2-level.critical{background:#fde8e6;color:#c62f27}.rym2-pager{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border-top:1px solid #e4ecf5;background:#f8fbff;color:#687d96;font-size:8px}.rym2-pager div{display:flex;gap:5px}.rym2-pager button{min-height:29px!important;height:29px!important;padding:4px 9px!important;border:1px solid #cddbea!important;border-radius:8px!important;background:#fff!important;color:#174a8b!important;font-size:8px!important;font-weight:900!important;box-shadow:none!important}.rym2-pager button:disabled{opacity:.4}
  @media(max-width:1250px){.rym2-rank-list{grid-template-columns:repeat(2,minmax(0,1fr))}.rym2-rank-tools{grid-template-columns:repeat(3,minmax(0,1fr))}.rym2-rank-tools button{width:100%}.rym2-rec-tools{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:820px){.rym2-head{align-items:flex-start;flex-direction:column}.rym2-head-meta{justify-content:flex-start}.rym2-podium{grid-template-columns:1fr}.rym2-rank-list{grid-template-columns:1fr}.rym2-kpis{grid-template-columns:1fr 1fr}.rym2-rec-query{grid-template-columns:1fr}.rym2-rec-summary{grid-template-columns:1fr 1fr}.rym2-rec-summary article:nth-child(3){grid-column:1/-1}.rym2-rec-head .rym2-mode{width:100%}.rym2-mode button{flex:1;min-width:0}}
  @media(max-width:560px){.rym2-rank-tools,.rym2-rec-tools,.rym2-kpis,.rym2-rec-summary{grid-template-columns:1fr}.rym2-rec-summary article:nth-child(3){grid-column:auto}.rym2-head{padding:11px 12px}.rym2-head h2{font-size:17px}.rym2-pod{grid-template-columns:auto 1fr}.rym2-pod-metric{grid-column:2;text-align:left}.rym2-rank-row{grid-template-columns:32px 1fr}.rym2-rank-side{grid-column:2;text-align:left}.rym2-rank-sub{grid-column:2}.rym2-pager{align-items:stretch;flex-direction:column}.rym2-pager div{display:grid;grid-template-columns:1fr 1fr}}
  `;
  d.head.appendChild(s);
}

async function lastPayDate(){
  try{
    const x=await rpc('panapass_ultima_fecha_pago');
    const raw=Array.isArray(x)?x[0]:x;
    if(typeof raw==='string'&&/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0,10);
    if(raw&&typeof raw==='object'){
      const v=raw.ultima_fecha||raw.max_pago||raw.fecha;
      if(v) return String(v).slice(0,10);
    }
  }catch(_){}
  return state?.meta?.max_pago||state?.today||new Date().toISOString().slice(0,10);
}
function monthBounds(date){
  const x=new Date(String(date).slice(0,10)+'T12:00:00'),y=x.getFullYear(),m=x.getMonth();
  return {desde:`${y}-${String(m+1).padStart(2,'0')}-01`,hasta:new Date(y,m+1,0).toISOString().slice(0,10),month:`${y}-${String(m+1).padStart(2,'0')}`};
}
function scopeLabel(scope){return scope==='GLOBAL'?'Todas las supervisoras':scope==='TODAS'?'4 galeras':scope}
function rankWhatsapp(rows,scope,desde,hasta){
  const active=rows.filter(x=>x.participa),total=active.reduce((a,x)=>a+Number(x.monto||0),0);
  let t=`🏆 *RANKING DE COBRANZA*\n📅 ${desde} → ${hasta}\n📍 ${scopeLabel(scope)}\n⚖️ Menor promedio pagado por día con pago = mejor posición\n\n`;
  active.forEach(x=>{const p=Number(x.puesto),med=p===1?'🥇':p===2?'🥈':p===3?'🥉':'#'+p;t+=`${med} *${x.entidad}*${scope==='TODAS'?'':' · '+x.galera}\n💵 B/. ${M(x.monto_por_dia)}/día · B/. ${M(x.monto)} total · ${x.registros} pagos · ${x.dias_con_pago} días\n\n`});
  t+=`📊 *TOTAL:* B/. ${M(total)}`;
  return t;
}

async function finalRanking(v){
  if(!v) return;
  addCss();
  const token=String(Date.now())+Math.random();v.dataset.rymFinalToken=token;
  const last=await lastPayDate(),b=monthBounds(last);
  if(v.dataset.rymFinalToken!==token) return;
  v.innerHTML=`<section data-rym-final="ranking">
    <div class="rym2-head"><div class="rym2-head-copy"><span class="rym2-eyebrow">Desempeño de cobranza Panapass</span><h2>Ranking de cobranza</h2><p>Comparación compacta por resultado diario. El total queda visible como referencia, sin castigar por sí solo vacaciones o ausencias.</p></div><div class="rym2-head-meta"><span class="rym2-chip">Ciclo <b id="rym2RankCycle">${E(DATE_LABEL(last))}</b></span><span class="rym2-chip">Regla <b>menor B/. por día = mejor</b></span></div></div>
    <div class="rym2-tools rym2-rank-tools"><label>Vista<select id="rym2RankScope"><option value="GLOBAL">Todas las supervisoras</option><option value="TODAS">4 galeras</option><option value="VCARS">VCARS · supervisoras</option><option value="VCOMP">VCOMP · supervisoras</option><option value="VIPCO">VIPCO · supervisoras</option><option value="VINDU">VINDU · supervisoras</option></select></label><label>Desde<input id="rym2RankFrom" type="date" value="${b.desde}"></label><label>Hasta<input id="rym2RankTo" type="date" value="${last}"></label><button id="rym2RankGo" class="rym2-primary">Actualizar</button><button id="rym2RankCopy" class="rym2-secondary">Copiar WhatsApp</button></div>
    <div id="rym2RankOut"><div class="card">Calculando ranking…</div></div>
  </section>`;
  let rows=[];
  const load=async()=>{
    const out=v.querySelector('#rym2RankOut');if(!out)return;
    const scope=v.querySelector('#rym2RankScope').value,desde=v.querySelector('#rym2RankFrom').value,hasta=v.querySelector('#rym2RankTo').value;
    out.innerHTML='<div class="card">Calculando ranking…</div>';
    try{
      rows=await rpc('panapass_reporte_competencia_cobrador',{p_desde:desde,p_hasta:hasta,p_modo:scope});
      const active=rows.filter(x=>x.participa),inactive=rows.filter(x=>!x.participa),total=active.reduce((a,x)=>a+Number(x.monto||0),0),regs=active.reduce((a,x)=>a+Number(x.registros||0),0),units=active.reduce((a,x)=>a+Number(x.unidades_pagadas||0),0),maxDays=active.length?Math.max(...active.map(x=>Number(x.dias_con_pago||0))):0;
      const medal=p=>p===1?'🥇':p===2?'🥈':'🥉';
      const detail=x=>`${x.registros} pagos · ${x.dias_con_pago} días${scope==='TODAS'?'':' · '+x.unidades_pagadas+' unid.'}`;
      const podium=active.slice(0,3).map(x=>`<article class="rym2-pod p${x.puesto}"><div class="rym2-medal">${medal(Number(x.puesto))}</div><div class="rym2-pod-name"><b>${E(x.entidad)}</b><small>${scope==='TODAS'?'Comparativo de galeras':E(x.galera||'')}</small></div><div class="rym2-pod-metric"><b>B/. ${M(x.monto_por_dia)} / día</b><small>B/. ${M(x.monto)} total · ${detail(x)}</small></div></article>`).join('');
      const rest=active.slice(3).map(x=>`<article class="rym2-rank-row"><span class="rym2-rank-pos">#${x.puesto}</span><div class="rym2-rank-person"><b>${E(x.entidad)}</b><small>${scope==='TODAS'?'GALERA':E(x.galera||'')}</small></div><div class="rym2-rank-side"><strong>B/. ${M(x.monto_por_dia)} / día</strong><small>B/. ${M(x.monto)} total</small></div><div class="rym2-rank-sub"><span class="rym2-mini"><b>${x.registros}</b> pagos</span><span class="rym2-mini"><b>${x.dias_con_pago}</b> días</span>${scope==='TODAS'?'':`<span class="rym2-mini"><b>${x.unidades_pagadas}</b> unidades</span>`}<span class="rym2-mini">B/. <b>${M(x.promedio_por_pago)}</b> / pago</span></div></article>`).join('');
      out.innerHTML=`<div class="rym2-kpis"><article class="rym2-kpi"><span>Participantes</span><b>${active.length}</b><small>${scopeLabel(scope)}</small></article><article class="rym2-kpi good"><span>Total pagado</span><b>B/. ${M(total)}</b><small>${regs} pagos registrados</small></article><article class="rym2-kpi"><span>Unidades pagadas</span><b>${units}</b><small>en el ciclo seleccionado</small></article><article class="rym2-kpi warn"><span>Días con actividad</span><b>${maxDays}</b><small>máximo entre participantes</small></article></div>${podium?`<div class="rym2-podium">${podium}</div>`:''}${rest?`<div class="rym2-rank-list">${rest}</div>`:''}${!active.length?'<div class="rym2-empty-note">No hay participantes con pagos en este período.</div>':''}${inactive.length?`<div class="rym2-empty-note"><b>Sin movimiento · no ocupan posición:</b><div class="rym2-inactive">${inactive.map(x=>`<span>${E(x.entidad)}${scope==='TODAS'?'':' · '+E(x.galera)}</span>`).join('')}</div></div>`:''}`;
    }catch(e){out.innerHTML=`<div class="alert">${E(e.message||e)}</div>`}
  };
  v.querySelector('#rym2RankGo').onclick=load;
  v.querySelector('#rym2RankScope').onchange=load;
  v.querySelector('#rym2RankFrom').onchange=()=>{const x=v.querySelector('#rym2RankFrom').value;if(x)v.querySelector('#rym2RankCycle').textContent=DATE_LABEL(x)};
  v.querySelector('#rym2RankCopy').onclick=async()=>{if(!rows.length)await load();const txt=rankWhatsapp(rows,v.querySelector('#rym2RankScope').value,v.querySelector('#rym2RankFrom').value,v.querySelector('#rym2RankTo').value);try{await navigator.clipboard.writeText(txt);const btn=v.querySelector('#rym2RankCopy'),old=btn.textContent;btn.textContent='Copiado ✓';setTimeout(()=>btn.textContent=old,1000)}catch(_){prompt('Copia el reporte:',txt)}};
  await load();
}

async function finalRecurrentes(v){
  if(!v) return;
  addCss();
  const token=String(Date.now())+Math.random();v.dataset.rymFinalToken=token;
  const last=await lastPayDate(),b=monthBounds(last),visible=Array.isArray(state?.meta?.galeras)?state.meta.galeras.filter(Boolean):[];
  if(v.dataset.rymFinalToken!==token) return;
  const admin=typeof isAdminRole==='function'?isAdminRole():['ADMIN_TOTAL','PAGADOR'].includes(N(state?.profile?.rol));
  const gals=admin?GALS:[...new Set(visible)];
  v.innerHTML=`<section class="rym2-rec" data-rym-final="recurrentes">
    <div class="rym2-head rym2-rec-head"><div class="rym2-head-copy"><span class="rym2-eyebrow">Control de pagos Panapass</span><h2>Pagos recurrentes</h2><p>Detecta operadores o unidades que necesitaron múltiples pagos durante el período seleccionado.</p></div><div class="rym2-mode"><button id="rym2RecOp" class="active">Por operador</button><button id="rym2RecUnit">Por unidad</button></div></div>
    <div class="rym2-tools rym2-rec-tools"><label>Galera<select id="rym2RecGal"><option value="">Todas las visibles</option>${gals.map(g=>`<option value="${E(g)}">${E(g)}</option>`).join('')}</select></label><label>Mes<input id="rym2RecMonth" type="month" value="${b.month}"></label><label>Mínimo de pagos<input id="rym2RecMin" type="number" min="2" max="20" value="5"></label><button id="rym2RecGo" class="rym2-primary">Analizar</button></div>
    <div class="rym2-rec-query"><div class="rym2-search"><label>Filtrar resultados<input id="rym2RecQ" placeholder="Unidad, operador o supervisora"></label></div><div class="rym2-context"><b>Último mes con pagos: ${E(DATE_LABEL(last))}</b><span>El portal abre este ciclo automáticamente para evitar un recurrente vacío al iniciar un mes nuevo.</span></div></div>
    <div id="rym2RecOut"><div class="card">Cargando recurrentes…</div></div>
  </section>`;
  let mode='OPERADOR',all=[],page=1;const size=25,out=v.querySelector('#rym2RecOut'),q=v.querySelector('#rym2RecQ');
  const paint=()=>{
    const term=N(q.value),rows=all.filter(x=>x.tipo_entidad===mode&&(!term||N([x.identificador,x.nombre,x.unidad,x.supervisora,x.galera].join(' ')).includes(term))),pages=Math.max(1,Math.ceil(rows.length/size));
    page=Math.min(page,pages);const slice=rows.slice((page-1)*size,page*size),crit=rows.filter(x=>N(x.nivel)==='CRITICO').length,total=rows.reduce((a,x)=>a+Number(x.total_pagado||0),0);
    const body=slice.map(r=>`<tr><td class="rym2-rec-name"><b>${E(mode==='OPERADOR'?(r.nombre||r.identificador):(r.identificador||r.unidad))}</b>${mode==='OPERADOR'?`<small>ID ${E(r.identificador||'—')}</small>`:''}</td>${mode==='OPERADOR'?`<td style="text-align:center">${E(r.unidad||'—')}</td>`:''}<td style="text-align:center">${E(r.supervisora||'—')}</td><td style="text-align:center">${E(r.galera||'—')}</td><td class="rym2-rec-metric" style="text-align:center"><b>${Number(r.pagos||0)} pagos</b><small>${Number(r.dias_con_pago||0)} días con pago</small></td><td style="text-align:right"><b>B/. ${M(r.total_pagado)}</b></td><td style="text-align:center"><span class="rym2-level ${N(r.nivel)==='CRITICO'?'critical':''}">${E(r.nivel||'RECURRENTE')}</span></td></tr>`).join('');
    out.innerHTML=`<div class="rym2-rec-summary"><article><span>${mode==='OPERADOR'?'Operadores':'Unidades'} recurrentes</span><b>${rows.length}</b></article><article class="bad"><span>Críticos · 8+ pagos</span><b>${crit}</b></article><article><span>Total pagado</span><b>B/. ${M(total)}</b></article></div><div class="rym2-rec-table"><div class="table-wrap"><table><thead><tr><th>${mode==='OPERADOR'?'Operador':'Unidad'}</th>${mode==='OPERADOR'?'<th>Unidad</th>':''}<th>Supervisora</th><th>Galera</th><th>Pagos / días</th><th>Total</th><th>Nivel</th></tr></thead><tbody>${body||`<tr><td colspan="${mode==='OPERADOR'?7:6}" style="text-align:center;padding:18px;color:#738198">Sin resultados para estos filtros.</td></tr>`}</tbody></table></div><div class="rym2-pager"><span>${rows.length?`${(page-1)*size+1}–${Math.min(page*size,rows.length)} de ${rows.length}`:'0 resultados'}</span><div><button id="rym2RecPrev" ${page<=1?'disabled':''}>← Anterior</button><button id="rym2RecNext" ${page>=pages?'disabled':''}>Siguiente →</button></div></div></div>`;
    out.querySelector('#rym2RecPrev').onclick=()=>{page--;paint()};out.querySelector('#rym2RecNext').onclick=()=>{page++;paint()};
  };
  const load=async()=>{
    out.innerHTML='<div class="card">Analizando frecuencia…</div>';
    const [y,m]=v.querySelector('#rym2RecMonth').value.split('-').map(Number),desde=`${y}-${String(m).padStart(2,'0')}-01`,hasta=new Date(y,m,0).toISOString().slice(0,10),gal=v.querySelector('#rym2RecGal').value||null;
    try{
      all=await rpc('panapass_recurrentes_entidad',{p_desde:desde,p_hasta:hasta,p_galera:gal,p_min_pagos:Number(v.querySelector('#rym2RecMin').value||5),p_limit:2000});page=1;paint();
      if(!all.length&&v.querySelector('#rym2RecMonth').value!==b.month){const note=d.createElement('div');note.className='rym2-empty-note';note.innerHTML=`Este mes no tiene recurrentes. El último ciclo con pagos es <b>${E(DATE_LABEL(last))}</b>. <button id="rym2RecLast" class="rym2-secondary" style="margin-left:7px;min-height:28px!important;height:28px!important;padding:3px 8px!important">Ver último ciclo</button>`;out.prepend(note);note.querySelector('#rym2RecLast').onclick=()=>{v.querySelector('#rym2RecMonth').value=b.month;load()}}
    }catch(e){out.innerHTML=`<div class="alert">${E(e.message||e)}</div>`}
  };
  const setMode=m=>{mode=m;page=1;v.querySelector('#rym2RecOp').classList.toggle('active',m==='OPERADOR');v.querySelector('#rym2RecUnit').classList.toggle('active',m==='UNIDAD');paint()};
  v.querySelector('#rym2RecOp').onclick=()=>setMode('OPERADOR');v.querySelector('#rym2RecUnit').onclick=()=>setMode('UNIDAD');v.querySelector('#rym2RecGo').onclick=load;v.querySelector('#rym2RecGal').onchange=load;q.oninput=()=>{page=1;paint()};
  await load();
}

function install(){
  addCss();
  try{ranking=finalRanking}catch(_){}
  try{recurrentes=finalRecurrentes}catch(_){}
  try{w.ranking=finalRanking;w.recurrentes=finalRecurrentes}catch(_){}

  try{
    if(typeof render==='function'&&!w.__RYM_FINAL_RENDER_WRAPPED__){
      const oldRender=render;
      const wrapped=async function(){const v=d.querySelector('#view');if(state?.active==='ranking')return finalRanking(v);if(state?.active==='recurrentes')return finalRecurrentes(v);return oldRender.apply(this,arguments)};
      render=wrapped;w.render=wrapped;w.__RYM_FINAL_RENDER_WRAPPED__=true;
    }
  }catch(_){}

  d.addEventListener('click',e=>{
    const nav=e.target?.closest?.('[data-m]');if(!nav)return;const m=nav.dataset.m;if(m!=='ranking'&&m!=='recurrentes')return;
    e.preventDefault();e.stopImmediatePropagation();
    try{state.active=m;if(typeof shell==='function')shell()}catch(_){}
    const v=d.querySelector('#view');(m==='ranking'?finalRanking:finalRecurrentes)(v);
  },true);

  let timer=0;
  const enforce=()=>{clearTimeout(timer);timer=setTimeout(()=>{let m;try{m=state?.active}catch(_){return}if(m!=='ranking'&&m!=='recurrentes')return;const v=d.querySelector('#view');if(!v)return;const marker=v.querySelector(`[data-rym-final="${m}"]`);if(!marker)(m==='ranking'?finalRanking:finalRecurrentes)(v)},70)};
  const obs=new MutationObserver(enforce);obs.observe(d.documentElement,{childList:true,subtree:true});enforce();
}
install();
})(window,document);
