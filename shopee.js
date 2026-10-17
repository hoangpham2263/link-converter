// Shopee affiliate link helpers (ported from the Hoàn Hời personal-link module).
(() => {
  const PRODUCT_PATHS = [/^\/product\/(\d+)\/(\d+)\/?$/, /^\/[^/]+\/(\d+)\/(\d+)\/?$/, /^\/[^/]*-i\.(\d+)\.(\d+)\/?$/];
  const KEEP = new Set(["variant", "extraParams", "rModelId"]);
  const isShopeeHost = (h) => /(^|\.)shopee\.vn$/i.test(h) || /(^|\.)shp\.ee$/i.test(h);
  const isMainShopee = (h) => /(^|\.)shopee\.vn$/i.test(h);
  const isProduct = (u) => isMainShopee(u.hostname) && PRODUCT_PATHS.some((p) => p.test(u.pathname));
  const isRedirect = (u) => u.hostname.toLowerCase() === "s.shopee.vn" && u.pathname.replace(/\/+$/, "") === "/an_redir";

  function unwrap(url) {
    let cur = url;
    for (let i = 0; i < 4; i++) {
      if (!isRedirect(cur)) return cur;
      const origin = cur.searchParams.get("origin_link");
      if (!origin) return cur;
      let next;
      try { next = new URL(origin, cur); } catch { return cur; }
      if (next.protocol !== "https:" || !isMainShopee(next.hostname)) return cur;
      cur = next;
    }
    return cur;
  }

  function clean(url) {
    const u = new URL(url.toString());
    for (const k of [...u.searchParams.keys()]) if (!KEEP.has(k)) u.searchParams.delete(k);
    u.hash = "";
    return u;
  }

  /** Returns { product } or { error } for one pasted line. */
  function readLine(text) {
    const m = /https?:\/\/[^\s"'<>]+/i.exec(text);
    if (!m) return { error: "Không thấy link trong dòng này." };
    let url;
    try { url = new URL(m[0].replace(/[),.;!?]+$/, "")); } catch { return { error: "Link không hợp lệ." }; }
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.username || url.password || !isShopeeHost(url.hostname)) return { error: "Chỉ đổi được link Shopee." };
    const u = unwrap(url);
    if (isProduct(u)) return { product: clean(u).toString() };
    if (isRedirect(u)) return { error: "Link affiliate này không chứa link sản phẩm." };
    return { error: "Link rút gọn — mở link trên trình duyệt rồi dán link sản phẩm đầy đủ." };
  }

  const validId = (id) => /^\d{6,20}$/.test(String(id).trim());

  function build(productUrl, affiliateId) {
    const d = new URL("https://s.shopee.vn/an_redir");
    d.searchParams.set("origin_link", productUrl);
    d.searchParams.set("affiliate_id", String(affiliateId).trim());
    return d.toString();
  }

  window.ShopeeLink = { readLine, validId, build };
})();
