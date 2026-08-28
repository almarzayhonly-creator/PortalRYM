/* Portal RYM V169 final polish: ranking alignment + recurrentes redesign + ENA PDF robust download */
(function(){
  'use strict';

  const STYLE_ID='v169-final-polish-css';
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* Ranking: centered section titles, consistent column alignment. */
      .v93-rank-head{justify-content:center!important;text-align:center!important;flex-direction:column!important;align-items:center!important;gap:2px!important}
      .v93-rank-head h3,.v93-rank-head span{width:100%!important;text-align:center!important}
      .v169-rank-group h4{text-align:center!important;margin:0 0 8px!important}
      .v169-rank-table th:nth-child(1),.v169-rank-table td:nth-child(1){text-align:center!important}
      .v169-rank-table th:nth-child(2),.v169-rank-table td:nth-child(2){text-align:left!important}
      .v169-rank-table th:nth-child(3),.v169-rank-table td:nth-child(3){text-align:center!important}
      .v169-rank-table th:nth-child(4),.v169-rank-table td:nth-child(4),
      .v169-rank-table th:nth-child(5),.v169-rank-table td:nth-child(5){text-align:right!important}
      .v169-rank-table th{vertical-align:middle!important}
      .v169-rank-table td{vertical-align:middle!important}

      /* Recurrentes V2: real layout change, isolated from the older v123 rules. */
      .v169-rec.v169-rec-r2{display:block!important}
      .v169-rec-r2 .v169r2-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:18px!important;padding:16px 18px!important;margin:0 0 10px!important;border:1px solid #cfe0f4!important;border-radius:16px!important;background:linear-gradient(135deg,#f8fbff 0%,#eef5ff 100%)!important;box-shadow:0 8px 22px rgba(23,74,139,.06)!important}
      .v169-rec-r2 .v169r2-title{min-width:0!important}
      .v169-rec-r2 .v169r2-eyebrow{display:block!important;margin-bottom:3px!important;color:#47719e!important;font-size:8px!important;font-weight:1000!important;letter-spacing:.08em!important;text-transform:uppercase!important}
      .v169-rec-r2 .v169r2-title h3{margin:0!important;color:#0b376f!important;font-size:20px!important;line-height:1.1!important}
      .v169-rec-r2 .v169r2-title p{margin:5px 0 0!important;color:#667b94!important;font-size:9.5px!important;line-height:1.35!important}
      .v169-rec-r2 .v169r2-mode-slot{flex:0 0 auto!important}
      .v169-rec-r2 .v123-rec-mode{display:inline-flex!important;align-items:center!important;gap:4px!important;padding:4px!important;margin:0!important;border:1px solid #cbdcf0!important;border-radius:12px!important;background:#fff!important;box-shadow:0 4px 12px rgba(23,74,139,.05)!important}
      .v169-rec-r2 .v123-rec-mode button{width:auto!important;min-width:128px!important;min-height:34px!important;margin:0!important;padding:7px 13px!important;border:0!important;border-radius:9px!important;background:transparent!important;color:#4a6687!important;font-size:9.5px!important;font-weight:1000!important;box-shadow:none!important}
      .v169-rec-r2 .v123-rec-mode button.active{background:#1f5fb5!important;color:#fff!important;box-shadow:0 5px 12px rgba(31,95,181,.18)!important}
      .v169-rec-r2 .v169-rec-toolbar.v169r2-filters{display:grid!important;grid-template-columns:minmax(180px,1fr) minmax(170px,.9fr) minmax(145px,.7fr) minmax(130px,.55fr)!important;gap:10px!important;align-items:end!important;margin:0 0 10px!important;padding:12px!important;border:1px solid #d8e4f1!important;border-radius:14px!important;background:#fff!important;box-shadow:0 5px 16px rgba(18,62,113,.04)!important}
      .v169-rec-r2 .v169-rec-toolbar.v169r2-filters .field{margin:0!important;min-width:0!important}
      .v169-rec-r2 .v169-rec-toolbar.v169r2-filters label,.v169-rec-r2 .v169-rec-search label{display:block!important;margin:0 0 5px!important;color:#58708d!important;font-size:8px!important;font-weight:1000!important;text-transform:uppercase!important;letter-spacing:.03em!important}
      .v169-rec-r2 .v169-rec-toolbar.v169r2-filters input,.v169-rec-r2 .v169-rec-toolbar.v169r2-filters select,.v169-rec-r2 .v169-rec-search input{width:100%!important;height:38px!important;min-height:38px!important;padding:7px 10px!important;border:1px solid #cddcec!important;border-radius:10px!important;background:#fbfdff!important;color:#163d6b!important;font-size:10px!important;box-sizing:border-box!important}
      .v169-rec-r2 #v123RecGo{width:100%!important;height:38px!important;min-height:38px!important;margin:0!important;padding:7px 14px!important;border:0!important;border-radius:10px!important;background:#1f5fb5!important;color:#fff!important;font-size:10px!important;font-weight:1000!important;box-shadow:0 6px 14px rgba(31,95,181,.16)!important}
      .v169-rec-r2 #v123RecGo:hover{background:#174f9b!important}
      .v169-rec-r2 .v169r2-query-row{display:grid!important;grid-template-columns:minmax(0,1.35fr) minmax(320px,.65fr)!important;gap:10px!important;align-items:stretch!important;margin:0 0 10px!important}
      .v169-rec-r2 .v169-rec-search{margin:0!important;padding:10px 12px!important;border:1px solid #d8e4f1!important;border-radius:13px!important;background:#fff!important}
      .v169-rec-r2 .v169-rec-context{display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:flex-start!important;gap:4px!important;margin:0!important;padding:10px 12px!important;border:1px solid #d8e4f1!important;border-radius:13px!important;background:#f7fbff!important;color:#6a7c91!important;font-size:8.5px!important;line-height:1.35!important}
      .v169-rec-r2 .v169-rec-context b{color:#174a8b!important;font-size:9px!important}
      .v169-rec-r2 .v123-rec-summary{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;margin:0 0 10px!important}
      .v169-rec-r2 .v123-rec-summary article{position:relative!important;overflow:hidden!important;min-height:74px!important;margin:0!important;padding:13px 14px 12px 48px!important;border:1px solid #d8e4f1!important;border-radius:14px!important;background:#fff!important;box-shadow:0 5px 16px rgba(18,62,113,.05)!important}
      .v169-rec-r2 .v123-rec-summary article:before{position:absolute!important;left:13px!important;top:50%!important;transform:translateY(-50%)!important;width:27px!important;height:27px!important;display:grid!important;place-items:center!important;border-radius:9px!important;background:#eaf2ff!important;color:#1f5fb5!important;font-size:14px!important;font-weight:1000!important}
      .v169-rec-r2 .v123-rec-summary article:nth-child(1):before{content:'↻'!important}
      .v169-rec-r2 .v123-rec-summary article:nth-child(2):before{content:'!'!important;background:#fff0ef!important;color:#c9382f!important}
      .v169-rec-r2 .v123-rec-summary article:nth-child(3):before{content:'B/.'!important;background:#edf8f1!important;color:#15824b!important;font-size:9px!important}
      .v169-rec-r2 .v123-rec-summary article span{display:block!important;margin:0!important;color:#6b7c91!important;font-size:8px!important;font-weight:1000!important;text-transform:uppercase!important;letter-spacing:.03em!important}
      .v169-rec-r2 .v123-rec-summary article b{display:block!important;margin:3px 0 0!important;color:#0b376f!important;font-size:20px!important;line-height:1.05!important}
      .v169-rec-r2 .v123-rec-summary article.bad{border-color:#f1d6d3!important;background:#fffafa!important}
      .v169-rec-r2 .v123-rec-summary article.bad b{color:#c9382f!important}
      .v169-rec-r2 .v123-rec-table{overflow:hidden!important;margin:0!important;border:1px solid #d3e0ee!important;border-radius:15px!important;background:#fff!important;box-shadow:0 7px 22px rgba(18,62,113,.05)!important}
      .v169-rec-r2 .v123-rec-table .table-wrap{overflow:auto!important}
      .v169-rec-r2 .v123-rec-table table{width:100%!important;border-collapse:separate!important;border-spacing:0!important;min-width:820px!important}
      .v169-rec-r2 .v123-rec-table thead th{position:sticky!important;top:0!important;z-index:1!important;padding:10px 12px!important;border:0!important;background:#174a8b!important;color:#fff!important;font-size:8.5px!important;font-weight:1000!important;text-transform:uppercase!important;letter-spacing:.025em!important;white-space:nowrap!important}
      .v169-rec-r2 .v123-rec-table thead th:first-child{text-align:left!important}
      .v169-rec-r2 .v123-rec-table thead th:not(:first-child){text-align:center!important}
      .v169-rec-r2 .v123-rec-table tbody td{padding:9px 12px!important;border:0!important;border-bottom:1px solid #e7eef6!important;background:#fff!important;color:#25486f!important;font-size:9.5px!important;vertical-align:middle!important}
      .v169-rec-r2 .v123-rec-table tbody tr:nth-child(even) td{background:#fbfdff!important}
      .v169-rec-r2 .v123-rec-table tbody tr:hover td{background:#f2f7fd!important}
      .v169-rec-r2 .v123-rec-table tbody tr:last-child td{border-bottom:0!important}
      .v169-rec-r2 .v123-rec-name b{display:block!important;color:#0b376f!important;font-size:10.5px!important;line-height:1.2!important}
      .v169-rec-r2 .v123-rec-name small,.v169-rec-r2 .v123-rec-metric small{display:block!important;margin-top:2px!important;color:#8391a3!important;font-size:8px!important;line-height:1.2!important}
      .v169-rec-r2 .v123-rec-metric b{color:#174a8b!important;font-size:10px!important}
      .v169-rec-r2 .v123-rec-table td[data-label='Unidad'],.v169-rec-r2 .v123-rec-table td[data-label='Supervisora'],.v169-rec-r2 .v123-rec-table td[data-label='Frecuencia'],.v169-rec-r2 .v123-rec-table td[data-label='Nivel']{text-align:center!important}
      .v169-rec-r2 .v123-rec-table td[data-label='Total']{text-align:right!important;font-variant-numeric:tabular-nums!important}
      .v169-rec-r2 .v123-rec-level{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:72px!important;padding:4px 8px!important;border-radius:999px!important;background:#edf3fb!important;color:#245e9f!important;font-size:8px!important;font-weight:1000!important;text-transform:uppercase!important}
      .v169-rec-r2 .v123-rec-level.critical{background:#fde8e6!important;color:#c62f27!important}
      .v169-rec-r2 .v123-rec-pager{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:9px 12px!important;border-top:1px solid #e4ecf5!important;background:#f8fbff!important;color:#687d96!important;font-size:8.5px!important}
      .v169-rec-r2 .v123-rec-pager button{min-height:30px!important;padding:5px 10px!important;border:1px solid #cddbea!important;border-radius:8px!important;background:#fff!important;color:#174a8b!important;font-size:8.5px!important;font-weight:900!important;box-shadow:none!important}
      .v169-rec-r2 .v123-rec-pager button:disabled{opacity:.45!important}

      @media(max-width:900px){
        .v169-rec-r2 .v169r2-head{align-items:flex-start!important;flex-direction:column!important}
        .v169-rec-r2 .v169r2-mode-slot,.v169-rec-r2 .v123-rec-mode{width:100%!important}
        .v169-rec-r2 .v123-rec-mode button{flex:1!important;min-width:0!important}
        .v169-rec-r2 .v169-rec-toolbar.v169r2-filters{grid-template-columns:1fr 1fr!important}
        .v169-rec-r2 .v169r2-query-row{grid-template-columns:1fr!important}
      }
      @media(max-width:620px){
        .v169-rec-r2 .v169r2-head{padding:13px!important;border-radius:14px!important}
        .v169-rec-r2 .v169r2-title h3{font-size:18px!important}
        .v169-rec-r2 .v169-rec-toolbar.v169r2-filters{grid-template-columns:1fr!important;padding:10px!important}
        .v169-rec-r2 .v123-rec-summary{grid-template-columns:1fr 1fr!important}
        .v169-rec-r2 .v123-rec-summary article:nth-child(3){grid-column:1/-1!important}
        .v169-rec-r2 .v123-rec-table{border-radius:12px!important}
        .v169-rec-r2 .v123-rec-pager{align-items:stretch!important;flex-direction:column!important}
        .v169-rec-r2 .v123-rec-pager>div{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important}
      }

      @media(max-width:720px){
        .v169-rank-group h4{font-size:12px!important}
        .v169-rank-table{border-radius:12px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceRecurrentes(){
    const rec=document.querySelector('.v169-rec');
    if(!rec) return;
    rec.classList.add('v169-rec-r2');
    const toolbar=rec.querySelector('.v169-rec-toolbar');
    if(toolbar && !rec.querySelector('.v169r2-head')){
      const mode=toolbar.querySelector('.v123-rec-mode');
      const head=document.createElement('div');
      head.className='v169r2-head';
      head.innerHTML='<div class="v169r2-title"><span class="v169r2-eyebrow">Control de pagos Panapass</span><h3>Pagos recurrentes</h3><p>Identifica operadores o unidades con múltiples pagos durante el período seleccionado.</p></div><div class="v169r2-mode-slot"></div>';
      rec.insertBefore(head,toolbar);
      if(mode) head.querySelector('.v169r2-mode-slot').appendChild(mode);
      toolbar.classList.add('v169r2-filters');

      const search=rec.querySelector('.v169-rec-search');
      const ctx=rec.querySelector('.v169-rec-context');
      if(search&&ctx){
        const row=document.createElement('div');
        row.className='v169r2-query-row';
        toolbar.after(row);
        row.appendChild(search);
        row.appendChild(ctx);
      }
    }
  }

  let recFrame=0;
  const scheduleRecurrentes=()=>{
    if(recFrame) return;
    recFrame=requestAnimationFrame(()=>{recFrame=0;enhanceRecurrentes()});
  };
  const recObserver=new MutationObserver(scheduleRecurrentes);
  recObserver.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('DOMContentLoaded',scheduleRecurrentes,{once:true});
  scheduleRecurrentes();

  const PDF_AUTOFILL_RETRY_V171=true;
  const PDF_ENDPOINTS=[
    'https://avczyvcpmicpuhdkmxzx.supabase.co/functions/v1/panapass-baja-transferencia-pdf-v2',
    'https://avczyvcpmicpuhdkmxzx.supabase.co/functions/v1/panapass-baja-transferencia-pdf'
  ];

  function authHeaders(){
    try{
      if(typeof H==='function') return {...H(),'content-type':'application/json'};
    }catch(_){ }
    return {'content-type':'application/json'};
  }

  function safeFilename(value){
    return String(value||'Transferencia_saldo_positivo.pdf').replace(/[\\/:*?"<>|]+/g,'_');
  }

  async function downloadPdfResponse(response){
    const type=(response.headers.get('content-type')||'').toLowerCase();
    if(!type.includes('application/pdf')) throw new Error('La respuesta recibida no es un PDF válido.');
    const blob=await response.blob();
    if(!blob.size) throw new Error('El PDF recibido está vacío.');
    const cd=response.headers.get('content-disposition')||'';
    const match=cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const filename=safeFilename(decodeURIComponent(match?.[1]||match?.[2]||'Transferencia_saldo_positivo.pdf'));
    const objectUrl=window.URL.createObjectURL(blob);
    let clicked=false;
    try{
      const a=document.createElement('a');
      a.href=objectUrl;
      a.download=filename;
      a.rel='noopener';
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      clicked=true;
      setTimeout(()=>a.remove(),250);
    }catch(_){ }
    if(!clicked){
      const opened=window.open(objectUrl,'_blank','noopener');
      if(!opened) throw new Error('El navegador bloqueó la descarga del PDF.');
    }
    setTimeout(()=>window.URL.revokeObjectURL(objectUrl),15000);
  }

  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  async function requestFilledPdf(bajaId){
    let lastError=new Error('No se pudo generar el formulario autollenado.');
    for(const endpoint of PDF_ENDPOINTS){
      const attempts=endpoint.endsWith('-v2')?3:2;
      for(let attempt=0;attempt<attempts;attempt++){
        try{
          const response=await fetch(endpoint,{
            method:'POST',
            headers:authHeaders(),
            body:JSON.stringify({baja_id:bajaId}),
            cache:'no-store'
          });
          if(response.ok) return response;
          let message='HTTP '+response.status;
          try{
            const raw=await response.text();
            try{message=JSON.parse(raw)?.error||raw||message}catch(_){message=raw||message}
          }catch(_){ }
          lastError=new Error(message);
          if(![429,502,503,504].includes(response.status)) break;
        }catch(error){
          lastError=error instanceof Error?error:new Error(String(error));
        }
        if(attempt<attempts-1) await wait(700*(attempt+1));
      }
    }
    throw lastError;
  }

  function showPdfError(message){
    alert('No se pudo generar el formulario ENA autollenado.\n\n'+((message&&String(message).trim())||'Intenta nuevamente en unos segundos.')+'\n\nNo se abrirá un formulario vacío.');
  }

  document.addEventListener('click',async function(event){
    const btn=event.target.closest?.('[data-v166-pdf]');
    if(!btn||btn.dataset.v169PdfBusy==='1') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const bajaId=Number(btn.dataset.v166Pdf);
    if(!Number.isFinite(bajaId)) return showPdfError('No se encontró el identificador de la baja.');
    btn.dataset.v169PdfBusy='1';
    btn.disabled=true;
    const old=btn.textContent;
    btn.textContent='Generando…';
    try{
      const response=await requestFilledPdf(bajaId);
      await downloadPdfResponse(response);
      btn.textContent='Generado ✓';
    }catch(error){
      btn.textContent='Abrir formulario ENA';
      showPdfError(error?.message||String(error));
    }finally{
      btn.disabled=false;
      btn.dataset.v169PdfBusy='0';
      if(btn.textContent==='Generando…') btn.textContent=old;
    }
  },true);
})();
