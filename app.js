// Many links × many affiliate IDs → one tracked link per product per account.
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = "slc-accounts";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(accounts)); } catch {} };
  // "Ngân PTK" → "ngan-ptk": lowercase, no diacritics, hyphens
  const slug = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // Share mode: /link-converter/<slug> (served by 404.html) or ?n=<slug>; the ID is looked up in accounts.json
  const BASE = "/link-converter/";
  const tail = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length).replace(/\/$/, "") : "";
  const n = new URLSearchParams(location.search).get("n") || (/^(index|404)(\.html)?$/.test(tail) ? "" : tail);
  let accounts = n ? [] : load();
  if (!n && !accounts.length) accounts = [{ name: "Tài khoản 1", id: "" }];
  const shareUrl = (a) => `${location.origin}${BASE}${slug(a.name)}`;

  function renderAccounts() {
    $("accCount").textContent = `${accounts.length} tài khoản`;
    $("accounts").replaceChildren(
      ...accounts.map((a, i) => {
        const box = document.createElement("div");
        box.className = "acc";
        const row = document.createElement("div");
        row.className = "acc-row";
        const name = Object.assign(document.createElement("input"), { value: a.name, placeholder: "Tên" });
        const id = Object.assign(document.createElement("input"), { value: a.id, placeholder: "Affiliate ID", inputMode: "numeric" });
        const rm = Object.assign(document.createElement("button"), { type: "button", className: "btn-sm btn-icon", textContent: "✕", title: "Xóa" });
        const link = document.createElement("div");
        link.className = "acc-link";
        const lbl = Object.assign(document.createElement("span"), { className: "acc-link-label", textContent: "Link:" });
        const code = document.createElement("code");
        const cp = Object.assign(document.createElement("button"), { type: "button", className: "btn-sm", textContent: "Sao chép" });
        const open = Object.assign(document.createElement("a"), { className: "btn-sm", textContent: "Mở link", target: "_blank", rel: "noopener" });
        const sync = () => {
          id.classList.toggle("bad", !!a.id && !ShopeeLink.validId(a.id));
          const ok = ShopeeLink.validId(a.id) && slug(a.name);
          code.textContent = ok ? shareUrl(a) : "Nhập tên và ID";
          link.classList.toggle("off", !ok);
          open.href = ok ? shareUrl(a) : "#";
        };
        name.oninput = () => { a.name = name.value; save(); sync(); };
        id.oninput = () => { a.id = id.value.trim(); save(); sync(); };
        rm.onclick = () => { accounts.splice(i, 1); if (!accounts.length) accounts.push({ name: "Tài khoản 1", id: "" }); save(); renderAccounts(); };
        cp.onclick = () => !link.classList.contains("off") && copy(code.textContent, cp);
        row.append(name, id, rm);
        link.append(lbl, code, cp, open);
        box.append(row, link);
        sync();
        return box;
      })
    );
  }

  // Small toast at the bottom of the screen
  let toastTimer;
  const toast = (text) => {
    let el = $("toast");
    if (!el) { el = Object.assign(document.createElement("div"), { id: "toast", className: "toast", role: "status" }); document.body.append(el); }
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  };
  const copy = async (text, btn) => {
    try { await navigator.clipboard.writeText(text); toast("✓ Đã sao chép"); }
    catch { toast("Không sao chép được — hãy chép thủ công"); }
  };

  function run() {
    const valid = accounts.filter((a) => ShopeeLink.validId(a.id));
    const lines = $("links").value.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!valid.length) { $("summary").textContent = "Thêm ít nhất một Affiliate ID hợp lệ (6–20 chữ số)."; return; }
    if (!lines.length) { $("summary").textContent = "Dán ít nhất một link Shopee."; return; }
    const seen = new Set();
    const items = lines.map((line) => {
      const r = ShopeeLink.readLine(line);
      if (r.product) { if (seen.has(r.product)) return { line, error: "Trùng với link phía trên." }; seen.add(r.product); }
      return { line, ...r };
    });
    const ok = items.filter((x) => x.product);
    $("summary").textContent = `${ok.length}/${items.length} link · ${valid.length} tài khoản → ${ok.length * valid.length} link mới`;

    $("copyAll").replaceChildren(
      ...valid.map((a) => {
        const b = Object.assign(document.createElement("button"), { type: "button", className: "outline", textContent: `Sao chép tất cả · ${a.name || a.id}` });
        b.onclick = () => copy(ok.map((x) => ShopeeLink.build(x.product, a.id)).join("\n"), b);
        return b;
      })
    );
    $("results").replaceChildren(
      ...items.map((x) => {
        const box = document.createElement("div");
        box.className = "res";
        const head = document.createElement("div");
        head.className = "res-head" + (x.error ? " err" : "");
        head.textContent = x.error ? `${x.line} — ${x.error}` : x.product;
        box.append(head);
        if (x.product) for (const a of valid) {
          const link = ShopeeLink.build(x.product, a.id);
          const row = document.createElement("div");
          row.className = "res-line";
          const b = Object.assign(document.createElement("b"), { textContent: a.name || a.id });
          const c = Object.assign(document.createElement("code"), { textContent: link, title: link });
          const btn = Object.assign(document.createElement("button"), { type: "button", className: "btn-sm", textContent: "Sao chép" });
          btn.onclick = () => copy(link, btn);
          row.append(b, c, btn);
          box.append(row);
        }
        return box;
      })
    );
    $("out").hidden = false;
  }

  $("addAcc").onclick = () => { accounts.push({ name: `Tài khoản ${accounts.length + 1}`, id: "" }); save(); renderAccounts(); };
  $("run").onclick = run;
  $("clear").onclick = () => { $("links").value = ""; $("out").hidden = true; $("summary").textContent = ""; };
  // Publish accounts.json to the repo through the GitHub API (token kept only in this browser)
  const REPO = "hoangpham2263/link-converter";
  async function publish() {
    const btn = $("publish"), say = (t) => ($("pubStatus").textContent = t);
    const out = {};
    for (const a of accounts) if (ShopeeLink.validId(a.id) && slug(a.name)) out[slug(a.name)] = { name: a.name, id: a.id };
    let token = localStorage.getItem("slc-token");
    if (!token) {
      token = (prompt("Dán GitHub token (fine-grained, chỉ repo link-converter, quyền Contents: Read and write):") || "").trim();
      if (!token) return;
      localStorage.setItem("slc-token", token);
    }
    btn.disabled = true;
    say("Đang cập nhật…");
    try {
      const api = `https://api.github.com/repos/${REPO}/contents/accounts.json`;
      const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };
      const cur = await fetch(api, { headers, cache: "no-store" });
      if (cur.status === 401) { localStorage.removeItem("slc-token"); throw new Error("Token sai hoặc hết hạn — bấm lại để nhập token mới."); }
      const { sha } = cur.ok ? await cur.json() : {};
      const content = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(out, null, 2) + "\n")));
      const r = await fetch(api, { method: "PUT", headers, body: JSON.stringify({ message: "data: update accounts", content, sha }) });
      if (!r.ok) throw new Error(`GitHub trả lỗi ${r.status}`);
      say(`✓ Đã cập nhật ${Object.keys(out).length} tài khoản`, "ok");
    } catch (e) {
      say(e.message, "err");
    }
    btn.disabled = false;
  }
  $("publish").onclick = publish;

  if (n) {
    $("accSection").hidden = true;
    fetch("accounts.json", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})).then((all) => {
      const a = all[slug(n)];
      if (a && ShopeeLink.validId(a.id)) {
        accounts = [a];
        $("who").replaceChildren("Tài khoản: ", Object.assign(document.createElement("strong"), { textContent: a.name }));
      } else {
        $("who").textContent = "Không tìm thấy tài khoản này — kiểm tra lại link.";
        $("who").classList.add("missing");
        $("run").disabled = true;
      }
      $("who").hidden = false;
    });
  } else {
    $("convSection").hidden = true;
    renderAccounts();
    // First visit on a new browser: start from the published list
    if (!load().length) fetch("accounts.json", { cache: "no-store" }).then((r) => r.json()).then((all) => {
      const list = Object.values(all);
      if (list.length) { accounts = list; save(); renderAccounts(); }
    }).catch(() => {});
  }
})();
