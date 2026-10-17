// Many links × many affiliate IDs → one tracked link per product per account.
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = "slc-accounts";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(accounts)); } catch {} };
  // "Ngân PTK" → "ngan-ptk": lowercase, no diacritics, hyphens
  const slug = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // Share mode: ?n=<slug> — the ID is looked up in accounts.json, so the link carries only the name
  const n = new URLSearchParams(location.search).get("n");
  let accounts = n ? [] : load();
  if (!n && !accounts.length) accounts = [{ name: "Tài khoản 1", id: "" }];

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
        share.onclick = () => (!ShopeeLink.validId(a.id) ? id.focus() : !slug(a.name) ? name.focus() : copy(shareUrl(a), share));
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
  // accounts.json for the published site: { "ngan-ptk": { "name": "Ngân PTK", "id": "17…" } }
  $("export").onclick = () => {
    const out = {};
    for (const a of accounts) if (ShopeeLink.validId(a.id) && slug(a.name)) out[slug(a.name)] = { name: a.name, id: a.id };
    copy(JSON.stringify(out, null, 2) + "\n", $("export"));
  };

  if (n) {
    $("accSection").hidden = true;
    fetch("accounts.json", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})).then((all) => {
      const a = all[slug(n)];
      if (a && ShopeeLink.validId(a.id)) {
        accounts = [a];
        $("who").textContent = `Link đổi theo tài khoản của ${a.name}`;
      } else {
        $("who").textContent = "Không tìm thấy tài khoản này — kiểm tra lại link.";
        $("run").disabled = true;
      }
      $("who").hidden = false;
    });
  } else renderAccounts();
})();
