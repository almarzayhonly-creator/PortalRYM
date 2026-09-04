/* Portal RYM - Panapass Command Center V2
   Progressive DOM enhancement over the existing dashboard data/rendering.
   Keeps business logic and click handlers intact while changing information architecture. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_COMMAND_CENTER_V2__) return;
  w.__RYM_PANAPASS_COMMAND_CENTER_V2__=true;

  const LABELS={
    active:'UNIDADES ACTIVAS',
    negatives:'NEGATIVOS HOY',
    paid:'REQUIRIERON PAGO',
    recurrent:'RECURRENTES',
    bajas:'BAJAS PANAPASS',
    noPan:'SIN PANAPASS'
  };

  const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toUpperCase();
  const el=(tag,cls,html)=>{const x=d.createElement(tag);if(cls)x.className=cls;if(html!=null)x.innerHTML=html;return x};

  function cardMap(top){
    const out={};
    [...top.querySelectorAll('.rym-admin-kpi')].forEach(card=>{
      const label=norm(card.querySelector('.label')?.textContent);
      for(const [key,value] of Object.entries(LABELS)) if(label===value) out[key]=card;
    });
    return out;
  }

  function valueOf(card){return String(card?.querySelector('strong')?.textContent||'—').trim()}

  function setCardRole(card,role,copy){
    if(!card)return;
    card.classList.add('rym-command-card');
    card.dataset.commandRole=role;
    if(copy&&!card.querySelector('.rym-command-explain')){
      const note=el('div','rym-command-explain');
      note.textContent=copy;
      card.appendChild(note);
    }
    if(card.classList.contains('click')&&!card.querySelector('.rym-command-link')){
      const link=el('span','rym-command-link');
      link.textContent='Ver detalle →';
      card.appendChild(link);
    }
  }

  function todayLabel(){
    try{return new Intl.DateTimeFormat('es-PA',{timeZone:'America/Panama',weekday:'long',day:'2-digit',month:'short'}).format(new Date())}
    catch(_){return 'Hoy'}
  }

  function enhanceTop(top){
    if(!top||top.dataset.commandEnhanced==='1'||top.dataset.rymReady!=='1')return false;
    const cards=cardMap(top);
    if(!cards.active||!cards.negatives||!cards.paid||!cards.bajas||!cards.noPan)return false;
    const exec=top.querySelector('.rym-exec-strip');
    if(!exec)return false;

    setCardRole(cards.negatives,'attention','Saldos negativos que necesitan revisión hoy.');
    setCardRole(cards.noPan,'attention','Unidades activas que todavía no tienen número Panapass.');
    setCardRole(cards.bajas,'attention','Casos pendientes de completar o cerrar.');
    setCardRole(cards.paid,'payment','Unidades que requirieron pago durante la jornada.');
    setCardRole(cards.active,'context','Base operativa actualmente visible.');
    setCardRole(cards.recurrent,'context','Unidades con 5 o más pagos en el mes.');

    const header=el('header','rym-command-header');
    header.innerHTML=`<div><span class="rym-command-eyebrow">PANAPASS · CENTRO DE OPERACIÓN</span><h1>Estado de hoy</h1><p>Primero revisa excepciones. Después pagos. Al final compara galeras.</p></div><div class="rym-command-date"><span>Actualizado</span><strong>${todayLabel()}</strong></div>`;

    const pulse=el('div','rym-command-pulse');
    pulse.innerHTML=`<span>Prioridades de hoy</span><strong>${valueOf(cards.negatives)} negativos</strong><i>•</i><strong>${valueOf(cards.noPan)} sin Panapass</strong><i>•</i><strong>${valueOf(cards.bajas)} bajas pendientes</strong>`;

    const attention=el('section','rym-command-section rym-attention-section');
    attention.innerHTML='<div class="rym-section-heading"><div><span>01</span><div><h2>Requiere atención</h2><p>Estos son los tres frentes que conviene revisar antes de continuar.</p></div></div><b>Acciones operativas</b></div>';
    const attentionGrid=el('div','rym-attention-grid');
    attentionGrid.append(cards.negatives,cards.noPan,cards.bajas);
    attention.appendChild(attentionGrid);

    const payment=el('section','rym-command-section rym-payment-section');
    payment.innerHTML='<div class="rym-section-heading"><div><span>02</span><div><h2>Pagos de hoy</h2><p>Menos unidades requiriendo pago representa mejor desempeño operativo.</p></div></div><b>Lectura del día</b></div>';
    const paymentBody=el('div','rym-payment-body');
    paymentBody.append(cards.paid,exec);
    payment.appendChild(paymentBody);

    const context=el('aside','rym-command-context');
    context.innerHTML='<div class="rym-context-heading"><span>Contexto</span><p>Volumen de operación y recurrencia.</p></div>';
    const contextGrid=el('div','rym-context-grid');
    contextGrid.append(cards.active,cards.recurrent);
    context.appendChild(contextGrid);

    const middle=el('div','rym-command-middle');
    middle.append(payment,context);

    top.replaceChildren(header,pulse,attention,middle);
    top.classList.add('rym-command-shell');
    top.dataset.commandEnhanced='1';
    return true;
  }

  function enhanceGaleraCard(card){
    if(!card||card.dataset.commandEnhanced==='1')return;
    const head=card.querySelector('.rym-gal-head');
    const metrics=card.querySelector('.rym-gal-metrics');
    const title=card.querySelector('.rym-7d-title');
    const days=card.querySelector('.rym-7d');
    if(!head||!metrics||!title||!days)return;

    const identity=el('div','rym-gal-identity');
    identity.appendChild(head);
    const action=el('span','rym-gal-action');action.textContent='Ver galera →';identity.appendChild(action);

    const trend=el('div','rym-gal-trend');
    trend.append(title,days);

    card.replaceChildren(identity,metrics,trend);
    card.classList.add('rym-command-galera');
    card.dataset.commandEnhanced='1';
  }

  function enhanceGalera(root){
    if(!root||root.dataset.commandEnhanced==='1'||root.dataset.rymReady!=='1')return false;
    const grid=root.querySelector('.galera-kpi-grid');
    if(!grid)return false;
    [...grid.querySelectorAll('.rym-gal-card')].forEach(enhanceGaleraCard);
    const heading=root.querySelector('.galera-kpi-title');
    if(heading){
      const h3=heading.querySelector('h3');
      const sub=heading.querySelector('span');
      if(h3)h3.textContent='Desempeño por galera';
      if(sub)sub.textContent='Compara volumen, incidencias y tendencia de 7 días sin abrir otra pantalla.';
      const n=el('span','rym-section-index');n.textContent='03';heading.prepend(n);
    }
    root.classList.add('rym-command-galeras');
    root.dataset.commandEnhanced='1';
    return true;
  }

  function enhance(){
    const body=d.body;
    const view=d.querySelector('#view');
    const isPan=body?.dataset?.rymModule==='panapass';
    const top=view?.querySelector('.rym-admin-kpis');
    const gal=view?.querySelector('#phase4GaleraKpis');
    if(!isPan||!top||!gal){body?.classList.remove('rym-panapass-command');return}
    const a=enhanceTop(top),b=enhanceGalera(gal);
    if(a||b||top.dataset.commandEnhanced==='1')body.classList.add('rym-panapass-command');
  }

  let raf=0;
  function schedule(){if(raf)return;raf=w.requestAnimationFrame(()=>{raf=0;enhance()})}
  const observer=new MutationObserver(schedule);
  observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-rym-ready','data-rym-module']});
  d.addEventListener('click',schedule,true);
  w.addEventListener('load',schedule,{once:true});
  schedule();
})(window,document);
