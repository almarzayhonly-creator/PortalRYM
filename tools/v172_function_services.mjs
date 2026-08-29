import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'acorn';

const root=process.cwd();
const config={
  phase6ConsultarSaldoENA:{service:'RYM_ENA_SALDO',mode:'first-base'},
  phase6OpenUnit:{service:'RYM_CONTROL_UNIT_MODAL',mode:'first-base'}
};
function nameOf(left){if(left?.type==='Identifier')return left.name;if(left?.type==='MemberExpression'&&!left.computed&&left.object?.type==='Identifier'&&left.object.name==='window'&&left.property?.type==='Identifier')return left.property.name;return null}
function initTarget(init,target){return init?.type==='Identifier'&&init.name===target||(init?.type==='MemberExpression'&&!init.computed&&init.object?.name==='window'&&init.property?.name===target)}
function walk(node,cb,parent=null){if(!node||typeof node!=='object')return;cb(node,parent);for(const [k,v] of Object.entries(node)){if(['start','end','loc'].includes(k))continue;if(Array.isArray(v))for(const x of v)walk(x,cb,node);else if(v&&typeof v==='object')walk(v,cb,node)}}
const indexPath=path.join(root,'index.html');let index=fs.readFileSync(indexPath,'utf8');
const serviceTags='\n<script id="rym-v172-ena-saldo" src="/modules/panapass/ena/saldo-service.js?v=172-clean"></script>\n<script id="rym-v172-control-unit-modal" src="/modules/control-auto/unit-modal-service.js?v=172-clean"></script>';
if(!index.includes('rym-v172-ena-saldo')){
  const runtime='<script id="rym-v172-core-runtime" src="/modules/core/runtime.js?v=172-clean"></script>';
  if(!index.includes(runtime))throw new Error('core runtime marker missing');
  index=index.replace(runtime,serviceTags+'\n'+runtime);
}
const scriptRefs=[...index.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m,i)=>({rel:m[1].split('?')[0].replace(/^\//,''),order:i}));
const order=new Map(scriptRefs.map(x=>[x.rel,x.order]));
const candidates=[];
for(const domain of fs.readdirSync(path.join(root,'modules'))){const base=path.join(root,'modules',domain);if(!fs.statSync(base).isDirectory())continue;const stack=[base];while(stack.length){const d=stack.pop();for(const f of fs.readdirSync(d)){const p=path.join(d,f),st=fs.statSync(p);if(st.isDirectory()){stack.push(p);continue}if(!f.endsWith('.js'))continue;const rel=path.relative(root,p).replaceAll('\\','/');if(rel.endsWith('saldo-service.js')||rel.endsWith('unit-modal-service.js'))continue;candidates.push({p,rel,order:order.get(rel)??99999})}}}
candidates.sort((a,b)=>a.order-b.order||a.rel.localeCompare(b.rel));
for(const [target,cfg] of Object.entries(config)){
  let baseDone=false,total=0;
  for(const f of candidates){
    const src=fs.readFileSync(f.p,'utf8');let ast;try{ast=parse(src,{ecmaVersion:'latest',sourceType:'script'})}catch{continue}
    const aliases=new Map(),decls=new Map();walk(ast,(n,p)=>{if(n.type==='VariableDeclarator'&&n.id?.type==='Identifier'&&initTarget(n.init,target)){aliases.set(n.id.name,true);if(p?.type==='VariableDeclaration'&&p.declarations.length===1)decls.set(n.id.name,p)}});
    const reps=[],usedAliases=new Set();
    walk(ast,n=>{if(n.type!=='ExpressionStatement'||n.expression?.type!=='AssignmentExpression'||n.expression.operator!=='=')return;const a=n.expression;if(nameOf(a.left)!==target||!['FunctionExpression','ArrowFunctionExpression'].includes(a.right?.type))return;const used=[];walk(a.right,x=>{if(x.type==='Identifier'&&aliases.has(x.name)&&!used.includes(x.name))used.push(x.name)});used.forEach(x=>usedAliases.add(x));const fnSrc=src.slice(a.right.start,a.right.end);let code;if(!baseDone&&!used.length){code=`window.${cfg.service}.setBase(${fnSrc});`;baseDone=true}else{const aliasCode=used.map(x=>`const ${x}=(...a)=>next(a);`).join('');code=`window.${cfg.service}.around(${a.right.async?'async ':''}function(next,args,ctx){${aliasCode}const impl=${fnSrc};return impl.apply(ctx.thisArg,args)});`;}reps.push({start:n.start,end:n.end,code});total++});
    for(const al of usedAliases){const d=decls.get(al);if(d)reps.push({start:d.start,end:d.end,code:''})}
    if(!reps.length)continue;const seen=new Set();reps.sort((a,b)=>b.start-a.start);let out=src;for(const r of reps){const k=r.start+':'+r.end;if(seen.has(k))continue;seen.add(k);out=out.slice(0,r.start)+r.code+out.slice(r.end)}fs.writeFileSync(f.p,out);console.log(target,'migrated',f.rel,reps.length);
  }
  if(!baseDone)throw new Error(target+' base not found');
  console.log(target,'assignments migrated',total);
}
indexPath&&fs.writeFileSync(indexPath,index);
console.log('function services migration complete');
