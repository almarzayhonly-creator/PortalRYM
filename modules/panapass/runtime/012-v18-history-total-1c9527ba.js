/* ===== V18 HISTORIAL TOTAL POR ALCANCE + PAGINACION ===== */
historial=async function(v){
 const minf=state.meta?.min_pago||'2025-01-01';
 const maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10);
 v.innerHTML=`<div class="v11-tabs"><button id="histAll">Historial</button><button id="histCobra" class="soft-btn">Pendiente a Cobra</button></div>
 <div class="section-tools">
   <div class="field"><label>Unidad</label><input id="hu" placeholder="Unidad"></div>
   <div class="field"><label>Operador / N_OP</label><input id="ho" placeholder="Operador o número"></div>
   <div class="field"><label>Desde</label><input id="hd" type="date" value="${minf}"></div>
   <div class="field"><label>Hasta</label><input id="hh" type="date" value="${maxf}"></div>
   <button id="hb">Buscar</button>
   <button id="hclear" class="soft-btn">Limpiar filtros</button>
 </div>
 <div id="histSummary"></div><div id="histOut"></div>`;

 let mode='ALL',page=1,pageSize=100,lastSummary=null;
 const params=()=>({
   p_modo:mode,
   p_unidad:document.querySelector('#hu').value||null,
   p_operador:document.querySelector('#ho').value||null,
   p_desde:document.querySelector('#hd').value||null,
   p_hasta:document.querySelector('#hh').value||null
 });
 const setTabs=()=>{
   document.querySelector('#histAll').className=mode==='ALL'?'':'soft-btn';
   document.querySelector('#histCobra').className=mode==='COBRA'?'':'soft-btn';
 };
 const summaryHtml=s=>{
   if(mode==='COBRA') return `<div class="kpis pending-kpis-v17">
     <div class="kpi"><span>Pendientes totales</span><strong>${Number(s.registros||0).toLocaleString('es-PA')}</strong></div>
     <div class="kpi"><span>Total pendiente</span><strong style="color:var(--red)">${money(s.total_a_pagar)}</strong></div>
     <div class="kpi"><span>Revisar Cobra</span><strong>${Number(s.revisar||0).toLocaleString('es-PA')}</strong></div>
   </div>`;
   return `<div class="kpis">
     <div class="kpi"><span>Registros totales</span><strong>${Number(s.registros||0).toLocaleString('es-PA')}</strong></div>
     <div class="kpi"><span>Unidades</span><strong>${Number(s.unidades||0).toLocaleString('es-PA')}</strong></div>
     <div class="kpi"><span>Total histórico</span><strong>${money(s.total_a_pagar)}</strong></div>
     <div class="kpi"><span>Pendiente Cobra</span><strong style="color:var(--red)">${money(s.monto_pendiente)}</strong></div>
   </div>`;
 };
 const pagerHtml=s=>{
   const total=Number(s?.registros||0),pages=Math.max(1,Math.ceil(total/pageSize));
   return `<div class="table-summary" style="padding:10px 2px 12px">
     <span class="muted">Mostrando página ${page} de ${pages} · ${Math.min(pageSize,total-(page-1)*pageSize)} de ${total.toLocaleString('es-PA')} registros</span>
     <div style="display:flex;gap:8px"><button id="hprev" class="soft-btn" ${page<=1?'disabled':''}>Anterior</button><button id="hnext" class="soft-btn" ${page>=pages?'disabled':''}>Siguiente</button></div>
   </div>`;
 };
 async function run(resetPage=true){
   if(resetPage)page=1;
   const sbox=document.querySelector('#histSummary'),obox=document.querySelector('#histOut');
   sbox.innerHTML='<div class="card">Calculando totales de tu alcance...</div>';
   obox.innerHTML='<div class="card">Cargando detalle...</div>';
   try{
     const p=params();
     const [sr,rows]=await Promise.all([
       rpc('panapass_historial_resumen_v2',p),
       rpc('panapass_historial_lista_v2',{...p,p_page:page,p_page_size:pageSize})
     ]);
     const s=sr?.[0]||{};lastSummary=s;
     sbox.innerHTML=summaryHtml(s);
     obox.innerHTML=`${pagerHtml(s)}${tableHtml(rows,['fecha','unidad','panapass_numero','a_pagar','boleta','n_op','operador','cobrador','tipo','estado_cobra'],'pretty compact-table','mobile-cards')}`;
     const prev=document.querySelector('#hprev'),next=document.querySelector('#hnext');
     if(prev)prev.onclick=()=>{if(page>1){page--;run(false)}};
     if(next)next.onclick=()=>{const pages=Math.max(1,Math.ceil(Number(lastSummary?.registros||0)/pageSize));if(page<pages){page++;run(false)}};
   }catch(e){sbox.innerHTML='';obox.innerHTML=`<div class="alert">${esc(e.message)}</div>`}
 }
 document.querySelector('#histAll').onclick=()=>{mode='ALL';setTabs();run(true)};
 document.querySelector('#histCobra').onclick=()=>{mode='COBRA';setTabs();run(true)};
 document.querySelector('#hb').onclick=()=>run(true);
 document.querySelector('#hclear').onclick=()=>{document.querySelector('#hu').value='';document.querySelector('#ho').value='';document.querySelector('#hd').value=minf;document.querySelector('#hh').value=maxf;run(true)};
 setTabs();
 await run(true);
};
