export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const validatorApp = ["validador","validator","validador-unidad","unit-validator"].includes((url.searchParams.get("app") || "").toLowerCase());

    if (validatorApp && url.pathname === "/") {
      const shellUrl = new URL("/unit-validator.html", url);
      const shellRequest = new Request(shellUrl, request);
      const shellResponse = await env.ASSETS.fetch(shellRequest);
      const shellHeaders = new Headers(shellResponse.headers);
      shellHeaders.set("cache-control", "no-store, no-cache, must-revalidate");
      shellHeaders.set("x-portal-build", "unit-validator-shell-v16");
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
      if (url.pathname === "/" && url.searchParams.get("validator-host") === "1") {
        body = body.replace(/<html\b/i, '<html class="rym-unit-validator-app"');
        // Publish only the canonical modal functions within the isolated validator host.
        // Keep index.html byte-for-byte identical to main (CI parity contract).
        const validatorBridgeAnchor = "  function card99(cls,icon,title,desc,buttonId,minis,badge='Disponible'){";
        const validatorBridge = "  window.openValidator99=openValidator99;window.bindValidator99=bindValidator99;window.searchValidator99=searchValidator99;\\n";
        if (body.includes(validatorBridgeAnchor)) body = body.replace(validatorBridgeAnchor, validatorBridge.replace('\\n','\n') + validatorBridgeAnchor);

        body = body.replace(/<\/head>/i, '<link rel="stylesheet" href="/css/validator-tablet-app.css?v=16"><script src="/modules/control-auto/validator-tablet-app.js?v=16" defer></script></head>');
      }
      const bodyEnd = body.toLowerCase().lastIndexOf("</body>");
      body = bodyEnd >= 0
        ? body.slice(0, bodyEnd) + owner + rankingOwner + negativosLastOwner + unitValidatorLauncher + body.slice(bodyEnd)
        : body + owner + rankingOwner + negativosLastOwner + unitValidatorLauncher;

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
