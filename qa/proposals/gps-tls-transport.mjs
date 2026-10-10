// Fixed-provider HTTP/1.1 over TLS, preserving the providers' nonstandard ports.
const feeds=new Set(['https://logistictodo.com:5001/user97','https://logistictodo.com:5000/user149']);
const MAX=8*1024*1024;
export function decodeHttp(bytes){
  const raw=new TextDecoder('latin1').decode(bytes),end=raw.indexOf('\r\n\r\n');
  if(end<0||end>16384)throw Error('Invalid upstream headers');
  const lines=raw.slice(0,end).split('\r\n'),status=Number(lines.shift().match(/^HTTP\/1\.[01] (\d{3}) /)?.[1]);
  if(status!==200)throw Error('Upstream HTTP '+status);
  const headers=new Headers();
  for(const line of lines){const colon=line.indexOf(':');if(colon<1)throw Error('Invalid upstream header');headers.append(line.slice(0,colon),line.slice(colon+1).trim())}
  if(headers.has('content-encoding')&&headers.get('content-encoding')!=='identity')throw Error('Unsupported upstream encoding');
  let body=bytes.subarray(end+4);
  if(headers.get('transfer-encoding')?.toLowerCase()==='chunked'){
    const chunks=[];let offset=0,total=0;
    for(;;){
      let next=offset;while(next+1<body.length&&(body[next]!==13||body[next+1]!==10))next++;
      if(next+1>=body.length)throw Error('Truncated chunk header');
      const hex=new TextDecoder().decode(body.subarray(offset,next)).split(';')[0];
      if(!/^[0-9a-f]+$/i.test(hex))throw Error('Invalid chunk size');
      const size=parseInt(hex,16);offset=next+2;if(size===0)break;
      if(offset+size+2>body.length||body[offset+size]!==13||body[offset+size+1]!==10)throw Error('Truncated chunk');
      chunks.push(body.subarray(offset,offset+size));total+=size;offset+=size+2;
    }
    const decoded=new Uint8Array(total);let position=0;for(const chunk of chunks){decoded.set(chunk,position);position+=chunk.length}body=decoded;
  }else if(headers.has('transfer-encoding'))throw Error('Unsupported transfer encoding');
  else if(headers.has('content-length')&&Number(headers.get('content-length'))!==body.length)throw Error('Truncated body');
  if(body.length>MAX)throw Error('Upstream too large');
  return new Response(body,{headers:{'content-type':headers.get('content-type')||'application/json'}});
}
export function createGpsTransport(connect){
  return async function(source){
    if(!feeds.has(source))throw Error('Provider not allowed');
    const url=new URL(source),socket=connect({hostname:url.hostname,port:Number(url.port)},{secureTransport:'on',allowHalfOpen:true});
    let timer;
    const operation=(async()=>{
      await socket.opened;
      const writer=socket.writable.getWriter();
      await writer.write(new TextEncoder().encode('GET '+url.pathname+' HTTP/1.1\r\nHost: '+url.host+'\r\nAccept: application/json\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n'));
      writer.releaseLock();
      const reader=socket.readable.getReader(),chunks=[];let total=0;
      try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>MAX+16384)throw Error('Upstream too large');chunks.push(value)}}finally{reader.releaseLock()}
      const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
      return decodeHttp(bytes);
    })();
    try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Upstream timeout')),15000)})])}
    finally{clearTimeout(timer);await socket.close().catch(()=>{})}
  };
}
