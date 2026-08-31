
/* V18: ranking de Negativos/Pagos listo para pegar en WhatsApp. */
function wa18Allowed(){return ['ADMIN_TOTAL','PAGADOR'].includes(role())}
function wa18Date(v){const p=String(v||'').split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(v||'')}
function wa18RankIcon(n){return n===1?'🥇':n===2?'🥈':n===3?'🥉':`${n}.`}
function wa18Plural(n,one,many){return Number(n)===1?one:many}
async function wa18Copy(text){
  try{await navigator.clipboard.writeText(text);return true}catch(_){
    try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();const ok=document.execCommand('copy');ta.remove();return ok}catch(__){return false}
  }
}
function wa18BuildNeg(rows,fecha,galera){
  const sorted=[...(rows||[])].sort((a,b)=>Number(a.cantidad)-Number(b.cantidad)||Number(a.monto)-Number(b.monto)||String(a.supervisora).localeCompare(String(b.supervisora),'es'));
  const totalUnits=sorted.reduce((a,x)=>a+Number(x.cantidad||0),0);
  const totalAmount=sorted.reduce((a,x)=>a+Number(x.monto||0),0);
  const lines=[
    `📅 *Fecha:* ${wa18Date(fecha)}`,
    `🚘 *Total unidades negativas:* ${totalUnits}`,
    `💰 *Monto a cobrar:* B/. ${money(totalAmount)}`,
    '',
    `🏆 *RANKING ${galera} – NEGATIVOS*`,
    ''
  ];
  sorted.forEach((x,i)=>lines.push(`${wa18RankIcon(i+1)} *${String(x.supervisora||'SIN SUPERVISORA').toUpperCase()}*  ·  ${Number(x.cantidad||0)} ${wa18Plural(x.cantidad,'unidad','unidades')}  ·  B/. ${money(x.monto)}`));
  const special=sorted.filter(x=>Number(x.cantidad||0)<=3);
  if(special.length){
    lines.push('','🌟 *MENSAJES DE HOY*','');
    special.forEach(x=>{
      const n=Number(x.cantidad||0),name=String(x.supervisora||'').toUpperCase();
      if(n===0)lines.push(`🎉😍 *${name}:* ¡Felicidades! Cerraste en *CERO negativos*. ¡Excelente trabajo! 🏆✨`);
      else if(n===1)lines.push(`💪😊 *${name}:* Solo queda *1 unidad* por recuperar. ¡Vamos por el cero!`);
      else lines.push(`🙌✨ *${name}:* Solo quedan *${n} unidades* por recuperar. ¡A cerrar esas pendientes!`);
    });
  }
  return lines.join('\n');
}
function wa18BuildPay(rows,fecha,galera){
  const sorted=[...(rows||[])].sort((a,b)=>Number(a.cantidad)-Number(b.cantidad)||Number(a.monto)-Number(b.monto)||String(a.supervisora).localeCompare(String(b.supervisora),'es'));
  const totalUnits=sorted.reduce((a,x)=>a+Number(x.cantidad||0),0);
  const totalAmount=sorted.reduce((a,x)=>a+Number(x.monto||0),0);
  const lines=[
    `📅 *Fecha:* ${wa18Date(fecha)}`,
    `🚘 *Total unidades con pago:* ${totalUnits}`,
    `💵 *Monto total pagado:* B/. ${money(totalAmount)}`,
    '',
    `🏆 *RANKING ${galera} – PAGOS*`,
    ''
  ];
  sorted.forEach((x,i)=>lines.push(`${wa18RankIcon(i+1)} *${String(x.supervisora||'SIN SUPERVISORA').toUpperCase()}*  ·  ${Number(x.cantidad||0)} ${wa18Plural(x.cantidad,'pago','pagos')}  ·  B/. ${money(x.monto)}`));
  const featured=sorted.filter(x=>Number(x.cantidad||0)<=1);
  if(featured.length){
    lines.push('','🌟 *DESTACADAS DEL DÍA*','');
    featured.forEach(x=>{
      const n=Number(x.cantidad||0),name=String(x.supervisora||'').toUpperCase(),streak=Number(x.racha_cero||0),prev=Number(x.cantidad_anterior||0);
      if(n===0&&streak>=5)lines.push(`👑💯 *${name}:* ¡Racha espectacular! Ya llevas *${streak} días consecutivos en CERO pagos*. ¡Sigue así! 🔥🏆`);
      else if(n===0&&streak>=2)lines.push(`🔥🏆 *${name}:* ¡Estás imparable! Ya llevas *${streak} días consecutivos en CERO pagos*. ¡Excelente trabajo! 😍👏`);
      else if(n===0)lines.push(`🎉✨ *${name}:* ¡Felicidades! Hoy cerraste en *CERO pagos*. ¡Vamos por una nueva racha! 💯`);
      else if(n===1&&prev>1)lines.push(`📉✨ *${name}:* ¡Gran mejora! Bajaste de *${prev} pagos* en el último día procesado a *solo 1 hoy*. ¡Vamos por el cero! 💪😊`);
      else lines.push(`💪😊 *${name}:* Solo *1 pago* hoy. ¡Estás a un paso del cero! 🌟`);
    });
  }
  return lines.join('\n');
}
async function wa18Run(tipo,prefix){
  const gal=document.querySelector(`#${prefix}Galera`)?.value||'';
  const fecha=document.querySelector(`#${prefix}Fecha`)?.value||'';
  const status=document.querySelector(`#${prefix}WaStatus`);
  const btn=document.querySelector(`#${prefix}WaCopy`);
  if(!gal){if(status)status.textContent='Selecciona una galera.';return}
  if(btn){btn.disabled=true;btn.textContent='Preparando...'}
  if(status)status.textContent='';
  try{
    const rows=await rpc('panapass_whatsapp_ranking',{p_tipo:tipo,p_fecha:fecha||null,p_galera:gal});
    if(!rows?.length)throw Error('No se encontraron supervisoras para la galera seleccionada.');
    if(rows[0].dia_procesado===false)throw Error('La fecha seleccionada todavía no tiene operación procesada; no se generó el ranking.');
    const text=tipo==='NEGATIVOS'?wa18BuildNeg(rows,fecha,gal):wa18BuildPay(rows,fecha,gal);
    const ok=await wa18Copy(text);
    if(!ok)throw Error('El navegador no permitió copiar al portapapeles.');
    if(status)status.textContent='Copiado para WhatsApp ✓';
    if(btn)btn.textContent='Copiado ✓';
    setTimeout(()=>{if(btn){btn.textContent='📋 Copiar para WhatsApp';btn.disabled=!document.querySelector(`#${prefix}Galera`)?.value}if(status)status.textContent=''},1800);
  }catch(e){if(status)status.textContent=String(e.message||e);if(btn){btn.textContent='📋 Copiar para WhatsApp';btn.disabled=!gal}}
}
function wa18Attach(v,tipo,prefix){
  if(!wa18Allowed())return;
  const tools=v.querySelector('.phase3-filterbar'),gal=v.querySelector(`#${prefix}Galera`);
  if(!tools||!gal||v.querySelector(`#${prefix}WaCopy`))return;
  const b=document.createElement('button');b.type='button';b.id=`${prefix}WaCopy`;b.className='wa-rank-btn';b.textContent='📋 Copiar para WhatsApp';b.disabled=!gal.value;
  const st=document.createElement('div');st.id=`${prefix}WaStatus`;st.className='wa-rank-status';
  tools.appendChild(b);tools.appendChild(st);
  const old=gal.onchange;
  gal.onchange=async e=>{if(old)await old.call(gal,e);b.disabled=!gal.value;st.textContent=''};
  b.onclick=()=>wa18Run(tipo,prefix);
}
const _v18Negativos=negativos;
negativos=async function(v){await _v18Negativos(v);wa18Attach(v,'NEGATIVOS','p3Neg')};
const _v18PagosConsulta=pagosConsultaHoy;
pagosConsultaHoy=async function(v){await _v18PagosConsulta(v);wa18Attach(v,'PAGOS','p3Pay')};
