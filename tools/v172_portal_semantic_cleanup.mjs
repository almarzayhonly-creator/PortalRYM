import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'acorn';

const MIGRATOR_VERSION='1.0';
const root=process.cwd();
const files=['modules/core/portal-v70.js','modules/core/portal-home-v99.js'];
function walk(node,cb,parent=null){if(!node||typeof node!=='object')return;cb(node,parent);for(const [k,v] of Object.entries(node)){if(['start','end','loc'].includes(k))continue;if(Array.isArray(v))for(const x of v)walk(x,cb,node);else if(v&&typeof v==='object')walk(v,cb,node)}}
function targetOf(left){if(left?.type==='Identifier')return left.name;if(left?.type==='MemberExpression'&&!left.computed&&left.object?.type==='Identifier'&&left.object.name==='window'&&left.property?.type==='Identifier')return left.property.name;return null}
function isHomeInit(init){return init?.type==='Identifier'&&init.name==='v36PortalHome'||(init?.type==='MemberExpression'&&!init.computed&&init.object?.name==='window'&&init.property?.name==='v36PortalHome')}
for(const rel of files){
  const p=path.join(root,rel),src=fs.readFileSync(p,'utf8'),ast=parse(src,{ecmaVersion:'latest',sourceType:'script'});
  const aliases=new Map(),decls=new Map();
  walk(ast,(n,parent)=>{if(n.type==='VariableDeclarator'&&n.id?.type==='Identifier'&&isHomeInit(n.init)){aliases.set(n.id.name,true);if(parent?.type==='VariableDeclaration'&&parent.declarations.length===1)decls.set(n.id.name,parent)}});
  const reps=[],usedAliases=new Set();
  walk(ast,n=>{
    if(n.type!=='ExpressionStatement'||n.expression?.type!=='AssignmentExpression'||n.expression.operator!=='=')return;
    const a=n.expression;if(targetOf(a.left)!=='v36PortalHome'||!['FunctionExpression','ArrowFunctionExpression'].includes(a.right?.type))return;
    const used=[];walk(a.right,x=>{if(x.type==='Identifier'&&aliases.has(x.name)&&!used.includes(x.name))used.push(x.name)});used.forEach(x=>usedAliases.add(x));
    const fnSrc=src.slice(a.right.start,a.right.end),aliasCode=used.map(x=>`const ${x}=(...a)=>next(a);`).join('');
    const code=`(window.__RYM_PORTAL_HOME_PENDING_AROUND__ ||= []).push(${a.right.async?'async ':''}function(next,args,ctx){${aliasCode}const impl=${fnSrc};return impl.apply(ctx.thisArg,args)});`;
    reps.push({start:n.start,end:n.end,code});
  });
  for(const a of usedAliases){const d=decls.get(a);if(d)reps.push({start:d.start,end:d.end,code:''})}
  if(reps.length){reps.sort((a,b)=>b.start-a.start);let out=src,seen=new Set();for(const r of reps){const k=r.start+':'+r.end;if(seen.has(k))continue;seen.add(k);out=out.slice(0,r.start)+r.code+out.slice(r.end)}fs.writeFileSync(p,out)}
}

for(const rel of files){
  const p=path.join(root,rel);let s=fs.readFileSync(p,'utf8');
  const replacements=[
    ["document.querySelector('#v70Pan')?.addEventListener('click',window.v70OpenPanapass);","document.querySelector('#v70Pan')?.addEventListener('click',()=>window.RYM_ROUTER?.open('panapass'));"],
    ["document.querySelector('#v70Control')?.addEventListener('click',window.v70OpenControl);","document.querySelector('#v70Control')?.addEventListener('click',()=>window.RYM_ROUTER?.open('control-auto'));"],
    ["document.querySelector('#v70Rev')?.addEventListener('click',()=>window.v60OpenRevisados?window.v60OpenRevisados():null);","document.querySelector('#v70Rev')?.addEventListener('click',()=>window.RYM_ROUTER?.open('revisados'));"],
    ["document.querySelector('#v70Users')?.addEventListener('click',window.v70OpenUsers);","document.querySelector('#v70Users')?.addEventListener('click',()=>window.RYM_ROUTER?.open('usuarios'));"],
  ];
  for(const [a,b] of replacements)s=s.replace(a,b);
  s=s.replaceAll("()=>window.v70OpenPanapass?.()","()=>window.RYM_ROUTER?.open('panapass')");
  s=s.replaceAll("()=>window.v70OpenControl?.()","()=>window.RYM_ROUTER?.open('control-auto')");
  s=s.replaceAll("()=>window.v60OpenRevisados?.()","()=>window.RYM_ROUTER?.open('revisados')");
  s=s.replaceAll("()=>window.v70OpenUsers?.()","()=>window.RYM_ROUTER?.open('usuarios')");
  fs.writeFileSync(p,s);
}

{
 const p=path.join(root,'modules/core/portal-v70.js');let s=fs.readFileSync(p,'utf8');
 s=s.replace(/window\.v70OpenPanapass=async function\(\)\{.*?\};\n/s,"window.v70OpenPanapass=()=>window.RYM_ROUTER?.open('panapass');\n");
 s=s.replace(/window\.v70OpenControl=async function\(\)\{.*?\};\n/s,"window.v70OpenControl=()=>window.RYM_ROUTER?.open('control-auto');\n");
 fs.writeFileSync(p,s);
}
console.log('Portal semantic home and module entry cleanup complete',MIGRATOR_VERSION);
