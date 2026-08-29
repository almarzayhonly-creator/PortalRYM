import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'acorn';

const root=process.cwd();
const targets=new Set(['req','rpc','clearSession','login','loadApp','shell']);
function targetOf(left){
  if(left?.type==='Identifier')return left.name;
  if(left?.type==='MemberExpression'&&!left.computed&&left.object?.type==='Identifier'&&left.object.name==='window'&&left.property?.type==='Identifier')return left.property.name;
  return null;
}
function initTarget(init){
  if(init?.type==='Identifier'&&targets.has(init.name))return init.name;
  if(init?.type==='MemberExpression'&&!init.computed&&init.object?.type==='Identifier'&&init.object.name==='window'&&init.property?.type==='Identifier'&&targets.has(init.property.name))return init.property.name;
  return null;
}
function walk(node,cb,parent=null){
  if(!node||typeof node!=='object')return;cb(node,parent);
  for(const [k,v] of Object.entries(node)){
    if(['start','end','loc'].includes(k))continue;
    if(Array.isArray(v))for(const x of v)walk(x,cb,node);else if(v&&typeof v==='object')walk(v,cb,node);
  }
}
let count=0;
for(const domain of fs.readdirSync(path.join(root,'modules')).filter(x=>fs.existsSync(path.join(root,'modules',x,'runtime')))){
  const dir=path.join(root,'modules',domain,'runtime');
  for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.js')).sort()){
    const p=path.join(dir,file),src=fs.readFileSync(p,'utf8');
    const ast=parse(src,{ecmaVersion:'latest',sourceType:'script',allowAwaitOutsideFunction:true});
    const aliases=new Map(),varStatements=new Map();
    walk(ast,(n,parent)=>{
      if(n.type==='VariableDeclarator'&&n.id?.type==='Identifier'){
        const t=initTarget(n.init);if(t){aliases.set(n.id.name,{target:t,decl:n,parent});if(parent?.type==='VariableDeclaration')varStatements.set(n.id.name,parent);}
      }
    });
    const replacements=[],consumed=new Set();
    walk(ast,(n,parent)=>{
      if(n.type!=='ExpressionStatement'||n.expression?.type!=='AssignmentExpression'||n.expression.operator!=='=')return;
      const a=n.expression,t=targetOf(a.left),fn=a.right;if(!targets.has(t)||!['FunctionExpression','ArrowFunctionExpression'].includes(fn?.type))return;
      const used=[];walk(fn,x=>{if(x.type==='Identifier'&&aliases.has(x.name)&&aliases.get(x.name).target===t&&!used.includes(x.name))used.push(x.name)});used.forEach(x=>consumed.add(x));
      const aliasCode=used.map(x=>`const ${x}=(...a)=>next(a);`).join('');
      const fnSource=src.slice(fn.start,fn.end);
      const code=`(window.__RYM_CORE_PENDING_AROUND__ ||= []).push([${JSON.stringify(t)},${fn.async?'async ':''}function(next,args,ctx){${aliasCode}const impl=${fnSource};return impl.apply(ctx.thisArg,args)}]);`;
      replacements.push({start:n.start,end:n.end,code});count++;
    });
    for(const alias of consumed){const st=varStatements.get(alias);if(st&&st.declarations?.length===1)replacements.push({start:st.start,end:st.end,code:''});}
    if(!replacements.length)continue;
    const unique=[];const seen=new Set();for(const r of replacements){const k=r.start+':'+r.end;if(!seen.has(k)){seen.add(k);unique.push(r)}}
    unique.sort((a,b)=>b.start-a.start);let out=src;for(const r of unique)out=out.slice(0,r.start)+r.code+out.slice(r.end);fs.writeFileSync(p,out);console.log('migrated',domain,file,unique.length);
  }
}

const idx=path.join(root,'index.html');let html=fs.readFileSync(idx,'utf8');
const runtime='<script id="rym-v172-core-runtime" src="/modules/core/runtime.js?v=172-clean"></script>';
const composition='\n<script id="rym-v172-core-composition" src="/modules/core/composition.js?v=172-clean"></script>';
if(!html.includes('rym-v172-core-composition')){
  if(!html.includes(runtime))throw new Error('core runtime index marker missing');
  html=html.replace(runtime,runtime+composition);fs.writeFileSync(idx,html);
}
console.log('Core service overrides migrated:',count);
