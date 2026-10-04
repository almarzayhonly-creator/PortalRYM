const SANDBOX_BUILD = "__RYM_SANDBOX_BUILD__";

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

      const embeddedBuild = html.match(/data-sandbox-build=["']([^"']+)["']/i)?.[1] || "";
      const requestUrl = new URL(request.url);
      const compiledBuild = SANDBOX_BUILD !== "__RYM_SANDBOX_BUILD__" ? SANDBOX_BUILD : "";
      const requestedBuild = compiledBuild || embeddedBuild || requestUrl.searchParams.get("sandboxBuild") || "sandbox-live";
      const safeBuild = String(requestedBuild).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80) || "sandbox-live";
      const shortBuild = safeBuild.length > 7 ? safeBuild.slice(0, 7) : safeBuild;
      if (isSandbox) headers.set("x-rym-sandbox-build", safeBuild);

      const staleSandboxCss = /<link\b[^>]*href=["'][^"']*\/css\/panapass-sandbox\/tokens\.css(?:\?[^"']*)?["'][^>]*>/gi;
      const staleSandboxBadge = /<div\b[^>]*class=["'][^"']*pps-sandbox-badge[^"']*["'][^>]*>[\s\S]*?<\/div\s*>/gi;
      const staleSandboxLoader = /<script\b[^>]*src=["'][^"']*\/modules\/v171-loader\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script\s*>/gi;
      const staleSandboxGuard = /<script\b[^>]*src=["'][^"']*\/modules\/panapass-sandbox\/dashboard\/index\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script\s*>/gi;

      const sandboxRuntime = isSandbox
        ? '<link rel="stylesheet" href="/css/panapass-sandbox/tokens.css?v='+encodeURIComponent(safeBuild)+'">'
          + '<div class="pps-sandbox-badge" data-sandbox-build="'+safeBuild+'" style="position:fixed;right:14px;bottom:14px;z-index:2147483647;padding:8px 11px;border:1px solid #b9d6ff;border-radius:999px;background:#103d79;color:#fff;font:800 11px/1 system-ui,sans-serif;box-shadow:0 8px 22px rgba(16,61,121,.22);letter-spacing:.04em">PANAPASS · SANDBOX V2 · '+shortBuild+'</div>'
          + '<script id="rym-v171-loader" src="/modules/v171-loader.js?v='+encodeURIComponent(safeBuild)+'" defer></script>'
          + '<script id="rym-sandbox-v2-guard" src="/modules/panapass-sandbox/dashboard/index.js?v='+encodeURIComponent(safeBuild)+'" defer></script>'
        : '';

      let body = html
        .replace(staleInline, "")
        .replace(staleExternal, "")
        .replace(staleSandboxCss, "")
        .replace(staleSandboxBadge, "")
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
