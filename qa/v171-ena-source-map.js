const fs=require('fs');
const s=fs.readFileSync('index.html','utf8');
const anchors=['Janneth','JANNETH','Jesus','JESUS','Jesús','firma','TRANSFERENCIA-DE-SALDO-POSITIVO','enhanceBajasPdf166','boletaResult166','panapass_bajas_listar_v5'];
const hits=[];
for(const a of anchors){let p=0,n=0;while((p=s.indexOf(a,p))>=0&&n<20){hits.push({a,p});p+=a.length;n++;}}
hits.sort((x,y)=>x.p-y.p);
console.log('V171_ENA_SOURCE_MAP_START');
let last=-99999;
for(const h of hits){if(h.p-last<3500)continue;last=h.p;const a=Math.max(0,h.p-4500),b=Math.min(s.length,h.p+9000),chunk=s.slice(a,b).replace(/\x00/g,'');const rpcs=[...chunk.matchAll(/rpc\(\s*['"`]([^'"`]+)['"`]/g)].map(m=>m[1]);const reqs=[...chunk.matchAll(/req\(\s*['"`]([^'"`]+)['"`]/g)].map(m=>m[1]);console.log(`\n===== ${h.a} @ ${h.p} =====`);console.log('RPCS:',[...new Set(rpcs)].join(','));console.log('REQS:',[...new Set(reqs)].join(','));console.log(chunk);}
console.log('\nV171_ENA_SOURCE_MAP_END');
