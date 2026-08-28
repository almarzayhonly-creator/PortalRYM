/* Portal RYM V171 - Panapass Bajas (parallel module, production-source parity) */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_BAJAS)return;

  const SOURCE='panapass_bajas_listar_v5';
  const text=v=>String(v??'').trim();
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>`B/. ${num(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

  function rpcFn(){
    try{
      const fn=w.rpc||(typeof rpc==='function'?rpc:null);
      if(typeof fn!=='function')throw new Error('Bajas Panapass: RPC no disponible');
      return fn;
    }catch(e){throw e instanceof Error?e:new Error('Bajas Panapass: RPC no disponible')}
  }

  function tags(value){return text(value).split(',').map(x=>x.trim()).filter(Boolean)}

  function canonicalRow(row){
    if(!row||typeof row!=='object')throw new Error('Bajas Panapass: fila invalida');
    const tagList=tags(row.tags_ena);
    const cantidad=Math.max(0,num(row.cantidad_tags||tagList.length));
    const saldo=num(row.saldo);
    return Object.freeze({
      unidad:text(row.unidad),
      galera:text(row.galera),
      empresa:text(row.empresa),
      placa:text(row.placa),
      panapass:text(row.panapass_numero),
      tags:Object.freeze(tagList),
      cantidadTags:cantidad,
      saldo,
      enaConsultadoAt:text(row.ena_consultado_at),
      alertaAdmin:!!row.alerta_admin,
      raw:row
    });
  }

  function status(row){
    const r=canonicalRow(row);
    if(r.alertaAdmin)return 'REVISION_ADMIN';
    if(r.cantidadTags>0)return r.saldo>0?'BAJA_PENDIENTE_DEVOLUCION':'PENDIENTE_BAJA';
    return 'SIN_TAG_ACTIVO';
  }

  async function load(){
    const rows=await rpcFn()(SOURCE);
    return Object.freeze((rows||[]).map(canonicalRow));
  }

  function filters(rows,opts={}){
    const g=norm(opts.galera),e=norm(opts.empresa),q=norm(opts.search),st=norm(opts.status),saldo=norm(opts.saldo);
    return (rows||[]).map(canonicalRow).filter(r=>
      (!g||norm(r.galera)===g)&&
      (!e||norm(r.empresa)===e)&&
      (!q||norm([r.unidad,r.placa,r.panapass,r.tags.join(' '),r.empresa,r.galera].join(' ')).includes(q))&&
      (!st||status(r)===st)&&
      (!saldo||(saldo==='POSITIVO'?r.saldo>0:saldo==='NEGATIVO'?r.saldo<0:r.saldo===0))
    );
  }

  function summary(rows){
    const list=(rows||[]).map(canonicalRow);
    const actionable=list.filter(r=>r.cantidadTags>0);
    return Object.freeze({
      unidades:list.length,
      pendientes:actionable.length,
      tags:actionable.reduce((a,r)=>a+r.cantidadTags,0),
      saldo:actionable.reduce((a,r)=>a+r.saldo,0),
      revisionAdmin:list.filter(r=>r.alertaAdmin).length,
      devolucion:actionable.filter(r=>r.saldo>0).length
    });
  }

  function enaContext(row,extra={}){
    const r=canonicalRow(row);
    if(!r.unidad)throw new Error('ENA: unidad faltante');
    if(!r.placa)throw new Error('ENA: placa faltante');
    if(!r.panapass)throw new Error('ENA: Panapass faltante');
    return Object.freeze({
      unidad:r.unidad,
      placa:r.placa,
      empresa:r.empresa,
      cuentaOrigen:r.panapass,
      saldo:r.saldo,
      motivo:`Transferencia de saldo por baja de Panapass - placa ${r.placa}`,
      telefono:'',
      firmante:null,
      ...extra
    });
  }

  function rowHtml(r){
    const st=status(r),label=st==='REVISION_ADMIN'?'Revisión ADMIN_TOTAL':st==='BAJA_PENDIENTE_DEVOLUCION'?'Baja / devolución':st==='PENDIENTE_BAJA'?'Pendiente por baja':'Sin TAG activo';
    return `<tr><td data-label="Unidad"><b>${esc(r.unidad)}</b></td><td data-label="Galera">${esc(r.galera||'—')}</td><td data-label="Empresa">${esc(r.empresa||'—')}</td><td data-label="Placa">${esc(r.placa||'—')}</td><td data-label="Panapass">${esc(r.panapass||'—')}</td><td data-label="TAG ENA">${esc(r.tags.join(', ')||'—')}</td><td data-label="Saldo">${money(r.saldo)}</td><td data-label="Estado"><span class="v171-bajas-status ${st.toLowerCase()}">${esc(label)}</span></td><td data-label="Acción">${r.cantidadTags?`<button type="button" data-baja-ena="${esc(r.unidad)}">Formulario ENA</button>`:'—'}</td></tr>`;
  }

  function renderRows(host,rows,state){
    const visible=filters(rows,state),sum=summary(visible);
    host.innerHTML=`<div class="v171-bajas-kpis"><article><span>Unidades visibles</span><b>${sum.unidades}</b></article><article><span>Pendientes por baja</span><b>${sum.pendientes}</b></article><article><span>TAG activos</span><b>${sum.tags}</b></article><article><span>Saldo ENA</span><b>${money(sum.saldo)}</b></article><article class="warn"><span>Revisión ADMIN_TOTAL</span><b>${sum.revisionAdmin}</b></article></div><section class="v171-bajas-table"><div class="table-wrap"><table><thead><tr><th>Unidad</th><th>Galera</th><th>Empresa</th><th>Placa</th><th>Panapass</th><th>TAG ENA</th><th>Saldo ENA</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${visible.map(rowHtml).join('')||'<tr><td colspan="9" class="empty">Sin resultados.</td></tr>'}</tbody></table></div></section>`;
    host.querySelectorAll('[data-baja-ena]').forEach(b=>b.onclick=()=>{
      const row=visible.find(x=>x.unidad===b.dataset.bajaEna);
      if(!row)return;
      host.dispatchEvent(new CustomEvent('rym:bajas:ena',{bubbles:true,detail:{row,context:enaContext(row)}}));
    });
    return {visible,summary:sum};
  }

  async function open(ctx={}){
    const root=typeof ctx.target==='string'?document.querySelector(ctx.target):ctx.target||document.querySelector('#view');
    if(!root)throw new Error('Bajas Panapass: contenedor no encontrado');
    root.innerHTML='<div class="card">Cargando bajas Panapass...</div>';
    const rows=ctx.rows?Object.freeze(ctx.rows.map(canonicalRow)):await load();
    const gals=[...new Set(rows.map(r=>r.galera).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    const emps=[...new Set(rows.map(r=>r.empresa).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    root.innerHTML=`<section class="v171-bajas"><header><div><h2>Bajas Panapass</h2><p>CERRADA + ENA validado + TAG activo = gestión de baja.</p></div><span>${esc(SOURCE)}</span></header><div class="v171-bajas-tools"><label>Galera<select data-baja-galera><option value="">Todas</option>${gals.map(g=>`<option>${esc(g)}</option>`).join('')}</select></label><label>Empresa<select data-baja-empresa><option value="">Todas</option>${emps.map(e=>`<option>${esc(e)}</option>`).join('')}</select></label><label>Estado<select data-baja-status><option value="">Todos</option><option value="PENDIENTE_BAJA">Pendiente por baja</option><option value="BAJA_PENDIENTE_DEVOLUCION">Baja / devolución</option><option value="REVISION_ADMIN">Revisión ADMIN_TOTAL</option><option value="SIN_TAG_ACTIVO">Sin TAG activo</option></select></label><label>Saldo<select data-baja-saldo><option value="">Todos</option><option value="POSITIVO">Positivo</option><option value="NEGATIVO">Negativo</option><option value="CERO">Cero</option></select></label><label>Buscar<input data-baja-search placeholder="Unidad, placa, Panapass o TAG"></label></div><div data-baja-out></div></section>`;
    const out=root.querySelector('[data-baja-out]'),state={galera:'',empresa:'',status:'',saldo:'',search:''};
    const paint=()=>renderRows(out,rows,state);
    root.querySelector('[data-baja-galera]').onchange=e=>{state.galera=e.target.value;paint()};
    root.querySelector('[data-baja-empresa]').onchange=e=>{state.empresa=e.target.value;paint()};
    root.querySelector('[data-baja-status]').onchange=e=>{state.status=e.target.value;paint()};
    root.querySelector('[data-baja-saldo]').onchange=e=>{state.saldo=e.target.value;paint()};
    root.querySelector('[data-baja-search]').oninput=e=>{state.search=e.target.value;paint()};
    paint();
    return {root,rows,state,paint};
  }

  const api=Object.freeze({SOURCE,tags,canonicalRow,status,load,filters,summary,enaContext,renderRows,open});
  w.RYM_PANAPASS_BAJAS=api;
  if(w.RYM_MODULES&&!w.RYM_MODULES.has('panapass-bajas'))w.RYM_MODULES.register('panapass-bajas',{open});
})(window);
