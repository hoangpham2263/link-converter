// Many links × many affiliate IDs → one tracked link per product per account.
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = "slc-accounts";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(accounts)); } catch {} };
  // Share mode: ?id=<affiliate id>&n=<name> — a friend converts links for that one account only
  const q = new URLSearchParams(location.search);
  const shared = ShopeeLink.validId(q.get("id") || "") ? { name: q.get("n") || "", id: q.get("id") } : null;
  let accounts = shared ? [shared] : load();
  if (!accounts.length) accounts = [{ name: "Tài khoản 1", id: "" }];
  const shareUrl = (a) => `${location.origin}${location.pathname}?${new URLSearchParams({ id: a.id, n: a.name })}`;

  function renderAccounts() {
    $("accounts").replaceChildren(
      ...accounts.map((a, i) => {
        const row = document.createElement("div");
        row.className = "acc-row";
        const name = Object.assign(document.createElement("input"), { value: a.name, placeholder: "Tên gợi nhớ" });
        const id = Object.assign(document.createElement("input"), { value: a.id, placeholder: "Affiliate ID (6–20 số)", inputMode: "numeric" });
        id.classList.toggle("bad", !!a.id && !ShopeeLink.validId(a.id));
        name.oninput = () => { a.name = name.value; save(); };
        id.oninput = () => { a.id = id.value.trim(); id.classList.toggle("bad", !!a.id && !ShopeeLink.validId(a.id)); save(); };
        const rm = Object.assign(document.createElement("button"), { type: "button", className: "btn-sm btn-icon", textContent: "✕", title: "Xóa" });
        rm.onclick = () => { accounts.splice(i, 1); if (!accounts.length) accounts.push({ name: "Tài khoản 1", id: "" }); save(); renderAccounts(); };
        const share = Object.assign(document.createElement("button"), { type: "button", className: "btn-sm", textContent: "Chép link gửi bạn" });
        share.onclick = () => (ShopeeLink.validId(a.id) ? copy(shareUrl(a), share) : id.focus());
        row.append(name, id, share, rm);
        return row;
      })
    );
  }

  const copy = async (text, btn) => {
    try { await navigator.clipboard.writeText(text); const t = btn.textContent; btn.textContent = "Đã chép"; setTimeout(() => (btn.textContent = t), 1200); } catch {}
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
        const b = Object.assign(document.createElement("button"), { type: "button", className: "outline", textContent: `Chép tất cả · ${a.name || a.id}` });
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
  if (shared) {
    $("accSection").hidden = true;
    $("who").textContent = shared.name ? `Link đổi theo tài khoản của ${shared.name}` : "";
    $("who").hidden = !shared.name;
  } else renderAccounts();
})();
