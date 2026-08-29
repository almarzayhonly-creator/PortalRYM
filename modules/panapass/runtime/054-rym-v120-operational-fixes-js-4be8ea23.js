(function(){
  document.addEventListener('click',async e=>{
    const button=e.target?.closest?.('#v115MobileNav [data-a="ctl"]');if(!button)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(button.dataset.busy==='1')return;
    button.dataset.busy='1';button.classList.add('v120-opening');button.setAttribute('aria-busy','true');
    const label=button.querySelector('span'),old=label?.textContent||'Flota';if(label)label.textContent='Abriendo…';
    try{
      if((!Array.isArray(state.allModules)||!state.allModules.length)&&Array.isArray(state.modules))state.allModules=[...state.modules];
      const open=window.v70OpenControl;if(typeof open!=='function')throw Error('El módulo Flota todavía no está disponible.');
      await open();
    }catch(err){console.error('Navegación móvil Flota',err);if(typeof toast==='function')toast(err?.message||'No se pudo abrir Flota');else alert(err?.message||'No se pudo abrir Flota')}
    finally{button.dataset.busy='0';button.classList.remove('v120-opening');button.removeAttribute('aria-busy');if(label)label.textContent=old}
  },true);
})();
