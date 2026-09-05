export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    const contentType = headers.get("content-type") || "";
    const url = new URL(request.url);
    const isHtml = contentType.includes("text/html");
    const isScript = contentType.includes("javascript") || url.pathname.endsWith(".js");
    const isStyle = contentType.includes("text/css") || url.pathname.endsWith(".css");

    if (isHtml || isScript || isStyle) {
      headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
      headers.set("pragma", "no-cache");
      headers.set("expires", "0");
    }
    if (isHtml) headers.set("x-portal-build", "panapass-dashboard-v2-clean");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
