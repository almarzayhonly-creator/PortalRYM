/* Outer PWA shell. The host exposes only presentation/session status, never tokens. */
(function(w,d){
  'use strict';
  const frame=d.getElementById('portal'),loading=d.getElementById('loading');
  const status=d.getElementById('status'),subtitle=d.getElementById('subtitle');
  const install=d.getElementById('install');
  let prompt=null;
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/validator-tablet-sw.js',{scope:'/'}).catch(()=>{});
  w.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;install.hidden=false});
  install.addEventListener('click',async()=>{
    if(!prompt)return;
    await prompt.prompt();await prompt.userChoice.catch(()=>null);
    prompt=null;install.hidden=true;
  });
  function update(){
    const session=frame.contentWindow?.RYM_UNIT_VALIDATOR?.session();
    if(!session)return;
    frame.classList.add('ready');loading.hidden=true;
    subtitle.textContent=session.user||'Portal RYM';
    status.textContent=session.denied?'Sin acceso':!session.authenticated?'Inicia sesión':navigator.onLine?'Conectado':'Sin conexión';
  }
  w.addEventListener('message',e=>{
    if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.type==='rym-validator-state')update();
  });
  frame.addEventListener('load',update);
  w.addEventListener('online',update);w.addEventListener('offline',update);
  d.getElementById('exit').addEventListener('click',()=>{
    frame.contentWindow?.RYM_UNIT_VALIDATOR?.logout();update();
  });
})(window,document);
