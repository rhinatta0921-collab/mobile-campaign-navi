export const OFFICIAL_ORIGIN = "https://r-mobile.kuraberaku.com";
export const LEGACY_WORKERS_HOSTNAME =
  "rakuten-mobile-campaign-navi.r-hinatta0921.workers.dev";

function isWorkersPreview(hostname) {
  return hostname.endsWith(".workers.dev");
}

function redirectToOfficial(url) {
  const destination = new URL(url.pathname + url.search, OFFICIAL_ORIGIN);
  return new Response(null, {
    status: 301,
    headers: { Location: destination.href },
  });
}

function withPreviewNoindex(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === LEGACY_WORKERS_HOSTNAME) {
      return redirectToOfficial(url);
    }

    const response = await env.ASSETS.fetch(request);
    return isWorkersPreview(url.hostname)
      ? withPreviewNoindex(response)
      : response;
  },
};

export default worker;
