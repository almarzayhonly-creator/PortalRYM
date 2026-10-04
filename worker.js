export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    const contentType = headers.get("content-type") || "";
    const host = new URL(request.url).hostname;
    const isSandbox = host.startsWith("sandbox-panapass-v2-") || host.includes("-portal-ena-rym.almarzayhonly.workers.dev");

    if (isSandbox) {
      headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
      headers.set("pragma", "no-cache");
      headers.set("expires", "0");
      headers.set("x-rym-sandbox", "panapass-v2");
    }

    if (contentType.includes("text/html")) {
      headers.set("cache-control", "no-store, no-cache, must-revalidate");
      headers.set("x-portal-build", "panapass-dashboard-owner-v12");

      const html = await response.text();
      const staleInline = /<script\b[^>]*\bid=["']rym-dashboard-payments-inline["'][^>]*>[\s\S]*?<\/script\s*>/gi;
      const staleExternal = /<script\b[^>]*\bsrc=["'][^"']*\/modules\/core\/dashboard-payments-enhance\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script\s*>/gi;
      const owner = '<script id="rym-dashboard-payments-owner" src="/modules/core/dashboard-payments-enhance.js?v=12" defer></script>';
      const rankingOwner = '<script id="rym-ranking-criteria-owner" src="/modules/core/panapass-ranking-criteria-final.js?v=13" defer></script>';

      const embeddedBuild = html.match(/data-sandbox-build=["']([0-9a-f]{40})["']/i)?.[1] || "";
      const verifiedBuild = embeddedBuild;
      const safeBuild = verifiedBuild || "unknown";
      const shortBuild = verifiedBuild ? verifiedBuild.slice(0, 7) : "BUILD DESCONOCIDO";
      if (isSandbox) headers.set("x-rym-sandbox-build", safeBuild);

      const staleSandboxCss = /<link\b[^>]*href=["'][^"']*\/css\/panapass-sandbox\/tokens\.css(?:\?[^"']*)?["'][^>]*>/gi;
      const staleSandboxLoader = /<script\b[^>]*src=["'][^"']*\/modules\/v171-loader\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script\s*>/gi;
      const staleSandboxGuard = /<script\b[^>]*src=["'][^"']*\/modules\/panapass-sandbox\/dashboard\/index\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script\s*>/gi;

      const sandboxRuntime = isSandbox
        ? '<link rel="stylesheet" href="/css/panapass-sandbox/tokens.css?v='+encodeURIComponent(safeBuild)+'">'
          + '<script id="rym-v171-loader" src="/modules/v171-loader.js?v='+encodeURIComponent(safeBuild)+'" defer></script>'
          + '<script id="rym-sandbox-v2-guard" src="/modules/panapass-sandbox/dashboard/index.js?v='+encodeURIComponent(safeBuild)+'" defer></script>'
        : '';

      let body = html
        .replace(staleInline, "")
        .replace(staleExternal, "")
        .replace(staleSandboxCss, "")
        .replace(staleSandboxLoader, "")
        .replace(staleSandboxGuard, "");

      const bodyEnd = body.toLowerCase().lastIndexOf("</body>");
      body = bodyEnd >= 0
        ? body.slice(0, bodyEnd) + owner + rankingOwner + sandboxRuntime + body.slice(bodyEnd)
        : body + owner + rankingOwner + sandboxRuntime;

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
