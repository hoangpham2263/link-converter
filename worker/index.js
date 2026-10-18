// Resolves Shopee short links (s.shopee.vn/xxx, shp.ee/xxx…) to the product URL.
// Same idea as Hoàn Hời's resolve-short-link: follow redirects by hand, Shopee hosts only, bounded hops.
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 5000;
const ALLOWED_ORIGINS = ["https://hoangpham.is-a.dev", "http://localhost:4334"];

const isShopeeHost = (h) => /(^|\.)(shopee\.vn|shp\.ee|shope\.ee|shopee\.ee)$/i.test(h);
// /product/<shop>/<item>, /<name>-i.<shop>.<item>, /<name>/<shop>/<item>
const isProduct = (u) =>
  /(^|\.)shopee\.vn$/i.test(u.hostname) &&
  (/^\/product\/\d+\/\d+/.test(u.pathname) || /-i\.\d+\.\d+/.test(u.pathname) || /^\/[^/]+\/\d+\/\d+\/?$/.test(u.pathname));

async function resolve(input) {
  let current = new URL(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== "https:" || current.username || current.password || current.port) throw new Error("Link không an toàn.");
    if (!isShopeeHost(current.hostname)) throw new Error("Link không dẫn về Shopee.");
    // an_redir wrappers carry the product in origin_link
    const origin = current.pathname === "/an_redir" && current.searchParams.get("origin_link");
    if (origin) { current = new URL(origin); continue; }
    if (isProduct(current)) return current.toString();
    const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "Mozilla/5.0" } });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current);
      continue;
    }
    throw new Error("Link không dẫn tới sản phẩm Shopee.");
  }
  throw new Error("Quá nhiều lần chuyển hướng.");
}

export default {
  async fetch(request) {
    const origin = request.headers.get("origin") || "";
    const cors = {
      "access-control-allow-origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "access-control-allow-methods": "GET, OPTIONS",
      "content-type": "application/json; charset=utf-8",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url).searchParams.get("url");
    if (!url) return new Response(JSON.stringify({ error: "Thiếu tham số url." }), { status: 400, headers: cors });
    try {
      return new Response(JSON.stringify({ url: await resolve(url) }), { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message || "Không mở được link." }), { status: 422, headers: cors });
    }
  },
};
