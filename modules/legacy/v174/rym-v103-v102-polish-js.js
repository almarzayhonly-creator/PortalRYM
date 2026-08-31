
(function(){
  const medalIcon=`<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#f2bb25" d="M8 3h6l2 8-5 4zM24 3h-6l-2 8 5 4z"/><circle cx="16" cy="18" r="9" fill="#ffd94e" stroke="#c99413" stroke-width="1.5"/><path d="M16 12.4l1.7 3.4 3.7.5-2.7 2.6.7 3.7-3.4-1.8-3.4 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#fff5bd"/></svg>`;
  const checkIcon=`<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#1e9b68"/><path d="M9.5 16.2l4.2 4.2 8.9-9.3" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const warnIcon=`<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#e89218"/><path d="M16 9v9" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="23" r="1.8" fill="#fff"/></svg>`;
  const shieldIcon=`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3.5l10 4v7.2c0 7.1-4 11.2-10 14-6-2.8-10-6.9-10-14V7.5z" fill="#18865b"/><path d="M10.5 15.7l3.5 3.5 7.5-8" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const panSvg=`<svg viewBox="0 0 300 170" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="solBlueBody2" x1="0" x2="1"><stop offset="0" stop-color="#2e79d9"/><stop offset="1" stop-color="#1c5ab8"/></linearGradient><linearGradient id="solBlueGlass2" x1="0" x2="1"><stop offset="0" stop-color="#dff2ff"/><stop offset="1" stop-color="#9fd0ee"/></linearGradient></defs><ellipse cx="136" cy="137" rx="82" ry="10" fill="#dce8f5"/><g transform="translate(18 6)"><path d="M44 112c4-12 12-21 24-28l26-16c14-8 26-12 43-12h26c13 0 23 3 32 11l23 20 20 7c8 3 13 10 13 18v8H34v-2c0-3 2-6 10-6z" fill="url(#solBlueBody2)"/><path d="M96 67c11-7 20-10 36-10h24c11 0 18 2 25 8l19 18H72c4-7 12-12 24-16z" fill="url(#solBlueGlass2)"/><path d="M72 84h129" stroke="#173f7d" stroke-width="2.2" opacity=".35"/><path d="M118 62v21M160 59v24" stroke="#5f88bf" stroke-width="2" opacity=".85"/><path d="M91 83l-10 18M204 83l10 18" stroke="#163e7d" stroke-width="2.2" opacity=".35"/><path d="M213 93h17c6 0 11 5 11 11v4h-32z" fill="#1b4e9d" opacity=".22"/><rect x="45" y="100" width="16" height="8" rx="3" fill="#ffd35a"/><rect x="232" y="101" width="11" height="8" rx="2.5" fill="#ef6b66"/><path d="M45 108h18" stroke="#f8fbff" stroke-width="1.5" opacity=".7"/><path d="M95 108h95" stroke="#173f7d" stroke-width="2" opacity=".22"/><circle cx="92" cy="120" r="17" fill="#23384f"/><circle cx="92" cy="120" r="8" fill="#eff5fa"/><circle cx="199" cy="120" r="17" fill="#23384f"/><circle cx="199" cy="120" r="8" fill="#eff5fa"/><path d="M36 119h220" stroke="#183252" stroke-width="2" opacity=".1"/></g><g transform="translate(228 24)"><rect x="10" y="16" width="12" height="88" rx="2" fill="#2c65bb"/><rect x="22" y="24" width="42" height="8" rx="2" fill="#2c65bb"/><rect x="22" y="44" width="34" height="7" rx="2" fill="#efb23d"/><rect x="22" y="63" width="28" height="7" rx="2" fill="#69a6e5"/></g></svg>`;
  const revSvg=`<svg viewBox="0 0 260 160" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><ellipse cx="135" cy="134" rx="62" ry="8" fill="#fff0d6"/><rect x="72" y="23" width="102" height="112" rx="13" fill="#fff5e8"/><rect x="82" y="31" width="82" height="96" rx="8" fill="#fff" stroke="#ed9c34" stroke-width="3"/><rect x="105" y="18" width="36" height="14" rx="7" fill="#4e5e70"/><g fill="#1f9868"><rect x="94" y="51" width="11" height="11" rx="2"/><rect x="94" y="76" width="11" height="11" rx="2"/><rect x="94" y="101" width="11" height="11" rx="2"/></g><g stroke="#405266" stroke-width="3" stroke-linecap="round"><path d="M113 56h35M113 81h35M113 106h27"/></g><circle cx="178" cy="107" r="29" fill="#1b9162"/><path d="M164 107l9 9 19-21" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ctlSvg=`<svg viewBox="0 0 300 170" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="solGreenBody2" x1="0" x2="1"><stop offset="0" stop-color="#54c89a"/><stop offset="1" stop-color="#2d9e72"/></linearGradient><linearGradient id="solGreenGlass2" x1="0" x2="1"><stop offset="0" stop-color="#eefdf6"/><stop offset="1" stop-color="#cfeedd"/></linearGradient></defs><ellipse cx="140" cy="137" rx="84" ry="10" fill="#dff1e8"/><g transform="translate(18 6)"><path d="M44 112c4-12 12-21 24-28l26-16c14-8 26-12 43-12h26c13 0 23 3 32 11l23 20 20 7c8 3 13 10 13 18v8H34v-2c0-3 2-6 10-6z" fill="url(#solGreenBody2)"/><path d="M96 67c11-7 20-10 36-10h24c11 0 18 2 25 8l19 18H72c4-7 12-12 24-16z" fill="url(#solGreenGlass2)"/><path d="M72 84h129" stroke="#11543e" stroke-width="2.2" opacity=".33"/><path d="M118 62v21M160 59v24" stroke="#73b89a" stroke-width="2" opacity=".9"/><path d="M91 83l-10 18M204 83l10 18" stroke="#13553f" stroke-width="2.2" opacity=".33"/><path d="M213 93h17c6 0 11 5 11 11v4h-32z" fill="#1f7d5d" opacity=".18"/><rect x="45" y="100" width="16" height="8" rx="3" fill="#f7fcf9"/><rect x="232" y="101" width="11" height="8" rx="2.5" fill="#ee6d68"/><path d="M45 108h18" stroke="#ffffff" stroke-width="1.5" opacity=".72"/><path d="M95 108h95" stroke="#11543e" stroke-width="2" opacity=".18"/><circle cx="92" cy="120" r="17" fill="#1f4036"/><circle cx="92" cy="120" r="8" fill="#eef6f1"/><circle cx="199" cy="120" r="17" fill="#1f4036"/><circle cx="199" cy="120" r="8" fill="#eef6f1"/><path d="M36 119h220" stroke="#17352d" stroke-width="2" opacity=".1"/></g><g transform="translate(242 48)"><path d="M22 0l18 7v14c0 16-9 26-18 32C13 47 4 37 4 21V7z" fill="#1d8a5f"/><path d="M14 24l6 6 12-14" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;

  function statusBadge(card,type){
    const badge=card?.querySelector('.v99-badge');if(!badge)return;
    const minis=[...card.querySelectorAll('.v99-mini b')].map(x=>x.textContent.trim());
    badge.classList.add('v103-state-badge');
    if(type==='pan'){
      const negativos=Number(minis[0]||0),rank=badge.textContent.trim()||'Sin ranking';
      badge.classList.add(negativos>0?'warn':'medal');
      badge.innerHTML=negativos>0
        ?`<span class="v103-state-icon">${warnIcon}</span><span class="v103-state-copy"><b>${negativos} por revisar</b><small>Negativos Panapass</small></span>`
        :`<span class="v103-state-icon">${medalIcon}</span><span class="v103-state-copy"><b>${rank}</b><small>Posición en galera</small></span>`;
    }else if(type==='rev'){
      const pendientes=Number(minis[0]||0),criticos=Number(minis[1]||0),ok=pendientes===0&&criticos===0;
      badge.classList.add(ok?'good':'warn');
      badge.innerHTML=`<span class="v103-state-icon">${ok?checkIcon:warnIcon}</span><span class="v103-state-copy"><b>${ok?'Al día':`${pendientes} pendiente${pendientes===1?'':'s'}`}</b><small>${ok?'Sin críticos pendientes':criticos?`${criticos} crítico${criticos===1?'':'s'}`:'Requiere gestión'}</small></span>`;
    }else{
      const total=Number(minis[0]||0),activas=Number(minis[1]||0),fuera=Number(minis[2]||0),ok=total>0&&fuera===0;
      badge.classList.add(ok?'good':'warn');
      badge.innerHTML=`<span class="v103-state-icon">${ok?shieldIcon:warnIcon}</span><span class="v103-state-copy"><b>${ok?'Flota en orden':'Revisar flota'}</b><small>${total} total · ${activas} activas · ${fuera} fuera de operación</small></span>`;
    }
  }

  function enhance103(){
    if(!document.body.classList.contains('v99-home'))return;
    const cards=[...document.querySelectorAll('.v99-grid .v99-module')];if(!cards.length)return;
    const pan=cards.find(c=>!c.classList.contains('rev')&&!c.classList.contains('control'));
    const rev=cards.find(c=>c.classList.contains('rev'));
    const ctl=cards.find(c=>c.classList.contains('control'));
    [[pan,'pan',panSvg],[rev,'rev',revSvg],[ctl,'ctl',ctlSvg]].forEach(([card,type,svg])=>{
      if(!card||card.dataset.v103==='1')return;
      card.dataset.v103='1';
      const vis=card.querySelector('.v102-visual');if(vis)vis.innerHTML=svg;
      statusBadge(card,type);
    });
  }
  function syncNavActive(){
    document.querySelectorAll('.v101-nav.v105-nav-clean button').forEach(btn=>{
      if(btn.dataset.v103NavBound==='1')return;
      btn.dataset.v103NavBound='1';
      btn.addEventListener('click',()=>{
        document.querySelectorAll('.v101-nav.v105-nav-clean button').forEach(x=>x.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }
  new MutationObserver(syncNavActive).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(syncNavActive,180);
  new MutationObserver(enhance103).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(enhance103,120);
})();
