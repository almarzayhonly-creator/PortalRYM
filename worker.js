export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const validatorApp = ["validador","validator","validator-tablet"].includes((url.searchParams.get("app") || "").toLowerCase());
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    const contentType = headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      headers.set("cache-control", "no-store, no-cache, must-revalidate");
      headers.set("x-portal-build", validatorApp ? "validator-tablet-app-v1" : "panapass-dashboard-owner-v12");
      if (validatorApp) headers.set("x-rym-app", "validator-tablet");

      const html = await response.text();
      const staleInline = /<script\b[^>]*\bid=["']rym-dashboard-payments-inline["'][^>]*>[\s\S]*?<\/script\s*>/gi;
      const staleExternal = /<script\b[^>]*\bsrc=["'][^"']*\/modules\/core\/dashboard-payments-enhance\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script\s*>/gi;
      const staleRanking = /<script\b[^>]*\bid=["']rym-ranking-criteria-inline["'][^>]*>[\s\S]*?<\/script\s*>/gi;
      const staleNegLast = /<script\b[^>]*\bsrc=["'][^"']*\/modules\/core\/panapass-negativos-ultima-consulta\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script\s*>/gi;
      const owner = '<script id="rym-dashboard-payments-owner" src="/modules/core/dashboard-payments-enhance.js?v=12" defer></script>';
      const rankingOwner = '<script id="rym-ranking-criteria-owner" src="/modules/core/panapass-ranking-criteria-final.js?v=13" defer></script>';
      const negativosLastOwner = '<script id="rym-negativos-last-query-owner" src="/modules/core/panapass-negativos-ultima-consulta.js?v=1" defer></script>';
      const validatorStyle = '<link id="rym-validator-tablet-style" rel="stylesheet" href="/css/validator-tablet-app.css?v=1">';
      const validatorScript = '<script id="rym-validator-tablet-script" src="/modules/control-auto/validator-tablet-app.js?v=1"></script>';

      let body = html.replace(staleInline, "").replace(staleExternal, "").replace(staleRanking, "").replace(staleNegLast, "");
      if (validatorApp && !body.includes('id="rym-validator-tablet-style"')) {
        const headEnd = body.toLowerCase().lastIndexOf("</head>");
        body = headEnd >= 0
          ? body.slice(0, headEnd) + validatorStyle + body.slice(headEnd)
          : validatorStyle + body;
      }
      const bodyEnd = body.toLowerCase().lastIndexOf("</body>");
      const validatorAssets = validatorApp ? validatorScript : "";
      body = bodyEnd >= 0
        ? body.slice(0, bodyEnd) + owner + rankingOwner + negativosLastOwner + validatorAssets + body.slice(bodyEnd)
        : body + owner + rankingOwner + negativosLastOwner + validatorAssets;

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
