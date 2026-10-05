/* Portal RYM - Panapass dashboard alert consistency fix
   Keeps the dashboard "Sin Panapass" KPI aligned with the home priority card.
   Business rule: count active missing-assignment alerts and Panapass numbers that
   are registered in Control de Auto but are not found in the external ENA query. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_NO_PAN_ALERT_FIX__) return;
  w.__RYM_PANAPASS_NO_PAN_ALERT_FIX__=true;

  const TYPES=new Set(['PANAPASS_NO_ASIGNADO','PANAPASS_NO_ENCONTRADO_ENA','PANAPASS_DIFERENTE_ENA','PLACA_DIFERENTE_ENA','TAG_DIFERENTE_ENA']);
  const CLOSED=new Set(['RESUELTA','RESUELTO','CERRADA','CERRADO']);
  const norm=s=>String(s||'').trim().toUpperCase();
  let loading=null,lastKey='',raf=0;

  function context(){
    return w.RYM_CONTEXT&&typeof w.RYM_CONTEXT.create==='function'
      ? w.RYM_CONTEXT.create('panapass-dashboard-no-panapass-fix')
      : null;
  }

  function activeAlert(x){
    return TYPES.has(norm(x?.tipo))&&!CLOSED.has(norm(x?.estado));
  }

  async function alerts(){
    if(loading) return loading;
    const c=context();
    if(!c?.api?.call) return [];
    loading=Promise.resolve(c.api.call('panapass_bajas_centro_v7'))
      .then(raw=>{
        const data=Array.isArray(raw)?(raw[0]||{}):(raw||{});
        return Array.isArray(data.alertas)?data.alertas.filter(activeAlert):[];
      })
      .catch(e=>{console.warn('Panapass dashboard alert sync',e);return []})
      .finally(()=>{loading=null});
    return loading;
  }

  function card(){
    const cards=[...d.querySelectorAll('#view .rym-admin-kpi,#view .rym-p2-card')];
    return cards.find(x=>norm(x.querySelector('.label')?.textContent)==='SIN PANAPASS')
      ||cards.find(x=>x.dataset?.p2Role==='missing')
      ||null;
  }

  function detail(x){
    const t=norm(x?.tipo);
    if(t==='PANAPASS_NO_ENCONTRADO_ENA') return 'Panapass registrado, no encontrado en ENA';
    if(t==='PANAPASS_DIFERENTE_ENA') return 'Panapass no coincide con ENA';
    if(t==='PLACA_DIFERENTE_ENA') return 'Placa no coincide con ENA';
    if(t==='TAG_DIFERENTE_ENA') return 'TAG no coincide con ENA';
    return 'Sin número Panapass asignado';
  }

  function rows(list){
    return list.map(x=>({
      unidad:x.unidad||x.numero_unidad||'',
      placa:x.placa||'',
      galera:x.galera||'',
      empresa:x.empresa||x.empresa_operadora||'',
      panapass:x.panapass_numero||'',
      panapass_ena:x.detalle?.panapass_ena||'',
      placa_ena:x.detalle?.placa_ena||'',
      tag_ena:x.detalle?.tag_ena||'',
      detalle:x.mensaje||x.observacion||detail(x)
    }));
  }

  function openRows(list){
    const data=rows(list);
    try{
      if(typeof w.openDataWindow==='function'&&typeof w.rowsTable==='function'){
        w.openDataWindow(
          'Control Panapass / ENA',
          `${data.length} unidades requieren acción`,
          w.rowsTable(data,['unidad','placa','galera','empresa','panapass','panapass_ena','placa_ena','tag_ena','detalle'])
        );
        return;
      }
    }catch(e){console.warn('Panapass dashboard alert detail',e)}
    try{
      const c=context();
      if(c?.router?.open) c.router.open('reportes');
    }catch(e){console.warn('Panapass dashboard alert navigation',e)}
  }

  async function sync(){
    if(d.body?.dataset?.rymModule!=='panapass') return;
    const target=card();
    if(!target) return;
    const list=await alerts();
    const count=list.length;
    const key=`${count}:${list.map(x=>`${x.id||''}-${x.tipo||''}-${x.estado||''}`).join('|')}`;

    const label=target.querySelector('.label');
    if(label) label.textContent='Control Panapass / ENA';
    const strong=target.querySelector('strong');
    if(strong&&strong.textContent!==String(count)) strong.textContent=String(count);
    const small=target.querySelector('small');
    if(small) small.textContent='Sin asignación o inconsistencia con ENA';
    target.dataset.rymAlertCount=String(count);
    target.onclick=()=>openRows(list);

    const alertItem=d.querySelector('#view .rym-p2-alert-item.missing');
    if(alertItem){
      const b=alertItem.querySelector('b');
      if(b&&b.textContent!==String(count)) b.textContent=String(count);
      const s=alertItem.querySelector('small');
      if(s) s.textContent='Sin asignación o inconsistencia con ENA';
    }
    lastKey=key;
  }

  function schedule(){
    if(raf) return;
    raf=w.requestAnimationFrame(()=>{raf=0;void sync()});
  }

  const observer=new MutationObserver(schedule);
  observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-rym-ready','data-rym-module','class']});
  d.addEventListener('click',schedule,true);
  w.addEventListener('load',schedule,{once:true});
  schedule();
})(window,document);

