
/* V30 FIX: ADMIN_TOTAL puede cambiar estatus de unidad y sincroniza Supabase + Control de Auto. */
(function(){
  function ca30Admin(){return String(typeof role==='function'?role():'').toUpperCase()==='ADMIN_TOTAL'}
  async function ca30SetStatus(unidad,estatus,msgEl){
    if(!ca30Admin())throw Error('Acceso exclusivo ADMIN_TOTAL.');
    if(!unidad)throw Error('Unidad requerida.');
    if(msgEl)msgEl.innerHTML='<div class="card">Actualizando Supabase y Control de Auto...</div>';
    const {data}=await req('/functions/v1/admin-unidad-status',{method:'POST',body:JSON.stringify({unidad,estatus})});
    if(!data?.ok)throw Error(data?.error||'No se pudo actualizar el estatus.');
    if(msgEl)msgEl.innerHTML=`<div class="ca22-good">✅ ${esc(data.unidad)} cambió de ${esc(data.estatus_anterior||'—')} a ${esc(data.estatus)}. Supabase y Control de Auto verificados.</div>`;
    return data;
  }
  function ca30ControlHtml(r){
    if(!ca30Admin())return '';
    const noTag=String(r?.ena_estado_acceso||'').toUpperCase()==='OK' && Number(r?.cantidad_tags||0)===0 && !!r?.panapass_numero;
    return `${noTag?`<div class="ca30-no-tag"><b>⚠️ ENA validó la cuenta pero no reportó ningún TAG.</b>Esto normalmente indica que el Panapass ya no tiene TAG activo. Revisa y, si corresponde, cambia la unidad a <b>Cerrado</b>.</div>`:''}<div class="ca30-status-box"><div class="ca30-status-row"><div class="field"><label>Estatus Control de Auto</label><select data-ca30-status><option value="Activo" ${String(r?.estatus||'').toLowerCase()==='activo'?'selected':''}>Activo</option><option value="Cerrado" ${String(r?.estatus||'').toLowerCase()==='cerrado'?'selected':''}>Cerrado</option><option value="Canibalizado" ${String(r?.estatus||'').toLowerCase()==='canibalizado'?'selected':''}>Canibalizado</option></select></div><button data-ca30-save>Guardar estatus</button>${noTag?'<button class="soft-btn" data-ca30-closeunit>Marcar Cerrado</button>':''}</div><div class="ca30-status-msg" data-ca30-msg></div></div>`;
  }
  function ca30Bind(host,r){
    if(!host||!ca30Admin())return;
    const anchor=host.querySelector('.ca6-ena-card')||host.querySelector('.ca6-detail-grid');
    if(!anchor||host.querySelector('[data-ca30-status]'))return;
    const w=document.createElement('div');w.innerHTML=ca30ControlHtml(r);anchor.insertAdjacentElement('afterend',w);
    const sel=w.querySelector('[data-ca30-status]'),save=w.querySelector('[data-ca30-save]'),close=w.querySelector('[data-ca30-closeunit]'),msg=w.querySelector('[data-ca30-msg]');
    const run=async st=>{if(!confirm(`Cambiar ${r.unidad} a ${st} en Supabase y Control de Auto?`))return;save.disabled=true;if(close)close.disabled=true;try{await ca30SetStatus(r.unidad,st,msg);r.estatus=st;setTimeout(()=>{const m=document.querySelector('#ca6UnitModal');if(m)m.style.display='none';if(typeof v11UnitList==='function')v11UnitList()},900)}catch(e){msg.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`;save.disabled=false;if(close)close.disabled=false}};
    if(save)save.onclick=()=>run(sel.value);if(close)close.onclick=()=>run('Cerrado');
  }
  const prevOpen=window.phase6OpenUnit;
  if(typeof prevOpen==='function')window.phase6OpenUnit=function(r){prevOpen(r);setTimeout(()=>ca30Bind(document.querySelector('#ca6UnitModal'),r),0)};

  const prevRender=window.phase10RenderSaldo;
  if(typeof prevRender==='function')window.phase10RenderSaldo=function(body,ctx,r){
    prevRender(body,ctx,r);
    const tags=Array.isArray(r?.tags)?r.tags.filter(t=>String(t?.tag||'').trim()):[];
    if(!ca30Admin()||tags.length||!ctx?.unidad)return;
    const box=document.createElement('div');box.className='ca30-no-tag';box.innerHTML=`<b>⚠️ Sin TAG activo reportado por ENA.</b>Si esta unidad ya no tiene Panapass activo, puedes cambiar su estatus en Control de Auto a Cerrado.<div style="margin-top:9px"><button class="soft-btn" data-ca30-saldo-close>Marcar ${esc(ctx.unidad)} Cerrado</button></div><div data-ca30-saldo-msg></div>`;body.appendChild(box);
    box.querySelector('[data-ca30-saldo-close]').onclick=async e=>{const b=e.currentTarget;if(!confirm(`Cambiar ${ctx.unidad} a Cerrado en Supabase y Control de Auto?`))return;b.disabled=true;try{await ca30SetStatus(ctx.unidad,'Cerrado',box.querySelector('[data-ca30-saldo-msg]'))}catch(x){box.querySelector('[data-ca30-saldo-msg]').innerHTML=`<div class="alert">${esc(x.message||x)}</div>`;b.disabled=false}};
  };
})();
