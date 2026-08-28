const fs=require('fs');
const s=fs.readFileSync('index.html','utf8');
const anchors=['v93ROut','v93-rank-card','v93-rank-grid','v93-podium','rank-hero-grid','menos unidades','menos monto','MENOS UNIDADES','MENOS MONTO','Ranking Panapass','ranking mensual'];
const positions=[];
for(const a of anchors){let from=0,count=0;while(true){const p=s.indexOf(a,from);if(p<0)break;positions.push({anchor:a,pos:p});from=p+a.length;count++;if(count>=12)break;}}
positions.sort((a,b)=>a.pos-b.pos);
console.log('V171_PANAPASS_RANKING_MAP_START');
const emitted=[];
for(const x of positions){if(emitted.some(p=>Math.abs(p-x.pos)<3500))continue;emitted.push(x.pos);const a=Math.max(0,x.pos-5000),b=Math.min(s.length,x.pos+9000),chunk=s.slice(a,b).replace(/\x00/g,'');const reqs=[...chunk.matchAll(/req\(\s*['"`]([^'"`]+)['"`]/g)].map(m=>m[1]);const funcs=[...chunk.matchAll(/(?:function\s+|(?:window\.)?)([A-Za-z_$][\w$]*)\s*(?:=\s*(?:async\s*)?function|=\s*(?:async\s*)?\([^)]*\)\s*=>|\()/g)].map(m=>m[1]);console.log(`\n===== ${x.anchor} @ ${x.pos} =====`);console.log('REQS:',[...new Set(reqs)].join(','));console.log('FUNCS:',[...new Set(funcs)].slice(0,80).join(','));console.log(chunk);}
console.log('\nV171_PANAPASS_RANKING_MAP_END');
