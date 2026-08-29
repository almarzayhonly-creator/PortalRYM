import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'acorn';
import {generate} from 'astring';

const MIGRATOR_VERSION='1.0';
const root=process.cwd();
const routeMap={v11UnitList:'unidades',v94ControlCuposATTT:'cupos',v75ControlDashboard:'dashboard',v75ControlAudit:'auditoria',v80OpenEcarValidator:'validador'};
function targetOf(left){
  if(left?.type==='Identifier')return left.name;
  if(left?.type==='MemberExpression'&&!left.computed&&left.object?.type==='Identifier'&&left.object.name==='window'&&left.property?.type==='Identifier')return left.property.name;
  return null;
}
function idOfParam(p){if(!p)return null;if(p.type==='Identifier')return p.name;if(p.type==='AssignmentPattern'&&p.left?.type==='Identifier')return p.left.name;return null;}
function walk(node,fn){if(!node||typeof node!=='object')return;fn(node);for(const [k,v] of Object.entries(node)){if(['start','end','loc'].includes(k))continue;if(Array.isArray(v))for(const x of v)walk(x,fn);else if(v&&typeof v==='object')walk(v,fn);}}
let total=0;
for(const domain of ['control-auto','panapass','revisados','core']){
  const dir=path.join(root,'modules',domain,'runtime');if(!fs.existsSync(dir))continue;
  for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.js')).sort()){
    const p=path.join(dir,file),src=fs.readFileSync(p,'utf8');
    const ast=parse(src,{ecmaVersion:'latest',sourceType:'script',allowAwaitOutsideFunction:true});
    const aliases=new Map();
    for(const st of ast.body){
      if(st.type!=='VariableDeclaration'||st.declarations.length!==1)continue;
      const d=st.declarations[0],t=d.init?.type==='Identifier'?d.init.name:(d.init?.type==='MemberExpression'&&!d.init.computed&&d.init.object?.name==='window'?d.init.property?.name:null);
      if(d.id?.type==='Identifier'&&routeMap[t])aliases.set(d.id.name,{target:t,start:st.start,end:st.end});
    }
    const replacements=[];const consumed=new Set();
    for(const st of ast.body){
      if(st.type!=='ExpressionStatement'||st.expression?.type!=='AssignmentExpression'||st.expression.operator!=='=')continue;
      const a=st.expression,target=targetOf(a.left),fn=a.right;
      if(!routeMap[target]||!['FunctionExpression','ArrowFunctionExpression'].includes(fn?.type)||fn.body?.type!=='BlockStatement')continue;
      const used=[];walk(fn.body,n=>{if(n.type==='Identifier'&&aliases.has(n.name)&&aliases.get(n.name).target===target&&!used.includes(n.name))used.push(n.name)});used.forEach(x=>consumed.add(x));
      const param=idOfParam(fn.params?.[0]);const pre=[];if(param)pre.push(`const ${param}=ctx.view;`);for(const al of used)pre.push(`const ${al}=(..._args)=>next();`);
      const body=fn.body.body.map(x=>generate(x)).join('\n');
      const code=`(window.__RYM_CONTROL_PENDING_AROUND__ ||= []).push([${JSON.stringify(routeMap[target])}, ${fn.async?'async ':''}function(next,ctx){\n${pre.join('\n')}\n${body}\n}]);`;
      replacements.push({start:st.start,end:st.end,code});total++;
    }
    for(const al of consumed){const x=aliases.get(al);replacements.push({start:x.start,end:x.end,code:''});}
    if(!replacements.length)continue;
    replacements.sort((a,b)=>b.start-a.start);let out=src;for(const r of replacements)out=out.slice(0,r.start)+r.code+out.slice(r.end);fs.writeFileSync(p,out);console.log('migrated',domain,file,replacements.length);
  }
}
console.log('Control route assignments migrated:',total,MIGRATOR_VERSION);
