(() => {
  'use strict';
  const app=window.RYM173;if(!app)throw new Error('V173 bootstrap missing');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount(message=''){
    const root=document.getElementById('rym-app');if(!root)throw new Error('V173 login mount missing');
    document.body.dataset.rymModule='login';
    root.innerHTML=`<main class="v173-login"><section class="v173-login-card"><div class="v173-login-mark">RYM</div><h1>Portal RYM</h1><p>Ingresa con tu usuario y contrasena.</p>${message?`<div class="v173-login-error">${esc(message)}</div>`:''}<form data-login-form><label>Usuario<input name="usuario" autocomplete="username" required></label><label>Contrasena<input name="password" type="password" autocomplete="current-password" required></label><button id="loginBtn" type="submit">Entrar</button></form></section></main>`;
    root.querySelector('[data-login-form]').onsubmit=async e=>{e.preventDefault();const b=root.querySelector('#loginBtn'),f=new FormData(e.currentTarget);b.disabled=true;b.textContent='Ingresando...';try{const result=await app.registry.get('auth').login(f.get('usuario'),f.get('password'));if(result.profile?.must_change_password)throw new Error('Debes cambiar tu contrasena antes de continuar.');delete document.body.dataset.rymModule;await app.registry.get('core').bootPortal();}catch(err){app.registry.get('auth').logout();mount(err.message||err);}};
  }
  app.register('login',{mount});
})();
