/* Revisados Vue boundary: legacy is data-only; Vue owns every visible screen. */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES)return;

  let lastData=null;
  let mounting=null;

  const tabs=()=>{
    const c=lastData?.profile?.can||{};
    const role=String(lastData?.profile?.rol||w.state?.profile?.rol||'').trim().toUpperCase();
    const daily=typeof w.rymHasModule==='function'
      ? w.rymHasModule('revisados.reporte_diario')
      : role==='ADMIN_TOTAL';

    return [
      {id:'dashboard',label:'1. Mission Control',icon:'M'},
      ...(c.monthly?[{id:'monthly',label:'2. Avance y Auditoría',icon:'A'}]:[]),
      ...(c.operations?[{id:'operations',label:'3. Operaciones',icon:'O'}]:[]),
      ...(daily?[{id:'daily',label:'Reporte diario',icon:'R'}]:[]),
      ...(c.history?[{id:'history',label:'Historial & Trazabilidad',icon:'H'}]:[]),
      ...(c.stats?[{id:'stats',label:'Auditoría Forense',icon:'F'}]:[]),
      ...(c.boletas?[{id:'boletas',label:'Boletas y Retenciones',icon:'B'}]:[]),
      ...(c.cupos?[{id:'cupos',label:'Cupos',icon:'C'}]:[])
    ];
  };

  w.RYM_REVISADOS_BRIDGE={
    async load(force){
      if(typeof w.v66PrefetchRevisados!=='function')throw new Error('Revisados canonical data loader unavailable');
      const data=await w.v66PrefetchRevisados(force===true);
      if(!data?.ok)throw new Error(data?.error||'No se pudo cargar Revisados');
      lastData=data;
      return data;
    },
    profile(){return lastData?.profile||w.state?.profile||null},
    tabs,
    async request(path,init){
      if(typeof w.req!=='function')throw new Error('Portal request client unavailable');
      return (await w.req(path,init))?.data;
    },
    back(){return w.v36PortalHome?.()}
  };

  async function mountVue(){
    const app=d.querySelector('#app');
    if(!app)throw new Error('Portal app root unavailable');
    if(mounting)return mounting;

    d.body.dataset.rymModule='revisados';
    d.body.classList.remove('v60-revisados','v63-revisados','v66-revisados');
    d.body.classList.add('rym-revisados-vue');
    app.innerHTML='<main class="rym-revisados-loading" aria-live="polite">Cargando Revisados…</main>';

    mounting=(async()=>{
      const html=await fetch('/vue/dist/index.html',{cache:'no-store'}).then(r=>{
        if(!r.ok)throw new Error('No se pudo cargar Revisados Vue');
        return r.text();
      });

      for(const href of [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)/gi)].map(m=>m[1])){
        if(d.querySelector('link[data-rym-revisados-vue="'+href+'"]'))continue;
        const l=d.createElement('link');
        l.rel='stylesheet';
        l.href=href;
        l.dataset.rymRevisadosVue=href;
        d.head.appendChild(l);
      }

      const src=html.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i)?.[1];
      if(!src)throw new Error('Bundle Vue de Revisados no encontrado');
      await import(src);
    })().finally(()=>{mounting=null});

    return mounting;
  }

  w.RYM_REVISADOS_VUE={open:mountVue};
  w.RYM_MODULES.register('revisados',{open:mountVue});
})(window,document);
