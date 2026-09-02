export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    const contentType = headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      headers.set("cache-control", "no-store, no-cache, must-revalidate");
      headers.set("x-portal-build", "panapass-dashboard-scope-v10");
      const html = await response.text();
      const controllerUrl = new URL("/modules/core/dashboard-payments-enhance.js?v=10", request.url);
      const controllerResponse = await env.ASSETS.fetch(new Request(controllerUrl, request));
      const controllerCode = controllerResponse.ok ? await controllerResponse.text() : "";
      const controller = `<script id="rym-dashboard-payments-inline">\n${controllerCode}\n</script>`;
      const inlinePattern = /<script id="rym-dashboard-payments-inline">[\s\S]*?<\/script>/i;
      const bodyEnd = html.toLowerCase().lastIndexOf("</body>");
      const body = controllerCode && inlinePattern.test(html)
        ? html.replace(inlinePattern, controller)
        : controllerCode && bodyEnd >= 0
          ? html.slice(0, bodyEnd) + controller + html.slice(bodyEnd)
          : html;
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
