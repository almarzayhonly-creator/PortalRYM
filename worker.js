export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    const contentType = headers.get("content-type") || "";
    const url = new URL(request.url);
    const isHtml = contentType.includes("text/html");
    const isScript = contentType.includes("javascript") || url.pathname.endsWith(".js");
    const isStyle = contentType.includes("text/css") || url.pathname.endsWith(".css");

    // Architecture pilot: never mix old and new dashboard generations.
    // HTML, JS and CSS must always revalidate while this branch is under active development.
    if (isHtml || isScript || isStyle) {
      headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
      headers.set("pragma", "no-cache");
      headers.set("expires", "0");
    }

    let body = response.body;

    if (isHtml) {
      // The monolithic legacy index still contains an embedded V11 Panapass dashboard.
      // Architecture V2 owns this view now. Remove that one inline owner at delivery
      // time so it cannot repaint #phase4GaleraKpis after the modular dashboard renders.
      const html = await response.text();
      body = html.replace(
        /<script\s+id=["']rym-dashboard-payments-inline["'][^>]*>[\s\S]*?<\/script>/i,
        '<script id="rym-dashboard-payments-inline" data-disabled-by="architecture-v2"></script>'
      );
      headers.delete("content-length");
      headers.set("x-portal-build", "panapass-dashboard-pilot-20260905-legacy-owner-off");
      headers.set("x-portal-legacy-dashboard", "disabled");
    }

    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
