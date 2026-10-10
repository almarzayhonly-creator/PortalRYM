import assert from 'node:assert/strict';
import {decodeHttp,createGpsTransport} from './proposals/gps-tls-transport.mjs';
const bytes=text=>new TextEncoder().encode(text);
assert.equal(await decodeHttp(bytes('HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\n[]')).text(),'[]');
assert.equal(await decodeHttp(bytes('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n2;test=1\r\n[]\r\n0\r\n\r\n')).text(),'[]');
for(const raw of ['HTTP/1.1 503 Error\r\n\r\n','HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\n[]','HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n4\r\n[]','HTTP/1.1 200 OK\r\nContent-Encoding: gzip\r\n\r\n[]'])assert.throws(()=>decodeHttp(bytes(raw)));
let opened=0,closed=0,requests=[];
const transport=createGpsTransport((address,options)=>{
  opened++;assert.equal(address.hostname,'logistictodo.com');assert.ok([5000,5001].includes(address.port));assert.equal(options.secureTransport,'on');
  return {opened:Promise.resolve(),close:async()=>{closed++},writable:new WritableStream({write:value=>requests.push(new TextDecoder().decode(value))}),readable:new ReadableStream({start:controller=>{controller.enqueue(bytes('HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\n[]'));controller.close()}})};
});
for(const source of ['https://logistictodo.com:5001/user97','https://logistictodo.com:5000/user149'])assert.deepEqual(await (await transport(source)).json(),[]);
await assert.rejects(transport('https://other.invalid/'),/Provider not allowed/);assert.equal(opened,2);assert.equal(closed,2);
assert.match(requests[0],/Host: logistictodo.com:5001\r\n/);assert.match(requests[1],/GET \/user149 HTTP\/1.1/);
console.log('PASS GPS TLS transport: fixed providers/ports, verified TLS, HTTP framing, rejection and socket cleanup.');
