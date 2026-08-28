const fs=require('fs');
const s=fs.readFileSync('index.html','utf8');
const keywords=['panapass','ranking','recurrent','baja','ena','negativ','pago','historial'];
const names=new Set();
for(const m of s.matchAll(/(?:function\s+|window\.)([A-Za-z_$][\w$]{2,})/g)){
  const name=m[1];
  const a=Math.max(0,m.index-220),b=Math.min(s.length,m.index+420);
  const ctx=s.slice(a,b).toLowerCase();
  if(keywords.some(k=>ctx.includes(k))||keywords.some(k=>name.toLowerCase().includes(k))) names.add(name);
}
const hits={};
for(const k of keywords){hits[k]=(s.toLowerCase().match(new RegExp(k,'g'))||[]).length;}
console.log('V171_PANAPASS_INVENTORY_START');
console.log(JSON.stringify({bytes:s.length,keywordHits:hits,candidateFunctions:[...names].sort()},null,2));
console.log('V171_PANAPASS_INVENTORY_END');
