/* CAMHARE prototype — vanilla JS, hash-routed, no build step. */
(() => {
  "use strict";

  const CATALOG = window.CATALOG || [];
  const I18N = window.I18N;
  const WA_NUMBER = "905308619585";
  const IMG = "assets/img/p/";
  const COLLS = ["osmanli", "anadolu", "bardak"];
  const COVER = { osmanli: 1882, anadolu: 1607, bardak: 3780 };
  const FEATURED = [1882, 1645, 3285, 3780, 2145, 3167, 3044, 1641];
  const TYPE_ORDER = ["vazo", "kase", "sekerlik", "mumluk", "gondol", "ibrik", "sahan", "tabak", "ayna", "set", "mucevherlik", "dekor", "obje"];
  const byId = new Map(CATALOG.map((p) => [p.id, p]));
  const bySlug = new Map(CATALOG.map((p) => [p.slug, p]));

  /* ---------- storage (best effort) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("camhare:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("camhare:" + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  let lang = store.get("lang", "tr"); // TR first; EN/AR via switch
  if (!I18N[lang]) lang = "tr";
  let selection = store.get("selection", []); // [{id, qty}]
  selection = selection.filter((s) => byId.has(s.id));
  const listState = { type: "all", q: "" };

  const t = (k) => (I18N[lang] && I18N[lang][k]) ?? I18N.tr[k] ?? k;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $("#app");

  /* ---------- icons ---------- */
  const ICON = {
    menu: '<svg viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h12"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
    plus: '<svg viewBox="0 0 14 14"><path d="M7 1v12M1 7h12"/></svg>',
    check: '<svg viewBox="0 0 14 14"><path d="M1.5 7.5l3.5 3.5 7.5-8"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.2-.4.7-1.3a.5.5 0 000-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.8 11.9 11.9 0 004.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 001.8-1.3 2.3 2.3 0 00.2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>',
    arrow: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 8h13M9 3l5 5-5 5"/></svg>',
  };

  /* ---------- helpers ---------- */
  const collName = (c) => t("c_" + c);
  const typeName = (k) => t("t_" + k);
  const story = (p) => {
    const txt = lang === "tr" ? p.tr || p.en : p.en || p.tr;
    return txt.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  };
  const inSel = (id) => selection.some((s) => s.id === id);
  const selCount = () => selection.reduce((n, s) => n + s.qty, 0);
  const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  const productWa = (p) => waLink(`${t("wa_one")}\n${p.name} (${p.sku})`);
  const selectionWa = (extra = "") => {
    const lines = selection.map((s) => { const p = byId.get(s.id); return `• ${p.name} — ${p.sku} × ${s.qty}`; });
    return waLink([t("wa_msg"), ...lines, extra].filter(Boolean).join("\n"));
  };
  const img = (file, alt, cls = "", eager = false) =>
    `<img src="${IMG + file}" alt="${esc(alt)}" width="900" height="900" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" class="${cls}">`;

  function saveSel() {
    store.set("selection", selection);
    $$("[data-count]").forEach((el) => { const n = selCount(); el.textContent = n; el.hidden = n === 0; });
  }
  function toggleSel(id, force) {
    const has = inSel(id);
    const want = force ?? !has;
    if (want && !has) { selection.push({ id, qty: 1 }); toast(t("toast_added"), "#seckim", t("toast_view")); }
    if (!want && has) selection = selection.filter((s) => s.id !== id);
    saveSel();
    $$(`[data-add="${id}"]`).forEach(paintAdd);
  }
  function paintAdd(btn) {
    const on = inSel(+btn.dataset.add);
    btn.setAttribute("aria-pressed", on);
    if (btn.classList.contains("card__add")) {
      btn.innerHTML = on ? ICON.check : ICON.plus;
      btn.setAttribute("aria-label", on ? t("remove_sel") : t("add"));
    } else {
      btn.innerHTML = `<span>${on ? t("added") : t("add")}</span>${on ? '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1.5 7.5l3.5 3.5 7.5-8"/></svg>' : ""}`;
      btn.classList.toggle("btn--solid", !on);
      btn.classList.toggle("btn--line", on);
    }
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
    catch {
      const r = document.createRange(); const target = btn.closest("div").querySelector("b");
      r.selectNodeContents(target); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    const old = btn.textContent; btn.textContent = t("copied"); setTimeout(() => (btn.textContent = old), 1600);
  }

  /* ---------- shell ---------- */
  function header() {
    const route = location.hash.slice(1);
    const cur = (r) => (route.startsWith(r) ? ' aria-current="page"' : "");
    return `
    <header class="hdr"><div class="wrap hdr__in">
      <div class="hdr__left"><button class="icon-btn icon-btn--menu" data-act="menu" aria-label="${t("menu")}">${ICON.menu}</button></div>
      <a class="hdr__logo" href="#" aria-label="CAMHARE — Camdan Düşler"><img src="assets/img/logo.jpg" alt="CAMHARE · Camdan Düşler" width="400" height="98"></a>
      <nav class="hdr__nav" aria-label="Ana menü">
        <a href="#koleksiyon"${cur("koleksiyon") || cur("c-") || cur("p-")}>${t("nav_collections")}</a>
        <a href="#ozel-uretim"${cur("ozel-uretim")}>${t("nav_bespoke")}</a>
        <a href="#atolye"${cur("atolye")}>${t("nav_atelier")}</a>
        <a href="#iletisim"${cur("iletisim")}>${t("nav_contact")}</a>
      </nav>
      <div class="hdr__right">
        ${langSwitch()}
        <a class="icon-btn" href="#seckim" aria-label="${t("nav_selection")}">${ICON.bag}<span class="count" data-count ${selCount() ? "" : "hidden"}>${selCount()}</span></a>
      </div>
    </div></header>`;
  }
  const langSwitch = () =>
    `<div class="lang" role="group" aria-label="Dil / Language">${["tr", "en", "ar"].map((l) => `<button data-lang="${l}" aria-pressed="${l === lang}">${l.toUpperCase()}</button>`).join("")}</div>`;

  function menu() {
    return `
    <div class="menu" role="dialog" aria-modal="true" aria-label="${t("menu")}">
      <div class="wrap menu__top">
        <img src="assets/img/logo.jpg" alt="CAMHARE" width="148" style="width:148px;mix-blend-mode:multiply">
        <button class="icon-btn" data-act="close-menu" aria-label="${t("close")}">${ICON.close}</button>
      </div>
      <div class="wrap">
        <ul class="menu__list">
          <li><a href="#koleksiyon">${t("nav_collections")} <small>${CATALOG.length}</small></a></li>
          ${COLLS.map((c) => `<li class="menu__sub"><a href="#c-${c}">${collName(c)} <small>${CATALOG.filter((p) => p.collection === c).length}</small></a></li>`).join("")}
          <li><a href="#ozel-uretim">${t("nav_bespoke")}</a></li>
          <li><a href="#atolye">${t("nav_atelier")}</a></li>
          <li><a href="#iletisim">${t("nav_contact")}</a></li>
          <li><a href="#seckim">${t("nav_selection")} <small data-count ${selCount() ? "" : "hidden"}>${selCount()}</small></a></li>
        </ul>
      </div>
      <div class="wrap menu__foot">
        ${langSwitch()}
        <a class="btn btn--wa btn--block" href="${waLink(t("wa_one"))}" target="_blank" rel="noopener">${ICON.wa}${t("wa_vip")}</a>
        <button class="btn btn--line btn--block" data-act="catalog">${t("nav_catalog")}</button>
      </div>
    </div>`;
  }

  function footer() {
    return `
    <footer class="ftr"><div class="wrap ftr__in">
      <div class="ftr__brand"><img src="assets/img/mark.png" alt="" width="52" height="52"><div><b>CAMHARE</b><em>${t("footer_tag")}</em></div></div>
      <div class="ftr__cols">
        <div><h4>${t("footer_col1")}</h4><ul>${COLLS.map((c) => `<li><a href="#c-${c}">${collName(c)}</a></li>`).join("")}<li><a href="#ozel-uretim">${t("nav_bespoke")}</a></li></ul></div>
        <div><h4>${t("footer_col2")}</h4><ul><li><a href="#atolye">${t("nav_atelier")}</a></li><li><a href="#iletisim">${t("nav_contact")}</a></li><li><button data-act="catalog">${t("nav_catalog")}</button></li></ul></div>
        <div><h4>${t("footer_col3")}</h4><ul><li><a href="#seckim">${t("nav_selection")}</a></li><li>${t("f_shipping")}</li><li>${t("f_care")}</li><li>${t("f_cert")}</li></ul></div>
        <div><h4>${t("footer_col4")}</h4><ul><li><a href="https://www.instagram.com/cam_hare/" target="_blank" rel="noopener">Instagram</a></li><li><a href="https://www.facebook.com/CamhareCam" target="_blank" rel="noopener">Facebook</a></li><li><a href="${waLink(t("wa_one"))}" target="_blank" rel="noopener">WhatsApp</a></li></ul></div>
      </div>
      <div class="ftr__legal"><span>© ${new Date().getFullYear()} Camhare Cam Tasarım Turizm Reklam Dış Tic. San. Ltd. Şti. ${t("rights")}</span><span>Çubuklu · Beykoz · İstanbul</span></div>
    </div></footer>`;
  }

  /* ---------- components ---------- */
  function card(p, eager = false) {
    const on = inSel(p.id);
    return `
    <article class="card">
      <a class="card__img" href="#p-${p.slug}" aria-label="${esc(p.name)}">${img(p.images[0], p.name, "", eager)}${p.limited ? `<span class="card__tag">${t("limited")}</span>` : ""}</a>
      <button class="card__add" data-add="${p.id}" aria-pressed="${on}" aria-label="${on ? t("remove_sel") : t("add")}">${on ? ICON.check : ICON.plus}</button>
      <a href="#p-${p.slug}" class="card__name">${esc(p.name)}</a>
      <div class="card__meta"><span>${p.sku}</span><span aria-hidden="true">·</span><span>${typeName(p.type)}</span></div>
    </article>`;
  }

  /* ---------- views ---------- */
  function viewHome() {
    const feat = FEATURED.map((id) => byId.get(id)).filter(Boolean);
    return `
    <section class="hero" aria-label="${t("hero_title")}">
      <canvas id="kiln" aria-hidden="true"></canvas>
      <div class="wrap hero__in">
        <p class="eyebrow"><span class="mark"></span>${t("hero_eyebrow")}</p>
        <h1>${t("hero_title")}</h1>
        <p class="hero__sub">${t("hero_sub")}</p>
        <div class="hero__cta">
          <a class="btn btn--gold" href="#koleksiyon">${t("hero_cta1")}</a>
          <a class="btn btn--light" href="#ozel-uretim">${t("hero_cta2")}</a>
        </div>
      </div>
    </section>
    <div class="hallmarks"><div class="wrap"><ul>
      ${["hm_gold", "hm_hand", "hm_limited", "hm_cert", "hm_beykoz"].map((k) => `<li><span class="mark"></span>${t(k)}</li>`).join("")}
    </ul></div></div>

    <section class="sec"><div class="wrap intro">
      <div class="sec__head" style="margin:0"><p class="eyebrow">${t("intro_eyebrow")}</p><p class="lede">${t("intro_text")}</p></div>
      <div class="intro__facts">
        <div><b>2005</b><span>${t("f_year")}</span></div>
        <div><b>3</b><span>${t("f_floors")}</span></div>
        <div><b>${CATALOG.length}</b><span>${t("f_pieces")}</span></div>
      </div>
    </div></section>

    <section class="sec" style="padding-top:0"><div class="wrap">
      <div class="sec__head sec__head--row"><div class="sec__head" style="margin:0"><p class="eyebrow">${t("nav_collections")}</p><h2>${t("hero_cta1")}</h2></div><a class="link" href="#koleksiyon">${t("see_all")} ${ICON.arrow.replace("<svg", '<svg width="14" height="14"')}</a></div>
      <div class="colls">
        ${COLLS.map((c) => {
          const cover = byId.get(COVER[c]); const n = CATALOG.filter((p) => p.collection === c).length;
          return `<a class="coll" href="#c-${c}"><div class="coll__img">${img(cover.images[0], collName(c))}</div>
            <div class="coll__meta"><h3>${collName(c)}</h3><span class="eyebrow">${n} ${t("pieces")}</span></div><p>${t("c_" + c + "_d")}</p></a>`;
        }).join("")}
      </div>
    </div></section>

    <section class="sec night" id="atelier-sec"><div class="wrap" style="display:grid;gap:44px">
      <div class="sec__head" style="margin:0"><p class="eyebrow">${t("atelier_eyebrow")}</p><h2>${t("atelier_title")}</h2></div>
      <div class="floors">
        ${[1, 2, 3].map((i) => `<div class="floor"><span class="floor__no">${["I", "II", "III"][i - 1]}</span><div><h3>${t("fl" + i + "_t")}</h3><p>${t("fl" + i + "_d")}</p></div></div>`).join("")}
      </div>
      <p class="atelier__quote">${t("atelier_quote")}</p>
      <div><a class="btn btn--light" href="#atolye">${t("nav_atelier")}</a></div>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sec__head sec__head--row"><div class="sec__head" style="margin:0"><p class="eyebrow">${t("featured_sub")}</p><h2>${t("featured")}</h2></div><a class="link" href="#koleksiyon">${t("see_all")}</a></div>
      <div class="rail">${feat.map((p) => card(p)).join("")}</div>
    </div></section>

    <section class="sec" style="padding-top:0"><div class="wrap split">
      <div class="sec__head"><p class="eyebrow">${t("bespoke_eyebrow")}</p><h2>${t("bespoke_title")}</h2><p class="muted" style="max-width:44ch">${t("bespoke_text")}</p>
        <div style="margin-top:12px"><a class="btn btn--solid" href="#ozel-uretim">${t("bespoke_cta")}</a></div></div>
      ${segments()}
    </div></section>

    <section class="sec" style="padding-top:0"><div class="wrap split">
      <div class="sec__head"><p class="eyebrow">${t("how_eyebrow")}</p><h2>${t("how_title")}</h2></div>
      <ol class="steps">${[1, 2, 3].map((i) => `<li><b>${t("how" + i)}</b><span>${t("how" + i + "_d")}</span></li>`).join("")}</ol>
    </div></section>

    ${catalogBand()}`;
  }

  const segments = () => `<ul class="segs">${[1, 2, 3, 4, 5].map((i) => `<li><b>${t("seg" + i)}</b><span>${t("seg" + i + "_d")}</span><i>${["I", "II", "III", "IV", "V"][i - 1]}</i></li>`).join("")}</ul>`;
  const catalogBand = () => `
    <section class="band"><div class="wrap band__in">
      <div class="sec__head" style="margin:0;gap:8px"><p class="eyebrow">PDF · 2026</p><h3 style="font-size:1.75rem">${t("catalog_title")}</h3><p class="muted">${t("catalog_text")}</p></div>
      <button class="btn btn--line" data-act="catalog">${t("catalog_cta")}</button>
    </div></section>`;

  function viewList(coll) {
    const pool = coll ? CATALOG.filter((p) => p.collection === coll) : CATALOG;
    const types = TYPE_ORDER.filter((k) => pool.some((p) => p.type === k));
    if (!types.includes(listState.type)) listState.type = "all";
    return `
    <div class="wrap list-head">
      <nav class="crumbs" aria-label="breadcrumb"><a href="#">Camhare</a><span>/</span><a href="#koleksiyon">${t("nav_collections")}</a>${coll ? `<span>/</span><span>${collName(coll)}</span>` : ""}</nav>
      <h1 style="font-size:clamp(2.4rem,9vw,4.2rem)">${coll ? collName(coll) : t("nav_all")}</h1>
      ${coll ? `<p class="muted" style="max-width:52ch">${t("c_" + coll + "_d")}</p>` : `<div class="chips" style="padding:0">${COLLS.map((c) => `<a class="chip" href="#c-${c}" style="display:inline-flex;align-items:center">${collName(c)}</a>`).join("")}</div>`}
    </div>
    <div class="toolbar"><div class="wrap">
      <label class="search">${ICON.search}<input id="q" type="search" placeholder="${t("search_ph")}" value="${esc(listState.q)}" autocomplete="off"></label>
      <div class="chips" role="group" aria-label="Filtre">
        <button class="chip" data-type="all" aria-pressed="${listState.type === "all"}">${t("type_all")}<sup>${pool.length}</sup></button>
        ${types.map((k) => `<button class="chip" data-type="${k}" aria-pressed="${listState.type === k}">${typeName(k)}<sup>${pool.filter((p) => p.type === k).length}</sup></button>`).join("")}
      </div>
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
      : `<div class="empty" style="grid-column:1/-1"><p class="lede" style="max-width:none">${t("no_results")}</p><button class="link" data-act="clear">${t("clear")}</button></div>`;
  }

  function viewProduct(p) {
    const st = story(p);
    const series = CATALOG.filter((x) => x.series === p.series && x.id !== p.id);
    const related = (series.length ? series : CATALOG.filter((x) => x.collection === p.collection && x.id !== p.id)).slice(0, 8);
    const many = p.images.length > 1;
    return `
    <div class="wrap" style="padding-top:18px"><nav class="crumbs" aria-label="breadcrumb"><a href="#koleksiyon">${t("nav_collections")}</a><span>/</span><a href="#c-${p.collection}">${collName(p.collection)}</a></nav></div>
    <div class="pdp wrap-lg">
      <div class="gal-col">
        <div class="gal">
          <div class="gal__track" id="gal">${p.images.map((f, i) => `<figure>${img(f, `${p.name} — ${i + 1}`, "", i === 0)}</figure>`).join("")}</div>
          ${many ? `<span class="gal__count" id="galc">1 / ${p.images.length}</span><span class="gal__dots" id="gald">${p.images.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</span>` : ""}
        </div>
        ${many ? `<div class="gal__thumbs">${p.images.map((f, i) => `<button data-thumb="${i}" class="${i ? "" : "on"}" aria-label="${i + 1}">${img(f, "")}</button>`).join("")}</div>` : ""}
      </div>
      <div class="pdp__info wrap-sm">
        <div class="pdp__title">
          <p class="eyebrow">${collName(p.collection)}</p>
          <h1>${esc(p.name)}</h1>
          <div class="pdp__sku"><span>SKU ${p.sku}</span><span>${typeName(p.type)}</span>${p.limited ? `<span style="color:var(--gold)">${t("limited")}</span>` : ""}</div>
        </div>
        <div class="price"><b>${t("price_on_request")}</b><small>${t("price_note")}</small></div>
        <div class="badges">
          <div><b>24</b>${t("b_gold")}</div>
          <div><b>${t("b_hand_v")}</b>${t("b_hand")}</div>
          <div><b>${t("b_origin_v")}</b>${t("b_origin")}</div>
        </div>
        <div class="pdp__cta" id="pdp-cta">
          <button class="btn btn--solid btn--block" data-add="${p.id}"></button>
          <a class="btn btn--wa btn--block" href="${productWa(p)}" target="_blank" rel="noopener">${ICON.wa}${t("wa_vip")}</a>
        </div>
        <div class="acc">
          ${p.set && p.set.length ? `<details open><summary>${t("set_contents")}</summary><div class="acc__body"><ul class="setlist">${p.set.map((s) => `<li><span>${esc(lang === "tr" ? s.tr : s.en)}</span><span>${p.images.length > 1 ? "" : ""}</span></li>`).join("")}</ul></div></details>` : ""}
          ${st.length ? `<details open><summary>${t("story")}</summary><div class="acc__body story">${st.map((x) => `<p>${esc(x)}</p>`).join("")}</div></details>` : ""}
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
            <p class="foot-note">${t("dims_note")}</p>
          </div></details>
          <details><summary>${t("certificate")}</summary><div class="acc__body"><div class="cert"><div class="cert__seal"><span>24</span></div><p>${t("cert_t")}</p></div></div></details>
          <details><summary>${t("care")}</summary><div class="acc__body"><p>${t("care_t")}</p></div></details>
          <details><summary>${t("delivery")}</summary><div class="acc__body"><p>${t("delivery_t")}</p></div></details>
        </div>
      </div>
    </div>
    ${related.length ? `<section class="sec" style="padding-top:24px"><div class="wrap">
      <div class="sec__head"><p class="eyebrow">${series.length ? esc(p.series) : collName(p.collection)}</p><h2 style="font-size:2rem">${series.length ? t("related") : t("related_coll")}</h2></div>
      <div class="rail">${related.map((x) => card(x)).join("")}</div></div></section>` : ""}
    <div class="actionbar" id="ab">
      <button class="btn btn--solid" data-add="${p.id}"></button>
      <a class="btn btn--wa" href="${productWa(p)}" target="_blank" rel="noopener" aria-label="${t("wa_vip")}">${ICON.wa}</a>
    </div>`;
  }

  function purposeOptions(def) {
    return ["personal", "corporate", "hotel", "museum", "export", "protocol", "bespoke"]
      .map((k) => `<option value="${k}" ${k === def ? "selected" : ""}>${t("p_" + k)}</option>`).join("");
  }
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
      <div style="display:grid;gap:10px">
        <button class="btn btn--solid btn--block" type="submit">${t("send")}</button>
        <a class="btn btn--wa btn--block" href="${waLink(t("wa_one"))}" target="_blank" rel="noopener" data-act="form-wa">${ICON.wa}${t("send_wa")}</a>
      </div>
      <p class="proto">${t("proto_note")}</p>
    </form>`;
  }

  function viewSelection() {
    if (!selection.length) {
      return `<div class="wrap list-head"><p class="eyebrow">${t("sel_eyebrow")}</p><h1 style="font-size:clamp(2.4rem,9vw,4.2rem)">${t("sel_title")}</h1></div>
      <div class="wrap"><div class="empty" style="border-top:1px solid var(--line)"><p class="lede" style="max-width:none">${t("sel_empty")}</p><p class="muted" style="max-width:40ch">${t("sel_empty_d")}</p><a class="btn btn--solid" href="#koleksiyon">${t("sel_browse")}</a></div></div>`;
    }
    return `
    <div class="wrap list-head" style="padding-bottom:0"><p class="eyebrow">${t("sel_eyebrow")}</p><h1 style="font-size:clamp(2.4rem,9vw,4.2rem)">${t("sel_title")} <span class="muted" style="font-size:.45em">${selCount()} ${t("sel_items")}</span></h1></div>
    <div class="wrap sel">
      <div class="sel__items">
        ${selection.map((s) => { const p = byId.get(s.id); return `
          <div class="sel__item">
            <a class="card__img" href="#p-${p.slug}">${img(p.images[0], p.name)}</a>
            <div style="min-width:0">
              <h3><a href="#p-${p.slug}">${esc(p.name)}</a></h3>
              <div class="card__meta" style="margin-top:4px"><span>${p.sku}</span><span>·</span><span>${t("price_on_request")}</span></div>
              <div class="sel__row">
                <div class="qty" aria-label="${t("qty")}"><button data-qty="${p.id}" data-d="-1" aria-label="−">−</button><output>${s.qty}</output><button data-qty="${p.id}" data-d="1" aria-label="+">+</button></div>
                <button class="rm" data-rm="${p.id}">${t("remove")}</button>
              </div>
            </div>
          </div>`; }).join("")}
      </div>
      <div id="sel-form">${leadForm("qf", { purpose: "personal" })}</div>
    </div>`;
  }

  function viewBespoke() {
    return `
    <section class="sec night" style="padding-block:72px 56px"><div class="wrap" style="display:grid;gap:18px">
      <p class="eyebrow">${t("bespoke_eyebrow")}</p><h1 style="font-size:clamp(2.6rem,10vw,5rem);font-style:italic;font-weight:300">${t("bespoke_title")}</h1>
      <p class="muted" style="max-width:46ch">${t("bespoke_text")}</p>
    </div></section>
    <section class="sec"><div class="wrap split">
      ${segments()}
      <div style="display:grid;gap:28px">
        <div class="sec__head" style="margin:0"><p class="eyebrow">${t("how_eyebrow")}</p><h2 style="font-size:2rem">${t("bespoke_cta")}</h2></div>
        ${leadForm("bf", { purpose: "corporate", file: true })}
      </div>
    </div></section>`;
  }

  function viewAtelier() {
    return `
    <section class="sec night" style="padding-block:72px"><div class="wrap" style="display:grid;gap:40px">
      <div class="sec__head" style="margin:0"><p class="eyebrow">${t("atelier_eyebrow")} · Çubuklu, Beykoz</p><h1 style="font-size:clamp(2.6rem,10vw,5rem);font-style:italic;font-weight:300">${t("about_title")}</h1></div>
      <div class="floors">${[1, 2, 3].map((i) => `<div class="floor"><span class="floor__no">${["I", "II", "III"][i - 1]}</span><div><h3>${t("fl" + i + "_t")}</h3><p>${t("fl" + i + "_d")}</p></div></div>`).join("")}</div>
    </div></section>
    <section class="sec"><div class="wrap split">
      <p class="lede">${t("about_p1")}</p>
      <div style="display:grid;gap:18px" class="muted"><p>${t("about_p2")}</p><p>${t("about_p3")}</p>
        <p class="atelier__quote" style="color:var(--ink)">${t("atelier_quote")}</p>
        <div><a class="btn btn--solid" href="#iletisim">${t("atelier_cta")}</a></div></div>
    </div></section>
    ${catalogBand()}`;
  }

  function viewContact() {
    const addr = "Çubuklu, Dedeoğlu Cad., Dereyolu Sk. No: 78 Kat: 3-4, 34800 Beykoz / İstanbul";
    return `
    <div class="wrap list-head"><p class="eyebrow">${t("contact_eyebrow")}</p><h1 style="font-size:clamp(2.4rem,9vw,4.2rem)">${t("contact_title")}</h1><p class="muted">${t("visit")}</p></div>
    <div class="wrap split" style="padding-bottom:80px">
      <div class="contact">
        <div><span class="eyebrow">${t("whatsapp")}</span><b>+90 530 861 95 85</b><div class="acts"><a class="link" href="${waLink(t("wa_one"))}" target="_blank" rel="noopener">${t("write")}</a><button class="link" data-copy="+90 530 861 95 85">${t("copy")}</button></div></div>
        <div><span class="eyebrow">${t("phone")}</span><b>+90 216 680 03 90</b><div class="acts"><a class="link" href="tel:+902166800390">${t("call")}</a><button class="link" data-copy="+90 216 680 03 90">${t("copy")}</button></div></div>
        <div><span class="eyebrow">${t("email")}</span><b>info@camhare.com</b><div class="acts"><a class="link" href="mailto:info@camhare.com">${t("write")}</a><button class="link" data-copy="info@camhare.com">${t("copy")}</button></div></div>
        <div><span class="eyebrow">${t("address")}</span><b style="font-size:1.25rem">${addr}</b><div class="acts"><a class="link" href="https://www.google.com/maps/search/?api=1&query=41.106073,29.10006" target="_blank" rel="noopener">${t("directions")}</a><button class="link" data-copy="${esc(addr)}">${t("copy")}</button></div></div>
      </div>
      <div style="display:grid;gap:24px"><div class="sec__head" style="margin:0"><p class="eyebrow">${t("sel_eyebrow")}</p><h2 style="font-size:2rem">${t("bespoke_cta")}</h2></div>${leadForm("cf", { purpose: "personal" })}</div>
    </div>`;
  }

  /* ---------- modal ---------- */
  function openCatalog() {
    closeModal();
    const el = document.createElement("div");
    el.className = "modal"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
    el.innerHTML = `<div class="modal__panel">
      <div class="modal__top"><div class="sec__head" style="margin:0;gap:8px"><p class="eyebrow">PDF · 2026</p><h3 style="font-size:1.75rem">${t("catalog_modal")}</h3></div><button class="icon-btn" data-act="close-modal" aria-label="${t("close")}">${ICON.close}</button></div>
      <p class="muted">${t("catalog_modal_d")}</p>
      <form class="form" id="catf" novalidate>
        <div class="field"><label for="cat-email">${t("f_email")}</label><input id="cat-email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="cat-purpose">${t("f_purpose")}</label><select id="cat-purpose">${purposeOptions("corporate")}</select></div>
        <p class="err" hidden></p>
        <button class="btn btn--solid btn--block" type="submit">${t("catalog_cta")}</button>
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
    box.innerHTML = `<p class="eyebrow">${t("done_title")}</p><p class="done__ref">${ref}</p><p class="muted">${t("done_text")}</p>
      <a class="btn btn--wa btn--block" href="${f.id === "qf" ? selectionWa(`Ref: ${ref} — ${v.name}`) : waLink(`${t("wa_one")}\nRef: ${ref} — ${v.name}\n${v.note || ""}`)}" target="_blank" rel="noopener">${ICON.wa}${t("send_wa")}</a>
      <p class="proto">${t("proto_note")}</p>`;
    f.replaceWith(box);
    box.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  /* ---------- hero kiln canvas ---------- */
  let kilnStop = null;
  function kiln() {
    kilnStop?.();
    const cv = $("#kiln"); if (!cv) return;
    const ctx = cv.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w, h, dpr, embers = [], raf, running = true, tick = 0;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2); w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = (y) => ({ x: w * (0.15 + Math.random() * 0.7), y: y ?? h + 10, vy: 0.25 + Math.random() * 0.9, vx: (Math.random() - 0.5) * 0.3, r: 0.6 + Math.random() * 1.8, life: 0.4 + Math.random() * 0.6, ph: Math.random() * 6.3 });
    const frame = () => {
      tick += 0.008;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#0d1110"; ctx.fillRect(0, 0, w, h);
      // kiln mouth: layered radial glow breathing slowly
      const cx = w * 0.7, cy = h * 0.9, pulse = 0.9 + Math.sin(tick * 2.1) * 0.07 + Math.sin(tick * 5.3) * 0.03;
      const rad = Math.max(w, h) * 0.75 * pulse;
      let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, "rgba(255,196,110,.95)"); g.addColorStop(0.12, "rgba(232,138,52,.7)"); g.addColorStop(0.38, "rgba(140,62,20,.35)"); g.addColorStop(1, "rgba(13,17,16,0)");
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      g = ctx.createRadialGradient(w * 0.2, h * 0.1, 0, w * 0.2, h * 0.1, w * 0.6);
      g.addColorStop(0, "rgba(29,107,110,.16)"); g.addColorStop(1, "rgba(29,107,110,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (const e of embers) {
        e.y -= e.vy; e.x += e.vx + Math.sin(tick * 3 + e.ph) * 0.25; e.life -= 0.0018;
        const a = Math.max(0, Math.min(1, e.life)) * (0.6 + Math.sin(tick * 9 + e.ph) * 0.4);
        ctx.fillStyle = `rgba(255,${170 + ((e.ph * 10) | 0)},90,${a})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.283); ctx.fill();
      }
      embers = embers.map((e) => (e.life <= 0 || e.y < -10 ? spawn() : e));
      if (running && !reduce) raf = requestAnimationFrame(frame);
    };
    resize();
    embers = Array.from({ length: Math.round(Math.min(90, w / 6)) }, () => spawn(Math.random() * h));
    frame();
    const ro = new ResizeObserver(() => { resize(); if (reduce) frame(); }); ro.observe(cv);
    const io = new IntersectionObserver(([en]) => { const vis = en.isIntersecting; if (vis && !running && !reduce) { running = true; frame(); } if (!vis) { running = false; cancelAnimationFrame(raf); } });
    io.observe(cv);
    kilnStop = () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }

  /* ---------- router ---------- */
  function route() {
    const r = decodeURIComponent(location.hash.slice(1));
    let html = "", after = null, title = "CAMHARE — Camdan Düşler";
    if (r === "koleksiyon") { html = viewList(null); after = () => paintList(null); title = t("nav_collections"); }
    else if (r.startsWith("c-") && COLLS.includes(r.slice(2))) { const c = r.slice(2); html = viewList(c); after = () => paintList(c); title = collName(c); }
    else if (r.startsWith("p-") && bySlug.has(r.slice(2))) { const p = bySlug.get(r.slice(2)); html = viewProduct(p); after = () => wireProduct(p); title = p.name; }
    else if (r === "seckim") { html = viewSelection(); title = t("sel_title"); }
    else if (r === "ozel-uretim") { html = viewBespoke(); title = t("nav_bespoke"); }
    else if (r === "atolye") { html = viewAtelier(); title = t("nav_atelier"); }
    else if (r === "iletisim") { html = viewContact(); title = t("nav_contact"); }
    else { html = viewHome(); after = kiln; }
    if (!after || after !== kiln) kilnStop?.();
    document.documentElement.lang = lang; document.documentElement.dir = t("dir");
    document.title = title === "CAMHARE — Camdan Düşler" ? title : `${title} · CAMHARE`;
    app.innerHTML = header() + `<main id="main">${html}</main>` + footer();
    $$("[data-add]").forEach(paintAdd);
    after?.();
  }

  function wireProduct() {
    const track = $("#gal");
    if (track && $("#galc")) {
      const n = track.children.length;
      track.addEventListener("scroll", () => {
        const i = Math.round(Math.abs(track.scrollLeft) / track.clientWidth);
        $("#galc").textContent = `${Math.min(i + 1, n)} / ${n}`;
        $$("#gald i").forEach((d, k) => d.classList.toggle("on", k === i));
        $$(".gal__thumbs button").forEach((d, k) => d.classList.toggle("on", k === i));
      }, { passive: true });
    }
    // hide the sticky bar while the inline CTA is on screen
    const cta = $("#pdp-cta"), ab = $("#ab");
    if (cta && ab) new IntersectionObserver(([e]) => ab.classList.toggle("hide", e.isIntersecting)).observe(cta);
  }

  /* ---------- events ---------- */
  let lastHash = location.hash;
  addEventListener("hashchange", () => {
    $(".menu")?.remove(); document.body.style.overflow = "";
    const keepScroll = false;
    if (!location.hash.startsWith("#c-") && !location.hash.startsWith("#koleksiyon")) listState.q = "";
    if (location.hash.slice(0, 3) !== lastHash.slice(0, 3)) listState.type = "all";
    lastHash = location.hash;
    route();
    if (!keepScroll) scrollTo({ top: 0, behavior: "instant" });
  });

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act],[data-add],[data-lang],[data-type],[data-qty],[data-rm],[data-copy],[data-thumb]");
    if (!el) return;
    const d = el.dataset;
    if (d.add) { e.preventDefault(); toggleSel(+d.add); }
    else if (d.lang) { lang = d.lang; store.set("lang", lang); $(".menu")?.remove(); document.body.style.overflow = ""; route(); }
    else if (d.type) { listState.type = d.type; $$("[data-type]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.type === d.type)); paintList(location.hash.startsWith("#c-") ? location.hash.slice(3) : null); }
    else if (d.qty) { const s = selection.find((x) => x.id === +d.qty); s.qty = Math.max(1, Math.min(999, s.qty + +d.d)); saveSel(); el.parentElement.querySelector("output").textContent = s.qty; }
    else if (d.rm) { toggleSel(+d.rm, false); route(); }
    else if (d.copy) { copy(d.copy, el); }
    else if (d.thumb) { const tr = $("#gal"); tr.scrollTo({ left: tr.clientWidth * +d.thumb * (t("dir") === "rtl" ? -1 : 1), behavior: "smooth" }); }
    else if (d.act === "menu") { document.body.insertAdjacentHTML("beforeend", menu()); document.body.style.overflow = "hidden"; $(".menu [data-act=close-menu]").focus(); }
    else if (d.act === "close-menu") { $(".menu")?.remove(); document.body.style.overflow = ""; }
    else if (d.act === "catalog") { $(".menu")?.remove(); document.body.style.overflow = ""; openCatalog(); }
    else if (d.act === "close-modal") closeModal();
    else if (d.act === "clear") { listState.q = ""; listState.type = "all"; route(); }
    else if (d.act === "form-wa") {
      const f = el.closest("form"); const v = readForm(f);
      const extra = [v.name, v.company, v.country, v.purpose && t("p_" + v.purpose), v.note].filter(Boolean).join(" · ");
      el.href = f.id === "qf" ? selectionWa(extra) : waLink(`${t("wa_one")}\n${extra}`); // real link: let the browser open it
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
