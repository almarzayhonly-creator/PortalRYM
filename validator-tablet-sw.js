/* Portal RYM · Unit Validator PWA
   Cache only the dedicated shell/static identity. Portal auth/API/data always stay network-fresh. */
const CACHE='rym-unit-validator-shell-v21';
const CORE=['/unit-validator.html','/validator-tablet.webmanifest','/assets/rym-validator-192.png','/assets/rym-validator-512.png','/css/validator-tablet-app.css?v=21','/modules/core/validator-session.js?v=21','/modules/core/unit-validator-shell.js?v=21','/modules/control-auto/validator-presentation.js?v=21','/modules/control-auto/validator-details.js?v=21','/modules/control-auto/validator-tablet-app.js?v=21'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(async keys=>{
        const old=keys.filter(k=>k.startsWith('rym-unit-validator-shell-')&&k!==CACHE);
        await Promise.all(old.map(k=>caches.delete(k)));
        await self.clients.claim();
        // Upgrade already-open v17 PWAs whose shell has no update listener.
        // Only this read-only app's outer windows reload; session storage is preserved.
        if(old.length)for(const client of await self.clients.matchAll({type:'window'})){
          const url=new URL(client.url);
          if(['/unit-validator','/unit-validator.html'].includes(url.pathname)||
            (url.pathname==='/'&&['validador','validator','validador-unidad','unit-validator'].includes(url.searchParams.get('app')))){
            // Navigation fetch waits for activation; awaiting it here deadlocks.
            void client.navigate(client.url).catch(()=>{});
          }
        }
      })
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
