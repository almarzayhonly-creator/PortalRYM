
(function(){
  function mobile(){return window.matchMedia && window.matchMedia('(max-width:820px)').matches}
  function showable(){return !document.querySelector('.login-card,.v101-login,.login-wrap') && !!document.body}
  function ensureNav(){
    if(!mobile()||!showable()){document.getElementById('v115MobileNav')?.remove();return}
    let nav=document.getElementById('v115MobileNav');
    if(!nav){
      nav=document.createElement('nav');nav.id='v115MobileNav';nav.setAttribute('aria-label','Navegación móvil');
      nav.innerHTML='<button class="home" data-a="home"><i>⌂</i><span>Inicio</span></button><button data-a="pan"><i>P</i><span>Panapass</span></button><button data-a="rev"><i>R</i><span>Revisados</span></button><button data-a="ctl"><i>▣</i><span>Flota</span></button>';
      nav.addEventListener('click',function(e){const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;if(a==='home')window.v36PortalHome?.();if(a==='pan')window.v70OpenPanapass?.();if(a==='rev')window.v60OpenRevisados?.();if(a==='ctl')window.v70OpenControl?.()});
      document.body.appendChild(nav);
    }
  }
  const mo=new MutationObserver(()=>{clearTimeout(window.__v115navt);window.__v115navt=setTimeout(ensureNav,80)});
  mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',ensureNav);setTimeout(ensureNav,250);
})();
