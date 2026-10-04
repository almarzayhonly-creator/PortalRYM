/* Portal RYM Architecture V2 - Panapass boundary.
   Legacy rendering remains compatible through RYM_LEGACY_ROUTES only. */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES)return;
  let vueMounting=null;
  function vueEnabled(){try{return new URL(w.location.href).searchParams.get('panapassVue')==='1'}catch(_){return false}}
  async function mountVue(){
    if(vueMounting)return vueMounting;
    const app=d.querySelector('#app');
    if(!app)throw new Error('Portal app root unavailable');
    d.documentElement.dataset.rymVueModule='panapass-dashboard';
    app.innerHTML='<main class="rym-revisados-loading" aria-live="polite">Cargando Dashboard…</main>';
    vueMounting=(async()=>{
      const build=encodeURIComponent(String(w.RYM_BUILD_VERSION||Date.now()));
      const bust=url=>url+(url.includes('?')?'&':'?')+'v='+build;
      const html=await fetch('/vue/dist/index.html?v='+build,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('No se pudo cargar Dashboard Vue');return r.text()});
      for(const href of [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)/gi)].map(m=>m[1])){
        const key=href+'@'+build;if(d.querySelector('link[data-rym-panapass-vue="'+key+'"]'))continue;
        const link=d.createElement('link');link.rel='stylesheet';link.href=bust(href);link.dataset.rymPanapassVue=key;d.head.appendChild(link);
      }
      const src=html.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i)?.[1];
      if(!src)throw new Error('Bundle Vue de Dashboard no encontrado');
      await import(bust(src));
    })().finally(()=>{vueMounting=null});
    return vueMounting;
  }
  w.RYM_MODULES.register('panapass',{
    open:function(){
      d.body.dataset.rymModule='panapass';
      if(vueEnabled())return mountVue();
      const legacy=w.RYM_LEGACY_ROUTES;
      if(!legacy||typeof legacy.open!=='function')throw new Error('Panapass legacy bridge unavailable');
      return legacy.open('panapass');
    }
  });
})(window,document);
