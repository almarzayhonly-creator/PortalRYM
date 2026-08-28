/* Portal RYM V172 clean - Panapass negativos */
async function negativos(v){
  const maxf=state.today||state.meta?.max_snapshot||new Date().toISOString().slice(0,10);
  const minf=state.meta?.min_snapshot||maxf;
  v.innerHTML=`
    <div class="section-tools">
      <div class="field"><label>Fecha</label><input id="negFecha" type="date" max="${esc(maxf)}" value="${esc(maxf)}"></div>
      <div class="field"><label>Buscar</label><input id="negQ" placeholder="Unidad, placa o empresa"></div>
      <button id="negBuscar">Consultar</button>
      <button id="negCompact" class="soft-btn">Vista captura</button>
      <div class="share-note">Optimizado para capturas y WhatsApp.</div>
    </div>
    <div id="negOut"><div class="card">Cargando...</div></div>`;
  let lastRows=[];
  async function draw(){
    const fecha=document.querySelector('#negFecha').value;
    const out=document.querySelector('#negOut');
    out.innerHTML='<div class="card">Consultando...</div>';
    try{
      lastRows=await rpc('panapass_negativos_fecha',{p_fecha:fecha||null});
      const q=document.querySelector('#negQ').value.trim().toLowerCase();
      const rows=q?lastRows.filter(r=>[r.unidad,r.placa,r.empresa,r.panapass_numero].join(' ').toLowerCase().includes(q)):lastRows;
      const total=rows.reduce((a,x)=>a+Number(x.saldo||0),0);
      const mx=rows.reduce((a,x)=>Math.max(a,Number(x.neg7||0)),0);
      const riesgo=mx>=3?'ALERTA':mx===2?'CUIDADO':'OK';
      out.innerHTML=`<div class="capture-title"><h2>Negativos Panapass · ${esc(fecha)}</h2><small>Detalle de unidades en negativo</small></div><div class="kpis">
        <div class="kpi"><span>Unidades</span><strong>${rows.length}</strong></div>
        <div class="kpi"><span>Saldo total</span><strong style="color:var(--red)">${money(total)}</strong></div>
        <div class="kpi"><span>Máx neg 7d</span><strong>${mx}</strong></div>
        <div class="kpi"><span>Riesgo</span><strong>${riesgo}</strong></div>
      </div>${tableHtml(rows,['fecha','status','unidad','placa','panapass_numero','empresa','neg7','saldo'],'pretty neg-table','mobile-cards')}`;
    }catch(x){out.innerHTML=`<div class="alert">${esc(x.message)}</div>`}
  }
  document.querySelector('#negBuscar').onclick=draw;
  document.querySelector('#negQ').oninput=draw;
  document.querySelector('#negCompact').onclick=e=>toggleCapture(e.currentTarget,'#negOut');
  await draw();
}
