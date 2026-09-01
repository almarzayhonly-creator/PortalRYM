export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    const contentType = headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      headers.set("cache-control", "no-store, no-cache, must-revalidate");
      headers.set("x-portal-build", "panapass-admin-dashboard-v6");
      const html = await response.text();
      const controller = '<script src="/modules/core/dashboard-payments-enhance.js?v=6" defer></script>';
      const body = html.includes(controller)
        ? html
        : html.replace(/<\/body\s*>/i, `${controller}</body>`);
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
