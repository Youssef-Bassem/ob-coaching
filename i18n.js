/* ==========================================================
   i18n.js  —  language switcher (English <-> Arabic)
   Needs translations.js loaded first. Load both at the end of <body>.
   ========================================================== */
(function () {
  "use strict";

  var DICT = window.TRANSLATIONS || {};
  var RTL = { ar: true };
  var STORAGE_KEY = "lang";

  /* Normalise text so it matches the dictionary keys */
  function norm(s) {
    return s
      .replace(/&nbsp;|\u00a0/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* All known English keys */
  var keys = new Set();
  Object.keys(DICT).forEach(function (l) {
    Object.keys(DICT[l]).forEach(function (k) { keys.add(k); });
  });

  /* ---------- Styles (RTL fixes + switcher look) ---------- */
  var css = [
    ".nav-actions{display:flex;align-items:center;gap:20px}",
    ".lang-switch{display:flex;align-items:center;gap:10px;direction:ltr}",
    ".lang-btn{background:none;border:none;padding:4px 2px;cursor:pointer;font-family:var(--font-body);font-size:.88rem;color:var(--text-secondary);transition:color .25s}",
    ".lang-btn[lang=ar]{font-family:'Cairo',var(--font-body)}",
    ".lang-btn:hover{color:var(--gold-light)}",
    ".lang-btn.active{color:var(--gold);font-weight:600}",
    ".lang-sep{color:rgba(212,168,83,.4)}",

    'html[dir="rtl"]{--font-display:"Cairo",Georgia,serif;--font-body:"Cairo",system-ui,sans-serif}',
    /* letter-spacing / uppercase break Arabic letter joining */
    'html[dir="rtl"] *{letter-spacing:0!important;text-transform:none!important}',
    'html[dir="rtl"] .hero-headline,html[dir="rtl"] .section-heading{line-height:1.45}',
    'html[dir="rtl"] .nav-links a::after{left:auto;right:0}',
    'html[dir="rtl"] .service-num{right:auto;left:22px}',
    'html[dir="rtl"] .stat{border-right:none;border-left:1px solid rgba(212,168,83,.18)}',
    'html[dir="rtl"] .stat:last-child{border-left:none}',
    '@media(max-width:576px){html[dir="rtl"] .stat{border-left:none}}',
    'html[dir="rtl"] .about-img-wrap::before{right:auto;left:-18px;border-right:none;border-left:2px solid var(--gold);border-radius:6px 0 0 0}',
    'html[dir="rtl"] .about-img-wrap::after{left:auto;right:-18px;border-left:none;border-right:2px solid var(--gold);border-radius:0 0 6px 0}',
    'html[dir="rtl"] .footer-tagline i{margin-right:0!important;margin-left:5px}',
    '@media(min-width:768px){html[dir="rtl"] .text-md-start{text-align:right!important}}',
  ].join("\n");
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* Arabic font (loaded only when needed) */
  var fontLoaded = false;
  function loadArabicFont() {
    if (fontLoaded) return;
    fontLoaded = true;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href =
      "https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap";
    document.head.appendChild(l);
  }

  /* ---------- Inject the switcher into the navbar ---------- */
  var navInner = document.querySelector(".nav-inner");
  var hamburger = document.getElementById("hamburger");
  var actions = document.createElement("div");
  actions.className = "nav-actions";
  actions.innerHTML =
    '<div class="lang-switch" id="langSwitch" role="group" aria-label="Language">' +
    '<button type="button" class="lang-btn" data-lang="ar" lang="ar">العربية</button>' +
    '<span class="lang-sep" aria-hidden="true">|</span>' +
    '<button type="button" class="lang-btn" data-lang="en" lang="en">English</button>' +
    "</div>";
  navInner.insertBefore(actions, hamburger);
  actions.appendChild(hamburger); // keep hamburger next to the switcher

  /* ---------- Collect everything that can be translated ---------- */
  var targets = [];
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, IFRAME: 1, svg: 1 };

  function collect(parent) {
    Array.prototype.forEach.call(parent.children, function (el) {
      if (SKIP[el.tagName] || el.id === "langSwitch") return;

      // 1) whole element (handles text with <span>, <em>, <br> inside)
      var key = norm(el.innerHTML);
      if (key && keys.has(key)) {
        targets.push({ kind: "html", el: el, key: key, orig: el.innerHTML });
        return;
      }
      // 2) plain text nodes directly inside the element
      Array.prototype.forEach.call(el.childNodes, function (n) {
        if (n.nodeType === 3) {
          var k = norm(n.nodeValue);
          if (k && keys.has(k)) {
            targets.push({ kind: "text", node: n, key: k, orig: n.nodeValue });
          }
        }
      });
      collect(el);
    });
  }
  collect(document.body);

  // aria-labels
  document.querySelectorAll("[aria-label]").forEach(function (el) {
    if (el === hamburger) return;
    var k = norm(el.getAttribute("aria-label"));
    if (keys.has(k))
      targets.push({ kind: "aria", el: el, key: k, orig: el.getAttribute("aria-label") });
  });

  // <title> and meta tags
  var tk = norm(document.title);
  if (keys.has(tk)) targets.push({ kind: "title", key: tk, orig: document.title });
  document
    .querySelectorAll(
      'meta[name="description"],meta[property="og:title"],meta[property="og:description"]'
    )
    .forEach(function (m) {
      var k = norm(m.getAttribute("content") || "");
      if (keys.has(k))
        targets.push({ kind: "meta", el: m, key: k, orig: m.getAttribute("content") });
    });

  /* ---------- Apply a language ---------- */
  var current = "en";

  function value(t, lang) {
    if (lang === "en") return t.orig;
    var v = DICT[lang] && DICT[lang][t.key];
    if (v == null) return t.orig;
    if (t.kind === "text") {
      // keep the original leading/trailing spaces (e.g. space before an icon)
      var lead = (t.orig.match(/^\s*/) || [""])[0];
      var trail = (t.orig.match(/\s*$/) || [""])[0];
      return lead + v + trail;
    }
    return v;
  }

  function setLang(lang) {
    if (lang !== "en" && !DICT[lang]) return;
    current = lang;
    var html = document.documentElement;
    html.lang = lang;
    html.dir = RTL[lang] ? "rtl" : "ltr";
    if (RTL[lang]) loadArabicFont();

    targets.forEach(function (t) {
      var v = value(t, lang);
      if (t.kind === "html") t.el.innerHTML = v;
      else if (t.kind === "text") t.node.nodeValue = v;
      else if (t.kind === "aria") t.el.setAttribute("aria-label", v);
      else if (t.kind === "meta") t.el.setAttribute("content", v);
      else if (t.kind === "title") document.title = v;
    });

    syncHamburgerLabel();

    document.querySelectorAll(".lang-btn").forEach(function (b) {
      var on = b.getAttribute("data-lang") === lang;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  /* Hamburger label is changed by the page's own script, so keep it in sync */
  function syncHamburgerLabel() {
    var en = hamburger.classList.contains("active")
      ? "Close navigation menu"
      : "Open navigation menu";
    var v = current === "en" ? en : (DICT[current] && DICT[current][en]) || en;
    if (hamburger.getAttribute("aria-label") !== v)
      hamburger.setAttribute("aria-label", v);
  }
  new MutationObserver(syncHamburgerLabel).observe(hamburger, {
    attributes: true,
    attributeFilter: ["aria-label"],
  });

  /* ---------- Events ---------- */
  document.getElementById("langSwitch").addEventListener("click", function (e) {
    var b = e.target.closest(".lang-btn");
    if (b) setLang(b.getAttribute("data-lang"));
  });

  /* ---------- Initial language: ?lang=ar  >  saved choice  >  English ---------- */
  var initial = "en";
  try {
    var q = new URLSearchParams(location.search).get("lang");
    initial = q || localStorage.getItem(STORAGE_KEY) || "en";
  } catch (e) {}
  if (initial !== "en" && !DICT[initial]) initial = "en";
  setLang(initial);
})();
