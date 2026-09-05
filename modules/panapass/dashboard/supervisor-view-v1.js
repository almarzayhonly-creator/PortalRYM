/* Portal RYM · Panapass Supervisor View V1
   Adds a personal payment card and a structured ranking only for supervisor profiles.
   It does not replace the galera renderer or modify business RPCs. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_SUPERVISOR_VIEW_V1__) return;
  w.__RYM_PANAPASS_SUPERVISOR_VIEW_V1__=true;

  let raf=0;
  let rankingPromise=null;
  let lastRoot=null;

  const text=v=>String(v??'').trim();
  const norm=v=>text(v).replace(/\s+/g,' ').toUpperCase();
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number.isFinite(Number(v))?Number(v):0;

  function context(){
    return w.RYM_CONTEXT&&typeof w.RYM_CONTEXT.create==='function'
      ? w.RYM_CONTEXT.create('panapass-supervisor-view-v1')
      : null;
  }

  function session(){
    const c=context();
    return c?.session||{};
  }

  function isPanSupervisor(){
    if(d.body?.dataset?.rymModule!=='panapass') return false;
    const role=norm(session().role||session().profile?.rol);
    return role.includes('SUPERVIS');
  }

  function profileName(profile){
    const fromProfile=profile?.nombre_completo||profile?.nombre||profile?.name||profile?.display_name||profile?.supervisora_nombre;
    const fromSidebar=d.querySelector('.side .user strong')?.textContent;
    return text(fromProfile||fromSidebar||'Mi gestión');
  }

  function profileIds(profile){
    return [profile?.supervisora_id,profile?.id,profile?.user_id,profile?.usuario_id]
      .map(text)
      .filter(Boolean);
  }

  function canonical(row){
    try{
      if(w.RYM_PANAPASS_RANKING?.canonicalRow) return w.RYM_PANAPASS_RANKING.canonicalRow(row);
    }catch(_){/* fall through */}
    return Object.freeze({
      id:text(row?.supervisora_id??row?.id),
      supervisora:text(row?.supervisora_nombre??row?.supervisora)||'SIN SUPERVISORA',
      galera:text(row?.galera),
      unidades:Math.max(0,Number(row?.unidades_pagadas??row?.unidades)||0),
      monto:money(row?.monto_pagado??row?.monto),
      posicionGalera:Math.max(0,Number(row?.posicion_galera??row?.posicionGalera)||0),
      totalGalera:Math.max(0,Number(row?.total_galera??row?.totalGalera)||0),
      fechaDesde:text(row?.fecha_desde??row?.fechaDesde),
      racha:Math.max(0,Number(row?.racha)||0)
    });
  }

  async function rankingRows(){
    if(rankingPromise) return rankingPromise;
    const c=context();
    if(!c?.api?.panapass?.ranking) throw new Error('Ranking Panapass no disponible');
    rankingPromise=Promise.resolve(c.api.panapass.ranking('DIA'))
      .then(rows=>(Array.isArray(rows)?rows:[]).map(canonical))
      .catch(err=>{rankingPromise=null;throw err});
    return rankingPromise;
  }

  function galeraName(root){
    return text(root?.querySelector('.rym-p2-galera .rym-p2-gal-name')?.textContent)
      || text(root?.querySelector('.rym-p2-galera .rym-gal-name')?.textContent)
      || '';
  }

  function sameGalera(a,b){return norm(a)===norm(b)}

  function findMe(rows,profile,galera){
    const ids=profileIds(profile);
    let me=rows.find(row=>ids.includes(text(row.id)));
    if(me) return me;

    const names=[
      profileName(profile),
      profile?.supervisora_nombre,
      profile?.nombre,
      profile?.nombre_completo
    ].map(norm).filter(Boolean);
    me=rows.find(row=>names.includes(norm(row.supervisora)));
    if(me) return me;

    const legacyMe=d.querySelector('#view #phase4GaleraKpis .rym-rank-row.me');
    const legacyName=norm(legacyMe?.textContent||'');
    if(legacyName) me=rows.find(row=>legacyName.includes(norm(row.supervisora)));
    if(me) return me;

    const inGalera=rows.filter(row=>sameGalera(row.galera,galera));
    return inGalera.length===1?inGalera[0]:null;
  }

  function sortGalera(rows,galera){
    return rows
      .filter(row=>sameGalera(row.galera,galera))
      .sort((a,b)=>a.unidades-b.unidades||a.monto-b.monto||a.supervisora.localeCompare(b.supervisora,'es'));
  }

  function initials(name){
    const parts=text(name).split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0]||'M')+(parts.length>1?(parts.at(-1)?.[0]||''):'')).toUpperCase();
  }

  function personalStatus(me){
    if(!me) return {tone:'neutral',label:'Sin dato de cierre'};
    if(me.unidades===0) return {tone:'good',label:'Excelente gestión'};
    if(me.unidades<=2) return {tone:'steady',label:'Buen resultado'};
    return {tone:'watch',label:'Gestión activa'};
  }

  function ensurePersonalCard(root,grid,me,profile,galera,total){
    let card=grid.querySelector('.rym-sup-personal-card');
    if(!card){
      card=d.createElement('article');
      card.className='rym-sup-personal-card';
      grid.appendChild(card);
    }

    const name=me?.supervisora||profileName(profile);
    const status=personalStatus(me);
    const position=me?.posicionGalera||0;
    const totalGalera=me?.totalGalera||total||0;
    const pct=position&&totalGalera?Math.max(7,Math.round(((totalGalera-position+1)/totalGalera)*100)):0;

    card.dataset.tone=status.tone;
    card.innerHTML=`
      <header class="rym-sup-personal-head">
        <div class="rym-sup-avatar">${esc(initials(name))}</div>
        <div class="rym-sup-personal-title">
          <span>MI GESTIÓN DE HOY</span>
          <strong>${esc(name)}</strong>
          <small>${esc(galera||me?.galera||'Panapass')}</small>
        </div>
        <span class="rym-sup-status ${esc(status.tone)}">${esc(status.label)}</span>
      </header>
      <div class="rym-sup-personal-hero">
        <div>
          <span>Unidades pagadas</span>
          <strong>${me?me.unidades:'—'}</strong>
          <small>Menos unidades = mejor gestión</small>
        </div>
        <div>
          <span>Monto pagado</span>
          <strong>${me?`B/. ${me.monto.toFixed(2)}`:'B/. —'}</strong>
          <small>Resultado personal del último cierre</small>
        </div>
      </div>
      <div class="rym-sup-personal-stats">
        <div><span>Posición</span><strong>${position?`#${position}`:'—'}${totalGalera?` <small>de ${totalGalera}</small>`:''}</strong></div>
        <div><span>Racha</span><strong>${me?me.racha:'—'} <small>días</small></strong></div>
      </div>
      <div class="rym-sup-position-progress" aria-label="Posición dentro de la galera">
        <span><i style="width:${pct}%"></i></span>
        <small>${position&&totalGalera?`Posición ${position} de ${totalGalera} en ${esc(galera||me?.galera||'tu galera')}`:'Esperando información de ranking'}</small>
      </div>`;
  }

  function rankPosition(row,index){return row.posicionGalera||index+1}

  function rankingRow(row,index,me){
    const position=rankPosition(row,index);
    const isMe=!!me&&text(row.id)&&text(row.id)===text(me.id) || (!!me&&norm(row.supervisora)===norm(me.supervisora));
    const topClass=position<=3?` top-${position}`:'';
    return `<div class="rym-sup-rank-row${isMe?' me':''}${topClass}" ${isMe?'aria-current="true"':''}>
      <span class="rym-sup-rank-pos">#${position}</span>
      <div class="rym-sup-rank-name"><strong>${esc(row.supervisora)}</strong><small>${isMe?'Tú · ':''}${esc(row.galera||'')}</small></div>
      <div class="rym-sup-rank-units"><strong>${row.unidades}</strong><span>${row.unidades===1?'pagada':'pagadas'}</span></div>
      <div class="rym-sup-rank-money"><strong>B/. ${row.monto.toFixed(2)}</strong><span>monto</span></div>
    </div>`;
  }

  function ensureRanking(root,rows,me,galera){
    const grid=root.querySelector('.galera-kpi-grid');
    if(!grid) return;

    let panel=root.querySelector('.rym-rank-panel');
    if(!panel){
      panel=d.createElement('section');
      panel.className='rym-rank-panel';
      grid.insertAdjacentElement('afterend',panel);
    }

    let title=panel.previousElementSibling;
    if(!title?.classList?.contains('galera-kpi-title')){
      title=d.createElement('div');
      title.className='galera-kpi-title rym-sup-ranking-title';
      panel.insertAdjacentElement('beforebegin',title);
    }
    title.classList.add('rym-sup-ranking-title');
    title.innerHTML=`<div><h3>Ranking de supervisoras · ${esc(galera||'Tu galera')}</h3><span>Menos unidades pagadas obtiene mejor posición.</span></div>`;

    const total=rows.length;
    const currentPosition=me?.posicionGalera||rows.findIndex(r=>text(r.id)===text(me?.id))+1||0;
    const date=me?.fechaDesde||rows[0]?.fechaDesde||'';
    panel.className='rym-rank-panel rym-sup-ranking-card';
    panel.dataset.supervisorRanking='1';
    panel.innerHTML=`
      <header class="rym-sup-ranking-summary">
        <div>
          <span>TU POSICIÓN ACTUAL</span>
          <strong>${currentPosition>0?`#${currentPosition}`:'—'}${total?` <small>de ${total}</small>`:''}</strong>
          <p>${me?`${esc(me.supervisora)} · ${me.unidades} ${me.unidades===1?'unidad pagada':'unidades pagadas'} · B/. ${me.monto.toFixed(2)}`:'No encontramos tu fila en el último cierre.'}</p>
        </div>
        <div class="rym-sup-ranking-rule"><span>CRITERIO</span><strong>Menor incidencia</strong><small>Primero unidades pagadas, luego monto.</small></div>
      </header>
      <div class="rym-sup-ranking-list">${rows.length?rows.map((row,i)=>rankingRow(row,i,me)).join(''):'<div class="rym-sup-ranking-empty">Sin datos de ranking para esta galera.</div>'}</div>
      <footer class="rym-sup-ranking-foot"><span>${date?`Último cierre · ${esc(date)}`:'Ranking diario'}</span><span>${total} ${total===1?'supervisora':'supervisoras'}</span></footer>`;
  }

  async function render(){
    if(!isPanSupervisor()) return;
    const root=d.querySelector('#view #phase4GaleraKpis.rym-p2-galeras');
    const grid=root?.querySelector('.galera-kpi-grid');
    if(!root||!grid||root.dataset.p2Enhanced!=='1') return;

    if(lastRoot!==root){lastRoot=root;rankingPromise=null}

    root.classList.add('rym-supervisor-dashboard-v1');
    grid.classList.add('rym-sup-two-card-grid');

    try{
      const all=await rankingRows();
      if(!isPanSupervisor()||!d.documentElement.contains(root)) return;
      const profile=session().profile||{};
      const galera=galeraName(root);
      const me=findMe(all,profile,galera);
      const resolvedGalera=galera||me?.galera||'';
      const rows=sortGalera(all,resolvedGalera);
      const signature=[resolvedGalera,me?.id,me?.unidades,me?.monto,me?.posicionGalera,rows.map(r=>`${r.id}:${r.unidades}:${r.monto}:${r.posicionGalera}`).join('|')].join('::');
      if(root.dataset.supervisorViewSignature===signature&&grid.querySelector('.rym-sup-personal-card')&&root.querySelector('.rym-sup-ranking-card')) return;
      root.dataset.supervisorViewSignature=signature;
      ensurePersonalCard(root,grid,me,profile,resolvedGalera,rows.length);
      ensureRanking(root,rows,me,resolvedGalera);
    }catch(err){
      console.warn('Panapass supervisor view',err);
      const profile=session().profile||{};
      const galera=galeraName(root);
      ensurePersonalCard(root,grid,null,profile,galera,0);
    }
  }

  function schedule(){
    if(raf) return;
    raf=w.requestAnimationFrame(()=>{raf=0;void render()});
  }

  const observer=new MutationObserver(schedule);
  observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-rym-module','data-rym-ready','data-p2-enhanced']});
  d.addEventListener('click',event=>{
    if(event.target?.closest?.('.rym-p2-refresh')) rankingPromise=null;
    schedule();
  },true);
  w.addEventListener('load',schedule,{once:true});
  schedule();
})(window,document);
