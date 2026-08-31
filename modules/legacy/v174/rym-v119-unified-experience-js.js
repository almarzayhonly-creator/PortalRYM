
(function(){
  const PAGE_SIZE=50;
  let tableSeq=0,timer=0;
  const text=x=>String(x?.textContent||'').trim();
  function paginate(table){
    const body=table.tBodies?.[0],rows=body?[...body.rows]:[];if(rows.length<=PAGE_SIZE)return;
    if(!table.dataset.v119Table)table.dataset.v119Table=String(++tableSeq);
    const id=table.dataset.v119Table,pages=Math.ceil(rows.length/PAGE_SIZE),page=Math.min(Number(table.dataset.v119Page||1),pages);table.dataset.v119Page=String(page);
    rows.forEach((r,i)=>r.hidden=!(i>=(page-1)*PAGE_SIZE&&i<page*PAGE_SIZE));
    const wrap=table.closest('.table-wrap,.v66-table-wrap,.v113-gps-table,.v66-daily-table')||table;
    let pager=document.querySelector(`.v119-pager[data-for="${id}"]`);
    if(!pager){pager=document.createElement('div');pager.className='v119-pager';pager.dataset.for=id;wrap.insertAdjacentElement('afterend',pager)}
    const start=(page-1)*PAGE_SIZE+1,end=Math.min(page*PAGE_SIZE,rows.length);
    const sig=[page,pages,rows.length,start,end].join('|');
    if(pager.dataset.v119Sig!==sig){
      pager.dataset.v119Sig=sig;
      pager.innerHTML=`<span><b>${start}–${end}</b> de ${rows.length} registros</span><div class="v119-pager-actions"><button type="button" data-dir="-1" ${page===1?'disabled':''}>← Anterior</button><span>Página ${page} de ${pages}</span><button type="button" data-dir="1" ${page===pages?'disabled':''}>Siguiente →</button></div>`;
      pager.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>{table.dataset.v119Page=String(page+Number(b.dataset.dir));paginate(table);wrap.scrollIntoView({block:'start',behavior:'smooth'})});
    }
  }
  function applyPagers(){document.querySelectorAll('table').forEach(paginate)}
  function compactMonthly(){
    if(!document.body.classList.contains('v66-revisados'))return;
    const title=text(document.querySelector('.v66-nav button.active'))||text(document.querySelector('.v66-title h1,.v66-main h1,h1'));
    if(!/Dashboard|Estadísticas/i.test(title))return;
    document.querySelectorAll('h2,h3').forEach(h=>{if(!/^(Avance por mes|Avance mensual)$/i.test(text(h)))return;const card=h.closest('.v66-card,section');if(!card||card.classList.contains('v119-month-summary'))return;card.classList.add('v119-month-summary');if(!card.querySelector('.v119-summary-note')){const n=document.createElement('p');n.className='v119-summary-note';n.textContent='Consulta el detalle completo y cada unidad pendiente en “Avance mensual”.';card.appendChild(n)}})
  }
  function enhanceUsers(){
    const detail=document.querySelector('#v70AdminDetail');if(!detail||detail.dataset.v119Bound)return;detail.dataset.v119Bound='1';
    detail.addEventListener('change',e=>{const perm=e.target.closest('[data-perm-mod]'),button=document.querySelector(perm?'#v70SavePerm':'#v70SaveUser');if(button)button.classList.add('v119-unsaved')});
  }
  function reportButtons(){document.querySelectorAll('.report-card').forEach(c=>{const h=text(c.querySelector('h3')),b=c.querySelector('button');if(!b||!h)return;b.classList.add('v119-report-action');if(text(b)==='Abrir reporte')b.textContent=`Abrir ${h}`})}
  function processSteps(){
    const names=[['Preparar desde pendientes PM','1'],['Validar pagos','2'],['Archivar pagos','3']];names.forEach(([name,n])=>document.querySelectorAll('button').forEach(b=>{if(text(b)===name){b.classList.add('v119-step');b.dataset.step=n}}));
  }
  function recipientTools(){
    document.querySelectorAll('.v66-recipient-list,.v92-rec-list').forEach(list=>{
      if(list.dataset.v119Rec){list._v121Apply?.();return}
      list.dataset.v119Rec='1';list.classList.add('v119-rec-list-collapsed');
      const bar=document.createElement('div');bar.className='v119-rec-toolbar';
      bar.innerHTML='<button type="button" class="v119-rec-toggle">Mostrar destinatarios</button><select class="v119-rec-role"><option value="">Todos los roles</option><option>SUPERVISORA</option><option>OPERATIVO</option><option>ADMIN</option><option>GERENTE_GALERA</option><option>PAGADOR</option></select><span class="v121-rec-count" aria-live="polite"></span>';
      list.before(bar);
      const toggle=bar.querySelector('.v119-rec-toggle'),role=bar.querySelector('.v119-rec-role'),count=bar.querySelector('.v121-rec-count');
      const search=list.parentElement?.querySelector('.v66-daily-search,input[placeholder*="destinatario" i],input[placeholder*="nombre" i]');
      const normRec=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
      const apply=()=>{
        const wantedRole=normRec(role.value),wantedText=normRec(search?.value);let visibleCount=0;
        list.querySelectorAll('label').forEach(item=>{
          const haystack=normRec(item.dataset.recipientSearch||item.dataset.v99rs||text(item));
          const visible=(!wantedRole||haystack.includes(wantedRole))&&(!wantedText||haystack.includes(wantedText));
          item.style.display=visible?'flex':'none';if(visible)visibleCount++;
        });
        if(wantedText){list.classList.remove('v119-rec-list-collapsed');toggle.textContent='Ocultar destinatarios'}
        count.textContent=wantedText||wantedRole?`${visibleCount} coincidencia${visibleCount===1?'':'s'}`:'';
      };
      list._v121Apply=apply;
      toggle.onclick=()=>{const closed=list.classList.toggle('v119-rec-list-collapsed');toggle.textContent=closed?'Mostrar destinatarios':'Ocultar destinatarios'};
      role.onchange=apply;
      search?.addEventListener('input',()=>setTimeout(apply,0));
      apply();
    })
  }
  function gpsClean(){
    if(!document.body.classList.contains('v113-gps'))return;const tools=document.querySelector('.v113-gps-tools');
    if(tools&&!document.querySelector('#v119GpsLevel')){const s=document.createElement('select');s.id='v119GpsLevel';s.innerHTML='<option value="">Todos los diagnósticos</option><option value="CRITICO">Críticos</option><option value="ALERTA">Alertas</option><option value="OK">OK</option><option value="SIN GPS">Sin GPS</option>';const go=document.querySelector('#v113Go');tools.insertBefore(s,go);s.onchange=()=>gpsClean()}
    const level=document.querySelector('#v119GpsLevel')?.value||'';document.querySelectorAll('.v113-gps tbody tr').forEach(r=>{const t=text(r).toUpperCase(),diag=text(r.querySelector('.v113-level')).toUpperCase();r.classList.toggle('v119-level-hidden',!!level&&!(level==='SIN GPS'?t.includes('SIN GPS'):diag===level));const walker=document.createTreeWalker(r,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode())n.nodeValue=n.nodeValue.replace(/\b1 días\b/g,'1 día').replace(/\b1 meses\b/g,'1 mes');const speed=r.querySelector('td[data-label="Velocidad"]');if(speed&&text(speed)==='km/h')speed.textContent='—'})
  }
  function wrapGpsDefault(){const old=window.v113OpenGps;if(typeof old!=='function'||old.__v119)return;const fn=async function(){const r=await old.apply(this,arguments);setTimeout(()=>{const b=document.querySelector('#v113Only');if(b&&b.dataset.on==='0'){b.dataset.on='1';b.textContent='✓ Solo problemas';document.querySelector('#v113Go')?.click()}},1800);return r};fn.__v119=true;window.v113OpenGps=fn;try{v113OpenGps=fn}catch(_){}}
  function enhance(){clearTimeout(timer);timer=setTimeout(()=>{applyPagers();compactMonthly();enhanceUsers();reportButtons();processSteps();recipientTools();gpsClean();wrapGpsDefault()},80)}
  const mo=new MutationObserver(enhance);mo.observe(document.documentElement,{subtree:true,childList:true});enhance();
})();
