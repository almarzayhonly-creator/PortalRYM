/* Outer PWA shell. The host exposes only presentation/session status, never tokens. */
(function(w,d){
  'use strict';
  const frame=d.getElementById('portal'),loading=d.getElementById('loading');
  const status=d.getElementById('status'),subtitle=d.getElementById('subtitle');
  const install=d.getElementById('install');
  let prompt=null;
  const build=d.querySelector('meta[name="rym-validator-build"]')?.content;
  let checking=false,reloading=false;
  async function checkBuild(){
    if(checking||!navigator.onLine||d.visibilityState==='hidden')return;
    checking=true;
    try{
      const response=await fetch('/?app=validador-unidad',{cache:'no-store'});
      const next=response.headers.get('x-portal-build');
      if(response.ok&&next&&build&&next!==build&&!reloading){
        reloading=true;w.location.reload();
      }
    }catch(_){}finally{checking=false}
  }
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/validator-tablet-sw.js',{scope:'/',updateViaCache:'none'})
      .then(registration=>registration.update()).catch(()=>{});
    navigator.serviceWorker.addEventListener('controllerchange',()=>{void checkBuild()});
  }
  d.addEventListener('visibilitychange',()=>{void checkBuild()});
  w.addEventListener('online',()=>{void checkBuild()});
  w.setInterval(()=>{void checkBuild()},60000);
  void checkBuild();
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
    status.textContent=session.pending?'Verificando acceso':session.denied?'Sin acceso':!session.authenticated?'Inicia sesión':navigator.onLine?'Conectado':'Sin conexión';
    const exit=d.getElementById('exit');
    if(exit)exit.hidden=!session.authenticated;
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
