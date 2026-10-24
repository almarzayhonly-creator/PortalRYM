/* Outer PWA shell. The host exposes only presentation/session status, never tokens. */
(function(w,d){
  'use strict';
  const frame=d.getElementById('portal'),loading=d.getElementById('loading');
  const status=d.getElementById('status'),subtitle=d.getElementById('subtitle');
  const install=d.getElementById('install');
  let prompt=null;
  const build=d.querySelector('meta[name="rym-validator-build"]')?.content;
  let checking=false,reloading=false;
  let ready=false,bootTimer=0;
  const BOOT_WAIT_MS=12000;
  function restart(){
    ready=false;
    frame.classList.remove('ready');
    loading.hidden=false;
    loading.dataset.state='loading';
    loading.textContent='Cargando Portal RYM…';
    frame.src='/?validator-host=1&boot='+Date.now();
    armBootWatchdog();
  }
  function showBootError(){
    if(ready)return;
    loading.hidden=false;
    loading.dataset.state='error';
    loading.textContent=navigator.onLine
      ?'El validador no pudo terminar de abrirse.'
      :'No hay conexión para abrir el validador.';
    const actions=d.createElement('div');
    actions.className='uva-recovery-actions';
    const retry=d.createElement('button');
    retry.type='button';retry.textContent='Reintentar';
    retry.addEventListener('click',restart);
    const direct=d.createElement('a');
    direct.href='/?validator-host=1';
    direct.textContent='Abrir sin la pantalla de inicio';
    actions.append(retry,direct);
    loading.append(actions);
    status.textContent='Error al cargar';
  }
  function armBootWatchdog(){
    w.clearTimeout(bootTimer);
    bootTimer=w.setTimeout(showBootError,BOOT_WAIT_MS);
  }
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
    let session=null;
    try{session=frame.contentWindow?.RYM_UNIT_VALIDATOR?.session()}catch(_){}
    if(!session)return;
    ready=true;w.clearTimeout(bootTimer);
    frame.classList.add('ready');loading.hidden=true;loading.removeAttribute('data-state');
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
  // A cached iframe may finish before this deferred shell script installs listeners.
  update();
  if(!ready)armBootWatchdog();
  d.getElementById('exit').addEventListener('click',()=>{
    frame.contentWindow?.RYM_UNIT_VALIDATOR?.logout();update();
  });
})(window,document);
