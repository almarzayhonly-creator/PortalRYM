/* Portal RYM V172 clean - Panapass pagosTrabajo */
async function pagosTrabajo(v){
  v.innerHTML=`<div class="source-card"><span class="entity-chip">PAGOS HOY ONLINE</span><div class="source-text"><strong>La hoja de trabajo vive dentro del portal</strong><p>Carga los pendientes PM y registra únicamente lo que realmente se pagó. N_OP y Operador se bloquean cuando vienen asignados; solo se editan si faltan. Cobrador se completa con la supervisora asignada. Edita monto y tipo antes de archivar.</p></div></div>
  <div class="section-tools"><button id="pmFromPM">Preparar desde pendientes PM</button><button id="pmValidate" class="soft-btn" title="Revisa solo los pagos con monto mayor que 0 antes de archivar">Validar pagos</button><button id="pmArchive" class="danger" title="Guarda definitivamente en el historial solo los pagos marcados y limpia la hoja de trabajo">Archivar pagos</button><button id="pmReload" class="soft-btn">Recargar</button><div class="share-note">Ya no necesitas importar el Excel para trabajar Pagos Hoy.</div></div><div id="pmMsg"></div><div id="pmOut"><div class="card">Cargando...</div></div>`;
  let rows=[];
  async function load(){const o=document.querySelector('#pmOut');o.innerHTML='<div class="card">Leyendo hoja online...</div>';try{rows=await rpc('panapass_v10_pagos_hoy');const paid=rows.filter(x=>Number(x.a_pagar)>0),total=paid.reduce((a,x)=>a+Number(x.a_pagar||0),0),boleta=paid.reduce((a,x)=>a+Number(x.con_boleta||0),0);o.innerHTML=`<div class="kpis"><div class="kpi"><span>Pendientes cargados</span><strong>${rows.length}</strong></div><div class="kpi"><span>Marcados pagados</span><strong>${paid.length}</strong></div><div class="kpi"><span>Total pagado</span><strong style="color:var(--green)">${money(total)}</strong></div><div class="kpi"><span>Boleta</span><strong>${money(boleta)}</strong></div></div>${pagosTrabajoTable(rows)}`;bind()}catch(x){o.innerHTML=`<div class="alert">${esc(x.message)}</div>`}}
  function bind(){
    // Estado de guardado compartido: viene de Supabase, no del navegador local.
    const mark=(b,tr,isSaved,dirty=false)=>{
      if(!b||!tr)return;
      const td=b.closest('td');
      let badge=td?.querySelector('[data-save-state]');
      if(!badge&&td){
        badge=document.createElement('div');
        badge.setAttribute('data-save-state','');
        badge.style.marginTop='5px';
        badge.style.fontSize='10px';
        badge.style.fontWeight='900';
        td.appendChild(badge);
      }
      if(isSaved){
        b.disabled=true;
        b.textContent='Guardado ✓';
        b.classList.add('pay-save-done');
        tr.classList.add('pay-row-saved');
        tr.classList.remove('pay-row-dirty');
        if(badge){badge.textContent='GUARDADO ✓';badge.className='pay-save-state ok'}
      }else{
        b.disabled=false;
        b.textContent=dirty?'Guardar cambios':'Guardar';
        b.classList.remove('pay-save-done');
        tr.classList.remove('pay-row-saved');
        tr.classList.toggle('pay-row-dirty',!!dirty);
        if(badge){badge.textContent=dirty?'CAMBIOS SIN GUARDAR':'';badge.className='pay-save-state'+(dirty?' dirty':'')}
      }
    };
    document.querySelectorAll('[data-save-pay]').forEach(b=>{
      const tr=b.closest('tr'),m=document.querySelector('#pmMsg');
      mark(b,tr,tr.dataset.paySaved==='1',false);

      const dirty=()=>{
        mark(b,tr,false,true);
      };
      tr.querySelectorAll('[data-pay],[data-nop],[data-op],[data-tipo]').forEach(el=>{
        el.addEventListener('input',dirty);
        el.addEventListener('change',dirty);
      });

      b.onclick=async()=>{
        if(b.disabled)return;
        b.disabled=true;
        b.textContent='Guardando...';
        try{
          const rr=await rpc('panapass_pagos_hoy_editar',{
            p_id:Number(b.dataset.savePay),
            p_a_pagar:Number(tr.querySelector('[data-pay]').value||0),
            p_numero_operador:tr.querySelector('[data-nop]').value||null,
            p_nombre_operador:tr.querySelector('[data-op]').value||null,
            p_cobrador:tr.querySelector('[data-cobrador]').value||null,
            p_tipo:tr.querySelector('[data-tipo]').value
          });
          const row=Array.isArray(rr)?rr[0]:rr;
          if(row?.updated_at)tr.dataset.payUpdated=String(row.updated_at);
          if(row?.con_boleta!==undefined&&tr.children?.[5]){
            const boletaEl=tr.children[5].querySelector('b');
            if(boletaEl)boletaEl.textContent=money(row.con_boleta);
          }
          tr.dataset.paySaved='1';
          if(row?.guardado_en)tr.dataset.paySavedAt=String(row.guardado_en);
          mark(b,tr,true,false);
          m.innerHTML='<div class="success">Fila guardada ✓</div>';
        }catch(x){
          mark(b,tr,false,true);
          m.innerHTML=`<div class="alert">${esc(x.message)}</div>`;
        }
      };
    })
  }
  document.querySelector('#pmReload').onclick=load;
  document.querySelector('#pmFromPM').onclick=async()=>{const m=document.querySelector('#pmMsg');try{const r=(await rpc('panapass_pagos_hoy_cargar_desde_pm'))[0];m.innerHTML=`<div class="success">${esc(r?.mensaje||'Pagos Hoy preparado.')}</div>`;await load()}catch(x){m.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
  document.querySelector('#pmValidate').onclick=async()=>{const m=document.querySelector('#pmMsg');try{const r=(await rpc('panapass_v10_validar_pagos_hoy'))[0];m.innerHTML=r.ok?`<div class="success">Validación OK · ${r.registros} pagos · ${money(r.total_a_pagar)}</div>`:`<div class="alert">${esc(JSON.stringify(r.errores))}</div>`}catch(x){m.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
  document.querySelector('#pmArchive').onclick=async()=>{if(!confirm('¿Archivar los pagos marcados?'))return;const m=document.querySelector('#pmMsg');try{const r=(await rpc('panapass_v10_archivar_pagos_hoy'))[0];m.innerHTML=`<div class="success">${esc(r.mensaje)} · ${r.registros} registros</div>`;await load()}catch(x){m.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
  await load();
}
