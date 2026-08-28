const fs=require('fs');
const s=fs.readFileSync('index.html','utf8');
const names=['Janneth','JANNETH','Jesus','JESUS','Jesús'];
const hits=[];
for(const name of names){let p=0,n=0;while((p=s.indexOf(name,p))>=0&&n<30){hits.push({name,p});p+=name.length;n++;}}
hits.sort((a,b)=>a.p-b.p);
console.log('V171_ENA_SIGNER_MAP_START');
let last=-99999;
for(const h of hits){
  if(h.p-last<700)continue;
  last=h.p;
  const a=Math.max(0,h.p-900),b=Math.min(s.length,h.p+1600);
  const snippet=s.slice(a,b).replace(/\s+/g,' ').replace(/\x00/g,'').trim();
  console.log(`SIGNER_HIT ${h.name} @ ${h.p}: ${snippet}`);
}
for(const anchor of ['TRANSFERENCIA-DE-SALDO-POSITIVO','enhanceBajasPdf166','boletaResult166','panapass_bajas_listar_v5']){
  const p=s.indexOf(anchor);if(p<0)continue;
  const a=Math.max(0,p-700),b=Math.min(s.length,p+1800);
  console.log(`FORM_HIT ${anchor} @ ${p}: ${s.slice(a,b).replace(/\s+/g,' ').replace(/\x00/g,'').trim()}`);
}
console.log('V171_ENA_SIGNER_MAP_END');
