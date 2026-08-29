/* FASE 5: búsqueda server-side Control de Auto + ENA visible en Negativos */
function phase5Today(){
  const t=state?.today;
  if(typeof t==='string' && /^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if(t && typeof t==='object' && /^\d{4}-\d{2}-\d{2}$/.test(String(t.fecha||''))) return String(t.fecha);
  return new Date().toISOString().slice(0,10);
}

(window.__RYM_CONTROL_PENDING_AROUND__ ||= []).push(["unidades", async function(next,ctx){

state.active = 'dashboard';
shell();
const v = document.querySelector('#view');
v.innerHTML = `<div class="source-card"><span class="entity-chip">UNIDADES</span><div class="source-text"><strong>Control de Auto</strong><p>Detalle operativo de las unidades bajo tu alcance.</p></div></div><div class="section-tools"><div class="field"><label>Buscar</label><input id="p5UnitQ" placeholder="Unidad, placa, Panapass, empresa, color o modelo" autocomplete="off"></div><button id="p5UnitGo">Buscar</button></div><div class="phase5-search-note">La búsqueda consulta directamente la base de Control de Auto.</div><div id="p5UnitOut"><div class="card">Cargando unidades...</div></div>`;
const out = document.querySelector('#p5UnitOut'), q = document.querySelector('#p5UnitQ');
let seq = 0, timer = null;
const draw = rows => {
  out.innerHTML = `<div class="panel"><div class="table-wrap"><table class="pretty"><thead><tr><th>Estatus</th><th>Unidad</th><th>Placa</th><th>Panapass</th><th>Empresa</th><th>Supervisora</th><th>Galera</th><th>Color</th><th>Marca</th><th>Modelo</th><th>Año</th></tr></thead><tbody>${rows.length ? rows.map(r => `<tr><td>${v12Status(r.estatus)}</td><td>${v17UnitBadge(r.unidad, r.color)}</td><td>${esc(r.placa || '')}</td><td>${esc(r.panapass_numero || '')}</td><td style="text-align:center">${esc(r.empresa || '')}</td><td>${esc(r.supervisora || '')}</td><td>${esc(r.galera || '')}</td><td>${esc(r.color || '')}</td><td>${esc(r.marca || '')}</td><td>${esc(r.modelo || '')}</td><td>${esc(r.anio || '')}</td></tr>`).join('') : `<tr><td colspan="11" class="empty">Sin coincidencias.</td></tr>`}</tbody></table></div></div>`;
};
const run = async () => {
  const my = ++seq, term = String(q.value || '').trim();
  out.innerHTML = '<div class="card">Consultando Control de Auto...</div>';
  try {
    const rows = await rpc('panapass_unidades_detalle', {
      p_buscar: term || null,
      p_limit: term ? 200 : 5000
    });
    if (my !== seq) return;
    draw(rows || []);
  } catch (e) {
    if (my === seq) out.innerHTML = `<div class="alert">${esc(e.message || e)}</div>`;
  }
};
document.querySelector('#p5UnitGo').onclick = run;
q.onkeydown = e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    run();
  }
};
q.oninput = () => {
  clearTimeout(timer);
  timer = setTimeout(run, 250);
};
await run();
}]);

(window.__RYM_PANAPASS_PENDING_AROUND__ ||= []).push(["negativos_hoy", async function(next,ctx){
const v=ctx.view;
const dashGal = String(state.dashboardGalera || '');
const [scope, units] = await Promise.all([phase3ScopeData(), rpc('panapass_unidades_detalle', {
  p_buscar: null,
  p_limit: 5000
}).catch(() => [])]);
const um = new Map((units || []).map(x => [norm(x.unidad), x]));
const maxf = phase5Today(), minf = state.meta?.min_snapshot || '2025-01-01';
v.innerHTML = `<div class="section-tools phase3-filterbar"><div class="field"><label>Fecha</label><input id="p3NegFecha" type="date" min="${minf}" max="${maxf}" value="${maxf}"></div>${phase3ScopeMarkup('p3Neg', scope)}<div class="field"><label>Buscar</label><input id="p3NegQ" placeholder="Unidad, Panapass, empresa o supervisora"></div><button id="p3NegGo">Consultar</button><button id="p3NegCapture" class="soft-btn">Vista captura</button></div><div id="p3NegOut"></div>`;
let last = [];
const paint = () => {
  const q = norm(document.querySelector('#p3NegQ')?.value || '');
  const rows = q ? last.filter(r => norm([r.unidad, r.placa, r.panapass_numero, r.empresa, r.galera, r.supervisora].join(' ')).includes(q)) : last;
  const total = rows.reduce((a, x) => a + Number(x.saldo || 0), 0), mx = Math.max(0, ...rows.map(x => Number(x.neg7) || 0));
  const body = rows.length ? rows.map(r => {
    const m = um.get(norm(r.unidad)) || ({}), pan = String(r.panapass_numero || '').trim();
    const ena = pan ? `<button class="soft-btn ena-saldo-btn" data-ena-saldo="${esc(pan)}">Consultar saldo</button>` : '<span class="muted">Sin Panapass</span>';
    return `<tr><td data-label="Estatus">${v12Status(r.status || m.estatus)}</td><td data-label="Unidad">${v17UnitBadge(r.unidad, m.color)}</td><td data-label="Placa">${esc(r.placa || '')}</td><td data-label="Panapass">${esc(pan)}</td><td data-label="Galera">${esc(r.galera || '')}</td><td data-label="Supervisora"><b>${esc(r.supervisora || 'SIN SUPERVISORA')}</b></td><td data-label="Empresa">${esc(r.empresa || '')}</td><td data-label="Neg. 7d">${chipNum(r.neg7)}</td><td data-label="Saldo" class="saldo">${money(r.saldo)}</td><td data-label="Saldo ENA" class="phase5-ena-cell">${ena}</td></tr>`;
  }).join('') : `<tr><td colspan="10" class="empty">Sin datos.</td></tr>`;
  document.querySelector('#p3NegOut').innerHTML = `<div class="capture-title"><h2>Negativos Panapass · ${esc(document.querySelector('#p3NegFecha').value)}</h2><small>Saldo inicial del negativo. “Consultar saldo” verifica ENA en ese momento antes de cobrar.</small></div><div class="kpis"><div class="kpi"><span>Unidades</span><strong>${rows.length}</strong></div><div class="kpi"><span>Saldo total</span><strong style="color:var(--red)">${money(total)}</strong></div><div class="kpi"><span>Máx neg 7d</span><strong>${mx}</strong></div><div class="kpi"><span>Riesgo</span><strong>${mx >= 3 ? 'ALERTA' : mx === 2 ? 'CUIDADO' : 'OK'}</strong></div></div><div class="panel phase3-panel mobile-cards"><div class="table-wrap"><table class="pretty phase3-fit-table phase3-neg-table"><thead><tr><th>Estatus</th><th>Unidad</th><th>Placa</th><th>Panapass</th><th>Galera</th><th>Supervisora</th><th>Empresa</th><th>Neg. 7d</th><th>Saldo</th><th>Saldo ENA</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
  document.querySelectorAll('[data-ena-saldo]').forEach(b => b.onclick = () => phase4ConsultarSaldoENA(b.dataset.enaSaldo, b));
};
const load = async () => {
  const o = document.querySelector('#p3NegOut');
  o.innerHTML = '<div class="card">Consultando...</div>';
  try {
    last = await rpc('panapass_negativos_fecha_v2', {
      p_fecha: document.querySelector('#p3NegFecha').value || null,
      ...phase3ScopeBody('p3Neg')
    });
    paint();
  } catch (e) {
    o.innerHTML = `<div class="alert">${esc(e.message || e)}</div>`;
  }
};
phase3BindScope('p3Neg', scope, load);
if (dashGal) {
  const sel = document.querySelector('#p3NegGalera');
  if (sel && [...sel.options].some(o => o.value === dashGal)) {
    sel.value = dashGal;
    state.dashboardGalera = '';
    const sup = document.querySelector('#p3NegSupervisora');
    if (sup) {
      const ev = new Event('change');
      sel.dispatchEvent(ev);
    }
  }
}
document.querySelector('#p3NegGo').onclick = load;
document.querySelector('#p3NegFecha').onchange = load;
document.querySelector('#p3NegQ').oninput = paint;
document.querySelector('#p3NegCapture').onclick = e => toggleCapture(e.currentTarget, '#p3NegOut');
await load();
}]);
