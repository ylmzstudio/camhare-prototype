/* CAMHARE prototype — "Musée" — vanilla JS, hash-routed, no build step. */
(() => {
  "use strict";

  const CATALOG = window.CATALOG || [];
  const I18N = window.I18N;
  const WA_NUMBER = "905308619585";
  const IMG = "assets/img/p/";
  const HERO_IMG = "assets/img/hero/";
  const COLLS = ["osmanli", "anadolu", "bardak"];
  const HERO = [[2825, "sehzade-vazo"], [1882, "selimiye-sahan"], [1641, "kisve-kabe-ortusu-vazo"], [3214, "sifali-vazo"]];
  const COVER = { osmanli: "tekbir-gondol-buyuk", anadolu: "burkut-ile-murkut-kase", bardak: "lalezar-bardak-grubu" };
  const FEATURED = [1645, 3285, 3202, 3186, 3075, 3343, 3259, 3164];
  const TYPE_ORDER = ["vazo", "kase", "sekerlik", "mumluk", "gondol", "ibrik", "sahan", "tabak", "ayna", "set", "mucevherlik", "dekor", "obje"];
  const byId = new Map(CATALOG.map((p) => [p.id, p]));
  const bySlug = new Map(CATALOG.map((p) => [p.slug, p]));

  /* ---------- storage (best effort) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("camhare:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("camhare:" + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  let lang = store.get("lang", "tr");
  if (!I18N[lang]) lang = "tr";
  let selection = store.get("selection", []).filter((s) => byId.has(s.id));
  const listState = { type: "all", q: "", search: false };

  const t = (k) => (I18N[lang] && I18N[lang][k]) ?? I18N.tr[k] ?? k;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $("#app");

  const ICON = {
    menu: '<svg viewBox="0 0 24 24"><path d="M3 9h18M3 15h18"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5.5 8.5h13l-1 12h-11l-1-12z"/><path d="M9 8.5V7a3 3 0 016 0v1.5"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>',
    play: '<svg viewBox="0 0 16 16"><path d="M3 1.5v13l11-6.5z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.2-.4.7-1.3a.5.5 0 000-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.8 11.9 11.9 0 004.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 001.8-1.3 2.3 2.3 0 00.2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>',
  };

  /* ---------- helpers ---------- */
  const collName = (c) => t("c_" + c);
  const typeName = (k) => t("t_" + k);
  const story = (p) => (lang === "tr" ? p.tr || p.en : p.en || p.tr).split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const inSel = (id) => selection.some((s) => s.id === id);
  const selCount = () => selection.reduce((n, s) => n + s.qty, 0);
  const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  const productWa = (p) => waLink(`${t("wa_one")}\n${p.name} (${p.sku})`);
  const selectionWa = (extra = "") => {
    const lines = selection.map((s) => { const p = byId.get(s.id); return `• ${p.name} — ${p.sku} × ${s.qty}`; });
    return waLink([t("wa_msg"), ...lines, extra].filter(Boolean).join("\n"));
  };
  const img = (src, alt, eager = false) =>
    `<img src="${src}" alt="${esc(alt)}" width="900" height="900" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  const pimg = (file, alt, eager) => img(IMG + file, alt, eager);

  function saveSel() {
    store.set("selection", selection);
    $$("[data-count]").forEach((el) => { const n = selCount(); el.textContent = n; el.hidden = n === 0; });
  }
  function toggleSel(id, force) {
    const has = inSel(id), want = force ?? !has;
    if (want && !has) { selection.push({ id, qty: 1 }); toast(t("toast_added"), "#seckim", t("toast_view")); }
    if (!want && has) selection = selection.filter((s) => s.id !== id);
    saveSel();
    $$(`[data-add="${id}"]`).forEach(paintAdd);
  }
  function paintAdd(btn) {
    const on = inSel(+btn.dataset.add);
    btn.setAttribute("aria-pressed", on);
    btn.textContent = on ? t("added") + " ✓" : t("add");
    btn.classList.toggle("btn--ghost", on);
  }

  let toastTimer;
  function toast(msg, href, label) {
    $(".toast")?.remove();
    const el = document.createElement("div");
    el.className = "toast"; el.setAttribute("role", "status");
    el.innerHTML = `<span>${esc(msg)}</span>${href ? `<a href="${href}">${esc(label)}</a>` : ""}`;
    document.body.append(el);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.remove(), 3200);
  }
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); }
    catch { const r = document.createRange(); r.selectNodeContents(btn.closest("div").parentElement.querySelector("b")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    const old = btn.textContent; btn.textContent = t("copied"); setTimeout(() => (btn.textContent = old), 1600);
  }

  /* ---------- shell ---------- */
  const langSwitch = () => `<div class="lang" role="group" aria-label="Dil / Language">${["tr", "en", "ar"].map((l) => `<button data-lang="${l}" aria-pressed="${l === lang}">${l.toUpperCase()}</button>`).join("")}</div>`;
  function header() {
    const r = location.hash.slice(1);
    const cur = (...k) => (k.some((x) => r.startsWith(x)) ? ' aria-current="page"' : "");
    return `
    <header class="hdr"><div class="wrap hdr__in">
      <div class="hdr__side hdr__side--l"><button class="icon-btn icon-btn--menu" data-act="menu" aria-label="${t("menu")}">${ICON.menu}</button>${langSwitch()}</div>
      <a class="hdr__logo" href="#" aria-label="CAMHARE — Camdan Düşler"><img src="assets/img/logo.jpg" alt="CAMHARE · Camdan Düşler" width="400" height="98"></a>
      <div class="hdr__side hdr__side--r">
        <a class="icon-btn" href="#koleksiyon" data-act="open-search" aria-label="${t("search")}">${ICON.search}</a>
        <a class="icon-btn" href="#seckim" aria-label="${t("nav_selection")}">${ICON.bag}<span class="count" data-count ${selCount() ? "" : "hidden"}>${selCount()}</span></a>
      </div>
      <nav class="hdr__nav" aria-label="Ana menü">
        <a href="#koleksiyon"${cur("koleksiyon", "c-", "p-")}>${t("nav_collections")}</a>
        <a href="#ozel-uretim"${cur("ozel-uretim")}>${t("nav_bespoke")}</a>
        <a href="#atolye"${cur("atolye")}>${t("nav_atelier")}</a>
        <a href="#iletisim"${cur("iletisim")}>${t("nav_contact")}</a>
      </nav>
    </div></header>`;
  }
  function menu() {
    return `
    <div class="menu" role="dialog" aria-modal="true" aria-label="${t("menu")}">
      <div class="wrap menu__top"><span></span><img src="assets/img/logo.jpg" alt="CAMHARE"><button class="icon-btn" style="justify-self:end" data-act="close-menu" aria-label="${t("close")}">${ICON.close}</button></div>
      <div class="wrap">
        <ul class="menu__list">
          <li><a href="#koleksiyon">${t("nav_collections")}</a></li>
          ${COLLS.map((c) => `<li class="sub"><a href="#c-${c}">${collName(c)}</a></li>`).join("")}
          <li><a href="#ozel-uretim">${t("nav_bespoke")}</a></li>
          <li><a href="#atolye">${t("nav_atelier")}</a></li>
          <li><a href="#iletisim">${t("nav_contact")}</a></li>
          <li><a href="#seckim">${t("nav_selection")}${selCount() ? ` <span class="label">(${selCount()})</span>` : ""}</a></li>
        </ul>
      </div>
      <div class="wrap menu__foot">
        ${langSwitch()}
        <a class="wa-link" style="justify-content:flex-start" href="${waLink(t("wa_one"))}" target="_blank" rel="noopener">${ICON.wa}<span>${t("wa_consult")}</span></a>
        <button class="more" style="justify-self:start" data-act="catalog">${t("nav_catalog")}</button>
      </div>
    </div>`;
  }
  function footer() {
    return `
    <footer class="ftr"><div class="wrap ftr__in">
      <div class="ftr__brand"><img src="assets/img/logo.jpg" alt="CAMHARE" width="400" height="98"><p>${t("footer_about")}</p></div>
      <div class="ftr__cols">
        <div><h4>${t("footer_col1")}</h4><ul>${COLLS.map((c) => `<li><a href="#c-${c}">${collName(c)}</a></li>`).join("")}<li><a href="#ozel-uretim">${t("nav_bespoke")}</a></li></ul></div>
        <div><h4>${t("footer_col2")}</h4><ul><li><a href="#atolye">${t("nav_atelier")}</a></li><li><a href="#iletisim">${t("nav_contact")}</a></li><li><button data-act="catalog">${t("nav_catalog")}</button></li></ul></div>
        <div><h4>${t("footer_col3")}</h4><ul><li><a href="#seckim">${t("nav_selection")}</a></li><li>${t("f_shipping")}</li><li>${t("f_care")}</li><li>${t("f_cert")}</li></ul></div>
        <div><h4>${t("footer_col4")}</h4><ul><li><a href="https://www.instagram.com/cam_hare/" target="_blank" rel="noopener">Instagram</a></li><li><a href="https://www.facebook.com/CamhareCam" target="_blank" rel="noopener">Facebook</a></li><li><a href="${waLink(t("wa_one"))}" target="_blank" rel="noopener">WhatsApp</a></li></ul></div>
      </div>
      <div class="ftr__legal"><span>© ${new Date().getFullYear()} Camhare Cam Tasarım Turizm Reklam Dış Tic. San. Ltd. Şti.</span><span>Çubuklu · Beykoz · İstanbul</span></div>
    </div></footer>`;
  }

  /* ---------- components ---------- */
  function card(p, eager = false) {
    return `
    <a class="card" href="#p-${p.slug}">
      <div class="card__img">${pimg(p.images[0], p.name, eager)}${p.images[1] ? pimg(p.images[1], "") : ""}</div>
      <span class="card__name">${esc(p.name)}</span>
      <span class="card__meta">${p.limited ? `<span class="lim">${t("limited")}</span> · ` : ""}${typeName(p.type)}</span>
    </a>`;
  }
  const floors = () => `<ol class="floors">${[1, 2, 3].map((i) => `<li><span class="label">${i}. ${t("floor")}</span><h3>${t("fl" + i + "_t")}</h3><p>${t("fl" + i + "_d")}</p></li>`).join("")}</ol>`;
  const film = () => `<div class="film"><canvas id="kiln" aria-hidden="true"></canvas><span class="film__play" aria-hidden="true">${ICON.play}</span><div class="film__cap"><span>${t("film")}</span><span>${t("film_note")}</span></div></div>`;
  const segments = () => `<ul class="segs">${[1, 2, 3, 4, 5].map((i) => `<li><b>${t("seg" + i)}</b><span>${t("seg" + i + "_d")}</span></li>`).join("")}</ul>`;
  const catalogBand = () => `
    <section class="band"><div class="wrap band__in">
      <span class="label">PDF · 2026</span><h2 style="font-size:clamp(2rem,7vw,3rem)">${t("catalog_title")}</h2><p>${t("catalog_text")}</p>
      <button class="btn btn--ghost" data-act="catalog">${t("catalog_cta")}</button>
    </div></section>`;

  /* ---------- views ---------- */
  function viewHome() {
    const feat = FEATURED.map((id) => byId.get(id)).filter(Boolean);
    const h0 = byId.get(HERO[0][0]);
    return `
    <section class="wrap hero" aria-label="CAMHARE">
      <div class="hero__stage" id="stage">${HERO.map(([id, f], i) => `<img src="${HERO_IMG + f}.jpg" alt="${esc(byId.get(id).name)}" class="${i ? "" : "on"}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="1600" height="1600">`).join("")}</div>
      <div class="hero__label"><a href="#p-${h0.slug}" id="hlabel">Nº 01 — <b>${esc(h0.name)}</b></a><span class="hero__ticks" id="hticks">${HERO.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</span></div>
      <div class="hero__text">
        <span class="label">${t("hero_eyebrow")}</span>
        <h1>${t("hero_l1")}<em>${t("hero_l2")}</em></h1>
        <p class="hero__sub">${t("hero_sub")}</p>
        <a class="more" href="#koleksiyon">${t("hero_cta1")}</a>
      </div>
    </section>

    <section class="wrap statement"><p>${t("intro_text")}</p><span class="label">${t("statement_sig")}</span></section>

    <section class="wrap" style="padding-bottom:120px">
      <div class="head"><span class="label">${t("nav_collections")}</span><h2>${t("hero_cta1")}</h2></div>
      <div class="colls">
        ${COLLS.map((c) => `<a class="coll" href="#c-${c}"><div class="coll__img">${img(HERO_IMG + COVER[c] + ".jpg", collName(c))}</div>
          <h3>${collName(c)}</h3><p>${t("c_" + c + "_d")}</p><span class="more">${t("discover")} · ${CATALOG.filter((p) => p.collection === c).length}</span></a>`).join("")}
      </div>
    </section>

    <section class="night sec"><div class="wrap atelier">
      ${film()}
      <div style="display:grid;gap:36px">
        <div style="display:grid;gap:14px"><span class="label">${t("atelier_eyebrow")}</span><h2>${t("atelier_title")}</h2></div>
        ${floors()}
        <p class="quote">${t("atelier_quote")}</p>
        <div><a class="btn btn--light" href="#atolye">${t("nav_atelier")}</a></div>
      </div>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="head"><span class="label">${t("featured_sub")}</span><h2>${t("featured")}</h2></div>
      <div class="rail">${feat.map((p) => card(p)).join("")}</div>
      <div style="text-align:center;margin-top:28px"><a class="more" href="#koleksiyon">${t("see_all")} · ${CATALOG.length}</a></div>
    </div></section>

    <section class="sec" style="padding-top:0"><div class="wrap bespoke">
      <div style="display:grid;gap:18px;align-content:start"><span class="label">${t("bespoke_eyebrow")}</span><h2>${t("bespoke_title")}</h2><p style="color:var(--ink-2);max-width:42ch">${t("bespoke_text")}</p>
        <div style="margin-top:8px"><a class="btn" href="#ozel-uretim">${t("bespoke_cta")}</a></div></div>
      ${segments()}
    </div></section>

    <section class="sec" style="padding-top:0"><div class="wrap">
      <div class="head"><span class="label">${t("how_eyebrow")}</span><h2>${t("how_title")}</h2></div>
      <ol class="steps">${[1, 2, 3].map((i) => `<li><b>${t("how" + i)}</b><span>${t("how" + i + "_d")}</span></li>`).join("")}</ol>
    </div></section>
    ${catalogBand()}`;
  }

  function viewList(coll) {
    const pool = coll ? CATALOG.filter((p) => p.collection === coll) : CATALOG;
    const types = TYPE_ORDER.filter((k) => pool.some((p) => p.type === k));
    if (!types.includes(listState.type)) listState.type = "all";
    return `
    <div class="wrap list-head">
      <nav class="crumbs" aria-label="breadcrumb"><a href="#">Camhare</a><span>/</span><a href="#koleksiyon">${t("nav_collections")}</a></nav>
      <h1>${coll ? collName(coll) : t("nav_all")}</h1>
      <p>${coll ? t("c_" + coll + "_d") : COLLS.map((c) => `<a href="#c-${c}" style="border-bottom:1px solid var(--line)">${collName(c)}</a>`).join(" · ")}</p>
    </div>
    <div class="toolbar"><div class="wrap">
      <div class="toolbar__in">
        <div class="tabs" role="group" aria-label="Filtre">
          <button class="tab" data-type="all" aria-pressed="${listState.type === "all"}">${t("type_all")}<sup>${pool.length}</sup></button>
          ${types.map((k) => `<button class="tab" data-type="${k}" aria-pressed="${listState.type === k}">${typeName(k)}<sup>${pool.filter((p) => p.type === k).length}</sup></button>`).join("")}
        </div>
        <button class="icon-btn" data-act="toggle-search" aria-label="${t("search")}" aria-expanded="${listState.search}">${ICON.search}</button>
      </div>
      <div class="searchrow" ${listState.search || listState.q ? "" : "hidden"}><input id="q" type="search" placeholder="${t("search_ph")}" value="${esc(listState.q)}" autocomplete="off" aria-label="${t("search")}"></div>
    </div></div>
    <div class="wrap results"><p class="results__count" id="rc"></p><div class="grid" id="grid"></div></div>`;
  }
  function paintList(coll) {
    const q = listState.q.trim().toLocaleLowerCase("tr");
    const pool = (coll ? CATALOG.filter((p) => p.collection === coll) : CATALOG)
      .filter((p) => listState.type === "all" || p.type === listState.type)
      .filter((p) => !q || `${p.name} ${p.sku} ${p.series} ${typeName(p.type)}`.toLocaleLowerCase("tr").includes(q));
    $("#rc").textContent = `${pool.length} ${t("results")}`;
    $("#grid").innerHTML = pool.length
      ? pool.map((p, i) => card(p, i < 4)).join("")
      : `<div class="empty" style="grid-column:1/-1"><p>${t("no_results")}</p><button class="more" data-act="clear">${t("clear")}</button></div>`;
  }

  function viewProduct(p) {
    const st = story(p);
    const long = st.join(" ").length > 360;
    const series = CATALOG.filter((x) => x.series === p.series && x.id !== p.id);
    const related = (series.length ? series : CATALOG.filter((x) => x.collection === p.collection && x.id !== p.id)).slice(0, 8);
    const many = p.images.length > 1;
    return `
    <div class="pdp">
      <div class="gal-col">
        <div class="gal__track" id="gal">${p.images.map((f, i) => `<figure>${pimg(f, `${p.name} — ${i + 1}`, i === 0)}</figure>`).join("")}</div>
        ${many ? `<div class="gal__ticks" id="galt">${p.images.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>
        <div class="gal__thumbs">${p.images.map((f, i) => `<button data-thumb="${i}" class="${i ? "" : "on"}" aria-label="${i + 1}">${pimg(f, "")}</button>`).join("")}</div>` : ""}
      </div>
      <div class="wrap pdp__info">
        <nav class="crumbs" aria-label="breadcrumb"><a href="#koleksiyon">${t("nav_collections")}</a><span>/</span><a href="#c-${p.collection}">${collName(p.collection)}</a></nav>
        <h1>${esc(p.name)}</h1>
        <div class="pdp__meta"><span>${typeName(p.type)}</span><span>${p.sku}</span>${p.limited ? `<span class="lim">${t("limited")}</span>` : ""}</div>
        <p class="pdp__price">${t("price_on_request")}<small>${t("price_note")}</small></p>
        <div class="pdp__cta" id="pdp-cta">
          <button class="btn btn--block" data-add="${p.id}"></button>
          <a class="wa-link" href="${productWa(p)}" target="_blank" rel="noopener">${ICON.wa}<span>${t("wa_consult")}</span></a>
        </div>
        <p class="hallmark"><span class="mark" style="margin-left:0"></span>${t("hallmark_line")}</p>
        ${st.length ? `<div class="story ${long ? "clamped" : ""}" id="story">${st.map((x) => `<p>${esc(x)}</p>`).join("")}${long ? `<button class="more" data-act="read-more">${t("read_more")}</button>` : ""}</div>` : ""}
        <div class="acc">
          ${p.set && p.set.length ? `<details open><summary>${t("set_contents")}</summary><div class="acc__body"><ul class="setlist">${p.set.map((s) => `<li>${esc(lang === "tr" ? s.tr : s.en)}</li>`).join("")}</ul></div></details>` : ""}
          <details><summary>${t("details")}</summary><div class="acc__body">
            <table class="specs"><tbody>
              <tr><th>${t("sp_sku")}</th><td>${p.sku}</td></tr>
              <tr><th>${t("sp_coll")}</th><td>${collName(p.collection)}</td></tr>
              <tr><th>${t("sp_series")}</th><td>${esc(p.series)}</td></tr>
              <tr><th>${t("sp_material")}</th><td>${t("m_" + p.material)}</td></tr>
              <tr><th>${t("sp_gold")}</th><td>${t("gold_v")}</td></tr>
              <tr><th>${t("sp_dims")}</th><td>${esc(p.dims)}</td></tr>
              <tr><th>${t("sp_prod")}</th><td>${t("prod_v")}</td></tr>
              <tr><th>${t("sp_edition")}</th><td>${p.limited ? t("ed_limited") : t("ed_order")}</td></tr>
            </tbody></table>
            <p class="note">${t("dims_note")}</p>
          </div></details>
          <details><summary>${t("certificate")}</summary><div class="acc__body"><p>${t("cert_t")}</p></div></details>
          <details><summary>${t("care")}</summary><div class="acc__body"><p>${t("care_t")}</p></div></details>
          <details><summary>${t("delivery")}</summary><div class="acc__body"><p>${t("delivery_t")}</p></div></details>
        </div>
      </div>
    </div>
    ${related.length ? `<section class="sec" style="padding-top:48px"><div class="wrap">
      <div class="head"><span class="label">${series.length ? esc(p.series) : collName(p.collection)}</span><h2 style="font-size:clamp(2rem,7vw,3rem)">${series.length ? t("related") : t("related_coll")}</h2></div>
      <div class="rail">${related.map((x) => card(x)).join("")}</div></div></section>` : ""}
    <div class="actionbar hide" id="ab">
      <button class="btn" data-add="${p.id}"></button>
      <a class="wa" href="${productWa(p)}" target="_blank" rel="noopener" aria-label="${t("wa_consult")}">${ICON.wa}</a>
    </div>`;
  }

  const purposeOptions = (def) => ["personal", "corporate", "hotel", "museum", "export", "protocol", "bespoke"]
    .map((k) => `<option value="${k}" ${k === def ? "selected" : ""}>${t("p_" + k)}</option>`).join("");
  function leadForm(id, { purpose = "personal", file = false } = {}) {
    const d = store.get("draft", {});
    return `
    <form class="form" id="${id}" novalidate>
      <div class="row2">
        <div class="field"><label for="${id}-name">${t("f_name")}</label><input id="${id}-name" name="name" autocomplete="name" value="${esc(d.name)}"></div>
        <div class="field"><label for="${id}-company">${t("f_company")}</label><input id="${id}-company" name="company" autocomplete="organization" value="${esc(d.company)}"></div>
      </div>
      <div class="row2">
        <div class="field"><label for="${id}-email">${t("f_email")}</label><input id="${id}-email" name="email" type="email" autocomplete="email" inputmode="email" value="${esc(d.email)}"></div>
        <div class="field"><label for="${id}-phone">${t("f_phone")}</label><input id="${id}-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" value="${esc(d.phone)}"></div>
      </div>
      <div class="row2">
        <div class="field"><label for="${id}-country">${t("f_country")}</label><input id="${id}-country" name="country" autocomplete="country-name" value="${esc(d.country || (lang === "tr" ? "Türkiye" : ""))}"></div>
        <div class="field"><label for="${id}-purpose">${t("f_purpose")}</label><select id="${id}-purpose" name="purpose">${purposeOptions(purpose)}</select></div>
      </div>
      <div class="field"><label for="${id}-note">${t("f_note")}</label><textarea id="${id}-note" name="note" placeholder="${t("f_note_ph")}"></textarea></div>
      ${file ? `<div class="field field--file"><label for="${id}-file">${t("f_file")}</label><input id="${id}-file" name="file" type="file" accept="image/*,.pdf,.ai,.svg"></div>` : ""}
      <label class="check" for="${id}-ok"><input id="${id}-ok" name="ok" type="checkbox"><span>${t("f_consent")}</span></label>
      <p class="err" hidden></p>
      <div style="display:grid;gap:6px;justify-items:center">
        <button class="btn btn--block" type="submit">${t("send")}</button>
        <a class="wa-link" href="${waLink(t("wa_one"))}" target="_blank" rel="noopener" data-act="form-wa">${ICON.wa}<span>${t("send_wa")}</span></a>
      </div>
      <p class="proto">${t("proto_note")}</p>
    </form>`;
  }

  function viewSelection() {
    const head = `<div class="wrap list-head"><span class="label">${t("sel_eyebrow")}</span><h1>${t("sel_title")}</h1>${selection.length ? `<p>${selCount()} ${t("sel_items")} · ${t("price_on_request")}</p>` : ""}</div>`;
    if (!selection.length) {
      return head + `<div class="wrap"><div class="empty"><p>${t("sel_empty")}</p><span style="color:var(--ink-2);max-width:40ch">${t("sel_empty_d")}</span><a class="btn" href="#koleksiyon">${t("sel_browse")}</a></div></div>`;
    }
    return head + `
    <div class="wrap sel">
      <div class="sel__items">
        ${selection.map((s) => { const p = byId.get(s.id); return `
          <div class="sel__item">
            <a class="card__img" href="#p-${p.slug}">${pimg(p.images[0], p.name)}</a>
            <div style="min-width:0">
              <h3><a href="#p-${p.slug}">${esc(p.name)}</a></h3>
              <div class="card__meta">${p.sku} · ${typeName(p.type)}</div>
              <div class="sel__row">
                <div class="qty" aria-label="${t("qty")}"><button data-qty="${p.id}" data-d="-1" aria-label="−">−</button><output>${s.qty}</output><button data-qty="${p.id}" data-d="1" aria-label="+">+</button></div>
                <button class="rm" data-rm="${p.id}">${t("remove")}</button>
              </div>
            </div>
          </div>`; }).join("")}
      </div>
      <div class="panel" id="sel-form"><h2 style="font-size:2rem">${t("sel_eyebrow")}</h2>${leadForm("qf")}</div>
    </div>`;
  }

  function viewBespoke() {
    return `
    <div class="wrap list-head"><span class="label">${t("bespoke_eyebrow")}</span><h1>${t("bespoke_title")}</h1><p>${t("bespoke_text")}</p></div>
    <section class="wrap bespoke" style="padding-block:24px 120px">
      ${segments()}
      <div class="panel"><h2 style="font-size:2rem">${t("bespoke_cta")}</h2>${leadForm("bf", { purpose: "corporate", file: true })}</div>
    </section>`;
  }

  function viewAtelier() {
    return `
    <div class="wrap list-head"><span class="label">${t("atelier_eyebrow")} · Çubuklu, Beykoz</span><h1>${t("about_title")}</h1></div>
    <section class="wrap statement" style="padding-top:8px"><p>${t("about_p1")}</p></section>
    <section class="night sec"><div class="wrap atelier">${film()}<div style="display:grid;gap:36px"><h2>${t("atelier_title")}</h2>${floors()}</div></div></section>
    <section class="sec"><div class="wrap narrow" style="display:grid;gap:22px;text-align:center;justify-items:center">
      <p style="color:var(--ink-2)">${t("about_p2")}</p><p style="color:var(--ink-2)">${t("about_p3")}</p>
      <p class="quote">${t("atelier_quote")}</p>
      <a class="btn" href="#iletisim">${t("atelier_cta")}</a>
    </div></section>
    ${catalogBand()}`;
  }

  function viewContact() {
    const addr = "Çubuklu, Dedeoğlu Cad., Dereyolu Sk. No: 78 Kat: 3-4, 34800 Beykoz / İstanbul";
    const row = (label, value, acts) => `<div><span class="label">${label}</span><b>${value}</b><div class="acts">${acts}</div></div>`;
    return `
    <div class="wrap list-head"><span class="label">${t("contact_eyebrow")}</span><h1>${t("contact_title")}</h1><p>${t("visit")}</p></div>
    <div class="wrap" style="padding-bottom:64px"><div class="contact">
      ${row(t("whatsapp"), "+90 530 861 95 85", `<a class="more" href="${waLink(t("wa_one"))}" target="_blank" rel="noopener">${t("write")}</a><button class="more" data-copy="+90 530 861 95 85">${t("copy")}</button>`)}
      ${row(t("phone"), "+90 216 680 03 90", `<a class="more" href="tel:+902166800390">${t("call")}</a><button class="more" data-copy="+90 216 680 03 90">${t("copy")}</button>`)}
      ${row(t("email"), "info@camhare.com", `<a class="more" href="mailto:info@camhare.com">${t("write")}</a><button class="more" data-copy="info@camhare.com">${t("copy")}</button>`)}
      ${row(t("address"), addr, `<a class="more" href="https://www.google.com/maps/search/?api=1&query=41.106073,29.10006" target="_blank" rel="noopener">${t("directions")}</a><button class="more" data-copy="${esc(addr)}">${t("copy")}</button>`)}
    </div></div>
    <div class="wrap narrow" style="padding-bottom:120px"><div class="panel"><h2 style="font-size:2rem">${t("bespoke_cta")}</h2>${leadForm("cf")}</div></div>`;
  }

  /* ---------- modal ---------- */
  function openCatalog() {
    closeModal();
    const el = document.createElement("div");
    el.className = "modal"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
    el.innerHTML = `<div class="modal__panel">
      <div class="modal__top"><div style="display:grid;gap:8px"><span class="label">PDF · 2026</span><h2 style="font-size:2rem">${t("catalog_modal")}</h2></div><button class="icon-btn" data-act="close-modal" aria-label="${t("close")}">${ICON.close}</button></div>
      <p style="color:var(--ink-2)">${t("catalog_modal_d")}</p>
      <form class="form" id="catf" novalidate>
        <div class="field"><label for="cat-email">${t("f_email")}</label><input id="cat-email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="cat-purpose">${t("f_purpose")}</label><select id="cat-purpose">${purposeOptions("corporate")}</select></div>
        <p class="err" hidden></p>
        <button class="btn btn--block" type="submit">${t("catalog_cta")}</button>
        <p class="proto">${t("proto_note")}</p>
      </form></div>`;
    document.body.append(el);
    el.addEventListener("click", (e) => { if (e.target === el) closeModal(); });
    $("#cat-email", el).focus();
  }
  const closeModal = () => $(".modal")?.remove();

  /* ---------- forms ---------- */
  function readForm(f) {
    const v = Object.fromEntries(new FormData(f).entries());
    store.set("draft", { name: v.name, company: v.company, email: v.email, phone: v.phone, country: v.country });
    return v;
  }
  function validate(f, v) {
    const ok = v.name && (v.email || v.phone) && f.querySelector('[name="ok"]').checked;
    const err = f.querySelector(".err");
    err.hidden = !!ok; err.textContent = ok ? "" : t("req_err");
    return ok;
  }
  function done(f, v) {
    const ref = "CH-Q-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);
    const box = document.createElement("div");
    box.className = "done"; box.setAttribute("role", "status");
    box.innerHTML = `<span class="label">${t("done_title")}</span><p class="done__ref">${ref}</p><p style="color:var(--ink-2);max-width:36ch">${t("done_text")}</p>
      <a class="wa-link" href="${f.id === "qf" ? selectionWa(`Ref: ${ref} — ${v.name}`) : waLink(`${t("wa_one")}\nRef: ${ref} — ${v.name}\n${v.note || ""}`)}" target="_blank" rel="noopener">${ICON.wa}<span>${t("send_wa")}</span></a>
      <p class="proto">${t("proto_note")}</p>`;
    f.replaceWith(box);
    box.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  /* ---------- hero slideshow ---------- */
  let heroTimer = null;
  function hero() {
    clearInterval(heroTimer);
    const imgs = $$("#stage img"); if (!imgs.length || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    heroTimer = setInterval(() => {
      if (document.hidden) return;
      imgs[i].classList.remove("on"); i = (i + 1) % imgs.length; imgs[i].classList.add("on");
      const p = byId.get(HERO[i][0]);
      const a = $("#hlabel"); a.href = "#p-" + p.slug; a.innerHTML = `Nº 0${i + 1} — <b>${esc(p.name)}</b>`;
      $$("#hticks i").forEach((x, k) => x.classList.toggle("on", k === i));
    }, 5200);
  }

  /* ---------- atelier film placeholder (kiln glow) ---------- */
  let kilnStop = null;
  function kiln() {
    kilnStop?.();
    const cv = $("#kiln"); if (!cv) return;
    const ctx = cv.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w, h, embers = [], raf, running = true, tick = 0;
    const resize = () => { const dpr = Math.min(devicePixelRatio || 1, 2); w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const spawn = (y) => ({ x: w * (0.2 + Math.random() * 0.6), y: y ?? h + 10, vy: 0.2 + Math.random() * 0.8, vx: (Math.random() - 0.5) * 0.3, r: 0.5 + Math.random() * 1.5, life: 0.5 + Math.random() * 0.5, ph: Math.random() * 6.3 });
    const frame = () => {
      tick += 0.008;
      ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#0b0d0c"; ctx.fillRect(0, 0, w, h);
      const pulse = 0.92 + Math.sin(tick * 2.1) * 0.06 + Math.sin(tick * 5.3) * 0.02;
      const g = ctx.createRadialGradient(w * 0.5, h * 0.92, 0, w * 0.5, h * 0.92, Math.max(w, h) * 0.7 * pulse);
      g.addColorStop(0, "rgba(255,196,110,.9)"); g.addColorStop(0.14, "rgba(226,128,46,.6)"); g.addColorStop(0.42, "rgba(120,50,16,.25)"); g.addColorStop(1, "rgba(11,13,12,0)");
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (const e of embers) {
        e.y -= e.vy; e.x += e.vx + Math.sin(tick * 3 + e.ph) * 0.2; e.life -= 0.0018;
        const a = Math.max(0, Math.min(1, e.life)) * (0.6 + Math.sin(tick * 9 + e.ph) * 0.4);
        ctx.fillStyle = `rgba(255,${175 + ((e.ph * 10) | 0)},95,${a})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.283); ctx.fill();
      }
      embers = embers.map((e) => (e.life <= 0 || e.y < -10 ? spawn() : e));
      if (running && !reduce) raf = requestAnimationFrame(frame);
    };
    resize(); embers = Array.from({ length: 60 }, () => spawn(Math.random() * h)); frame();
    const ro = new ResizeObserver(() => { resize(); if (reduce) frame(); }); ro.observe(cv);
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting && !running && !reduce) { running = true; frame(); } if (!en.isIntersecting) { running = false; cancelAnimationFrame(raf); } });
    io.observe(cv);
    kilnStop = () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }

  /* ---------- router ---------- */
  function route() {
    const r = decodeURIComponent(location.hash.slice(1));
    let html, title = "";
    const after = [];
    if (r === "koleksiyon") { html = viewList(null); after.push(() => paintList(null)); title = t("nav_collections"); }
    else if (r.startsWith("c-") && COLLS.includes(r.slice(2))) { const c = r.slice(2); html = viewList(c); after.push(() => paintList(c)); title = collName(c); }
    else if (r.startsWith("p-") && bySlug.has(r.slice(2))) { const p = bySlug.get(r.slice(2)); html = viewProduct(p); after.push(wireProduct); title = p.name; }
    else if (r === "seckim") { html = viewSelection(); title = t("sel_title"); }
    else if (r === "ozel-uretim") { html = viewBespoke(); title = t("nav_bespoke"); }
    else if (r === "atolye") { html = viewAtelier(); after.push(kiln); title = t("nav_atelier"); }
    else if (r === "iletisim") { html = viewContact(); title = t("nav_contact"); }
    else { html = viewHome(); after.push(hero, kiln); }
    kilnStop?.(); clearInterval(heroTimer);
    document.documentElement.lang = lang; document.documentElement.dir = t("dir");
    document.title = title ? `${title} · CAMHARE` : "CAMHARE — Camdan Düşler";
    app.innerHTML = header() + `<main id="main">${html}</main>` + footer();
    $$("[data-add]").forEach(paintAdd);
    after.forEach((f) => f());
    onScroll();
  }

  function wireProduct() {
    const track = $("#gal");
    if (track && $("#galt")) {
      track.addEventListener("scroll", () => {
        const i = Math.round(Math.abs(track.scrollLeft) / track.clientWidth);
        $$("#galt i").forEach((d, k) => d.classList.toggle("on", k === i));
        $$(".gal__thumbs button").forEach((d, k) => d.classList.toggle("on", k === i));
      }, { passive: true });
    }
    // sticky bar appears only once the inline CTA has scrolled above the viewport
    const cta = $("#pdp-cta"), ab = $("#ab");
    if (cta && ab) new IntersectionObserver(([e]) => ab.classList.toggle("hide", e.isIntersecting || e.boundingClientRect.top > 0)).observe(cta);
  }

  const onScroll = () => $(".hdr")?.classList.toggle("scrolled", scrollY > 4);
  addEventListener("scroll", onScroll, { passive: true });

  /* ---------- events ---------- */
  let lastHash = location.hash;
  addEventListener("hashchange", () => {
    $(".menu")?.remove(); document.body.style.overflow = "";
    if (!location.hash.startsWith("#c-") && !location.hash.startsWith("#koleksiyon")) { listState.q = ""; listState.search = false; }
    if (location.hash.slice(0, 3) !== lastHash.slice(0, 3)) listState.type = "all";
    lastHash = location.hash;
    route();
    scrollTo({ top: 0, behavior: "instant" });
    if (listState.search) $("#q")?.focus();
  });

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act],[data-add],[data-lang],[data-type],[data-qty],[data-rm],[data-copy],[data-thumb]");
    if (!el) return;
    const d = el.dataset;
    const listColl = () => (location.hash.startsWith("#c-") ? location.hash.slice(3) : null);
    if (d.add) { e.preventDefault(); toggleSel(+d.add); }
    else if (d.lang) { lang = d.lang; store.set("lang", lang); $(".menu")?.remove(); document.body.style.overflow = ""; route(); }
    else if (d.type) { listState.type = d.type; $$("[data-type]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.type === d.type)); paintList(listColl()); }
    else if (d.qty) { const s = selection.find((x) => x.id === +d.qty); s.qty = Math.max(1, Math.min(999, s.qty + +d.d)); saveSel(); el.parentElement.querySelector("output").textContent = s.qty; }
    else if (d.rm) { toggleSel(+d.rm, false); route(); }
    else if (d.copy) copy(d.copy, el);
    else if (d.thumb) { const tr = $("#gal"); tr.scrollTo({ left: tr.clientWidth * +d.thumb * (t("dir") === "rtl" ? -1 : 1), behavior: "smooth" }); }
    else if (d.act === "menu") { document.body.insertAdjacentHTML("beforeend", menu()); document.body.style.overflow = "hidden"; $(".menu [data-act=close-menu]").focus(); }
    else if (d.act === "close-menu") { $(".menu")?.remove(); document.body.style.overflow = ""; }
    else if (d.act === "catalog") { $(".menu")?.remove(); document.body.style.overflow = ""; openCatalog(); }
    else if (d.act === "close-modal") closeModal();
    else if (d.act === "clear") { listState.q = ""; listState.type = "all"; route(); }
    else if (d.act === "read-more") { $("#story").classList.remove("clamped"); el.remove(); }
    else if (d.act === "open-search") { listState.search = true; if (location.hash === "#koleksiyon") { e.preventDefault(); route(); $("#q")?.focus(); } }
    else if (d.act === "toggle-search") { listState.search = !listState.search; $(".searchrow").hidden = !listState.search; el.setAttribute("aria-expanded", listState.search); if (listState.search) $("#q").focus(); }
    else if (d.act === "form-wa") {
      const f = el.closest("form"); const v = readForm(f);
      const extra = [v.name, v.company, v.country, v.purpose && t("p_" + v.purpose), v.note].filter(Boolean).join(" · ");
      el.href = f.id === "qf" ? selectionWa(extra) : waLink(`${t("wa_one")}\n${extra}`); // real link: the browser opens it
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "q") { listState.q = e.target.value; paintList(location.hash.startsWith("#c-") ? location.hash.slice(3) : null); }
  });
  document.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.id === "catf") {
      const em = $("#cat-email", f).value.trim(); const err = $(".err", f);
      if (!/^\S+@\S+\.\S+$/.test(em)) { err.hidden = false; err.textContent = t("req_err"); return; }
      done(f, { name: em, note: "PDF katalog / catalogue" }); return;
    }
    const v = readForm(f);
    if (validate(f, v)) done(f, v);
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModal(); if ($(".menu")) { $(".menu").remove(); document.body.style.overflow = ""; } }
  });

  route();
})();
