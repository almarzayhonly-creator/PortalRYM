/* Portal RYM V169 final polish: ranking alignment + ENA PDF robust download */
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
      @media(max-width:720px){
        .v169-rank-group h4{font-size:12px!important}
        .v169-rank-table{border-radius:12px!important}
      }
    `;
    document.head.appendChild(style);
  }

  const PDF_ENDPOINT='https://avczyvcpmicpuhdkmxzx.supabase.co/functions/v1/panapass-baja-transferencia-pdf';
  const ENA_TEMPLATE='https://ena.com.pa/wp-content/uploads/2020/12/TRANSFERENCIA-DE-SALDO-POSITIVO.pdf';

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

  function openOfficialFallback(message){
    const w=window.open(ENA_TEMPLATE,'_blank','noopener');
    const text=(message&&String(message).trim())||'No se pudo generar el PDF firmado.';
    if(w){
      alert(text+'\n\nSe abrió como respaldo el formulario oficial de ENA usando el dominio válido.');
    }else{
      alert(text+'\n\nEl navegador bloqueó la ventana de respaldo. Habilita ventanas emergentes para abrir el formulario oficial ENA.');
    }
  }

  document.addEventListener('click',async function(event){
    const btn=event.target.closest?.('[data-v166-pdf]');
    if(!btn||btn.dataset.v169PdfBusy==='1') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const bajaId=Number(btn.dataset.v166Pdf);
    if(!Number.isFinite(bajaId)) return openOfficialFallback('No se encontró el identificador de la baja.');
    btn.dataset.v169PdfBusy='1';
    btn.disabled=true;
    const old=btn.textContent;
    btn.textContent='Generando…';
    try{
      const response=await fetch(PDF_ENDPOINT,{
        method:'POST',
        headers:authHeaders(),
        body:JSON.stringify({baja_id:bajaId}),
        cache:'no-store'
      });
      if(!response.ok){
        let message='HTTP '+response.status;
        try{
          const raw=await response.text();
          try{message=JSON.parse(raw)?.error||raw||message}catch(_){message=raw||message}
        }catch(_){ }
        throw new Error(message);
      }
      await downloadPdfResponse(response);
      btn.textContent='Generado ✓';
    }catch(error){
      btn.textContent='Abrir formulario ENA';
      openOfficialFallback(error?.message||String(error));
    }finally{
      btn.disabled=false;
      btn.dataset.v169PdfBusy='0';
      if(btn.textContent==='Generando…') btn.textContent=old;
    }
  },true);
})();
