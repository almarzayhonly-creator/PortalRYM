/* Portal RYM - Negativos Hoy: fecha operativa Panama */
(function(w,d){'use strict';
if(w.__RYM_NEGATIVOS_PANAMA_DATE_V2__)return;w.__RYM_NEGATIVOS_PANAMA_DATE_V2__=true;
const norm=s=>String(s||'').trim().toUpperCase();
function todayPanama(){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).reduce((a,x)=>(a[x.type]=x.value,a),{});
  return `${p.year}-${p.month}-${p.day}`;
}
function utcToday(){return new Date().toISOString().slice(0,10)}
function negativesDateInput(){
  const root=d.querySelector('#view')||d.body;if(!root)return null;
  const inputs=[...root.querySelectorAll('input[type="date"]')];
  for(const input of inputs){
    let box=input.parentElement;
    for(let i=0;i<6&&box;i++,box=box.parentElement){
      const t=norm(box.textContent||'');
      if(t.includes('FECHA')&&t.includes('GALERA')&&t.includes('SUPERVISORA')&&t.includes('BUSCAR'))return input;
    }
  }
  const pageText=norm(root.textContent||'');
  if(pageText.includes('NEGATIVOS HOY')&&pageText.includes('MAX NEG 7D'))return inputs[0]||null;
  return null;
}
function fix(){
  try{
    const input=negativesDateInput();if(!input)return;
    const pan=todayPanama(),utc=utcToday();
    if(pan===utc)return;
    if(input.value!==utc&&input.value!==pan)return;
    if(input.value===pan)return;
    input.value=pan;
    input.dataset.rymPanamaDateFixed=pan;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }catch(_){ }
}
let t=0;function schedule(){if(t)return;t=setTimeout(()=>{t=0;fix()},30)}
new MutationObserver(schedule).observe(d.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['value']});
setInterval(fix,250);
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',fix,{once:true});else fix();
})(window,document);
