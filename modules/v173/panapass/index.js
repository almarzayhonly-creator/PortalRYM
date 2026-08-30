(() => {
  'use strict';
  if (!window.RYM173) throw new Error('V173 bootstrap missing');

  const tabs = Object.freeze([
    ['ranking','Ranking'],
    ['recurrentes','Recurrentes'],
    ['bajas','Bajas']
  ]);

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));}
  function getFeature(name){return window.RYM173.registry.get(`panapass-${name}`);}
  function currentMonth(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}

  async function openTab(name, root, context={}) {
    const feature=getFeature(name);
    if(!feature) throw new Error(`Panapass V173: modulo ${name} no registrado`);
    root.querySelectorAll('[data-panapass-tab]').forEach(b=>b.classList.toggle('active',b.dataset.panapassTab===name));
    const view=root.querySelector('[data-panapass-view]');
    view.innerHTML='<div class="v173-loading">Cargando…</div>';
    try {
      if(name==='ranking'){
        const rows=await feature.load(context.rankingPeriod||'DIA');
        const m=feature.model(rows,{metric:context.rankingMetric||'unidades',galera:context.galera||'TODAS'});
        view.innerHTML=`<section class="v173-panel"><header><h2>Ranking Panapass</h2><p>Menor resultado = mejor posicion.</p></header><div class="v173-ranking-list">${m.rows.map(r=>`<article><strong>#${r.posicion}</strong><span><b>${esc(r.supervisora)}</b><small>${esc(r.galera)}</small></span><span>${r.unidades} unid.<small>B/. ${Number(r.monto).toFixed(2)}</small></span></article>`).join('')||'<p>Sin datos.</p>'}</div></section>`;
      } else if(name==='recurrentes'){
        const opts={month:currentMonth(),...(context.recurrentes||{})};
        const rows=await feature.load(opts), m=feature.model(rows,{mode:'OPERADOR',...(context.recurrentesModel||{})});
        view.innerHTML=`<section class="v173-panel"><header><h2>Recurrentes</h2><p>Frecuencia de pagos por operador.</p></header><div class="v173-kpis"><article><span>Recurrentes</span><b>${m.count}</b></article><article><span>Criticos</span><b>${m.critical}</b></article><article><span>Total pagado</span><b>B/. ${m.total.toFixed(2)}</b></article></div><div class="v173-table-wrap"><table><thead><tr><th>Operador</th><th>Unidad</th><th>Supervisora</th><th>Pagos</th><th>Total</th></tr></thead><tbody>${m.rows.map(r=>`<tr><td>${esc(r.nombre||r.identificador)}</td><td>${esc(r.unidad)}</td><td>${esc(r.supervisora)}<small>${esc(r.galera)}</small></td><td>${r.pagos}</td><td>B/. ${r.total.toFixed(2)}</td></tr>`).join('')||'<tr><td colspan="5">Sin datos.</td></tr>'}</tbody></table></div></section>`;
      } else {
        const rows=await feature.load(), sum=feature.summary(rows);
        view.innerHTML=`<section class="v173-panel"><header><h2>Bajas Panapass</h2><p>Gestion ENA y devoluciones.</p></header><div class="v173-kpis"><article><span>Unidades</span><b>${sum.unidades}</b></article><article><span>Pendientes</span><b>${sum.pendientes}</b></article><article><span>Revision ADMIN</span><b>${sum.revisionAdmin}</b></article><article><span>Devolucion</span><b>${sum.devolucion}</b></article></div><div class="v173-table-wrap"><table><thead><tr><th>Unidad</th><th>Galera</th><th>Empresa</th><th>Placa</th><th>Panapass</th><th>Estado</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.unidad)}</b></td><td>${esc(r.galera)}</td><td>${esc(r.empresa)}</td><td>${esc(r.placa)}</td><td>${esc(r.panapass)}</td><td>${esc(feature.status(r))}</td></tr>`).join('')||'<tr><td colspan="6">Sin datos.</td></tr>'}</tbody></table></div></section>`;
      }
    } catch(e) {
      view.innerHTML=`<div class="v173-error"><b>No se pudo cargar ${esc(name)}.</b><span>${esc(e.message||e)}</span></div>`;
    }
  }

  async function mount(context={}) {
    document.body.dataset.rymModule='panapass';
    const root=document.getElementById('rym-app');
    if(!root) throw new Error('Panapass V173: mount root missing');
    root.innerHTML=`<section class="v173-panapass"><header class="v173-panapass-head"><button type="button" data-panapass-back>← Portal</button><div><span>RYM · Panapass</span><h1>Control Panapass</h1></div></header><nav class="v173-panapass-tabs" aria-label="Panapass">${tabs.map(([id,label])=>`<button type="button" data-panapass-tab="${id}">${label}</button>`).join('')}</nav><main data-panapass-view></main></section>`;
    root.querySelector('[data-panapass-back]').onclick=()=>window.RYM173.registry.get('router')?.go('portal');
    root.querySelectorAll('[data-panapass-tab]').forEach(b=>b.onclick=()=>openTab(b.dataset.panapassTab,root,context));
    await openTab(context.tab||'ranking',root,context);
  }

  async function unmount(){if(document.body.dataset.rymModule==='panapass')delete document.body.dataset.rymModule;}
  window.RYM173.register('panapass',{mount,unmount,openTab});
})();
