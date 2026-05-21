/* ============================================================================
   go-api docs — behaviour layer. Vanilla JS, no deps, 100% offline (file://).
   ========================================================================== */
(function () {
  "use strict";

  var ROOT = (document.body && document.body.dataset.root) || "";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------- Theme */
  var THEME_KEY = "goapi-theme";
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  (function initTheme() {
    var saved;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    applyTheme(saved === "light" || saved === "dark" ? saved : "dark");
  })();
  function bindTheme() {
    var btn = $("#themeToggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      applyTheme(cur === "dark" ? "light" : "dark");
      renderMermaid(true);
    });
  }

  /* ----------------------------------------------- Root-relative links */
  // Every nav/brand link uses data-href relative to docs/html/ root.
  function resolveLinks() {
    $$("[data-href]").forEach(function (a) {
      a.setAttribute("href", ROOT + a.dataset.href);
    });
    // Mark the current sidebar entry.
    var here = location.pathname.split("/").pop() || "index.html";
    var dir = location.pathname.split("/").slice(-2, -1)[0] || "";
    $$(".sidebar a[data-href]").forEach(function (a) {
      var target = a.dataset.href.split("/");
      var tFile = target.pop();
      var tDir = target.pop() || "";
      if (tFile === here && (tDir === dir || a.dataset.href.indexOf("/") === -1)) {
        a.classList.add("current");
        a.scrollIntoView({ block: "center" });
      }
    });
  }

  /* ------------------------------------------------- Mobile sidebar */
  function bindSidebar() {
    var menu = $("#menuBtn"), sb = $(".sidebar"), scrim = $(".scrim");
    if (!menu || !sb) return;
    function close() { sb.classList.remove("open"); if (scrim) scrim.classList.remove("show"); }
    menu.addEventListener("click", function () {
      sb.classList.toggle("open");
      if (scrim) scrim.classList.toggle("show");
    });
    if (scrim) scrim.addEventListener("click", close);
    $$(".sidebar a").forEach(function (a) { a.addEventListener("click", close); });
  }

  /* -------------------------------------------------- Code copy buttons */
  function svg(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + "</svg>";
  }
  var COPY_IC = svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>');
  var CHECK_IC = svg('<polyline points="20 6 9 17 4 12"/>');
  function bindCopy() {
    $$(".code").forEach(function (block) {
      var pre = $("pre", block);
      if (!pre) return;
      var head = $(".code-head", block);
      if (!head) {
        head = document.createElement("div");
        head.className = "code-head";
        head.innerHTML = '<span class="lang">' + (block.dataset.lang || "text") + "</span>";
        block.insertBefore(head, pre);
      }
      if ($(".copy-btn", head)) return;
      var btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.type = "button";
      btn.innerHTML = COPY_IC + "<span>copy</span>";
      btn.addEventListener("click", function () {
        var txt = pre.innerText;
        function ok() {
          btn.classList.add("done");
          btn.innerHTML = CHECK_IC + "<span>copied</span>";
          setTimeout(function () {
            btn.classList.remove("done");
            btn.innerHTML = COPY_IC + "<span>copy</span>";
          }, 1600);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(ok, function () { legacyCopy(txt); ok(); });
        } else { legacyCopy(txt); ok(); }
      });
      head.appendChild(btn);
    });
  }
  function legacyCopy(t) {
    var ta = document.createElement("textarea");
    ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---------------------------------------------------------- Tabs */
  function bindTabs() {
    $$(".tabs").forEach(function (tabs) {
      var btns = $$(".tab-bar button", tabs);
      btns.forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.dataset.tab;
          btns.forEach(function (x) { x.classList.toggle("active", x === b); });
          $$(".tab-panel", tabs).forEach(function (p) {
            p.classList.toggle("active", p.dataset.tab === id);
          });
        });
      });
    });
  }

  /* ----------------------------------------- Headings: ids + anchors + TOC */
  function slug(s) {
    return s.toLowerCase().trim()
      .replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  }
  function bindHeadings() {
    var page = $(".page");
    if (!page) return;
    var toc = $(".toc-list");
    var heads = $$("h2, h3", page);
    heads.forEach(function (h) {
      if (!h.id) h.id = slug(h.textContent) || ("s-" + Math.random().toString(36).slice(2, 7));
      var a = document.createElement("a");
      a.href = "#" + h.id; a.className = "anchor"; a.textContent = "#";
      a.setAttribute("aria-label", "link to section");
      h.appendChild(a);
      if (toc) {
        var t = document.createElement("a");
        t.href = "#" + h.id;
        t.textContent = h.textContent.replace(/#$/, "");
        t.className = h.tagName === "H3" ? "lvl-3" : "lvl-2";
        t.dataset.target = h.id;
        toc.appendChild(t);
      }
    });
    if (toc && heads.length && "IntersectionObserver" in window) {
      var links = $$("a", toc);
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            links.forEach(function (l) {
              l.classList.toggle("active", l.dataset.target === e.target.id);
            });
          }
        });
      }, { rootMargin: "-80px 0px -70% 0px" });
      heads.forEach(function (h) { obs.observe(h); });
    }
  }

  /* ------------------------------------------------------- Mermaid */
  function mermaidTheme() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    return {
      theme: "base",
      themeVariables: dark
        ? {
            background: "#161b27", primaryColor: "#1c2333",
            primaryTextColor: "#e6e9f0", primaryBorderColor: "#3a4256",
            lineColor: "#5a6680", secondaryColor: "#15321f",
            tertiaryColor: "#2a2030", fontSize: "15px",
            textColor: "#e6e9f0", noteBkgColor: "#2a2030",
            noteTextColor: "#e6e9f0", clusterBkg: "#11151f",
            clusterBorder: "#262d3d"
          }
        : {
            background: "#ffffff", primaryColor: "#fff3e8",
            primaryTextColor: "#1a1f2b", primaryBorderColor: "#e0670f",
            lineColor: "#8a93a6", secondaryColor: "#e6f7f4",
            tertiaryColor: "#f3f4f8", fontSize: "15px",
            textColor: "#1a1f2b", clusterBkg: "#f7f8fb",
            clusterBorder: "#e2e5ee"
          }
    };
  }
  var mermaidInited = false;
  function renderMermaid(rerender) {
    if (!window.mermaid) return;
    var nodes = $$(".mermaid");
    if (!nodes.length) return;
    nodes.forEach(function (n) {
      if (!n.dataset.src) n.dataset.src = n.textContent.trim();
      if (rerender) {
        n.removeAttribute("data-processed");
        n.innerHTML = n.dataset.src;
      }
    });
    var cfg = mermaidTheme();
    try {
      window.mermaid.initialize({
        startOnLoad: false, securityLevel: "loose",
        theme: cfg.theme, themeVariables: cfg.themeVariables,
        flowchart: { curve: "basis", htmlLabels: true },
        sequence: { useMaxWidth: false }
      });
      mermaidInited = true;
      var run = window.mermaid.run
        ? window.mermaid.run({ nodes: nodes })
        : Promise.resolve(window.mermaid.init(undefined, nodes));
      Promise.resolve(run).then(setupZoom).catch(function (e) {
        console.warn("mermaid render", e);
      });
    } catch (e) { console.warn("mermaid", e); }
  }

  /* ----------------------------------------------- Diagram zoom / pan */
  function setupZoom() {
    $$(".diagram").forEach(function (d) {
      var vp = $(".diagram-viewport", d);
      var fig = $(".mermaid", vp);
      if (!vp || !fig || vp.dataset.zoomBound) return;
      vp.dataset.zoomBound = "1";
      var scale = 1, tx = 0, ty = 0, dragging = false, sx = 0, sy = 0;
      function apply() {
        fig.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
      }
      function zoom(f) { scale = Math.min(4, Math.max(0.4, scale * f)); apply(); }
      vp.addEventListener("wheel", function (e) {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault(); zoom(e.deltaY < 0 ? 1.12 : 0.89);
      }, { passive: false });
      vp.addEventListener("mousedown", function (e) {
        dragging = true; sx = e.clientX - tx; sy = e.clientY - ty;
      });
      window.addEventListener("mousemove", function (e) {
        if (!dragging) return;
        tx = e.clientX - sx; ty = e.clientY - sy; apply();
      });
      window.addEventListener("mouseup", function () { dragging = false; });
      var tools = $(".diagram-tools", d);
      if (tools && !tools.dataset.bound) {
        tools.dataset.bound = "1";
        tools.addEventListener("click", function (e) {
          var act = e.target.closest("button");
          if (!act) return;
          var a = act.dataset.act;
          if (a === "in") zoom(1.2);
          else if (a === "out") zoom(0.83);
          else if (a === "reset") { scale = 1; tx = 0; ty = 0; apply(); }
        });
      }
    });
  }

  /* ----------------------------------------------------------- Search */
  function bindSearch() {
    var input = $("#searchInput"), box = $("#searchResults");
    if (!input || !box) return;
    var idx = window.__SEARCH_INDEX__ || [];
    var cur = -1, shown = [];
    function render(items) {
      shown = items; cur = -1;
      if (!items.length) {
        box.innerHTML = '<div class="sr-empty">Nessun risultato</div>';
        box.classList.add("open"); return;
      }
      box.innerHTML = items.map(function (it) {
        return '<a href="' + ROOT + it.url + '"><span class="sr-sec">' +
          it.section + "</span><br><span class=\"sr-title\">" + it.title +
          "</span></a>";
      }).join("");
      box.classList.add("open");
    }
    function search(q) {
      q = q.trim().toLowerCase();
      if (q.length < 2) { box.classList.remove("open"); return; }
      var terms = q.split(/\s+/);
      var scored = [];
      idx.forEach(function (it) {
        var hay = (it.title + " " + it.section + " " + it.text).toLowerCase();
        var s = 0, ok = true;
        terms.forEach(function (t) {
          if (hay.indexOf(t) === -1) ok = false;
          if (it.title.toLowerCase().indexOf(t) !== -1) s += 5;
          if (it.text.toLowerCase().indexOf(t) !== -1) s += 1;
        });
        if (ok) scored.push({ it: it, s: s });
      });
      scored.sort(function (a, b) { return b.s - a.s; });
      render(scored.slice(0, 12).map(function (x) { return x.it; }));
    }
    input.addEventListener("input", function () { search(input.value); });
    input.addEventListener("focus", function () { if (input.value) search(input.value); });
    input.addEventListener("keydown", function (e) {
      var links = $$("a", box);
      if (e.key === "ArrowDown") { e.preventDefault(); cur = Math.min(cur + 1, links.length - 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); cur = Math.max(cur - 1, 0); }
      else if (e.key === "Enter" && links[cur]) { location.href = links[cur].href; return; }
      else if (e.key === "Escape") { box.classList.remove("open"); input.blur(); return; }
      else return;
      links.forEach(function (l, i) { l.classList.toggle("active", i === cur); });
      if (links[cur]) links[cur].scrollIntoView({ block: "nearest" });
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".search-box")) box.classList.remove("open");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== input) {
        e.preventDefault(); input.focus();
      }
    });
  }

  /* ------------------------------------------------------- Slide deck */
  function bindDeck() {
    var deck = $(".deck");
    if (!deck) return;
    var slides = $$(".slide", deck);
    var n = slides.length, i = 0;
    var bar = $(".deck-progress");
    var counter = $("#deckCount");
    function go(x) {
      i = Math.min(n - 1, Math.max(0, x));
      slides.forEach(function (s, k) { s.classList.toggle("active", k === i); });
      if (bar) bar.style.width = ((i + 1) / n * 100) + "%";
      if (counter) counter.textContent = (i + 1) + " / " + n;
      try { history.replaceState(null, "", "#" + (i + 1)); } catch (e) {}
    }
    var h = parseInt((location.hash || "").slice(1), 10);
    go(isNaN(h) ? 0 : h - 1);
    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); go(i + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(i - 1); }
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(n - 1);
    });
    var pv = $("#deckPrev"), nx = $("#deckNext");
    if (pv) pv.addEventListener("click", function () { go(i - 1); });
    if (nx) nx.addEventListener("click", function () { go(i + 1); });
  }

  /* ------------------------------------------------- Endpoint filter */
  function bindFilter() {
    var fb = $(".filter-bar");
    if (!fb) return;
    var q = $("#fText"), area = $("#fArea"), kind = $("#fKind");
    var rows = $$("tbody tr", $(".filter-table") || document);
    function run() {
      var tv = (q && q.value || "").toLowerCase();
      var av = area && area.value || "";
      var kv = kind && kind.value || "";
      rows.forEach(function (r) {
        var txt = r.textContent.toLowerCase();
        var okT = !tv || txt.indexOf(tv) !== -1;
        var okA = !av || r.dataset.area === av;
        var okK = !kv || r.dataset.kind === kv;
        r.classList.toggle("hidden-row", !(okT && okA && okK));
      });
    }
    [q, area, kind].forEach(function (el) {
      if (el) el.addEventListener("input", run), el.addEventListener("change", run);
    });
  }

  /* --------------------------------------------------------- Boot */
  function boot() {
    bindTheme();
    resolveLinks();
    bindSidebar();
    bindCopy();
    bindTabs();
    bindHeadings();
    bindSearch();
    bindDeck();
    bindFilter();
    renderMermaid(false);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
