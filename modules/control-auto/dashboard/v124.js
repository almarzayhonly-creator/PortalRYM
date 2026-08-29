/* V172 clean externalized legacy layer: rym-v124-dashboard-ranking-js */
(function(){
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const N=v=>typeof norm==='function'?norm(v):String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const numberFrom=el=>Number(String(el?.querySelector('b,strong')?.textContent||'0').replace(/[^0-9.-]/g,''))||0;

  function fixControlKpis(){
    const grid=document.querySelector('.v75-control-dashboard .v75-control-kpis');if(!grid||grid.dataset.v124==='1')return;
    const cards=[...grid.children],find=re=>cards.find(c=>re.test(N(c.querySelector('span')?.textContent||c.textContent)));
    const active=numberFrom(find(/^ACTIVAS?$/)),shownTotal=numberFrom(find(/^TOTAL FLOTA$/)),others=shownTotal?Math.max(0,shownTotal-active):numberFrom(find(/^OTROS? ESTATUS/)),closed=numberFrom(find(/^CERRADAS?$/)),shownCannibalized=numberFrom(find(/^CANIBALIZADAS?$/)),audit=numberFrom(find(/ALERTAS.*AUDITORIA/));
    if(!active&&!others&&!closed)return;
    const cached=window.__v117ControlSummary?.data||{},cannibalized=Number(cached.canibalizadas??cached.canibalized??(shownCannibalized||Math.max(0,others-closed)))||0,total=shownTotal||active+others;
    grid.dataset.v124='1';grid.classList.add('v124-exclusive-kpis');
    grid.innerHTML=`<article class="v75-control-kpi v124-control-kpi total"><span>Total flota</span><b>${total}</b><small>Inventario completo</small></article><article class="v75-control-kpi v124-control-kpi active"><span>Activas</span><b>${active}</b><small>En operación</small></article><article class="v75-control-kpi v124-control-kpi closed"><span>Cerradas</span><b>${closed}</b><small>Fuera de operación</small></article><article class="v75-control-kpi v124-control-kpi other"><span>Canibalizadas</span><b>${cannibalized}</b><small>Otro estatus exclusivo</small></article><article class="v75-control-kpi v124-control-kpi audit" id="v117CtlAudit"><span>Alertas auditoría</span><b id="v117CtlAuditCount">${audit||'—'}</b><small id="v117CtlAuditHint">Requieren revisión</small></article>`;
    let note=grid.nextElementSibling;if(!note?.classList?.contains('v124-control-formula')){note=document.createElement('p');note.className='v124-control-formula';grid.after(note)}
    note.innerHTML=`<b>${total} unidades</b> = ${active} activas + ${closed} cerradas + ${cannibalized} canibalizadas. Las categorías ya no se duplican.`;
  }

  function supervisorMarkup(rows,source){
    const totals=rows.reduce((a,r)=>(a.total+=r.total,a.activas+=r.activas,a.abono_adicional+=r.abono_adicional,a.paradas+=r.paradas,a),{total:0,activas:0,abono_adicional:0,paradas:0});
    return `<div class="v123-supervisor-head"><div><h3>Operación por supervisora</h3><p>ACTIVO/CONVENIO, ABONO ADICIONAL y PARADA son categorías separadas.</p></div><div class="v123-supervisor-total"><span>${totals.total} asignadas</span><span>${totals.activas} activas</span><span class="extra">${totals.abono_adicional} abono adicional</span><span class="stop">${totals.paradas} paradas</span><span class="v124-supervisor-fallback">${E(source)}</span></div></div><div class="v123-supervisor-grid">${rows.map((r,i)=>{const pct=Math.round(100*r.activas/Math.max(1,r.total));return `<article class="v123-supervisor-card"><header><h4 title="${E(r.supervisora)}">${E(r.supervisora)}</h4><span>${E(r.galera||'')}</span></header><div class="v123-supervisor-counts"><span>Total<b>${r.total}</b></span><span>Activas<b>${r.activas}</b></span><span class="extra">Abono<b>${r.abono_adicional}</b></span><span class="stop">Paradas<b>${r.paradas}</b></span></div><div class="v123-supervisor-track" title="${pct}% activas"><i style="width:${pct}%"></i></div><button data-v124-sup="${i}">Ver sus unidades</button></article>`}).join('')||'<div class="empty">Sin unidades dentro de este alcance.</div>'}</div>`;
  }

  async function fallbackSupervisorSummary(){
    const host=document.querySelector('#v123SupervisorPanel'),err=host?.querySelector('.v123-supervisor-error');if(!host||!err||host.dataset.v124Fallback)return;
    host.dataset.v124Fallback='loading';const role=N(state?.profile?.rol||'');
    if(role!=='ADMIN_TOTAL'){err.textContent='El resumen por supervisora estará disponible al publicar la función de Control de Auto.';host.dataset.v124Fallback='waiting';return}
    err.className='v123-supervisor-loading';err.textContent='Recuperando el resumen desde el respaldo GPS…';
    try{
      const {data}=await req('/functions/v1/gps-rym-admin',{method:'POST',body:JSON.stringify({q:'',galera:'TODAS',estado:'TODOS',onlyProblems:false})});if(!data?.ok)throw Error(data?.error||'Respaldo no disponible');
      const groups=new Map();(data.rows||[]).filter(r=>['ACTIVO','ACTIVA','ACTIVE'].includes(N(r.estatus_control))).forEach(r=>{const sup=String(r.supervisora||'SIN SUPERVISORA').trim()||'SIN SUPERVISORA',gal=String(r.galera||'').trim(),key=`${sup}|${gal}`,g=groups.get(key)||{supervisora:sup,galera:gal,total:0,activas:0,abono_adicional:0,paradas:0};g.total++;const st=N(r.estado_operativo);if(st==='ACTIVO'||st==='CONVENIO')g.activas++;else if(st==='ABONO ADICIONAL')g.abono_adicional++;else g.paradas++;groups.set(key,g)});
      const rows=[...groups.values()].sort((a,b)=>b.total-a.total||a.supervisora.localeCompare(b.supervisora));host.innerHTML=supervisorMarkup(rows,'Respaldo GPS');host.dataset.v124Fallback='done';host.querySelectorAll('[data-v124-sup]').forEach(b=>b.onclick=async()=>{const row=rows[Number(b.dataset.v124Sup)];await window.v75ControlUnits?.();setTimeout(()=>{const q=document.querySelector('#ca6Q');if(q){q.value=row.supervisora;q.dispatchEvent(new Event('input',{bubbles:true}));q.focus()}},80)})
    }catch(e){err.className='v123-supervisor-error';err.textContent='Resumen por supervisora pendiente de activar. Publica la función control-auto-resumen-supervisoras.';host.dataset.v124Fallback='waiting'}
  }

  let timer=0;const enhance=()=>{clearTimeout(timer);timer=setTimeout(()=>{fixControlKpis();fallbackSupervisorSummary()},90)};new MutationObserver(enhance).observe(document.documentElement,{subtree:true,childList:true});enhance();
})();
