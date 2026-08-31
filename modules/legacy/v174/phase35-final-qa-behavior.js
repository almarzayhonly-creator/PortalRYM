
/* V35 QA FINAL: ordena toolbar y elimina textos viejos visibles de la consulta de saldo. */
function phase35LabelClass(field){
  const t=norm(field?.querySelector?.('label')?.textContent||'');
  field?.classList?.remove('phase35-date','phase35-galera','phase35-supervisora','phase35-search');
  if(t==='FECHA')field?.classList?.add('phase35-date');
  else if(t==='GALERA')field?.classList?.add('phase35-galera');
  else if(t==='SUPERVISORA')field?.classList?.add('phase35-supervisora');
  else if(t==='BUSCAR')field?.classList?.add('phase35-search');
}
function phase35NormalizeFilterbar(v,prefix){
  const tools=v?.querySelector?.('.phase3-filterbar');
  if(!tools)return;
  tools.classList.add('phase35-ready');
  [...tools.querySelectorAll(':scope > .field')].forEach(phase35LabelClass);
  let actions=tools.querySelector(':scope > .phase35-actions');
  if(!actions){actions=document.createElement('div');actions.className='phase35-actions';tools.appendChild(actions)}
  const ids=[`${prefix}Go`,`${prefix}Capture`,`${prefix}WaCopy`];
  ids.forEach(id=>{const el=tools.querySelector(`#${id}`)||document.querySelector(`#${id}`);if(el&&el.parentElement!==actions)actions.appendChild(el)});
  const st=tools.querySelector(`#${prefix}WaStatus`)||document.querySelector(`#${prefix}WaStatus`);
  if(st){st.classList.add('phase35-wa-status');if(st.parentElement!==tools)tools.appendChild(st)}
}
wa18Attach=function(v,tipo,prefix){
  const tools=v?.querySelector?.('.phase3-filterbar'),gal=v?.querySelector?.(`#${prefix}Galera`);
  if(!tools){return}
  if(wa18Allowed()&&gal&&!v.querySelector(`#${prefix}WaCopy`)){
    const b=document.createElement('button');
    b.type='button';b.id=`${prefix}WaCopy`;b.className='wa-rank-btn';b.textContent='Copiar WhatsApp';b.disabled=!gal.value;
    const st=document.createElement('div');st.id=`${prefix}WaStatus`;st.className='wa-rank-status phase35-wa-status';
    tools.appendChild(b);tools.appendChild(st);
    const old=gal.onchange;
    gal.onchange=async e=>{if(old)await old.call(gal,e);b.disabled=!gal.value;st.textContent=''};
    b.onclick=()=>wa18Run(tipo,prefix);
  }
  phase35NormalizeFilterbar(v,prefix);
};
wa18Run=async function(tipo,prefix){
  const gal=document.querySelector(`#${prefix}Galera`)?.value||'';
  const fecha=document.querySelector(`#${prefix}Fecha`)?.value||'';
  const status=document.querySelector(`#${prefix}WaStatus`);
  const btn=document.querySelector(`#${prefix}WaCopy`);
  if(!gal){if(status)status.textContent='Selecciona una galera.';return}
  if(btn){btn.disabled=true;btn.textContent='Preparando...'}
  if(status)status.textContent='';
  try{
    const rows=await rpc('panapass_whatsapp_ranking',{p_tipo:tipo,p_fecha:fecha||null,p_galera:gal});
    if(!rows?.length)throw Error('No se encontraron supervisoras para la galera seleccionada.');
    if(rows[0].dia_procesado===false)throw Error('La fecha seleccionada todavía no tiene operación procesada.');
    const text=tipo==='NEGATIVOS'?wa18BuildNeg(rows,fecha,gal):wa18BuildPay(rows,fecha,gal);
    const ok=await wa18Copy(text);
    if(!ok)throw Error('El navegador no permitió copiar al portapapeles.');
    if(status)status.textContent='Copiado para WhatsApp ✓';
    if(btn)btn.textContent='Copiado ✓';
  }catch(e){
    if(status)status.textContent=String(e.message||e);
  }finally{
    setTimeout(()=>{
      if(btn){btn.textContent='Copiar WhatsApp';btn.disabled=!document.querySelector(`#${prefix}Galera`)?.value}
      if(status)status.textContent='';
    },1800);
  }
};
const _phase35SaldoEnhance=phase31EnhanceSaldoButtons;
phase31EnhanceSaldoButtons=async function(v){
  await _phase35SaldoEnhance(v);
  const note=v?.querySelector?.('#p3NegOut .capture-title small');
  if(note)note.textContent='Saldo AM del corte seleccionado. Consulta el saldo actual antes de cobrar.';
  v?.querySelectorAll?.('[data-saldo-express-info].muted').forEach(x=>{if(!String(x.textContent||'').trim())x.style.display='none'});
};
/* Reemplaza el observer anterior por uno seguro: se desconecta mientras aplica mejoras para evitar bucles de mutaciones. */
negativos=async function(v){
  await _phase31Negativos(v);
  await phase31EnhanceSaldoButtons(v);
  const out=v?.querySelector?.('#p3NegOut');
  if(!out)return;
  let timer=0;
  const obs=new MutationObserver(()=>{
    clearTimeout(timer);
    timer=setTimeout(async()=>{
      obs.disconnect();
      try{await phase31EnhanceSaldoButtons(v)}finally{obs.observe(out,{childList:true,subtree:true})}
    },70);
  });
  obs.observe(out,{childList:true,subtree:true});
};
