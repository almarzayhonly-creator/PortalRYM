
(function(){
  function addMobileAdmin(){
    if(!document.body.classList.contains('v99-home'))return;
    const isAdmin=String(state?.profile?.rol||'').trim().toUpperCase()==='ADMIN_TOTAL';
    const mods=Array.isArray(state?.allModules)&&state.allModules.length?state.allModules:(state?.modules||[]);
    if(!isAdmin)return;
    const top=document.querySelector('.v101-top-right');
    if(top&&!top.querySelector('#v118TopUsers')){
      const b=document.createElement('button');b.id='v118TopUsers';b.className='v118-top-users';b.title='Usuarios';b.textContent='U';b.onclick=()=>window.v70OpenUsers?.();top.insertBefore(b,top.querySelector('#v117TopLogout')||null);
    }
  }
  const mo=new MutationObserver(()=>{clearTimeout(window.__v118t);window.__v118t=setTimeout(addMobileAdmin,60)});
  mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  setTimeout(addMobileAdmin,180);
})();
