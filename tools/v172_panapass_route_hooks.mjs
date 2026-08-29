import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'acorn';
import {generate} from 'astring';

const root=process.cwd();
const runtimeDir=path.join(root,'modules/panapass/runtime');
const routeMap={dashboard:'dashboard',negativos:'negativos_hoy',pagosConsultaHoy:'pagos_hoy',pagosTrabajo:'cargar_pagos',historial:'historial',operaciones:'operaciones',reportes:'reportes'};

function targetOf(left){
  if(left?.type==='Identifier') return left.name;
  if(left?.type==='MemberExpression'&&!left.computed&&left.object?.type==='Identifier'&&left.object.name==='window'&&left.property?.type==='Identifier') return left.property.name;
  return null;
}
function idOfParam(p){
  if(!p)return null;
  if(p.type==='Identifier')return p.name;
  if(p.type==='AssignmentPattern'&&p.left?.type==='Identifier')return p.left.name;
  return null;
}
function walk(node,fn){
  if(!node||typeof node!=='object')return;
  fn(node);
  for(const [k,v] of Object.entries(node)){
    if(k==='start'||k==='end'||k==='loc')continue;
    if(Array.isArray(v))for(const x of v)walk(x,fn);else if(v&&typeof v==='object')walk(v,fn);
  }
}

let total=0;
for(const file of fs.readdirSync(runtimeDir).filter(x=>x.endsWith('.js')).sort()){
  const p=path.join(runtimeDir,file),src=fs.readFileSync(p,'utf8');
  const ast=parse(src,{ecmaVersion:'latest',sourceType:'script',allowAwaitOutsideFunction:true});
  const aliases=new Map();
  for(const st of ast.body){
    if(st.type!=='VariableDeclaration'||st.declarations.length!==1)continue;
    const d=st.declarations[0];
    if(d.id?.type==='Identifier'&&d.init?.type==='Identifier'&&routeMap[d.init.name]) aliases.set(d.id.name,{target:d.init.name,start:st.start,end:st.end});
    if(d.id?.type==='Identifier'&&d.init?.type==='MemberExpression'&&!d.init.computed&&d.init.object?.name==='window'&&routeMap[d.init.property?.name]) aliases.set(d.id.name,{target:d.init.property.name,start:st.start,end:st.end});
  }
  const replacements=[]; const consumedAliases=new Set();
  for(const st of ast.body){
    if(st.type!=='ExpressionStatement'||st.expression?.type!=='AssignmentExpression'||st.expression.operator!=='=')continue;
    const a=st.expression,target=targetOf(a.left),fn=a.right;
    if(!routeMap[target]||!['FunctionExpression','ArrowFunctionExpression'].includes(fn?.type))continue;
    if(fn.body?.type!=='BlockStatement')continue;
    const usedAliases=[];
    walk(fn.body,n=>{if(n.type==='Identifier'&&aliases.has(n.name)&&aliases.get(n.name).target===target&&!usedAliases.includes(n.name))usedAliases.push(n.name)});
    for(const x of usedAliases)consumedAliases.add(x);
    const param=idOfParam(fn.params?.[0]);
    const pre=[];
    if(param)pre.push(`const ${param}=ctx.view;`);
    for(const al of usedAliases)pre.push(`const ${al}=(..._args)=>next();`);
    const body=fn.body.body.map(x=>generate(x)).join('\n');
    const asyncWord=fn.async?'async ':'';
    const code=`(window.__RYM_PANAPASS_PENDING_AROUND__ ||= []).push([${JSON.stringify(routeMap[target])}, ${asyncWord}function(next,ctx){\n${pre.join('\n')}\n${body}\n}]);`;
    replacements.push({start:st.start,end:st.end,code}); total++;
  }
  for(const al of consumedAliases){const x=aliases.get(al);replacements.push({start:x.start,end:x.end,code:''});}
  if(!replacements.length)continue;
  replacements.sort((a,b)=>b.start-a.start);let out=src;
  for(const r of replacements)out=out.slice(0,r.start)+r.code+out.slice(r.end);
  fs.writeFileSync(p,out);
  console.log('migrated',file,replacements.length);
}

const routerPath=path.join(root,'modules/panapass/router.js');
let router=fs.readFileSync(routerPath,'utf8');
const marker="  w.RYM_PANAPASS_ROUTER=Object.freeze({open,leave,active,isBusy,routes,permittedTabs,around,after});\n})(window,document);";
if(router.includes(marker)){
  router=router.replace(marker,"  w.RYM_PANAPASS_ROUTER=Object.freeze({open,leave,active,isBusy,routes,permittedTabs,around,after});\n  for(const [route,fn] of (w.__RYM_PANAPASS_PENDING_AROUND__||[])) around(route,fn);\n  for(const [route,fn] of (w.__RYM_PANAPASS_PENDING_AFTER__||[])) after(route,fn);\n  delete w.__RYM_PANAPASS_PENDING_AROUND__;delete w.__RYM_PANAPASS_PENDING_AFTER__;\n})(window,document);");
  fs.writeFileSync(routerPath,router);
}
console.log('Panapass route assignments migrated:',total);
