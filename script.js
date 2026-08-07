/* =========================================================
   Luque & Merino — Interactividad
   ========================================================= */
(function () {
  "use strict";

  /* ---- Año dinámico en el footer ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Sombra en la nav al hacer scroll ---- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("is-stuck", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Menú lateral (móvil) ---- */
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("menu");
  var backdrop = document.getElementById("navBackdrop");

  function openMenu() {
    if (!menu || !toggle) return;
    menu.classList.add("is-open");
    document.body.classList.add("menu-open");
    if (backdrop) backdrop.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Cerrar menú");
  }
  function closeMenu() {
    if (!menu || !toggle) return;
    menu.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    if (backdrop) backdrop.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú");
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      if (menu.classList.contains("is-open")) closeMenu();
      else openMenu();
    });
    if (backdrop) backdrop.addEventListener("click", closeMenu);
    // Cerrar al pulsar un enlace del menú
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    // Cerrar con Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---- Reveal al hacer scroll ---- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---- Carrusel del hero (rotación automática) ---- */
  var carousel = document.getElementById("heroCarousel");
  var dotsWrap = document.getElementById("heroDots");
  var heroTimer = null;

  function initCarousel() {
    if (!carousel || !dotsWrap) return;
    if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
    dotsWrap.innerHTML = "";

    var slides = carousel.querySelectorAll(".slide");
    if (!slides.length) return;
    var idx = 0;
    slides.forEach(function (s, i) {
      s.classList.toggle("is-active", i === 0);
      var dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", "Imagen " + (i + 1));
      if (i === 0) dot.classList.add("is-active");
      dot.addEventListener("click", function () { go(i); restart(); });
      dotsWrap.appendChild(dot);
    });
    var dots = dotsWrap.querySelectorAll("button");
    function go(n) {
      slides[idx].classList.remove("is-active");
      dots[idx].classList.remove("is-active");
      idx = (n + slides.length) % slides.length;
      slides[idx].classList.add("is-active");
      dots[idx].classList.add("is-active");
    }
    function start() { heroTimer = setInterval(function () { go(idx + 1); }, 3800); }
    function restart() { clearInterval(heroTimer); start(); }
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && slides.length > 1) {
      start();
      carousel.onmouseenter = function () { clearInterval(heroTimer); };
      carousel.onmouseleave = start;
    }
  }
  initCarousel();

  /* ---- Catálogo: buscador + filtro por categoría ---- */
  var catFilters = document.querySelectorAll(".cat-filters .filter");
  var catalogEl = document.getElementById("catalog");
  var searchInput = document.getElementById("catSearch");
  var noResults = document.getElementById("noResults");
  var activeFilter = "all";

  // Se consultan en vivo para que funcione también con los
  // productos que se cargan desde la base de datos.
  function getItems() {
    return catalogEl ? catalogEl.querySelectorAll(".product") : [];
  }

  function refreshCatalog() {
    var q = searchInput ? searchInput.value.trim().toLowerCase() : "";
    var anyVisible = false;
    var items = getItems();
    items.forEach(function (item) {
      var okCat;
      if (activeFilter === "all") {
        okCat = true;
      } else if (activeFilter === "ofertas") {
        okCat = item.getAttribute("data-offer") === "1";
      } else {
        okCat = item.getAttribute("data-cat") === activeFilter;
      }
      var okSearch = q === "" || item.textContent.toLowerCase().indexOf(q) >= 0;
      var show = okCat && okSearch;
      item.classList.toggle("is-hidden", !show);
      if (show) anyVisible = true;
    });
    if (noResults) noResults.hidden = anyVisible || items.length === 0;
  }

  var catFiltersWrap = document.querySelector(".cat-filters");

  function setFilter(f) {
    activeFilter = f;
    document.querySelectorAll(".cat-filters .filter").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-filter") === f);
    });
    refreshCatalog();
  }

  // Delegación: sirve también para los filtros generados desde la base de datos
  if (catFiltersWrap) {
    catFiltersWrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter");
      if (btn && catFiltersWrap.contains(btn)) {
        setFilter(btn.getAttribute("data-filter"));
      }
    });
  }

  // Buscador en vivo
  if (searchInput) {
    searchInput.addEventListener("input", refreshCatalog);
  }

  // Accesos directos (tarjetas de categoría y menú) que filtran el catálogo
  document.querySelectorAll("[data-cat-filter]").forEach(function (el) {
    el.addEventListener("click", function () {
      setFilter(el.getAttribute("data-cat-filter"));
    });
  });

  /* ---- Catálogo dinámico desde Supabase ---- */
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Las fotos subidas se guardan como URL completa; las ilustraciones,
  // como nombre de archivo dentro de img/.
  function imgSrc(v) {
    if (!v) return "img/cama.svg";
    return /^https?:\/\//.test(v) ? v : "img/" + v;
  }

  function productCard(p) {
    var cats = window.LYM_CATEGORIES || {};
    var catLabel = cats[p.category] || p.category || "";
    var isOffer = !!p.is_offer;
    var price = (p.price || "").trim();
    var ref = /presupuesto/i.test(price) ? "a medida" : "precio orientativo";
    var img = imgSrc(p.image);

    var badge = "";
    if (isOffer && p.discount_pct) {
      badge = '<span class="product__badge">-' + escapeHtml(p.discount_pct) + '%</span>';
    }
    var priceHtml;
    if (isOffer && p.old_price) {
      priceHtml = '<span class="product__old">' + escapeHtml(p.old_price) + '</span> ' + escapeHtml(price);
    } else {
      priceHtml = escapeHtml(price);
    }

    var art = document.createElement("article");
    art.className = "product reveal is-visible" + (isOffer ? " product--offer" : "");
    art.setAttribute("data-cat", p.category || "");
    art.setAttribute("data-offer", isOffer ? "1" : "0");
    if (p.id != null) art.setAttribute("data-id", p.id);
    art.innerHTML =
      '<div class="product__img">' + badge +
        '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(p.name) + '" loading="lazy" />' +
      '</div>' +
      '<div class="product__body">' +
        '<span class="product__cat">' + escapeHtml(catLabel) + '</span>' +
        '<h3>' + escapeHtml(p.name) + '</h3>' +
        '<p>' + escapeHtml(p.description || "") + '</p>' +
        '<div class="product__foot">' +
          '<span class="product__price">' + priceHtml + '</span>' +
          '<span class="product__ref">' + ref + '</span>' +
        '</div>' +
      '</div>';
    return art;
  }

  // Reconstruye las pastillas de filtro según las categorías que
  // realmente tienen productos (así las categorías nuevas aparecen solas).
  function renderFilters(rows, catMeta) {
    if (!catFiltersWrap) return;
    var order = {}, labels = {};
    (catMeta || []).forEach(function (c, i) { order[c.slug] = c.sort_order != null ? c.sort_order : i; labels[c.slug] = c.label; });
    var cats = {}, hasOffer = false;
    rows.forEach(function (p) {
      if (p.category) cats[p.category] = true;
      if (p.is_offer) hasOffer = true;
    });
    var list = Object.keys(cats).sort(function (a, b) {
      return (order[a] != null ? order[a] : 999) - (order[b] != null ? order[b] : 999);
    });
    var html = '<button class="filter is-active" data-filter="all">Todo</button>';
    list.forEach(function (slug) {
      var label = labels[slug] || (window.LYM_CATEGORIES && window.LYM_CATEGORIES[slug]) || slug;
      html += '<button class="filter" data-filter="' + escapeHtml(slug) + '">' + escapeHtml(label) + '</button>';
    });
    if (hasOffer) html += '<button class="filter" data-filter="ofertas">Ofertas</button>';
    catFiltersWrap.innerHTML = html;
    activeFilter = "all";
  }

  // Reconstruye el carrusel del hero con los productos marcados como destacados.
  function renderHero(featured) {
    if (!carousel || !featured.length) return;
    carousel.innerHTML = "";
    featured.forEach(function (p) {
      var fig = document.createElement("figure");
      fig.className = "slide";
      fig.setAttribute("data-tint", p.category || "");
      if (p.id != null) fig.setAttribute("data-id", p.id);
      fig.style.cursor = "pointer";
      fig.title = "Ver “" + p.name + "” en el catálogo";
      fig.innerHTML =
        '<img src="' + escapeHtml(imgSrc(p.image)) + '" alt="' + escapeHtml(p.name) + '" />' +
        '<figcaption>' + escapeHtml(p.name) + '</figcaption>';
      carousel.appendChild(fig);
    });
    // Clic en un destacado → salta a ese producto en el catálogo.
    carousel.onclick = function (e) {
      var fig = e.target.closest(".slide");
      if (fig && fig.getAttribute("data-id")) goToProduct(fig.getAttribute("data-id"));
    };
    initCarousel();
  }

  // Lleva la vista al producto indicado dentro del catálogo y lo resalta.
  function goToProduct(id) {
    setFilter("all");
    if (searchInput) { searchInput.value = ""; refreshCatalog(); }
    var card = catalogEl && catalogEl.querySelector('[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (!card) return;
    card.classList.remove("is-hidden");
    var y = card.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
    card.classList.add("is-highlight");
    setTimeout(function () { card.classList.remove("is-highlight"); }, 2200);
  }

  // Aplica las fotos que el cliente haya subido para las secciones grandes.
  function applySiteImages(rows) {
    var map = {};
    (rows || []).forEach(function (s) { map[s.key] = s.value; });
    document.querySelectorAll("[data-site-img]").forEach(function (box) {
      var url = map[box.getAttribute("data-site-img")];
      if (!url) return;
      box.style.backgroundImage = "url('" + url + "')";
      box.style.backgroundSize = "cover";
      box.style.backgroundPosition = "center";
      box.classList.add("has-photo");
    });
  }

  function loadCatalog() {
    var cfg = window.LYM_SUPABASE;
    if (!catalogEl || !cfg || !window.supabase) return;
    try {
      var sb = window.supabase.createClient(cfg.url, cfg.key);

      // Imágenes personalizadas de la web (independiente del catálogo)
      sb.from("lym_settings").select("*").then(function (res) {
        if (!res.error) applySiteImages(res.data);
      }).catch(function () { /* si falla, se queda el diseño por defecto */ });
      // Categorías (para orden y nombres) y productos activos, en paralelo.
      var pCats = sb.from("lym_categories").select("*").order("sort_order", { ascending: true });
      var pProd = sb.from(cfg.table).select("*").eq("active", true).order("sort_order", { ascending: true });

      Promise.all([pCats, pProd]).then(function (results) {
        var catMeta = (results[0] && results[0].data) || [];
        var prod = results[1] || {};
        if (prod.error) { console.warn("Catálogo: usando demo (", prod.error.message, ")"); return; }
        var rows = prod.data || [];
        if (!rows.length) return; // base de datos vacía → se queda la demo

        renderFilters(rows, catMeta);
        catalogEl.innerHTML = "";
        rows.forEach(function (p) { catalogEl.appendChild(productCard(p)); });
        refreshCatalog();

        var featured = rows.filter(function (p) { return p.is_featured; });
        renderHero(featured);
      }).catch(function (e) { console.warn("Catálogo: usando demo (", e && e.message, ")"); });
    } catch (e) {
      console.warn("Catálogo: Supabase no disponible, usando demo.");
    }
  }
  loadCatalog();

  /* ---- Formulario → WhatsApp ---- */
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (document.getElementById("name") || {}).value || "";
      var phone = (document.getElementById("phone") || {}).value || "";
      var topic = (document.getElementById("topic") || {}).value || "";
      var msg = (document.getElementById("msg") || {}).value || "";

      if (!name.trim() || !phone.trim()) {
        form.reportValidity();
        return;
      }

      var text =
        "Hola Luque & Merino 👋\n" +
        "Soy " + name + ".\n" +
        "Me interesa: " + topic + ".\n" +
        (msg ? "Mensaje: " + msg + "\n" : "") +
        "Mi teléfono: " + phone;

      var url = "https://wa.me/34679381294?text=" + encodeURIComponent(text);
      window.open(url, "_blank", "noopener");
    });
  }
})();
