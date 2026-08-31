
(function(){
 const isAdmin=()=>String(state?.profile?.rol||'').trim().toUpperCase()==='ADMIN_TOTAL';
 const mark=()=>document.body.classList.toggle('v100-admin-total',isAdmin());
 function enhance(){mark();if(!document.body.classList.contains('v99-home'))return;const hero=document.querySelector('.v99-hero>div:first-child');if(hero&&!hero.querySelector('.v99-priority')){const k=[...document.querySelectorAll('.v99-kpi')],u=k.filter(x=>x.classList.contains('bad')||x.classList.contains('warn')),top=u[0]||k[0],box=document.createElement('div');box.className='v99-priority';box.innerHTML=`<div class="ico">${u.length?'!':'✓'}</div><div><b>${u.length?'Prioridad de hoy':'Operación bajo control'}</b><span>${top?`${top.querySelector('span')?.textContent||''}: ${top.querySelector('strong')?.textContent||''} · ${top.querySelector('small')?.textContent||''}`:'Sin pendientes prioritarios.'}</span></div><div class="action">${u.length} alerta${u.length===1?'':'s'} prioritaria${u.length===1?'':'s'}</div>`;hero.appendChild(box)}document.querySelectorAll('.v99-kpi').forEach((c,i)=>c.style.setProperty('--v100-progress',`${Math.min(90,36+i*13)}%`))}
 new MutationObserver(()=>enhance()).observe(document.documentElement,{subtree:true,childList:true});enhance();
})();
