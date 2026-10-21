async function historial(v){
  const minf=state.meta?.min_pago||'2025-01-02', maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10);
  const admin=isAdminRole();
  v.innerHTML=`<div class="card"><div class="toolbar"><div class="field"><label>Unidad</label><input id="hu"></div><div class="field"><label>Operador / N_OP</label><input id="ho"></div><div class="field"><label>Desde</label><input id="hd" type="date" value="${minf}"></div><div class="field"><label>Hasta</label><input id="hh" type="date" value="${maxf}"></div><button id="hb">Buscar</button>${admin?'<button id="cobraToday" class="soft-btn">Validar Cobra hoy</button>':''}</div>${admin?`<div class="source-card" style="margin-top:12px"><span class="entity-chip">COBRA</span><div class="source-text"><strong>Validación diaria</strong><p>PRE DIARIO y PRE NO DIARIO se revisan únicamente cuando presionas Validar. El resultado queda guardado para que el historial cargue rápido.</p></div></div><div id="cobraHistMsg"></div>`:''}<div id="histOut" class="muted">Cargando historial...</div></div>`;
  async function runHist(){
    const b={p_unidad:document.querySelector('#hu').value||null,p_operador:document.querySelector('#ho').value||null,p_desde:document.querySelector('#hd').value||null,p_hasta:document.querySelector('#hh').value||null,p_limit:500};
    document.querySelector('#histOut').innerHTML='<div class="card">Consultando...</div>';
    try{
      const [rows,sum]=await Promise.all([rpc('panapass_historial',b),rpc('panapass_historial_resumen',{p_unidad:b.p_unidad,p_operador:b.p_operador,p_desde:b.p_desde,p_hasta:b.p_hasta})]);
      const s=sum[0]||{};
      document.querySelector('#histOut').innerHTML=`<div class="kpis"><div class="kpi"><span>Registros</span><strong>${s.registros||0}</strong></div><div class="kpi"><span>Unidades</span><strong>${s.unidades||0}</strong></div><div class="kpi"><span>Total A pagar</span><strong>${money(s.total_a_pagar)}</strong></div><div class="kpi"><span>Pendiente Cobra</span><strong style="color:var(--red)">${money(s.total_pendiente)}</strong></div></div>${tableHtml(rows,['fecha','unidad','panapass_numero','a_pagar','boleta','n_op','operador','cobrador','tipo','estado_cobra'])}`;
    }catch(x){document.querySelector('#histOut').innerHTML=`<div class="alert">${esc(x.message)}</div>`}
  }
  document.querySelector('#hb').onclick=runHist;
  if(admin){
    document.querySelector('#cobraToday').onclick=async()=>{
      const msg=document.querySelector('#cobraHistMsg');c