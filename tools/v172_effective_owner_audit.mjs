import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'acorn';

const root=process.cwd();
const targets=new Set(['phase6ConsultarSaldoENA','phase6OpenUnit','phase10RenderSaldo','phase31EnhanceSaldoButtons','wa18Attach','wa18Run','wa18BuildPay','wa18BuildNeg','v75Recorrido','v87BajasPanapass','v94ControlCuposATTT','rymPrefetchRevisados','dashboard','render','pagosTrabajo','pagosTrabajoTable','reportes','usuarios','v11UnitList']);
function nameOf(left){if(left?.type==='Identifier')return left.name;if(left?.type==='MemberExpression'&&!left.computed&&left.object?.type==='Identifier'&&left.object.name==='window'&&left.property?.type==='Identifier')return left.property.name;return null}
function walk(node,cb){if(!node||typeof node!=='object')return;cb(node);for(const [k,v] of Object.entries(node)){if(['start','end','loc'].includes(k))continue;if(Array.isArray(v))for(const x of v)walk(x,cb);else if(v&&typeof v==='object')walk(v,cb)}}
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m,i)=>({src:m[1].split('?')[0],order:i}));
const order=new Map(refs.map(x=>[x.src.replace(/^\//,''),x.order]));
const rows=[];
for(const domain of fs.readdirSync(path.join(root,'modules'))){
 const base=path.join(root,'modules',domain);if(!fs.statSync(base).isDirectory())continue;
 const stack=[base];while(stack.length){const dir=stack.pop();for(const f of fs.readdirSync(dir)){const p=path.join(dir,f),st=fs.statSync(p);if(st.isDirectory()){stack.push(p);continue}if(!f.endsWith('.js'))continue;const rel=path.relative(root,p).replaceAll('\\','/'),src=fs.readFileSync(p,'utf8');let ast;try{ast=parse(src,{ecmaVersion:'latest',sourceType:'script'})}catch{continue}walk(ast,n=>{if(n.type==='AssignmentExpression'&&n.operator==='='){const t=nameOf(n.left);if(targets.has(t)&&['FunctionExpression','ArrowFunctionExpression'].includes(n.right?.type))rows.push({target:t,path:rel,order:order.get(rel)??99999,start:n.start,bytes:n.end-n.start});}})}}
}
rows.sort((a,b)=>a.order-b.order||a.start-b.start);
const grouped={};for(const r of rows)(grouped[r.target]??=[]).push(r);
const report={targets:{}};for(const [t,a] of Object.entries(grouped))report.targets[t]={count:a.length,effective:a[a.length-1],definitions:a};
fs.writeFileSync(path.join(root,'docs/arquitectura/V172_EFFECTIVE_OWNERS.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
