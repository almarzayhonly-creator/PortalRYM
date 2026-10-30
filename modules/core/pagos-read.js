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

  async function consultEna(btn,tr,panEl,resultEl){
    const panapass=Number(String(panEl?.textContent||'').replace(/\D/g,''));
    if(!Number.isFinite(panapass)||panapass<=0){
      resultEl.className='rym-ena-result err';
      resultEl.textContent='Sin Panapass';
      return;
    }
    if(typeof w.req!=='function'){
      resultEl.className='rym-ena-result err';
      resultEl.textContent='Consulta no disponible';
      return;
    }
    btn.disabled=true;
    const old=btn.textContent;
    btn.textContent='Consultando…';
    resultEl.className='rym-ena-result';
    resultEl.textContent='';
    try{
      const raw=await w.req('/functions/v1/ena-consulta-saldo',{method:'POST',body:JSON.stringify({panapass})});
      const r=normalizeEnaResponse(raw);
      if(!r?.ok || !Number.isFinite(Number(r.balance))){
        throw Error(r?.error||'No se obtuvo saldo actual');
      }
      const balance=Number(r.balance),positive=balance>=0;
      tr.classList.toggle('rym-ena-positive-row',positive);
      tr.dataset.rymEnaBalance=String(balance);
      tr.dataset.rymEnaCheckedAt=String(r.consultado_at||r.ultima_consulta||'');
      resultEl.className='rym-ena-result '+(positive?'good':'bad');
      resultEl.textContent=positive?`✓ YA POSITIVA · ${money(balance)} · NO PAGAR`:`Sigue negativa · ${money(balance)}`;
      const at=r.consultado_at||r.ultima_consulta;
      resultEl.title=`Saldo ENA/LogisticTodo${at?' · '+new Date(at).toLocaleString('es-PA'):''}${r.cached?' · consulta reciente reutilizada':''}`;
      btn.textContent='Actualizar ENA';
    }catch(e){
      tr.classList.remove('rym-ena-positive-row');
      resultEl.className='rym-ena-result err';
      resultEl.textContent='Sin respuesta ENA';
      resultEl.title=String(e?.message||e||'Error de consulta');
      btn.textContent='Reintentar ENA';
    }finally{
      btn.disabled=false;
      if(!btn.textContent)btn.textContent=old||'Consultar ENA';
    }
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
      const result=d.createElement('span');
      result.className='rym-ena-result';
      btn.addEventListener('click',ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        consultEna(btn,tr,panEl,result);
      });
      wrap.append(btn,result);
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
