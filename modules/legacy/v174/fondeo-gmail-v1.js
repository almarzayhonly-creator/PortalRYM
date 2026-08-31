
(function(){
  const FN='/functions/v1/panapass-fondeo-email';
  function fmoney(n){return 'USD '+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
  async function fcall(body){const {data}=await req(FN,{method:'POST',body:JSON.stringify(body)});if(!data?.ok){const e=new Error(data?.error||'No se pudo completar la operación.');e.payload=data;throw e}return data}
  function removeFondeoModal(){document.querySelector('#fondeoModalV1')?.remove()}
  async function openFondeoProfessional(desde,hasta){
    removeFondeoModal();
    const host=document.createElement('div');host.id='fondeoModalV1';host.className='fondeo-modal-backdrop';host.innerHTML=`<section class="fondeo-modal"><header class="fondeo-head"><div><h2>Fondeo Administración</h2><p>${esc(desde)} → ${esc(hasta)}</p></div><button class="fondeo-close" id="fondeoCloseV1">×</button></header><div class="fondeo-body" id="fondeoBodyV1"><div class="card">Preparando vista previa del correo...</div></div></section>`;document.body.appendChild(host);host.querySelector('#fondeoCloseV1').onclick=removeFondeoModal;host.addEventListener('click',e=>{if(e.target===host)removeFondeoModal()});
    const body=host.querySelector('#fondeoBodyV1');
    try{
      const [p,h]=await Promise.all([fcall({action:'preview',desde,hasta}),fcall({action:'history'}).catch(()=>({items:[]}))]);
      body.innerHTML=`<div class="fondeo-meta"><div class="fm"><span>Total fondeo</span><b>${fmoney(p.total)}</b></div><div class="fm"><span>Empresas</span><b>${Number(p.empresas||0)}</b></div><div class="fm"><span>Desde</span><b>${esc(p.from)}</b></div><div class="fm"><span>Para</span><b>${esc(p.to)}</b></div></div>${p.duplicate?'<div class="fondeo-alert warn">Este mismo rango ya aparece enviado en Gmail. El sistema bloqueará un envío normal para evitar duplicados.</div>':'<div class="fondeo-alert ok">Rango listo. No se detectó un envío previo con este mismo asunto.</div>'}<div class="fondeo-preview">${p.html}</div><div class="fondeo-actions"><button class="soft-btn" id="fondeoCopyV1">Copiar resumen</button><button class="primary" id="fondeoSendV1">Enviar solicitud de fondeo</button>${p.duplicate?'<button class="danger" id="fondeoResendV1">Reenviar de todos modos</button>':''}</div><div id="fondeoMsgV1"></div><div class="fondeo-history"><h4>Últimos fondeos enviados</h4>${(h.items||[]).length?(h.items||[]).slice(0,8).map(x=>`<div class="fondeo-history-item"><b>${esc(x.subject||'')}</b><br><span class="muted">${esc(x.date||'')}</span></div>`).join(''):'<div class="muted">Sin historial disponible.</div>'}</div>`;
      body.querySelector('#fondeoCopyV1').onclick=async()=>{try{await navigator.clipboard.writeText(p.text||'');body.querySelector('#fondeoMsgV1').innerHTML='<div class="fondeo-alert ok">Resumen copiado.</div>'}catch(_){body.querySelector('#fondeoMsgV1').innerHTML='<div class="fondeo-alert err">No se pudo copiar automáticamente.</div>'}};
      const send=async reenviar=>{const msg=body.querySelector('#fondeoMsgV1'),btn=reenviar?body.querySelector('#fondeoResendV1'):body.querySelector('#fondeoSendV1');if(!confirm(`${reenviar?'REENVIAR':'ENVIAR'} fondeo por ${fmoney(p.total)} a ${p.to}?`))return;btn.disabled=true;msg.innerHTML='<div class="fondeo-alert warn">Enviando desde panapassrym@gmail.com...</div>';try{const r=await fcall({action:'send',desde,hasta,reenviar:!!reenviar});msg.innerHTML=`<div class="fondeo-alert ok">Correo enviado correctamente a ${esc(r.to)}. ${fmoney(r.total)} · ${Number(r.empresas||0)} empresas.</div>`;body.querySelector('#fondeoSendV1')?.setAttribute('disabled','disabled');body.querySelector('#fondeoResendV1')?.setAttribute('disabled','disabled')}catch(e){if(e?.payload?.duplicate)msg.innerHTML='<div class="fondeo-alert warn">Este rango ya fue enviado. Usa “Reenviar de todos modos” solo si realmente necesitas repetirlo.</div>';else msg.innerHTML=`<div class="fondeo-alert err">${esc(e.message||e)}</div>`}finally{btn.disabled=false}};
      body.querySelector('#fondeoSendV1').onclick=()=>send(false);if(body.querySelector('#fondeoResendV1'))body.querySelector('#fondeoResendV1').onclick=()=>send(true);
    }catch(e){body.innerHTML=`<div class="fondeo-alert err">${esc(e.message||e)}</div>`}
  }
  const prev=reportes;
  reportes=async function(v){
    await prev(v);
    const btn=v.querySelector('#rFon')||v.querySelector('#repFondeo');
    if(btn){btn.textContent='Preparar fondeo';btn.onclick=async()=>{const desde=(v.querySelector('#repDesde')||document.querySelector('#repDesde'))?.value;const hasta=(v.querySelector('#repHasta')||document.querySelector('#repHasta'))?.value;if(!desde||!hasta){alert('Selecciona Desde y Hasta.');return}await openFondeoProfessional(desde,hasta)}}
  };
})();
