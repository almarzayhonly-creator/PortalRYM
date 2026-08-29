/* Portal RYM V172 clean - Control Auto unit filters */
(function(w){
 'use strict';
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const N=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
 const fmt=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('es-PA',{timeZone:'America/Panama',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch(_){return String(v)}};
 /* ---------------- Control de Auto: filtros sin reemplazar tabla/ficha ---------------- */
 let ctlCache=null,ctlAt=0;
 async function ctlData(){if(ctlCache&&Date.now()-ctlAt<60000)return ctlCache;const r=await req('/functions/v1/control-auto-unidades-operativas',{method:'POST',body:'{}'});if(!r.data?.ok)throw Error(r.data?.error||'No se pudo cargar Control de Auto');ctlCache=r.data;ctlAt=Date.now();return ctlCache}
 function unitFromRow(tr){return N(tr?.querySelector('td[data-label="Unidad"]')?.textContent||tr?.children?.[1]?.textContent||'')}
 async function enhanceControl(){
   if(!document.body.classList.contains('v70-control'))return;
   if(!document.querySelector('[data-v75-control="unidades"].active'))return;
   const q=document.querySelector('#ca6Q'),tools=q?.closest('.section-tools'),out=document.querySelector('#ca6Out');if(!q||!tools||!out)return;
   let box=document.querySelector('#v154ControlFilters'),data;try{data=await ctlData()}catch(e){console.warn('V154 Control',e);return}
   const map=new Map((data.rows||[]).map(r=>[N(r.unidad),r]));
   if(!box){box=document.createElement('div');box.id='v154ControlFilters';box.className='v154-control-filters';box.innerHTML='<div class="field"><label>Color</label><select id="v154CtlColor"><option value="">Todos los colores</option></select></div><div class="field"><label>Estatus operativo</label><select id="v154CtlState"><option value="">Todos los estatus</option></select></div><div id="v154CtlCount" class="v154-control-count"></div>';tools.appendChild(box)}
   const color=box.querySelector('#v154CtlColor'),status=box.querySelector('#v154CtlState'),count=box.querySelector('#v154CtlCount');
   const fill=(el,vals,label)=>{const cur=el.value;el.innerHTML='<option value="">'+label+'</option>'+vals.map(x=>'<option value="'+E(x)+'">'+E(x)+'</option>').join('');if([...el.options].some(o=>o.value===cur))el.value=cur};
   const apply=()=>{const trs=[...out.querySelectorAll('tbody tr')].filter(tr=>tr.querySelector('td[data-label="Unidad"]'));const metas=trs.map(tr=>map.get(unitFromRow(tr))).filter(Boolean);fill(color,[...new Set(metas.map(x=>x.color).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'es')),'Todos los colores');fill(status,[...new Set(metas.map(x=>x.estado_operativo).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'es')),'Todos los estatus');let shown=0;trs.forEach(tr=>{const r=map.get(unitFromRow(tr)),ok=(!color.value||String(r?.color||'')===color.value)&&(!status.value||N(r?.estado_operativo)===N(status.value));tr.classList.toggle('v154-filter-hidden',!ok);if(ok)shown++});count.textContent=trs.length?shown+' de '+trs.length+' unidades':''};
   if(!box.dataset.bound){box.dataset.bound='1';color.addEventListener('change',apply);status.addEventListener('change',apply);q.addEventListener('input',()=>setTimeout(apply,360));document.querySelector('#ca6Go')?.addEventListener('click',()=>setTimeout(apply,120));document.querySelector('#ca6Active')?.addEventListener('click',()=>setTimeout(apply,160));document.querySelector('#ca6Other')?.addEventListener('click',()=>setTimeout(apply,160))}
   setTimeout(apply,20);
 }

 if(!w.RYM_CONTROL_ROUTER?.after)throw new Error('Control router hook API unavailable');
 w.RYM_CONTROL_ROUTER.after('unidades',enhanceControl);
})(window);
