(() => {
  'use strict';
  const app=window.RYM173;if(!app)throw new Error('V173 bootstrap missing');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount(input=''){
    const message=typeof input==='string'?input:(typeof input?.message==='string'?input.message:'');
    const root=document.getElementById('rym-app');if(!root)throw new Error('V173 login mount missing');
    document.body.dataset.rymModule='login';
    root.innerHTML=`<main class="v173-login"><section class="v173-login-card"><div class="v173-login-logo"><img src="https://drive.google.com/thumbnail?id=1f65vwdwsAraUrK2h7cb5l_eVOQKuHsL8&sz=w1000" alt="Portal RYM" onerror="this.style.display='none'"></div><div class="v173-login-brand">Portal RYM</div><h1>Portal RYM</h1><p>Ingresa con tu usuario y contraseña.</p>${message?`<div class="v173-login-error">${esc(message)}</div>`:''}<form data-login-form><label class="v173-sr-only" for="v173-usuario">Usuario</label><input id="v173-usuario" name="usuario" autocomplete="username" placeholder="Usuario" required><label class="v173-sr-only" for="v173-password">Contraseña</label><input id="v173-password" name="password" type="password" autocomplete="current-password" placeholder="Contraseña" required><button id="loginBtn" type="submit">Entrar</button></form></section></main>`;
    root.querySelector('[data-login-form]').onsubmit=async e=>{e.preventDefault();const b=root.querySelector('#loginBtn'),f=new FormData(e.currentTarget);b.disabled=true;b.textContent='Ingresando...';try{const result=await app.registry.get('auth').login(f.get('usuario'),f.get('password'));if(result.profile?.must_change_password)throw new Error('Debes cambiar tu contraseña antes de continuar.');delete document.body.dataset.rymModule;await app.registry.get('core').bootPortal();}catch(err){app.registry.get('auth').logout();mount(err instanceof Error?err.message:String(err||'No se pudo iniciar sesión.'));}};
  }
  app.register('login',{mount});
})();
