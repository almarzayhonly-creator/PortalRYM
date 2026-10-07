/* Portal RYM · Unit Validator PWA
   Cache only the dedicated shell/static identity. Portal auth/API/data always stay network-fresh. */
const CACHE='rym-unit-validator-shell-v3';
const CORE=['/unit-validator.html','/validator-tablet.webmanifest','/assets/rym-validator-192.png','/assets/rym-validator-512.png','/css/validator-tablet-app.css?v=3','/modules/core/unit-validator-shell.js?v=3'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('rym-unit-validator-shell-')&&k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  const isStatic=CORE.includes(url.pathname+url.search);
  if(!isStatic){
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response=>{
        if(!response.ok)return response;
        const clone=response.clone();
        caches.open(CACHE).then(cache=>cache.put(request,clone)).catch(()=>{});
        return response;
      })
      .catch(()=>caches.match(request))
  );
});
