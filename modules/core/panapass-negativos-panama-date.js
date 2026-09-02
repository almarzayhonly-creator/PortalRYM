/* Portal RYM - Negativos Hoy: fecha operativa Panama */
(function(w,d){'use strict';
if(w.__RYM_NEGATIVOS_PANAMA_DATE__)return;w.__RYM_NEGATIVOS_PANAMA_DATE__=true;
const norm=s=>String(s||'').trim().toUpperCase();
function todayPanama(){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).reduce((a,x)=>(a[x.type]=x.value,a),{});
  return `${p.year}-${p.month}-${p.day}`;
}
function utcToday(){return new Date().toISOString().slice(0,10)}
function negativesDateInput(){
  const root=d.querySelector('#view')||d.body;if(!root)return null;
  const hasTitle=[...root.querySelectorAll('h1,h2,h3,h4,.title,.page-title')].some(el=>norm(el.textContent)==='NEGATIVOS HOY');
  if(!hasTitle)return null;
  const labels=[...root.querySelectorAll('label,span,div')].filter(el=>norm(el.textContent)==='FECHA');
  for(const lab of labels){
    let box=lab.parentElement;
    for(let i=0;i<4&&box;i++,box=box.parentElement){const input=box.querySelector?.('input[type="date"]');if(input)return input}
  }
  return root.querySelector('input[type="date"]');
}
function fix(){
  try{
    const input=negativesDateInput();if(!input)return;
    const pan=todayPanama(),utc=utcToday();if(pan===utc)return;
    if(input.dataset.rymPanamaDateFixed===pan)return;
    if(input.value!==utc)return;
    input.value=pan;input.dataset.rymPanamaDateFixed=pan;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }catch(_){ }
}
let t=0;function schedule(){if(t)return;t=setTimeout(()=>{t=0;fix()},80)}
new MutationObserver(schedule).observe(d.documentElement,{childList:true,subtree:true});
setInterval(fix,1200);
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',fix,{once:true});else fix();
})(window,document);
