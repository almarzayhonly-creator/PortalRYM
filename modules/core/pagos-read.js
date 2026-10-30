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
      .rym-ena-individual{display:flex;align-items:center;gap:6px;justify-content:center;margin-top:4px;min-height:24px}
      .rym-ena-individual button{border:1px solid #b8cae2;background:#f4f8fd;color:#174d98;border-radius:8px;padding:3px 7px;font-size:9px;font-weight:900;line-height:1.2;cursor:pointer;white-space:nowrap}
      .rym-ena-individual button:hover{background:#eaf2ff}.rym-ena-individual button:disabled{opacity:.65;cursor:wait}
      .rym-ena-result{font-size:9px;font-weight:900;line-height:1.25;white-space:nowrap}.rym-ena-result.good{color:#087443}.rym-ena-result.bad{color:#b42318}.rym-ena-result.err{color:#8a5a00}
      #pmOut tbody tr.rym-ena-positive-row>td{background:#f1fbf6!important}
      #pmOut tbody tr.rym-ena-positive-row>td:first-child{box-shadow:inset 3px 0 0 #28a46b}
      .rym-ena-overlay{position:fixed;inset:0;z-index:999999;background:rgba(10,31,62,.48);display:grid;place-items:center;padding:15px}
      .rym-ena-card{width:min(410px,100%);padding:22px;background:#fff;border-radius:18px;box-shadow:0 24px 80px #142d4c55;color:#173257}
      .rym-ena-card header{display:flex;align-items:center;justify-content:space-between;gap:12px}.rym-ena-card h3{font-size:17px;margin:0}
      .rym-ena-card header button{border:0;background:none;font-size:25px;cursor:pointer}
      .rym-ena-line{display:flex;justify-content:space-between;gap:12px;font-size:12px;padding:9px 0;border-bottom:1px solid #e6edf5}
      .rym-ena-line span{color:#697b93}.rym-ena-sum{font-size:32px;font-weight:900;margin-top:17px}.rym-ena-sum.good{color:#087443}.rym-ena-sum.bad{color:#b42318}
      .rym-ena-state{font-size:12px;font-weight:850;margin:0 0 15px}.rym-ena-card footer{display:flex;gap:8px;margin-top:19px}
      .rym-ena-card footer button{flex:1;border-radius:9px;padding:10px;border:1px solid #b8cce5;background:#eef5fe;color:#174d98;font-weight:750;cursor:pointer}
      .rym-ena-card footer .rym-ena-remove{background:#fff0f1;color:#a21c2c;border-color:#f7c7cd}.rym-ena-card footer button:disabled{opacity:.55;cursor:not-allowed}
      @media(max-width:900px){.rym-ena-individual{flex-direction:column;gap:3px}.rym-ena-result{white-space:normal;text-align:center}}
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
    const h=document.createElement('header');const title=document.createElement('h3');title.textContent='Consulta ENA · '+(tr.dataset.payRowUnit||'Unidad');const x=document.createElement('button');x.type='button';x.textContent='×';x.setAttribute('aria-label','Cerrar');h.append(title,x);card.appendChild(h);
    line('Panapass',String(panapass));const sum=document.createElement('div');sum.className='rym-ena-sum '+(positive?'good':'bad');sum.textContent=valid?money(data.balance):'Sin saldo confirmado';card.appendChild(sum);
    const st=document.createElement('p');st.className='rym-ena-state';st.textContent=valid?(positive?'✓ YA POSITIVA · NO PAGAR':'Sigue negativa'):'No se pudo verificar el saldo';card.appendChild(st);
    line('Fecha de consulta',when);line('Fuente','ENA · LogisticTodo');
    if(!valid)line('Detalle',String(data?.error||'Consulta fallida').slice(0,100));
    const buttons=document.createElement('footer');const keep=document.createElement('button');keep.textContent='Conservar en la hoja';keep.type='button';const remove=document.createElement('button');remove.type='button';remove.textContent='Retirar de la hoja';remove.className='rym-ena-remove';remove.disabled=true;remove.title='Retiro individual pendiente de habilitar';buttons.append(keep,remove);card.appendChild(buttons);
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
