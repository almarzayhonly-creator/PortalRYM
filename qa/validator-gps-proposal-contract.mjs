import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import gateway from './proposals/gps-feed-coordinator.mjs';

const patch=fs.readFileSync('qa/proposals/gps-rym-validator.patch','utf8').replaceAll('\r','');
const lines=patch.trimEnd().split('\n');
const added=lines.filter(line=>line.startsWith('+')&&!line.startsWith('+++')).map(line=>line.slice(1));
assert.equal(added.length,Number(lines.find(line=>line.startsWith('@@')).match(/\+20,(\d+)/)[1]),'Patch hunk count');
let calls=[],config={},payload=[{unit:'fixture'}];
const context=vm.createContext({URL,Array,Error,Deno:{env:{get:key=>config[key]}},fetch:async(url,opt)=>{
  calls.push({url,opt});return new Response(JSON.stringify(payload));
}});
// The deployed Edge Function has a lexical URL string for the Supabase origin.
vm.runInContext("const URL='https://supabase.fixture.invalid';"+stripTypeScriptTypes(added.join('\n'))+';transport=json;',context);
const gps='https://logistictodo.com:5001/user97',status='https://logistictodo.com:5000/user149';
await context.transport(gps);assert.equal(calls[0].url,gps);assert.equal(calls[0].opt.headers.authorization,undefined);
const secret='controlled-fixture-secret-not-a-real-credential';
config={GPS_SHARED_FEED_URL:'https://fixture.invalid',GPS_COORDINATOR_SECRET:secret};calls=[];
payload=[[{unit:'nested'}]];
assert.equal((await context.transport(gps))[0].unit,'nested');await context.transport(status);
assert.deepEqual(calls.map(call=>call.url),['https://fixture.invalid/gps','https://fixture.invalid/status']);
assert.equal(calls[0].opt.headers.authorization,'Bearer '+secret);
for(const url of ['http://fixture.invalid','https://fixture.invalid/path','https://user:pass@fixture.invalid','https://fixture.invalid/?q=1']){
  config.GPS_SHARED_FEED_URL=url;await assert.rejects(context.transport(gps),/shared_feed_origin_invalid/);
}
config={GPS_SHARED_FEED_URL:'https://fixture.invalid'};await assert.rejects(context.transport(gps),/configuration_incomplete/);
config={GPS_SHARED_FEED_URL:'https://fixture.invalid',GPS_COORDINATOR_SECRET:secret};
await assert.rejects(context.transport('https://other.invalid'),/not_allowed/);
payload={};await assert.rejects(context.transport(gps),/JSON no es array/);
let dispatched=0;
const env={GPS_COORDINATOR_SECRET:secret,GPS_FEEDS:{getByName:name=>{
  assert.equal(name,'validator-feed-global');return {fetch:async()=>{dispatched++;return new Response('[]')}};
}}};
assert.equal((await gateway.fetch(new Request('https://fixture.invalid/gps'),env)).status,401);
assert.equal(dispatched,0);
assert.equal((await gateway.fetch(new Request('https://fixture.invalid/gps',{headers:{authorization:'Bearer '+secret}}),env)).status,200);
assert.equal(dispatched,1);
console.log('PASS GPS proposal: direct fallback, two allowed shared routes, malformed configuration rejection, unchanged array parsing and gateway authorization.');
