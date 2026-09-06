import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(path,'utf8');
const fail=[];
const index=read(join(root,'index.html'));
const loader=read(join(root,'modules/v171-loader.js'));
const scripts=['modules/panapass/dashboard/role-policy.js','modules/panapass/dashboard/view-model.js','modules/panapass/dashboard/components.js','modules/panapass/dashboard/views/admin-total.js','modules/panapass/dashboard/views/galera.js','modules/panapass/dashboard/views/supervisora.js','modules/panapass/dashboard/index.js'];
for(const path of scripts){const hits=index.split(`src="/${path}"`).length-1;if(hits!==1)fail.push(`script must appear once: ${path}`);if(!existsSync(join(root,path)))fail.push(`missing script: ${path}`);if(loader.includes(path))fail.push(`script loaded by v171 loader: ${path}`)}
const firstRuntime=index.indexOf('const URL=');
for(const path of scripts)if(index.indexOf(`src="/${path}"`)>firstRuntime)fail.push(`script loads after runtime: ${path}`);
if(!index.includes('const PANAPASS_DASHBOARD_V2=true'))fail.push('missing V2 flag');
if(!index.includes("PANAPASS_DASHBOARD_V2?renderPanapassDashboardV2(v):dashboard(v)"))fail.push('router lacks V2/fallback route');
const dashboardDir=join(root,'modules/panapass/dashboard');
function walk(path){return readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(path,e.name)):[join(path,e.name)]);}
const prohibited=/\brpc\s*\(|window\.dashboard|w\.dashboard|installDashboardOwner|MutationObserver|createElement\s*\(\s*['"]style|RYM_PANAPASS_CLEAN_RUNTIME|RYM_PANAPASS_CLEAN_DATA/;
for(const file of walk(dashboardDir)){if(file.endsWith('.js')&&prohibited.test(read(file)))fail.push(`prohibited dashboard dependency: ${relative(root,file)}`)}
const owner=read(join(dashboardDir,'index.js'));
if(!/RYM_PANAPASS_DASHBOARD_V2=Object\.freeze\(\{render\}\)/.test(owner))fail.push('owner must expose render');
const css=read(join(root,'css/panapass/dashboard.css'));
if(/RESERVED FOR|@import/.test(css)||!css.includes('.rym-pdc')||!css.includes('body[data-rym-module="panapass"]'))fail.push('dashboard CSS is not a scoped non-placeholder');
const bridge=index.slice(index.indexOf('async function renderPanapassDashboardV2'),index.indexOf('async function render(){'));
for(const rpc of bridge.matchAll(/rpc\('([^']+)'/g))if(!['dashboard_resumen','panapass_ranking_pagos'].includes(rpc[1]))fail.push(`unapproved bridge RPC: ${rpc[1]}`);
if(fail.length){console.error(fail.join('\n'));process.exit(1)}
console.log('Panapass Dashboard V2 contract passed.');
