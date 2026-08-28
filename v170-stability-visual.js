/* Portal RYM V170: canonical GPS KPIs, source freshness, mobile usability and low-overhead navigation polish. */
(function(){
  'use strict';
  if(window.__RYM_V170_STABILITY__) return;
  window.__RYM_V170_STABILITY__=true;

  const N=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const sourceState={revisados:null,control:null};

  const style=document.createElement('style');
  style.id='rym-v170-stability-css';
  style.textContent=`
    .v170-source-banner{display:flex;align-items:center;gap:8px;margin:0 0 12px;padding:9px 11px;border:1px solid #cfe1d8;border-radius:11px;background:#f3fbf6;color:#315c45;font-size:10px;line-height:1.35}
    .v170-source-banner.warn{border-color:#efd5a3;background:#fff8e9;color:#80520d}.v170-source-banner.stale{border-color:#efc2bd;background:#fff2f0;color:#8b352d}
    .v170-source-dot{flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:#25a46a;box-shadow:0 0 0 4px rgba(37,164,106,.12)}
    .v170-source-banner.warn .v170-source-dot{background:#e79a20;box-shadow:0 0 0 4px rgba(231,154,32,.13)}.v170-source-banner.stale .v170-source-dot{background:#d94c45;box-shadow:0 0 0 4px rgba(217,76,69,.12)}
    body.v99-home .v99-module .v170-source-banner{margin:7px 0 0;padding:7px 8px;font-size:9px}
    .v170-scroll-tabs{overflow-x:auto!important;overscroll-behavior-x:contain!important;scroll-snap-type:x proximity!important;scrollbar-width:thin!important;scrollbar-color:#9db1c8 transparent!important}
    .v170-scroll-tabs::-webkit-scrollbar,.v170-hscroll::-webkit-scrollbar{height:5px}.v170-scroll-tabs::-webkit-scrollbar-thumb,.v170-hscroll::-webkit-scrollbar-thumb{background:#9db1c8;border-radius:99px}
    .v170-scroll-tabs button{scroll-snap-align:center}
    .v170-hscroll{overflow-x:auto!important;overscroll-behavior-x:contain!important;scrollbar-width:thin!important;scrollbar-color:#9db1c8 transparent!important}
    @media(max-width:820px){
      body.v99-home .v101-main,body.v99-home .v101-content,body.v36-admin-total .main,body.v70-control .main,body.v66-revisados .v66-main,body.v70-admin .v70-admin-main,body.v157-gps .v157-main{padding-bottom:104px!important}
      #v115MobileNav,.v157-mobile-nav{bottom:max(8px,env(safe-area-inset-bottom))!important}
      body.v99-home .v99-module p,body.v99-home .v99-alert,body.v66-revisados .v66-title p,body.v157-gps .v157-card-head p,body.v70-admin .v70-note{font-size:11px!important;line-height:1.45!important}
      .v170-scroll-tabs{padding-bottom:5px!important;box-shadow:inset -14px 0 12px -15px rgba(16,48,83,.8)!important}
      body.v70-admin .v70-perm-head{display:none!important}
      body.v70-admin .v70-perm-row{display:grid!important;grid-template-columns:1fr 1fr!important;gap:9px!important;margin:8px!important;padding:10px!important;border:1px solid #dce6f1!important;border-radius:12px!important;background:#fff!important;font-size:11px!important}
      body.v70-admin .v70-perm-row.disabled{background:#f6f7f8!important}
      body.v70-admin .v70-perm-row>div{min-width:0!important;padding:0!important;border:0!important}
      body.v70-admin .v70-perm-row .v70-perm-name{grid-column:1/-1!important;padding-bottom:7px!important;border-bottom:1px solid #e7edf4!important}
      body.v70-admin .v70-perm-row>div:not(.v70-perm-name):before{display:block;margin:0 0 4px;color:#5d7087;font-size:9px;font-weight:900;text-transform:uppercase}
      body.v70-admin .v70-perm-row>div:nth-child(2):before{content:'Ver'}body.v70-admin .v70-perm-row>div:nth-child(3):before{content:'Crear'}body.v70-admin .v70-perm-row>div:nth-child(4):before{content:'Editar'}body.v70-admin .v70-perm-row>div:nth-child(5):before{content:'Eliminar'}
      body.v70-admin .v70-perm-row select{width:100%!important;min-width:0!important;font-size:11px!important;padding:8px!important;text-overflow:clip!important}
      body.v70-admin .v70-userlist{max-height:240px!important}
      .v157-table th:first-child,.v157-table td:first-child{position:sticky!important;left:0!important}.v157-table th:first-child{z-index:4!important}.v157-table td:first-child{z-index:2!important;background:#fff!important;box-shadow:7px 0 9px -10px #173c70}
      .v157-table-wrap,.v66-table-wrap,.table-wrap{padding-bottom:5px!important}
      .v157-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}.v157-kpi{min-height:82px!important}
      .v170-source-banner{font-size:11px!important}
    }
  `;
  document.head.appendChild(style);

  function gpsClass(row){
    if(row?.historico) return 'HISTORICO';
    const installed=Number(row?.instalados||0),reporting=Number(row?.reportando||0);
    if(installed===0||reporting===0) return 'CRITICO';
    if(installed===2&&reporting===1) return 'ALERTA';
    return 'OK'; // Regla temporal confirmada: un GPS instalado y reportando es OK.
  }

  function gpsSummary(data){
    const rows=Array.isArray(data?.rows)?data.rows:[];
    const active=rows.filter(row=>!row.historico&&N(row.estado_operativo)==='ACTIVO');
    const critical=active.filter(row=>gpsClass(row)==='CRITICO').length;
    const alert=active.filter(row=>gpsClass(row)==='ALERTA').length;
    return {critical,alert,pending:critical+alert};
  }

  function paintHomeGps(data){
    if(!document.body.classList.contains('v99-home')||!data) return false;
    const card=document.querySelector('.v99-module.gps');
    const minis=card?.querySelector('.v99-mini-kpis'),button=card?.querySelector('button');
    if(!card||!minis||!button) return false;
    const value=gpsSummary(data);
    minis.innerHTML='<div class="v99-mini"><span>Críticas</span><b>'+value.critical+'</b></div><div class="v99-mini"><span>Alertas</span><b>'+value.alert+'</b></div><div class="v99-mini"><span>Pendientes hoy</span><b>'+value.pending+'</b></div>';
    const badge=card.querySelector('.v99-badge');
    if(badge){
      badge.classList.remove('good','warn','medal');
      badge.classList.add('v103-state-badge',value.pending?'warn':'good');
      badge.innerHTML='<span class="v103-state-copy"><b>'+(value.pending?value.pending+' pendiente'+(value.pending===1?'':'s'):'GPS al día')+'</b><small>'+(value.pending?(value.critical?value.critical+' crítico'+(value.critical===1?'':'s'):'Sin críticos'):'Sin prioridades ACTIVO')+'</small></span>';
    }
    button.textContent=value.pending?'Atender '+value.pending+' prioridades':'Abrir GPS';
    button.onclick=()=>window.v113OpenGps?.();
    card.dataset.v170GpsCanonical='1';
    return true;
  }

  function timestampInfo(value){
    const ms=Date.parse(String(value||''));
    if(!Number.isFinite(ms)) return null;
    const hours=Math.max(0,(Date.now()-ms)/3600000);
    const tone=hours>24?'stale':hours>6?'warn':'fresh';
    const ago=hours<1?'hace menos de 1 h':hours<48?'hace '+Math.round(hours)+' h':'hace '+Math.round(hours/24)+' días';
    const label=new Date(ms).toLocaleString('es-PA',{timeZone:'America/Panama',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    return {tone,ago,label};
  }

  function sourceBanner(id,source,value,state){
    const info=timestampInfo(value);
    if(!info) return null;
    let el=document.getElementById(id);
    if(!el){el=document.createElement('div');el.id=id;el.className='v170-source-banner'}
    el.className='v170-source-banner '+info.tone;
    el.innerHTML='<span class="v170-source-dot" aria-hidden="true"></span><span><b>'+source+':</b> '+info.label+' · '+info.ago+(state?' · '+String(state):'')+'</span>';
    return el;
  }

  function paintFreshness(){
    const rev=sourceState.revisados;
    if(rev){
      const card=document.querySelector('body.v99-home .v99-module.rev,body.v99-home .v99-module.revisados');
      const small=sourceBanner('v170HomeRevSource','Fuente eCarCheck',rev.at,rev.state);
      if(card&&small&&!card.contains(small)){const p=card.querySelector('p');p?.after(small)}
      const host=document.querySelector('body.v66-revisados #v66Body')||document.querySelector('body.v66-revisados .v66-main');
      const banner=sourceBanner('v170RevSource','Fuente oficial eCarCheck',rev.at,rev.state);
      if(host&&banner&&!host.contains(banner)) host.prepend(banner);
    }
    const control=sourceState.control;
    if(control){
      const host=document.querySelector('body.v70-control #view')||document.querySelector('body.v70-control .main');
      const banner=sourceBanner('v170ControlSource','Estados de logística',control.at,'');
      if(host&&banner&&!host.contains(banner)) host.prepend(banner);
    }
  }

  function rememberResponse(path,result){
    const data=result?.data;
    if(!data||data.ok===false) return;
    if(path==='/functions/v1/gps-rym-admin'){
      window.__v170GpsData=data;
      setTimeout(()=>paintHomeGps(data),0);
    }else if(path==='/functions/v1/revisados-final'){
      const sync=data.sync||{};
      sourceState.revisados={at:sync.ultimo_exito_at||sync.finalizado_at||sync.updated_at||null,state:sync.estado||''};
      setTimeout(paintFreshness,0);
    }else if(path==='/functions/v1/portal-home-resumen'){
      if(data.revisados?.source_updated_at) sourceState.revisados={at:data.revisados.source_updated_at,state:data.revisados.source_state||''};
      setTimeout(paintFreshness,0);
    }else if(path==='/functions/v1/control-auto-resumen-supervisoras'){
      sourceState.control={at:data.sources?.logistictodo_updated_at||null};
      setTimeout(paintFreshness,0);
    }
  }

  if(typeof window.req==='function'&&!window.req.__v170){
    const reqBase=window.req;
    const wrapped=async function(path,opt={}){
      const result=await reqBase(path,opt);
      rememberResponse(String(path||''),result);
      return result;
    };
    wrapped.__v170=true;
    window.req=wrapped;
    try{req=wrapped}catch(_){ }
  }

  function enhanceLayout(){
    document.querySelectorAll('.side .nav,.v66-nav,.v75-control-nav,.ca6-tabs,.v157-mobile-nav').forEach(nav=>nav.classList.add('v170-scroll-tabs'));
    document.querySelectorAll('.table-wrap,.v66-table-wrap,.ca77-table-wrap,.v157-table-wrap').forEach(wrap=>wrap.classList.add('v170-hscroll'));
    const shared=window.__v170GpsData||window.__v164GpsPortalData?.data||window.__v163GpsPortalCache?.data;
    if(shared) paintHomeGps(shared);
    const cached=window.__v106RevisadosCache;
    if(cached?.sync){const sync=cached.sync;sourceState.revisados={at:sync.ultimo_exito_at||sync.finalizado_at||sync.updated_at||null,state:sync.estado||''}}
    paintFreshness();
  }

  document.addEventListener('click',event=>{
    const tab=event.target.closest?.('.side .nav button,.v66-nav button,.v75-control-nav button,.ca6-tabs button,.v157-mobile-nav button');
    if(tab) requestAnimationFrame(()=>tab.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));
    setTimeout(enhanceLayout,80);
    setTimeout(enhanceLayout,500);
  },true);

  function wrapOpen(name){
    const base=window[name];
    if(typeof base!=='function'||base.__v170Layout) return;
    const wrapped=async function(){
      const result=await base.apply(this,arguments);
      enhanceLayout();
      setTimeout(enhanceLayout,120);
      return result;
    };
    Object.assign(wrapped,base);wrapped.__v170Layout=true;window[name]=wrapped;
    try{if(name==='v36PortalHome')v36PortalHome=wrapped;if(name==='v70OpenPanapass')v70OpenPanapass=wrapped;if(name==='v60OpenRevisados')v60OpenRevisados=wrapped;if(name==='v70OpenControl')v70OpenControl=wrapped;if(name==='v70OpenUsers')v70OpenUsers=wrapped;if(name==='v113OpenGps')v113OpenGps=wrapped}catch(_){ }
  }
  ['v36PortalHome','v70OpenPanapass','v60OpenRevisados','v70OpenControl','v70OpenUsers','v113OpenGps'].forEach(wrapOpen);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhanceLayout,{once:true});
  else enhanceLayout();
})();
