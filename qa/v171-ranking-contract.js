const fs=require('fs');
const vm=require('vm');
const code=fs.readFileSync('modules/panapass/ranking/index.js','utf8');
const sandbox={window:{RYM_MODULES:{has:()=>false,register:(n,d)=>{sandbox.registered={n,d}}}},document:{querySelector:()=>null}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const api=sandbox.window.RYM_PANAPASS_RANKING;if(!api)throw new Error('Ranking API missing');
const rows=[
 {supervisora:'ANA',galera:'VCOMP',unidades:3,monto:90,racha:2},
 {supervisora:'BERTA',galera:'VCOMP',unidades:1,monto:120,racha:5},
 {supervisora:'CARLA',galera:'VIPCO',unidades:2,monto:40,racha:0}
];
const u=api.model(rows,{metric:'unidades'}).rows.map(x=>x.supervisora).join(',');
const m=api.model(rows,{metric:'monto'}).rows.map(x=>x.supervisora).join(',');
if(u!=='BERTA,CARLA,ANA')throw new Error('Orden menos unidades incorrecto: '+u);
if(m!=='CARLA,ANA,BERTA')throw new Error('Orden menos monto incorrecto: '+m);
if(api.model(rows,{metric:'unidades'}).podio.length!==3)throw new Error('Podio incorrecto');
console.log('V171_RANKING_CONTRACT_OK',JSON.stringify({menosUnidades:u,menosMonto:m}));
