/* Bounded, coalesced reads for the online payments screen. No result cache. */
(function(w,d){
  let enaPaintTimer=null;

  function money(v){
    const n=Number(v);
    return Number.isFinite(n)?`B/. ${n.toFixed(2)}`:'B/. --';
  }

  function ensureEnaStyles(){
    if(d.getElementById('rym-pagos-ena-individual-style'))return;
    const s=d.createElement('style');
    s.id='rym-pagos-ena-individual-style';
    s.textContent=`

      .rym-ena-individual{display:flex;align-items:center;justify-content:center;margin-top:4px;min-height:25px}
      .rym-ena-individual button{min-width:100px;padding:5px 9px!important;border:1px solid #b8cae2!important;background:#f3f7ff!important;color:#174d98!important;border-radius:9px!important;font-size:10px!important;font-weight:800!important;white-space:nowrap;cursor:pointer}
      .rym-ena-individual button:hover{background:#e7f1ff!important}
      #pmOut tbody tr.rym-ena-positive-row>td{background:#f2fbf6!important}
      #pmOut tbody tr.rym-ena-positive-row>td:first-child{box-shadow:inset 3px 0 0 #28a46b}
      #rym-ena-overlay.rym-ena-overlay{position:fixed!important;inset:0!important;z-index:999999!important;background:rgba(12,31,56,.45)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important}
      #rym-ena-overlay .rym-ena-card{box-sizing:border-box!important;width:min(450px,100%)!important;max-height:calc(100vh - 36px)!important;overflow-y:auto!important;padding:24px!important;background:#ffffff!important;color:#173257!important;border:1px solid #dfe8f5!important;border-radius:20px!important;box-shadow:0 24px 80px rgba(12,32,58,.25)!important;text-align:left!important;font-family:inherit!important}
      #rym-ena-overlay .rym-ena-card header{display:flex!important;justify-content:space-between!important;align-items:flex-start!important;gap:12px!important;margin:0 0 14px!important;padding:0!important;background:transparent!important;border:0!important}
      #rym-ena-overlay .rym-ena-card h3{font-size:20px!important;line-height:1.2!important;font-weight:850!important;color:#173257!important;margin:0!important}
      #rym-ena-overlay .rym-ena-subtitle{display:block!important;margin-top:4px!important;color:#6c7e95!important;font-size:12px!important;font-weight:700!important}
      #rym-ena-overlay .rym-ena-card header button{display:flex!important;align-items:center!important;justify-content:center!important;flex:none!important;width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;padding:0!important;border:1px solid #e1e9f3!important;border-radius:10px!important;background:#f3f6fb!important;color:#31537f!important;font-size:21px!important;font-weight:600!important;line-height:1!important;box-shadow:none!important;cursor:pointer!important}
      #rym-ena-overlay .rym-ena-line{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:14px!important;min-width:0!important;padding:11px 0!important;border-bottom:1px solid #e9eef5!important;background:transparent!important;font-size:12px!important;line-height:1.35!important;color:#173257!important}
      #rym-ena-overlay .rym-ena-line span{color:#64748b!important;flex:none!important}
      #rym-ena-overlay .rym-ena-line strong{color:#173257!important;font-size:12px!important;font-weight:800!important;text-align:right!important;overflow-wrap:anywhere!important}
      #rym-ena-overlay .rym-ena-sum{display:block!important;font-size:42px!important;line-height:1.1!important;letter-spacing:-.02em!important;font-weight:900!important;margin:17px 0 4px!important;background:transparent!important}
      #rym-ena-overlay .rym-ena-sum.good{color:#09804b!important}
      #rym-ena-overlay .rym-ena-sum.bad{color:#bf2923!important}
      #rym-ena-overlay .rym-ena-state{font-size:13px!important;line-height:1.4!important;font-weight:800!important;color:#173257!important;margin:0 0 13px!important}
      #rym-ena-overlay .rym-ena-card footer{display:flex!important;gap:10px!important;margin:20px 0 0!important;padding:0!important;background:transparent!important;border:0!important}
      #rym-ena-overlay .rym-ena-card footer button{box-sizing:border-box!important;display:inline-flex!important;justify-content:center!important;align-items:center!important;flex:1 1 0!important;min-width:0!important;min-height:46px!important;padding:10px 9px!important;border-radius:11px!important;border:1px solid #afc7e7!important;background:#1854a6!important;color:#ffffff!important;font-size:12px!important;font-weight:850!important;line-height:1.25!important;text-align:center!important;white-space:normal!important;opacity:1!important;box-shadow:none!important;cursor:pointer!important}
      #rym-ena-overlay .rym-ena-card footer button:hover:not(:disabled){background:#12468d!important}
      #rym-ena-overlay .rym-ena-card footer button.rym-ena-remove{background:#f5f7fa!important;border-color:#d8e0ea!important;color:#8492a6!important;cursor:not-allowed!important}
      #rym-ena-overlay .rym-ena-note{margin-top:10px!important;color:#7b879a!important;font-size:11px!important;line-height:1.4!important}
      @media(max-width:480px){#rym-ena-overlay .rym-ena-card{padding:19px!important;border-radius:16px!important}#rym-ena-overlay .rym-ena-sum{font-size:36px!important}#rym-ena-overlay .rym-ena-card footer{flex-direction:column!important}#rym-ena-overlay .rym-ena-card footer button{flex:none!important;width:100%!important}}
    `;
    (d.head||d.documentElement).appendChild(s);
  }

  function normalizeEnaResponse(payload){
    if(!payload)return null;
    const data=payload.data??payload;
    if(data?.ok===false && !Array.isArray(data?.results))return {ok:false,error:data.error||'sin_respuesta'};
    return Array.isArray(data?.results)?data.results[0]:(data?.result||data);
  }

  function showBalanceModal(tr,panapass,data){
    document.querySelector('#rym-ena-overlay')?.remove();
    const dlg=document.createElement('div');dlg.id='rym-ena-overlay';dlg.className='rym-ena-overlay';
    const card=document.createElement('section');card.className='rym-ena-card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
    const valid=data?.ok===true&&Number.isFinite(Number(data.balance))&&!data.desactualizado;
    const positive=valid&&Number(data.balance)>=0;
    const date=data?.consultado_at||data?.ultima_consulta;
    const when=date&&!Number.isNaN(Date.parse(date))?new Date(date).toLocaleString('es-PA',{timeZone:'America/Panama'}):'No disponible';
    const line=(label,value)=>{const el=document.createElement('div');el.className='rym-ena-line';const a=document.createElement('span'),b=document.createElement('strong');a.textContent=label;b.textContent=value;el.append(a,b);card.appendChild(el)};
    const h=document.createElement('header');const title=document.createElement('h3');title.textContent='Consulta ENA';const subtitle=document.createElement('span');subtitle.className='rym-ena-subtitle';subtitle.textContent='Unidad '+(tr.dataset.payRowUnit||'');const titleBox=document.createElement('div');titleBox.append(title,subtitle);const x=document.createElement('button');x.type='button';x.textContent='×';x.setAttribute('aria-label','Cerrar');h.append(titleBox,x);card.appendChild(h);
    line('Panapass',String(panapass));const sum=document.createElement('div');sum.className='rym-ena-sum '+(positive?'good':'bad');sum.textContent=valid?money(data.balance):'Sin saldo confirmado';card.appendChild(sum);
    const st=document.createElement('p');st.className='rym-ena-state';st.textContent=valid?(positive?'✓ Ya está positiva · NO PAGAR':'Saldo todavía negativo'):'No se pudo verificar el saldo';card.appendChild(st);
    line('Fecha de consulta',when);line('Fuente','ENA · LogisticTodo');
    if(!valid)line('Detalle',String(data?.error||'Consulta fallida').slice(0,100));
    const buttons=document.createElement('footer');const keep=document.createElement('button');keep.textContent='Conservar en la hoja';keep.type='button';const remove=document.createElement('button');remove.type='button';remove.textContent='Retirar de la hoja';remove.className='rym-ena-remove';remove.disabled=true;remove.title='Retiro individual pendiente de habilitar';buttons.append(keep,remove);card.appendChild(buttons);const note=document.createElement('p');note.className='rym-ena-note';note.textContent='Retirar una sola unidad estará disponible cuando se habilite su validación segura. Conservar no modifica pagos.';card.appendChild(note);
    dlg.appendChild(card);document.body.appendChild(dlg);
    const dismiss=()=>{dlg.remove();document.removeEventListener('keydown',escKey)};
    const escKey=e=>{if(e.key==='Escape')dismiss()};
    x.onclick=dismiss;keep.onclick=dismiss;dlg.onclick=e=>{if(e.target===dlg)dismiss()};document.addEventListener('keydown',escKey);
    keep.focus();
  }
  async function consultEna(btn,tr,panEl){
    const panapass=Number(String(panEl?.textContent||'').replace(/\\D/g,''));
    btn.disabled=true;btn.textContent='Consultando…';
    try{
      if(!panapass||typeof w.req!=='function')throw Error('Consulta no disponible');
      const response=await w.req('/functions/v1/ena-consulta-saldo',{method:'POST',body:JSON.stringify({panapass})});
      const result=normalizeEnaResponse(response);
      if(!result?.ok||!Number.isFinite(Number(result.balance))||result.desactualizado)throw Error(result?.error||'Sin saldo confirmado');
      tr.classList.toggle('rym-ena-positive-row',Number(result.balance)>=0);
      showBalanceModal(tr,panapass,result);
    }catch(e){tr.classList.remove('rym-ena-positive-row');showBalanceModal(tr,panapass,{ok:false,error:String(e.message||e)})}
    finally{btn.disabled=false;btn.textContent='Consultar ENA'}
  }

  function decorateEnaRows(){
    const out=d.querySelector('#pmOut');
    if(!out)return;
    const rows=out.querySelectorAll('tbody tr[data-pay-row-unit]');
    if(!rows.length)return;
    ensureEnaStyles();
    rows.forEach(tr=>{
      if(tr.dataset.rymEnaIndividual==='1')return;
      const panEl=tr.querySelector('[data-pay-panapass]');
      const cell=panEl?.closest('td');
      if(!panEl||!cell)return;
      tr.dataset.rymEnaIndividual='1';
      const wrap=d.createElement('div');
      wrap.className='rym-ena-individual';
      const btn=d.createElement('button');
      btn.type='button';
      btn.textContent='Consultar ENA';
      btn.title='Consultar el saldo actual de esta unidad antes de pagar';
      btn.addEventListener('click',ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        consultEna(btn,tr,panEl);
      });
      wrap.append(btn);
      cell.appendChild(wrap);
    });
  }

  function scheduleEnaPaint(){
    clearTimeout(enaPaintTimer);
    enaPaintTimer=setTimeout(decorateEnaRows,0);
  }

  w.rymPagosRead=function(read,timeoutMs=20000){
    let pending=null;
    return function(){
      if(pending)return pending;
      const controller=new AbortController();
      let timer;
      const timeout=new Promise((_,reject)=>{
        timer=setTimeout(()=>{
          reject(Error('La lectura tardó demasiado. Pulsa Recargar para reintentar.'));
          controller.abort();
        },timeoutMs);
      });
      pending=Promise.race([Promise.resolve().then(()=>read(controller.signal)),timeout])
        .finally(()=>{clearTimeout(timer);pending=null;scheduleEnaPaint()});
      return pending;
    };
  };

  w.rymPagosEnaIndividual={decorate:decorateEnaRows};
})(window,document);
