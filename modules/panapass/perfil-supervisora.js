/* Portal RYM V172 clean - Panapass openSupervisoraProfile */
async function openSupervisoraProfile(id){
  let modal=document.querySelector('#supProfileModal');
  if(!modal){modal=document.createElement('div');modal.id='supProfileModal';modal.className='modal';document.body.appendChild(modal)}
  modal.style.display='flex';modal.innerHTML='<div class="modal-card" style="max-width:1180px;width:94vw"><div class="table-summary"><h2>Perfil operativo</h2><button class="soft-btn" id="supClose">Cerrar</button></div><div class="card">Cargando información...</div></div>';
  document.querySelector('#supClose').onclick=()=>modal.style.display='none';
  try{
    const d=await rpc('panapass_supervisora_perfil',{p_supervisora_id:id}),s=d.supervisora||{},k=d.kpis||{},rows=d.unidades||[];
    const um=new Map(rows.map(x=>[norm(x.unidad),x]));
    modal.innerHTML=`<div class="modal-card" style="max-width:1180px;width:94vw;max-height:92vh;overflow:auto">
      <div class="table-summary"><div><h2 style="margin:0">${esc(s.nombre||'Supervisora')}</h2><span class="muted">${esc(s.galera||'')} · ${esc(s.email||'')}</span></div><button class="soft-btn" id="supClose">Cerrar</button></div>
      <div class="kpis">
        <div class="kpi"><span>Unidades</span><strong>${k.unidades||0}</strong></div>
        <div class="kpi"><span>Negativas ahora</span><strong>${k.negativas_ahora||0}</strong></div>
        <div class="kpi"><span>Pagadas mes</span><strong>${k.unidades_pagadas_mes||0}</strong></div>
        <div class="kpi"><span>Monto mes</span><strong>${money(k.monto_mes||0)}</strong></div>
      </div>
      ${v12Rows(rows,um,['status','unidad','placa','panapass_numero','empresa','saldo'])}
      <div class="panel mobile-cards" style="margin-top:12px"><div class="rank-table-title"><h3>Comportamiento mensual</h3><span>Recurrencia por unidad</span></div>${tableHtml(rows,['unidad','neg7','pagos_mes','dias_mes','total_mes'],'pretty compact-table','mobile-cards')}</div>
      ${(d.rotaciones||[]).length?`<div class="card"><h3>Rotaciones</h3>${tableHtml(d.rotaciones,['galera_anterior','galera_nueva','cambio_en'],'pretty compact-table','mobile-cards')}</div>`:''}
    </div>`;
    document.querySelector('#supClose').onclick=()=>modal.style.display='none';
  }catch(x){modal.innerHTML=`<div class="modal-card"><div class="alert">${esc(x.message)}</div><button id="supClose">Cerrar</button></div>`;document.querySelector('#supClose').onclick=()=>modal.style.display='none'}
}
