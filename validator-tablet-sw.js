/* Portal RYM Validator PWA: network-first by design.
   API/auth responses are never cached so behavior stays aligned with main. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  event.respondWith(fetch(request));
});
