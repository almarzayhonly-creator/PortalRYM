function isolatedValidatorHost(html){
  const core=html.match(/<script id="rym-v99-centro-control-js">([\s\S]*?)<\/script>/)?.[1];
  if(!core)return html; // QA fixtures already supply only the canonical validator.
  const auth=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  const between=(source,start,end)=>{
    const a=source?.indexOf(start),b=source?.indexOf(end,a);
    if(a==null||a<0||b<a)throw Error('Validator source anchor missing: '+start);
    return source.slice(a,b);
  };
  const runtime='var login,loadApp;window.RYM_VALIDATOR_HOST=true;\n'+between(auth,'const URL=','async function cobraLive(')+
    between(auth,'const RYM_SANDBOX_HOST=','function loginView(')+
    between(auth,'function loginView(','async function login(')+
    between(auth,'function passwordChangeView(','async function loadApp(');
  const modal=between(core,'  const E99=','  function card99(').replace('refreshIndicators:refreshExecutiveCards99','refreshIndicators:()=>{}');
  const styles=[...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map(m=>m[0]).join('\n') + '\n<style id="rym-login-env-host-css">.rym-login-environments{margin:0 0 15px}.rym-login-env-caption{display:block;margin:0 0 7px 2px;color:#69788d;font-size:9px;font-weight:900;letter-spacing:.14em}.rym-login-env-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}.rym-login-env-option{position:relative;display:flex;align-items:center;gap:9px;min-width:0;min-height:54px;padding:8px 10px;border:1px solid #dce3ea;border-radius:13px;background:linear-gradient(145deg,#fff,#f8fafc);color:#17324d;text-decoration:none;box-shadow:0 3px 9px #17324d08;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease}.rym-login-env-option:hover{transform:translateY(-1px);border-color:#f47b20;box-shadow:0 7px 15px #17324d12}.rym-login-env-option:focus-visible{outline:3px solid #ffc928;outline-offset:2px}.rym-login-env-option.active{border-color:#1769c2;background:linear-gradient(135deg,#edf5ff,#fff);box-shadow:inset 0 0 0 1px #1769c2,0 5px 14px #1769c21c}.rym-login-env-option.active:after{position:absolute;top:7px;right:8px;width:7px;height:7px;border-radius:50%;background:#16834a;content:"";box-shadow:0 0 0 3px #16834a1c}.rym-login-env-symbol{display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;border-radius:9px;color:#17191d;background:linear-gradient(145deg,#ffc928,#f47b20);font-size:12px;font-weight:950}.rym-login-env-symbol.sandbox{color:#fff;background:linear-gradient(145deg,#16834a,#2a83c8)}.rym-login-env-copy{display:grid;gap:2px;min-width:0}.rym-login-env-copy b{color:#17324d;font-size:12px;line-height:1.1}.rym-login-env-copy small{color:#596574;font-size:10px;line-height:1.2}.rym-login-env-status{margin-left:auto;padding:3px 5px;border-radius:999px;background:#eaf6ef;color:#16834a;font-size:8px;font-weight:950;letter-spacing:.05em;white-space:nowrap}@media(max-width:650px){.rym-login-env-option{gap:7px;min-height:52px;padding:7px}.rym-login-env-status{display:none}}@media(prefers-reduced-motion:reduce){.rym-login-env-option{transition:none}.rym-login-env-option:hover{transform:none}}</style>';
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Validador de Unidad</title>'+styles+'</head><body><div id="app"></div><script>'+runtime+'\n'+modal+'\nwindow.openValidator99=openValidator99;window.bindValidator99=bindValidator99;window.searchValidator99=searchValidator99;window.loadValidatorDetail99=loadValidatorDetail99;\n</script></body></html>';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const validatorApp = ["validador","validator","validador-unidad","unit-validator"].includes((url.searchParams.get("app") || "").toLowerCase());

    if ((validatorApp && url.pathname === "/") || ["/unit-validator", "/unit-validator.html"].includes(url.pathname)) {
      // Assets canonicalize .html with a redirect; fetch the canonical asset so
      // the PWA entry keeps the Worker build/cache headers on its 200 response.
      const shellUrl = new URL("/unit-validator", url);
      const shellRequest = new Request(shellUrl, request);
      const shellResponse = await env.ASSETS.fetch(shellRequest);
      const shellHeaders = new Headers(shellResponse.headers);
      shellHeaders.set("cache-control", "no-store, no-cache, must-revalidate");
      shellHeaders.set("x-portal-build", "unit-validator-shell-v29");
      shellHeaders.set("x-rym-app", "unit-validator");
      return new Response(shellResponse.body, {
        status: shellResponse.status,
        statusText: shellResponse.statusText,
        headers: shellHeaders,
      });
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    const contentType = headers.get("content-type") || "";
    const validatorStatic = ["/validator-tablet-sw.js", "/validator-tablet.webmanifest", "/css/validator-tablet-app.css", "/modules/core/unit-validator-shell.js", "/modules/core/validator-session.js", "/modules/control-auto/validator-presentation.js", "/modules/control-auto/validator-details.js", "/modules/control-auto/validator-tablet-app.js"].includes(url.pathname);
    if (validatorStatic) {
      headers.set("cache-control", "no-store, no-cache, must-revalidate");
      headers.set("x-portal-build", "unit-validator-shell-v29");
      if (url.pathname === "/validator-tablet-sw.js") headers.set("service-worker-allowed", "/");
    }

    if (contentType.includes("text/html")) {
      headers.set("cache-control", "no-store, no-cache, must-revalidate");
      headers.set("x-portal-build", "panapass-dashboard-owner-v12");

      const html = await response.text();
      const staleInline = /<script\b[^>]*\bid=["']rym-dashboard-payments-inline["'][^>]*>[\s\S]*?<\/script\s*>/gi;
      const staleExternal = /<script\b[^>]*\bsrc=["'][^"']*\/modules\/core\/dashboard-payments-enhance\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script\s*>/gi;
      const staleRanking = /<script\b[^>]*\bid=["']rym-ranking-criteria-inline["'][^>]*>[\s\S]*?<\/script\s*>/gi;
      const staleNegLast = /<script\b[^>]*\bsrc=["'][^"']*\/modules\/core\/panapass-negativos-ultima-consulta\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script\s*>/gi;
      const owner = '<script id="rym-dashboard-payments-owner" src="/modules/core/dashboard-payments-enhance.js?v=12" defer></script>';
      const rankingOwner = '<script id="rym-ranking-criteria-owner" src="/modules/core/panapass-ranking-criteria-final.js?v=13" defer></script>';
      const negativosLastOwner = '<script id="rym-negativos-last-query-owner" src="/modules/core/panapass-negativos-ultima-consulta.js?v=1" defer></script>';
      const unitValidatorLauncher = '<script id="rym-unit-validator-launcher-owner" src="/modules/core/unit-validator-launcher.js?v=1" defer></script>';

      let body = html.replace(staleInline, "").replace(staleExternal, "").replace(staleRanking, "").replace(staleNegLast, "");
      if (url.pathname === "/") {
        const dedicated=url.searchParams.get("validator-host") === "1";
        if(dedicated)body=isolatedValidatorHost(body);
        const revStart=body.indexOf('  async function loadRevisados99()'),revEnd=body.indexOf('  function findRevisado99(',revStart);
        if(revStart>=0&&revEnd>revStart){
          const helper="  async function loadRevisados99(unit){try{const r=await req('/functions/v1/revisados-validator',{method:'POST',body:JSON.stringify({unidad:unit})});if(r?.data?.ok)return r.data}catch(e){console.warn('Validator unit Revisados',e)}return {rows:[]}}\n";
          body=body.slice(0,revStart)+helper+body.slice(revEnd);
          body=body.replace('const revData=await loadRevisados99();','const revData=await loadRevisados99(ctrl.unidad);');
        }
        if(dedicated){
          headers.set("x-portal-build", "unit-validator-shell-v29");
          body = body.replace(/<html\b/i, '<html class="rym-unit-validator-app"');
        }
        // The dedicated validator uses its own module permission for the GPS card.
        // The GPS Edge Function independently verifies the user JWT and validator access.
        const legacyGpsGate = "const adminGps=['ADMIN_TOTAL','ADMIN','GERENTE_GALERA','SUPERVISORA'].includes(String(state?.profile?.rol||'').trim().toUpperCase());";
        if (body.includes(legacyGpsGate)) {
          body = body.replace(legacyGpsGate, "const adminGps=!!(typeof window.rymHasModule==='function'&&window.rymHasModule('control_auto.validador_unidad_app'))||['ADMIN_TOTAL','ADMIN','GERENTE_GALERA','SUPERVISORA'].includes(String(state?.profile?.rol||'').trim().toUpperCase());");
        }
        // The official module permits one installed/reporting GPS. Its evaluated
        // level, normalized by the adapter, drives the host summary as well.
        body = body.replace("const tone=missing||level==='CRITICO'?'bad':level==='ALERTA'?'warn':(g1.ok&&g2.ok?'ok':'warn');", "const tone=level==='CRITICO'?'bad':level==='ALERTA'?'warn':level==='OK'?'ok':'bad';");

        // Publish only the canonical modal functions within the isolated validator host.
        // Keep index.html byte-for-byte identical to main (CI parity contract).
        const validatorBridgeAnchor = "  function card99(cls,icon,title,desc,buttonId,minis,badge='Disponible'){";
        const validatorBridge = "  window.openValidator99=openValidator99;window.bindValidator99=bindValidator99;window.searchValidator99=searchValidator99;window.loadValidatorDetail99=loadValidatorDetail99;\\n";
        if (body.includes(validatorBridgeAnchor)) body = body.replace(validatorBridgeAnchor, validatorBridge.replace('\\n','\n') + validatorBridgeAnchor);

        body = body.replace(/<\/head>/i, '<link rel="stylesheet" href="/css/validator-tablet-app.css?v=29"><script src="/modules/control-auto/validator-presentation.js?v=29" defer></script><script src="/modules/control-auto/validator-details.js?v=29" defer></script>' + (dedicated?'<script src="/modules/core/validator-session.js?v=29" defer></script>':'<script>window.RYM_VALIDATOR_INTEGRATED=true;</script>') + '<script src="/modules/control-auto/validator-tablet-app.js?v=29" defer></script></head>');
      }
      const bodyEnd = body.toLowerCase().lastIndexOf("</body>");
      const extras=url.searchParams.get('validator-host')==='1'?'':owner+rankingOwner+negativosLastOwner+unitValidatorLauncher;
      body = bodyEnd >= 0
        ? body.slice(0, bodyEnd) + extras + body.slice(bodyEnd)
        : body + extras;

      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
