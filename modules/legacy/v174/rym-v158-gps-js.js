
(function(){
  if(window.__RYM_V158_GPS__)return;window.__RYM_V158_GPS__=true;
  const N=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const gpsClass=r=>{if(r?.historico)return'HISTORICO';const i=Number(r?.instalados||0),p=Number(r?.reportando||0);if(i===0||p===0)return'CRITICO';if(i===2&&p===1)return'ALERTA';return'OK'};
  const profileKey=()=>[state?.profile?.id||'',state?.profile?.email||'',state?.profile?.supervisora_id||'',N(state?.profile?.rol||'')].join('|');
  const storeKey=()=> 'rym_gps_portal_'+profileKey();
  function summarize(data){const rows=Array.isArray(data?.rows)?data.rows:[],act=rows.filter(r=>!r.historico&&N(r.estado_operativo)==='ACTIVO'),crit=act.filter(r=>gpsClass(r)==='CRITICO').length,alert=act.filter(r=>gpsClass(r)==='ALERTA').length;return{crit,alert,pending:crit+alert,at:Date.now()}}
  function paint(sum){
    if(!document.body.classList.contains('v99-home'))return false;const card=document.querySelector('.v99-module.gps');if(!card)return false;const minis=card.querySelector('.v99-mini-kpis'),btn=card.querySelector('button');if(!minis||!btn)return false;
    const crit=Number(sum?.crit||0),alert=Number(sum?.alert||0),pending=crit+alert;
    minis.innerHTML='<div class="v99-mini"><span>Críticas</span><b>'+crit+'</b></div><div class="v99-mini"><span>Alertas</span><b>'+alert+'</b></div><div class="v99-mini"><span>Pendientes hoy</span><b>'+pending+'</b></div>';
    card.querySelector('.v158-home-priority')?.remove();const badge=card.querySelector('.v99-badge');if(badge){badge.classList.remove('good','warn','medal');badge.classList.add('v103-state-badge',pending?'warn':'good');const icon=pending?'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#e89218"/><path d="M16 9v9" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="23" r="1.8" fill="#fff"/></svg>':'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#1e9b68"/><path d="M9.5 16.2l4.2 4.2 8.9-9.3" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';badge.innerHTML='<span class="v103-state-icon">'+icon+'</span><span class="v103-state-copy"><b>'+(pending?pending+' pendiente'+(pending===1?'':'s'):'GPS al día')+'</b><small>'+(pending?(crit?crit+' crítico'+(crit===1?'':'s'):'Sin críticos'):'Sin prioridades ACTIVO')+'</small></span>'}
    btn.textContent=pending?'Atender '+pending+' prioridades':'Abrir GPS';btn.onclick=()=>window.v113OpenGps?.();return true
  }
  async function portalGpsPriority(){
    if(!document.body.classList.contains('v99-home'))return;
    const key=profileKey();
    try{const raw=localStorage.getItem(storeKey());if(raw){const cached=JSON.parse(raw);if(cached&&Date.now()-Number(cached.at||0)<6*3600000)paint(cached)}}catch(_){}
    try{
      const shared=window.__v164GpsPortalData;let data=shared&&shared.key===key?shared.data:null,c=window.__v163GpsPortalCache;if(!data&&c&&c.key===key&&Date.now()-c.at<30000)data=c.data;
      if(!data){const res=await req('/functions/v1/gps-rym-admin',{method:'POST',body:JSON.stringify({q:'',galera:'TODAS',estado:'TODOS',nivel:'TODOS',onlyProblems:false})});if(!res?.data?.ok)throw Error('GPS no disponible');data=res.data}
      window.__v164GpsPortalData={key,data};window.__v163GpsPortalCache={key,at:Date.now(),data};const sum=summarize(data);paint(sum);try{localStorage.setItem(storeKey(),JSON.stringify(sum))}catch(_){}
    }catch(_){/* conserva el último dato visible sin bloquear el Portal */}
  }
  const oldHome=window.v36PortalHome;
  if(typeof oldHome==='function'&&!oldHome.__v164gps){const fn=async function(){const r=await oldHome.apply(this,arguments);portalGpsPriority();setTimeout(portalGpsPriority,120);return r};fn.__v164gps=true;window.v36PortalHome=fn;try{v36PortalHome=fn}catch(_){}}
  setTimeout(portalGpsPriority,60);
})();
