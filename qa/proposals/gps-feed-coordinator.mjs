// Review candidate only. Not bound to the Portal Worker or deployed.
// Raw feeds are restricted to a server-to-server secret; the existing Edge Function
// must still authorize each user and filter visible units before returning data.
const SOURCES=Object.freeze({
  '/gps':'https://logistictodo.com:5001/user97',
  '/status':'https://logistictodo.com:5000/user149'
});
const response=(message,status)=>new Response(message,{status,headers:{'cache-control':'no-store'}});
export class InFlight{
  pending=new Map();
  read(key,loader){
    if(this.pending.has(key))return this.pending.get(key);
    const promise=Promise.resolve().then(loader).finally(()=>this.pending.delete(key));
    this.pending.set(key,promise);return promise;
  }
}
async function authorized(request,secret){
  if(typeof secret!=='string'||secret.length<32)return false;
  const given=request.headers.get('authorization')||'',encoder=new TextEncoder();
  const digests=await Promise.all([given,'Bearer '+secret].map(value=>crypto.subtle.digest('SHA-256',encoder.encode(value))));
  const left=new Uint8Array(digests[0]),right=new Uint8Array(digests[1]);let difference=0;
  for(let i=0;i<left.length;i++)difference|=left[i]^right[i];return difference===0;
}
export class GpsFeedCoordinator{
  constructor(state,env,fetchImpl=globalThis.fetch){this.env=env;this.fetchImpl=fetchImpl;this.flights=new InFlight()}
  async fetch(request){
    if(!await authorized(request,this.env.GPS_COORDINATOR_SECRET))return response('Unauthorized',401);
    if(request.method!=='GET')return response('Method not allowed',405);
    const path=new URL(request.url).pathname,source=SOURCES[path];if(!source)return response('Not found',404);
    try{
      const result=await this.flights.read(path,async()=>{
        const upstream=await this.fetchImpl(source,{headers:{accept:'application/json'},cache:'no-store'});
        if(!upstream.ok)throw Error('Upstream unavailable');
        return {body:await upstream.arrayBuffer(),contentType:upstream.headers.get('content-type')||'application/json'};
      });
      return new Response(result.body.slice(0),{headers:{'content-type':result.contentType,'cache-control':'no-store'}});
    }catch{return response('Upstream unavailable',502)}
  }
}
export default{
  async fetch(request,env){
    if(!await authorized(request,env.GPS_COORDINATOR_SECRET))return response('Unauthorized',401);
    if(request.method!=='GET')return response('Method not allowed',405);
    const path=new URL(request.url).pathname;if(!SOURCES[path])return response('Not found',404);
    return env.GPS_FEEDS.getByName('validator-feed-global').fetch(request);
  }
};
