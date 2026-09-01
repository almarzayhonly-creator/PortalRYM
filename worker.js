export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    const contentType = headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      headers.set("cache-control", "no-store, no-cache, must-revalidate");
      headers.set("x-portal-build", "panapass-dashboard-scope-v8");
      const html = await response.text();
      const controller = '<script src="/modules/core/dashboard-payments-enhance.js?v=8" defer></script>';
      const bodyEnd = html.toLowerCase().lastIndexOf("</body>");
      const body = html.includes(controller) || bodyEnd < 0
        ? html
        : html.slice(0, bodyEnd) + controller + html.slice(bodyEnd);
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
