import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'acorn';

const root=process.cwd(),target='v36PortalHome';
function targetOf(left){if(left?.type==='Identifier')return left.name;if(left?.type==='MemberExpression'&&!left.computed&&left.object?.type==='Identifier'&&left.object.name==='window'&&left.property?.type==='Identifier')return left.property.name;return null}
function initIsTarget(init){return init?.type==='Identifier'&&init.name===target||(init?.type==='MemberExpression'&&!init.computed&&init.object?.name==='window'&&init.property?.name===target)}
function walk(node,cb,parent=null){if(!node||typeof node!=='object')return;cb(node,parent);for(const [k,v] of Object.entries(node)){if(['start','end','loc'].includes(k))continue;if(Array.isArray(v))for(const x of v)walk(x,cb,node);else if(v&&typeof v==='object')walk(v,cb,node)}}
const files=[];
for(const domain of fs.readdirSync(path.join(root,'modules'))){const dir=path.join(root,'modules',domain,'runtime');if(!fs.existsSync(dir))continue;for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js')).sort())files.push({domain,file:f,path:path.join(dir,f)})}
// preserve actual source order using index positions when possible
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
files.sort((a,b)=>{const aa=index.indexOf('/'+path.relative(root,a.path).replaceAll('\\','/')),bb=index.indexOf('/'+path.relative(root,b.path).replaceAll('\\','/'));return (aa<0?1e9:aa)-(bb<0?1e9:bb)});
let baseAssigned=false,count=0;
for(const f of files){
 const src=fs.readFileSync(f.path,'utf8'),ast=parse(src,{ecmaVersion:'latest',sourceType:'script',allowAwaitOutsideFunction:true});
 const aliases=new Map(),decls=new Map();walk(ast,(n,p)=>{if(n.type==='VariableDeclarator'&&n.id?.type==='Identifier'&&initIsTarget(n.init)){aliases.set(n.id.name,true);if(p?.type==='VariableDeclaration'&&p.declarations.length===1)decls.set(n.id.name,p)}});
 const reps=[],usedAliases=new Set();
 walk(ast,(n,p)=>{if(n.type!=='ExpressionStatement'||n.expression?.type!=='AssignmentExpression'||n.expression.operator!=='=')return;const a=n.expression;if(targetOf(a.left)!==target||!['FunctionExpression','ArrowFunctionExpression'].includes(a.right?.type))return;const fn=a.right,used=[];walk(fn,x=>{if(x.type==='Identifier'&&aliases.has(x.name)&&!used.includes(x.name))used.push(x.name)});used.forEach(x=>usedAliases.add(x));const fnSrc=src.slice(fn.start,fn.end);let code;if(!baseAssigned&&!used.length){code=`window.__RYM_PORTAL_HOME_BASE__=${fnSrc};`;baseAssigned=true}else{const aliasCode=used.map(x=>`const ${x}=(...a)=>next(a);`).join('');code=`(window.__RYM_PORTAL_HOME_PENDING_AROUND__ ||= []).push(${fn.async?'async ':''}function(next,args,ctx){${aliasCode}const impl=${fnSrc};return impl.apply(ctx.thisArg,args)});`;}reps.push({start:n.start,end:n.end,code});count++});
 for(const a of usedAliases){const d=decls.get(a);if(d)reps.push({start:d.start,end:d.end,code:''})}
 if(!reps.length)continue;const seen=new Set();reps.sort((a,b)=>b.start-a.start);let out=src;for(const r of reps){const k=r.start+':'+r.end;if(seen.has(k))continue;seen.add(k);out=out.slice(0,r.start)+r.code+out.slice(r.end)}fs.writeFileSync(f.path,out);console.log('portal home migrated',f.domain,f.file);
}
if(!baseAssigned)throw new Error('Portal Home base assignment not found');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');const comp='<script id="rym-v172-core-composition" src="/modules/core/composition.js?v=172-clean"></script>',home='\n<script id="rym-v172-portal-home" src="/modules/core/portal-home.js?v=172-clean"></script>';if(!html.includes('rym-v172-portal-home')){if(!html.includes(comp))throw new Error('composition marker missing');html=html.replace(comp,comp+home);fs.writeFileSync(path.join(root,'index.html'),html)}
console.log('Portal Home assignments migrated:',count);
