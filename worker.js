function isolatedValidatorHost(html){
  const core=html.match(/<script id="rym-v99-centro-control-js">([\s\S]*?)<\/script>/)?.[1];
  if(!core)return html; // QA fixtures already supply only the canonical validator.
  const auth=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  const between=(source,start,end)=>{
    const a=source?.indexOf(start),b=source?.indexOf(end,a);
    if(a==null||a<0||b<a)throw Error('Validator source anchor missing: '+start);
    return source.slice(a,b);
  };
  const standaloneLogin=`function loginView(msg=''){
    window.__RYM_VUE_NEXT_LOGIN?.dispose();
    app.innerHTML='<main class="uva-auth-page"><section class="uva-auth-card" aria-labelledby="uva-auth-title"><div class="uva-auth-brand"><img src="/assets/rym-validator-512.png" alt="RYM"><span>Validador RYM</span></div><p class="uva-auth-kicker">ACCESO DE OPERACIÓN</p><h1 id="uva-auth-title">Validador de Unidad</h1><p class="uva-auth-copy">Inicia sesión para consultar la información operativa de una unidad.</p>'+ (msg?'<div class="uva-auth-error" role="alert">'+esc(msg)+'</div>':'') +'<form id="f" class="uva-auth-form"><label>Usuario<input name="usuario" autocomplete="username" placeholder="Usuario asignado" required></label><label>Contraseña<input name="password" type="password" autocomplete="current-password" placeholder="Contraseña" required></label><button id="loginBtn" type="submit">Ingresar al validador <span aria-hidden="true">→</span></button></form><p class="uva-auth-foot">Portal RYM · Validador independiente</p></section></main>';
    document.querySelector('#f').onsubmit=login;
  }`;
  const runtime='var login,loadApp;window.RYM_VALIDATOR_HOST=true;\n'+between(auth,'const URL=','async function cobraLive(')+
    between(auth,'const RYM_SANDBOX_HOST=','function loginView(')+standaloneLogin+
    between(auth,'async function login(','function passwordChangeView(')+
    between(auth,'function passwordChangeView(','async function loadApp(');
  const modal=between(core,'  const E99=','  function card99(').replace('refreshIndicators:refreshExecutiveCards99','refreshIndicators:()=>{}');
  const styles=[...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map(m=>m[0]).join('\n');
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Validador de Unidad</title>'+styles+'<style>\n.uva-auth-page{min-height:100vh;box-sizing:border-box;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 15% 0%,#e5f4ff 0,transparent 42%),linear-gradient(145deg,#f4f7fb,#edf3fa)}.uva-auth-card{box-sizing:border-box;width:min(460px,100%);padding:36px;border:1px solid #d8e3f2;border-radius:22px;background:#fff;box-shadow:0 20px 60px #0a1b4d16;color:#10224e;font-family:Inter,system-ui,"Segoe UI",sans-serif}.uva-auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:30px;color:#0a1b4d;font-size:17px;font-weight:750}.uva-auth-brand img{width:48px;height:48px;object-fit:contain}.uva-auth-kicker{margin:0 0 8px;color:#244aa5;font-size:11px;font-weight:800;letter-spacing:.12em}.uva-auth-card h1{margin:0;font-size:28px;line-height:1.15;letter-spacing:-.04em}.uva-auth-copy{margin:10px 0 24px;color:#62708c;font-size:14px;line-height:1.55}.uva-auth-form{display:grid;gap:17px}.uva-auth-form label{display:grid;gap:7px;font-size:13px;font-weight:700}.uva-auth-form input{box-sizing:border-box;width:100%;height:52px;padding:0 14px;border:1px solid #d8e3f2;border-radius:11px;background:#fbfcfe;color:#10224e;font:500 15px inherit}.uva-auth-form input:focus{outline:3px solid #244aa522;border-color:#244aa5}.uva-auth-form button{height:54px;margin-top:4px;border:0;border-radius:11px;background:#244aa5;color:#fff;font:700 15px inherit;cursor:pointer}.uva-auth-form button span{margin-left:8px}.uva-auth-error{margin:0 0 16px;padding:11px 13px;border-radius:10px;background:#fff1f0;color:#b42318;font-size:13px}.uva-auth-foot{margin:23px 0 0;text-align:center;color:#73819a;font-size:11px}@media(max-width:520px){.uva-auth-page{padding:16px}.uva-auth-card{padding:27px 22px;border-radius:18px}}</style></head><body><div id="app"></div><script>'+runtime+'\n'+modal+'\nwindow.openValidator99=openValidator99;window.bindValidator99=bindValidator99;window.searchValidator99=searchValidator99;window.loadValidatorDetail99=loadValidatorDetail99;\n</script></body></html>';
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
      shellHeaders.set("x-portal-build", "unit-validator-shell-v32");
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
    const validatorStatic = ["/validator-tablet-sw.js", "/validator-tablet.webmanifest", "/css/validator-tablet-app.css", "/css/validator-tablet-app-legacy.css", "/modules/core/unit-validator-shell.js", "/modules/core/validator-session.js", "/modules/control-auto/validator-presentation.js", "/modules/control-auto/validator-details.js", "/modules/control-auto/validator-tablet-app.js", "/modules/control-auto/validator-tablet-app-legacy.js"].includes(url.pathname);
    if (validatorStatic) {
      headers.set("cache-control", "no-store, no-cache, must-revalidate");
      headers.set("x-portal-build", "unit-validator-shell-v32");
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
          headers.set("x-portal-build", "unit-validator-shell-v32");
          body = body.replace(/<html\b/i, '<html class="rym-unit-validator-app"');
        }
        // The dedicated validator uses its own module permission for the GPS card.
        // The GPS Edge Function independently verifies the user JWT and validator access.
        const legacyGpsGate = "const adminGps=['ADMIN_TOTAL','ADMIN','GERENTE_GALERA','SUPERVISORA'].includes(String(state?.profile?.rol||'').trim().toUpperCase());";
        if (body.includes(legacyGpsGate)) {
          body = body.split(legacyGpsGate).join("const adminGps=!!(typeof window.rymHasModule==='function'&&window.rymHasModule('control_auto.validador_unidad_app'))||['ADMIN_TOTAL','ADMIN','GERENTE_GALERA','SUPERVISORA'].includes(String(state?.profile?.rol||'').trim().toUpperCase());");
        }
        // The official module permits one installed/reporting GPS. Its evaluated
        // level, normalized by the adapter, drives the host summary as well.
        body = body.replace("const tone=missing||level==='CRITICO'?'bad':level==='ALERTA'?'warn':(g1.ok&&g2.ok?'ok':'warn');", "const tone=level==='CRITICO'?'bad':level==='ALERTA'?'warn':level==='OK'?'ok':'bad';");

        // Publish only the canonical modal functions within the isolated validator host.
        // Keep index.html byte-for-byte identical to main (CI parity contract).
        const validatorBridgeAnchor = "  function card99(cls,icon,title,desc,buttonId,minis,badge='Disponible'){";
        const validatorBridge = "  window.openValidator99=openValidator99;window.bindValidator99=bindValidator99;window.searchValidator99=searchValidator99;window.loadValidatorDetail99=loadValidatorDetail99;\\n";
        if (body.includes(validatorBridgeAnchor)) body = body.replace(validatorBridgeAnchor, validatorBridge.replace('\\n','\n') + validatorBridgeAnchor);

        const validatorUi=dedicated
          ? '<link rel="stylesheet" href="/css/validator-tablet-app-legacy.css?v=32"><script src="/modules/control-auto/validator-presentation.js?v=32" defer></script><script src="/modules/control-auto/validator-details.js?v=32" defer></script><script src="/modules/core/validator-session.js?v=32" defer></script><script src="/modules/control-auto/validator-tablet-app-legacy.js?v=32" defer></script>'
          : '<link rel="stylesheet" href="/css/validator-tablet-app.css?v=32"><script src="/modules/control-auto/validator-presentation.js?v=32" defer></script><script src="/modules/control-auto/validator-details.js?v=32" defer></script><script>window.RYM_VALIDATOR_INTEGRATED=true;</script><script src="/modules/control-auto/validator-tablet-app.js?v=32" defer></script>';
        body = body.replace(/<\/head>/i, validatorUi + '</head>');
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

