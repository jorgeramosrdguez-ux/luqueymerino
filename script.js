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
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          el.classList.add("is-visible");
          io.unobserve(el);
          // El retraso escalonado solo sirve para la entrada: luego se quita
          // para que el efecto al pasar el ratón no llegue tarde.
          if (el.style.getPropertyValue("--d")) {
            setTimeout(function () { el.style.removeProperty("--d"); }, 1200);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
  }
  function observeReveal(els) {
    Array.prototype.forEach.call(els, function (el) {
      if (io) io.observe(el); else el.classList.add("is-visible");
    });
  }
  // Las tarjetas de una misma rejilla entran una detrás de otra
  function staggerReveal(els) {
    Array.prototype.forEach.call(els, function (el, i) {
      el.style.setProperty("--d", Math.min(i * 0.09, 0.45).toFixed(2) + "s");
    });
  }
  // En los bloques de dos columnas, una parte entra por la izquierda y la
  // otra por la derecha, según su orden real en la página.
  document.querySelectorAll(".feature__media, .about__media, .visit__map, .cta__form").forEach(function (el) {
    var pair = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains("reveal"); });
    if (pair.length !== 2) return;
    pair[0].classList.add("reveal--left");
    pair[1].classList.add("reveal--right");
  });
  document.querySelectorAll(".tips, .trust__grid, .quotes, .reviews").forEach(function (grid) {
    staggerReveal(Array.prototype.filter.call(grid.children, function (c) { return c.classList.contains("reveal"); }));
  });
  observeReveal(document.querySelectorAll(".reveal"));

  /* ---- Entrada animada de la portada ---- */
  (function heroIntro() {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    var title = hero.querySelector(".hero__title");
    if (title) {
      // Cada palabra en su propia capa para que aparezcan una tras otra
      var n = 0;
      Array.prototype.slice.call(title.childNodes).forEach(function (node) {
        if (node.nodeType !== 3) return;          // los <br> se quedan igual
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement("span");
          w.className = "hw";
          w.textContent = part;
          w.style.setProperty("--i", n++);
          frag.appendChild(w);
        });
        title.replaceChild(frag, node);
      });
    }
    hero.classList.add("hero--intro");
  })();

  /* ---- Efecto al hacer scroll: barra de progreso y profundidad ---- */
  var progressBar = document.createElement("div");
  progressBar.className = "scroll-progress";
  progressBar.setAttribute("aria-hidden", "true");
  document.body.appendChild(progressBar);

  // Las fotos grandes se desplazan algo más despacio que el texto
  var parallaxEls = reduceMotion ? [] :
    Array.prototype.slice.call(document.querySelectorAll(".feature__media, .about__media"));
  var scrollTicking = false;
  function onScrollEffects() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(function () {
      scrollTicking = false;
      var vh = window.innerHeight;
      var max = document.documentElement.scrollHeight - vh;
      progressBar.style.setProperty("--sp", max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
      var k = window.innerWidth < 720 ? 0.05 : 0.09;
      parallaxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -150 || r.top > vh + 150) return;
        // Se descuenta el desplazamiento ya aplicado para medir su sitio real
        var center = r.top - (el._py || 0) + r.height / 2;
        var y = Math.max(-40, Math.min(40, -(center - vh / 2) * k));
        el._py = y;
        el.style.setProperty("--py", y.toFixed(1) + "px");
      });
    });
  }
  window.addEventListener("scroll", onScrollEffects, { passive: true });
  window.addEventListener("resize", onScrollEffects);
  onScrollEffects();

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
    function start() { heroTimer = setInterval(function () { go(idx + 1); }, 2600); }
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
      // La descripción ya no se ve en la tarjeta, pero se sigue buscando en ella
      var hay = (item.textContent + " " + (item.getAttribute("data-desc") || "")).toLowerCase();
      var okSearch = q === "" || hay.indexOf(q) >= 0;
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

  // Estilo de encuadre (ajuste, tamaño y posición) elegido en el panel.
  function frameStyle(p) {
    var isPhoto = /^https?:\/\//.test(p.image || "");
    var fit = p.img_fit || (isPhoto ? "cover" : "contain");
    var zoom = (p.img_zoom || 100) / 100;
    var x = p.img_x == null ? 50 : p.img_x;
    var y = p.img_y == null ? 50 : p.img_y;
    return "object-fit:" + fit + ";object-position:" + x + "% " + y + "%;--z:" + zoom + ";" +
           (isPhoto ? "width:100%;height:100%;" : "");
  }

  // Precio más bajo de una lista de variantes.
  function minPriceOf(list) {
    var nums = (list || []).map(function (x) {
      var n = parseFloat(String(x.price || "").replace(/[^0-9,.]/g, "").replace(/\./g, "").replace(",", "."));
      return isNaN(n) ? null : { n: n, t: x.price };
    }).filter(Boolean).sort(function (a, b) { return a.n - b.n; });
    return nums.length ? nums[0].t : "";
  }
  function minVariantPrice(id) {
    return minPriceOf(variantsByProduct[id] || []);
  }

  function productCard(p) {
    var cats = window.LYM_CATEGORIES || {};
    var catLabel = cats[p.category] || p.category || "";
    var isOffer = !!p.is_offer;
    var price = (p.price || "").trim();

    // Si el precio general está vacío pero hay colores o medidas con precio,
    // se enseña el más bajo como "Desde…" en lugar de dejar la tarjeta sin precio.
    var desde = false;
    if (!price) {
      price = minVariantPrice(p.id);
      desde = !!price;
    }

    // Solo los productos a presupuesto llevan etiqueta bajo el precio
    var ref = /presupuesto/i.test(price) ? "a medida" : "";
    var img = imgSrc(p.image);

    var badge = "";
    if (isOffer && p.discount_pct) {
      badge = '<span class="product__badge">-' + escapeHtml(p.discount_pct) + '%</span>';
    }
    var priceHtml;
    if (isOffer && p.old_price) {
      priceHtml = '<span class="product__old">' + escapeHtml(p.old_price) + '</span> ' + escapeHtml(price);
    } else {
      priceHtml = (desde ? "Desde " : "") + escapeHtml(price);
    }

    var art = document.createElement("article");
    art.className = "product reveal is-visible" + (isOffer ? " product--offer" : "");
    art.setAttribute("data-cat", p.category || "");
    art.setAttribute("data-offer", isOffer ? "1" : "0");
    if (p.id != null) art.setAttribute("data-id", p.id);
    // La descripción no se muestra en el catálogo (queda para la ficha),
    // pero se guarda aquí para que el buscador siga encontrándola.
    art.setAttribute("data-desc", p.description || "");
    art.innerHTML =
      '<div class="product__img">' + badge +
        '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(p.name) + '" loading="lazy" style="' + frameStyle(p) + '" />' +
      '</div>' +
      '<div class="product__body">' +
        '<span class="product__cat">' + escapeHtml(catLabel) + '</span>' +
        '<h3>' + escapeHtml(p.name) + '</h3>' +
        '<div class="product__foot">' +
          '<span class="product__price">' + priceHtml + '</span>' +
          (ref ? '<span class="product__ref">' + ref + '</span>' : '') +
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
        '<img src="' + escapeHtml(imgSrc(p.image)) + '" alt="' + escapeHtml(p.name) + '" style="' + frameStyle(p) + '" />' +
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

  /* ---- Ficha de producto (ventana con galería y opciones) ---- */
  var productsById = {}, variantsByProduct = {};
  var pmodal = document.getElementById("pmodal");
  var pmState = { product: null, color: null, size: null };

  function galleryOf(p) {
    var list = [];
    if (p.image) list.push(p.image);
    var g = p.gallery;
    if (typeof g === "string") { try { g = JSON.parse(g); } catch (e) { g = []; } }
    (g || []).forEach(function (u) { if (u && list.indexOf(u) < 0) list.push(u); });
    // Las fotos de cada color/medida también forman parte de la galería
    (variantsByProduct[p.id] || []).forEach(function (v) {
      if (v.image && list.indexOf(v.image) < 0) list.push(v.image);
    });
    return list;
  }

  function uniq(arr) {
    var out = [];
    arr.forEach(function (v) { if (v && out.indexOf(v) < 0) out.push(v); });
    return out;
  }

  // Busca la variante que coincide con el color y la medida elegidos.
  // Variantes que encajan con lo que el cliente lleva elegido.
  function matchingVariants(vars) {
    return vars.filter(function (v) {
      return (!pmState.color || (v.color || "") === pmState.color) &&
             (!pmState.size || (v.size || "") === pmState.size);
    });
  }
  function findVariant(vars) {
    return matchingVariants(vars)[0] || null;
  }

  function renderOptions() {
    var box = document.getElementById("pmOptions");
    var vars = variantsByProduct[pmState.product.id] || [];
    box.innerHTML = "";
    if (!vars.length) return;

    var colors = uniq(vars.map(function (v) { return v.color; }));
    var sizes = uniq(vars.map(function (v) { return v.size; }));

    function group(label, values, key) {
      if (!values.length) return;
      var g = document.createElement("div");
      g.className = "pmopt";
      g.innerHTML = '<span class="pmopt__label">' + label + '</span>';
      var row = document.createElement("div");
      row.className = "pmopt__vals";
      values.forEach(function (val) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "pmopt__btn" + (pmState[key] === val ? " is-active" : "");
        b.textContent = val;
        // Marca en gris las combinaciones que no existen
        var other = key === "color" ? "size" : "color";
        var possible = vars.some(function (v) {
          return (v[key] || "") === val && (!pmState[other] || (v[other] || "") === pmState[other]);
        });
        if (!possible) b.disabled = true;
        b.addEventListener("click", function () {
          pmState[key] = pmState[key] === val ? null : val;
          renderOptions();
          updatePrice();
        });
        row.appendChild(b);
      });
      g.appendChild(row);
      box.appendChild(g);
    }
    group("Color", colors, "color");
    group("Medida", sizes, "size");
  }

  function updatePrice() {
    var p = pmState.product;
    var vars = variantsByProduct[p.id] || [];
    var price = "", html = "";

    if (vars.length) {
      // Mientras queden varias opciones posibles con precios distintos se
      // sigue enseñando "Desde…"; en cuanto el precio es único, se concreta.
      var m = matchingVariants(vars);
      if (!m.length) m = vars;
      var distintos = uniq(m.map(function (v) { return (v.price || "").trim(); }));
      if (distintos.length === 1) {
        price = distintos[0];
        html = escapeHtml(price);
      } else {
        price = minPriceOf(m);
        html = price ? "Desde " + escapeHtml(price) : "";
      }
      // La foto se cambia a la de la primera opción que encaje y tenga foto
      var conFoto = m.filter(function (v) { return v.image; })[0];
      if (conFoto) showProductImage(conFoto.image);
    } else {
      price = (p.price || "").trim();
      html = escapeHtml(price);
      if (p.is_offer && p.old_price) {
        html = '<span class="product__old">' + escapeHtml(p.old_price) + '</span> ' + escapeHtml(price);
      }
    }

    document.getElementById("pmPrice").innerHTML = html;

    document.getElementById("pmNote").textContent = /presupuesto/i.test(price)
      ? "Presupuesto a medida. Pásate por la tienda o pregúntanos."
      : "¿Tienes dudas? Pásate por la tienda o pregúntanos.";

    // Mensaje de WhatsApp con lo que ha elegido
    var txt = "Hola Luque & Merino 👋\nMe interesa: " + p.name;
    if (pmState.color) txt += "\nColor: " + pmState.color;
    if (pmState.size) txt += "\nMedida: " + pmState.size;
    if (price) txt += "\nPrecio indicado: " + price;
    document.getElementById("pmWa").href = "https://wa.me/34679381294?text=" + encodeURIComponent(txt);
  }

  /* ---- Visor de fotos a pantalla completa con zoom ---- */
  var zoomer = document.getElementById("zoomer");
  var zStage = document.getElementById("zStage");
  var zImg = document.getElementById("zImg");
  var zv = { list: [], i: 0, scale: 1, tx: 0, ty: 0, pointers: {}, startDist: 0, startScale: 1, moved: false };
  var MIN_Z = 1, MAX_Z = 4;

  function zApply() {
    // No dejamos que la foto se salga del todo de la pantalla al arrastrar.
    var r = zStage.getBoundingClientRect();
    var maxX = Math.max(0, (r.width * zv.scale - r.width) / 2);
    var maxY = Math.max(0, (r.height * zv.scale - r.height) / 2);
    zv.tx = Math.max(-maxX, Math.min(maxX, zv.tx));
    zv.ty = Math.max(-maxY, Math.min(maxY, zv.ty));
    zImg.style.transform = "translate(" + zv.tx + "px," + zv.ty + "px) scale(" + zv.scale + ")";
    zStage.classList.toggle("is-zoomed", zv.scale > 1);
    document.getElementById("zLevel").textContent = Math.round(zv.scale * 100) + "%";
  }
  function zSet(scale) {
    zv.scale = Math.max(MIN_Z, Math.min(MAX_Z, scale));
    if (zv.scale === 1) { zv.tx = 0; zv.ty = 0; }
    zApply();
  }
  function zShow(i) {
    zv.i = (i + zv.list.length) % zv.list.length;
    zImg.src = imgSrc(zv.list[zv.i]);
    zv.scale = 1; zv.tx = 0; zv.ty = 0; zApply();
    var many = zv.list.length > 1;
    document.getElementById("zPrev").hidden = !many;
    document.getElementById("zNext").hidden = !many;
  }
  function openZoom(list, i) {
    if (!zoomer || !list.length) return;
    zv.list = list;
    zoomer.hidden = false;
    document.body.classList.add("pmodal-open");
    zShow(i || 0);
    var hint = document.getElementById("zHint");
    hint.classList.remove("is-off");
    setTimeout(function () { hint.classList.add("is-off"); }, 2600);
  }
  function closeZoom() {
    if (!zoomer) return;
    zoomer.hidden = true;
    if (pmodal && pmodal.hidden) document.body.classList.remove("pmodal-open");
  }

  if (zoomer) {
    document.getElementById("zClose").addEventListener("click", closeZoom);
    document.getElementById("zPrev").addEventListener("click", function () { zShow(zv.i - 1); });
    document.getElementById("zNext").addEventListener("click", function () { zShow(zv.i + 1); });
    document.getElementById("zIn").addEventListener("click", function () { zSet(zv.scale + 0.5); });
    document.getElementById("zOut").addEventListener("click", function () { zSet(zv.scale - 0.5); });

    // Rueda del ratón
    zStage.addEventListener("wheel", function (e) {
      e.preventDefault();
      zSet(zv.scale + (e.deltaY < 0 ? 0.25 : -0.25));
    }, { passive: false });

    // Dedos y ratón: arrastrar para mover, pellizcar para ampliar
    zStage.addEventListener("pointerdown", function (e) {
      zStage.setPointerCapture(e.pointerId);
      zv.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      zv.moved = false;
      var ids = Object.keys(zv.pointers);
      if (ids.length === 2) {
        var a = zv.pointers[ids[0]], b = zv.pointers[ids[1]];
        zv.startDist = Math.hypot(a.x - b.x, a.y - b.y);
        zv.startScale = zv.scale;
      }
      zStage.classList.add("is-dragging");
    });
    zStage.addEventListener("pointermove", function (e) {
      var p = zv.pointers[e.pointerId];
      if (!p) return;
      var ids = Object.keys(zv.pointers);
      if (ids.length === 2 && zv.startDist) {
        p.x = e.clientX; p.y = e.clientY;
        var a = zv.pointers[ids[0]], b = zv.pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        zv.moved = true;
        zSet(zv.startScale * (d / zv.startDist));
        return;
      }
      var dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) zv.moved = true;
      if (zv.scale > 1) { zv.tx += dx; zv.ty += dy; zApply(); }
      p.x = e.clientX; p.y = e.clientY;
    });
    function endPointer(e) {
      var had = zv.pointers[e.pointerId];
      delete zv.pointers[e.pointerId];
      if (!Object.keys(zv.pointers).length) {
        zStage.classList.remove("is-dragging");
        zv.startDist = 0;
        // Un toque limpio (sin arrastrar) alterna entre ampliada y normal
        if (had && !zv.moved) zSet(zv.scale > 1 ? 1 : 2.5);
      }
    }
    zStage.addEventListener("pointerup", endPointer);
    zStage.addEventListener("pointercancel", endPointer);

    document.addEventListener("keydown", function (e) {
      if (zoomer.hidden) return;
      if (e.key === "Escape") {
        closeZoom();
        e.stopImmediatePropagation();   // que Escape no cierre además la ficha
      }
      if (e.key === "ArrowLeft") zShow(zv.i - 1);
      if (e.key === "ArrowRight") zShow(zv.i + 1);
    });
  }

  // Muestra una foto concreta del producto y marca su miniatura.
  function showProductImage(url) {
    var imgs = pmState.images || [];
    var i = imgs.indexOf(url);
    if (i < 0) return;
    document.getElementById("pmMain").src = imgSrc(url);
    pmState.imgIndex = i;
    document.getElementById("pmThumbs").querySelectorAll("button").forEach(function (b, n) {
      b.classList.toggle("is-active", n === i);
    });
  }

  function openProduct(id) {
    var p = productsById[id];
    if (!p || !pmodal) return;
    pmState = { product: p, color: null, size: null };

    var cats = window.LYM_CATEGORIES || {};
    document.getElementById("pmCat").textContent = cats[p.category] || p.category || "";
    document.getElementById("pmName").textContent = p.name;
    document.getElementById("pmDesc").textContent = p.description || "";

    // Galería: foto principal y miniaturas
    var imgs = galleryOf(p);
    var main = document.getElementById("pmMain");
    main.src = imgSrc(imgs[0]);
    main.alt = p.name;
    pmState.images = imgs;
    pmState.imgIndex = 0;
    var thumbs = document.getElementById("pmThumbs");
    thumbs.innerHTML = "";
    if (imgs.length > 1) {
      imgs.forEach(function (u, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = i === 0 ? "is-active" : "";
        b.innerHTML = '<img src="' + escapeHtml(imgSrc(u)) + '" alt="" />';
        b.addEventListener("click", function () {
          main.src = imgSrc(u);
          pmState.imgIndex = i;
          thumbs.querySelectorAll("button").forEach(function (x) { x.classList.remove("is-active"); });
          b.classList.add("is-active");
        });
        thumbs.appendChild(b);
      });
    }

    renderOptions();
    updatePrice();
    pmodal.hidden = false;
    document.body.classList.add("pmodal-open");
  }

  function closeProduct() {
    if (!pmodal) return;
    pmodal.hidden = true;
    document.body.classList.remove("pmodal-open");
  }

  if (pmodal) {
    pmodal.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) closeProduct();
    });
    // Pulsar la foto de la ficha la abre a pantalla completa para verla de cerca
    var stage = pmodal.querySelector(".pmodal__stage");
    if (stage) {
      stage.addEventListener("click", function () {
        openZoom(pmState.images || [], pmState.imgIndex || 0);
      });
    }
    document.addEventListener("keydown", function (e) {
      // Si el visor de fotos está abierto, Escape lo cierra solo a él.
      if (e.key === "Escape" && !pmodal.hidden && (!zoomer || zoomer.hidden)) closeProduct();
    });
  }

  // Abrir la ficha al pulsar una tarjeta del catálogo
  if (catalogEl) {
    catalogEl.addEventListener("click", function (e) {
      var card = e.target.closest(".product");
      if (card && card.getAttribute("data-id")) openProduct(card.getAttribute("data-id"));
    });
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
  // Banner de ofertas de la portada: texto, foto y si se muestra o no.
  function applyPromo(raw) {
    var wrap = document.querySelector(".promo-wrap");
    if (!wrap || !raw) return;               // sin ajustes: se queda el de por defecto
    var p;
    try { p = JSON.parse(raw); } catch (e) { return; }

    if (p.active === false) { wrap.hidden = true; return; }
    wrap.hidden = false;

    var box = wrap.querySelector(".promo");
    var h2 = box.querySelector(".promo__text h2");
    var txt = box.querySelector(".promo__text p");
    var cta = box.querySelector(".promo__cta");

    // Los porcentajes se resaltan solos en dorado
    if (p.title) {
      h2.innerHTML = escapeHtml(p.title).replace(/(-?\s?\d{1,3}\s?%)/g, "<strong>$1</strong>");
    }
    if (txt) {
      if (p.text) { txt.textContent = p.text; txt.hidden = false; }
      else { txt.hidden = true; }
    }
    if (cta && p.cta) cta.textContent = p.cta + " →";

    // Foto del producto en oferta
    var old = box.querySelector(".promo__photo");
    if (old) old.remove();
    if (p.image) {
      var fig = document.createElement("div");
      fig.className = "promo__photo";
      fig.innerHTML = '<img src="' + escapeHtml(p.image) + '" alt="" loading="lazy" />';
      box.insertBefore(fig, box.firstChild);
    }
  }

  function applySiteImages(rows) {
    var map = {};
    (rows || []).forEach(function (s) { map[s.key] = s.value; });
    applyPromo(map.promo);
    document.querySelectorAll("[data-site-img]").forEach(function (box) {
      var raw = map[box.getAttribute("data-site-img")];
      if (!raw) return;
      var cfg;
      if (raw.charAt(0) === "{") { try { cfg = JSON.parse(raw); } catch (e) { return; } }
      else { cfg = { url: raw, zoom: 100, x: 50, y: 50 }; }
      if (!cfg || !cfg.url) return;

      var img = document.createElement("img");
      img.className = "site-photo";
      img.src = cfg.url;
      img.alt = "";
      img.style.objectFit = cfg.fit || "cover";
      img.style.objectPosition = (cfg.x == null ? 50 : cfg.x) + "% " + (cfg.y == null ? 50 : cfg.y) + "%";
      img.style.transform = "scale(" + (cfg.zoom || 100) / 100 + ")";
      box.appendChild(img);
      box.classList.add("has-photo");
    });
  }

  /* ---- Tarjetas de categoría: varias fotos que van pasando solas ---- */
  // Fotos de una categoría: la principal, las "Más fotos" del panel y, si no
  // hay fotos extra, las fotos reales de sus productos.
  function categoryPhotos(c, galleries, rows) {
    var list = [];
    function add(u) { if (u && list.indexOf(u) < 0) list.push(u); }
    if (c.image) add(c.image);
    var extra = galleries[c.slug] || [];
    extra.forEach(add);
    if (!extra.length) {
      (rows || []).forEach(function (p) {
        if (list.length < 8 && p.category === c.slug && /^https?:\/\//.test(p.image || "")) add(p.image);
      });
    }
    return list;
  }

  var catTimers = [];
  function startCategoryRotation(wrap) {
    catTimers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    catTimers = [];
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    wrap.querySelectorAll(".cat__img").forEach(function (box, n) {
      var imgs = box.querySelectorAll(".cat-photo");
      if (imgs.length < 2) return;
      var i = 0;
      // Cada tarjeta empieza con un pequeño desfase para que no cambien todas a la vez
      catTimers.push(setTimeout(function () {
        catTimers.push(setInterval(function () {
          imgs[i].classList.remove("is-on");
          i = (i + 1) % imgs.length;
          imgs[i].classList.add("is-on");
        }, 4000));
      }, n * 900));
    });
  }

  function renderCategoryCards(catMeta, galleries, rows) {
    var wrap = document.querySelector(".cats");
    if (!wrap || !catMeta.length) return;
    wrap.innerHTML = "";
    catMeta.forEach(function (c) {
      var a = document.createElement("a");
      a.className = "cat reveal";
      a.href = "#catalogo";
      a.setAttribute("data-cat-filter", c.slug);
      var photos = categoryPhotos(c, galleries || {}, rows);
      var media;
      if (photos.length) {
        media = photos.map(function (u, k) {
          // El encuadre del panel se aplica a la foto principal
          var style = (u === c.image)
            ? ' style="object-position:' + (c.img_x == null ? 50 : c.img_x) + "% " + (c.img_y == null ? 50 : c.img_y) +
              '%;--z:' + ((c.img_zoom || 100) / 100) + '"'
            : "";
          return '<img class="cat-photo' + (k === 0 ? " is-on" : "") + '" src="' + escapeHtml(imgSrc(u)) +
                 '" alt="' + (k === 0 ? escapeHtml(c.label) : "") + '" loading="lazy"' + style + ' />';
        }).join("");
      } else {
        media = '<img src="' + escapeHtml(imgSrc(catFallbackImg(c.slug))) + '" alt="' + escapeHtml(c.label) + '" loading="lazy" />';
      }
      var desc = (c.description || "").trim();
      a.innerHTML =
        '<div class="cat__img">' + media + '</div>' +
        '<div class="cat__body">' +
          '<h3>' + escapeHtml(c.label) + '</h3>' +
          (desc ? '<p>' + escapeHtml(desc) + '</p>' : '') +
          '<span class="cat__link">Ver productos →</span>' +
        '</div>';
      a.addEventListener("click", function () { setFilter(c.slug); });
      wrap.appendChild(a);
    });
    // Entran escalonadas al llegar a ellas haciendo scroll
    var cards = wrap.querySelectorAll(".cat");
    staggerReveal(cards);
    observeReveal(cards);
    startCategoryRotation(wrap);
  }

  // Ilustración de reserva mientras la tienda no suba su propia foto.
  function catFallbackImg(slug) {
    var m = {
      "textil": "cama.svg", "cortinas": "cortinas.svg", "cama-infantil": "cuna.svg",
      "colchon": "colchon.svg", "bebe": "bebe.svg"
    };
    return m[slug] || "cama.svg";
  }

  // Mensaje en el hueco del catálogo cuando no hay productos que enseñar.
  function catalogMessage(html) {
    if (!catalogEl || catalogEl.querySelector(".product")) return;
    catalogEl.innerHTML = '<p class="catalog-msg">' + html + '</p>';
  }
  function catalogFailed() {
    catalogMessage('No hemos podido cargar el catálogo en este momento. Vuelve a intentarlo en un rato o llámanos al <a href="tel:+34916104731">91 610 47 31</a>.');
    applyDeepLink();
  }

  function loadCatalog() {
    var cfg = window.LYM_SUPABASE;
    if (!catalogEl || !cfg || !window.supabase) { catalogFailed(); return; }
    try {
      var sb = window.supabase.createClient(cfg.url, cfg.key);

      // Ajustes de la web (imágenes, banner y fotos extra de las categorías).
      // Se convierte en promesa una sola vez para reutilizar la misma consulta.
      var pSets = Promise.resolve(sb.from("lym_settings").select("*"))
        .catch(function () { return { data: [] }; });
      pSets.then(function (res) {
        if (!res.error) applySiteImages(res.data);
      });
      // Categorías (para orden y nombres) y productos activos, en paralelo.
      var pCats = sb.from("lym_categories").select("*").order("sort_order", { ascending: true });
      var pProd = sb.from(cfg.table).select("*").eq("active", true).order("sort_order", { ascending: true });
      var pVars = sb.from("lym_variants").select("*").order("sort_order", { ascending: true });

      Promise.all([pCats, pProd, pVars, pSets]).then(function (results) {
        var catMeta = (results[0] && results[0].data) || [];
        var prod = results[1] || {};
        if (prod.error) { console.warn("Catálogo no disponible (", prod.error.message, ")"); catalogFailed(); return; }
        var rows = prod.data || [];
        if (!rows.length) {
          catalogMessage("Muy pronto encontrarás aquí nuestros productos. Mientras tanto, pásate por la tienda o pregúntanos.");
          applyDeepLink();
          return;
        }

        // Variantes (color / medida / precio) agrupadas por producto
        variantsByProduct = {};
        (((results[2] && results[2].data) || [])).forEach(function (v) {
          (variantsByProduct[v.product_id] = variantsByProduct[v.product_id] || []).push(v);
        });
        productsById = {};
        rows.forEach(function (p) { productsById[p.id] = p; });

        // Fotos extra de cada categoría ("catgal:<categoría>" en los ajustes)
        var galleries = {};
        (((results[3] && results[3].data) || [])).forEach(function (s) {
          if (s.key && s.key.indexOf("catgal:") === 0) {
            try { galleries[s.key.slice(7)] = JSON.parse(s.value) || []; } catch (e) { /* se ignora */ }
          }
        });
        renderCategoryCards(catMeta, galleries, rows);
        renderFilters(rows, catMeta);
        catalogEl.innerHTML = "";
        rows.forEach(function (p) { catalogEl.appendChild(productCard(p)); });
        refreshCatalog();

        var featured = rows.filter(function (p) { return p.is_featured; });
        renderHero(featured);
        applyDeepLink();
      }).catch(function (e) { console.warn("Catálogo no disponible (", e && e.message, ")"); catalogFailed(); });
    } catch (e) {
      console.warn("Catálogo: Supabase no disponible.");
      catalogFailed();
    }
  }
  /* ---- Enlaces directos: ?cat=… (catálogo filtrado) o ?ir=… (sección) ----
     Los usan las redirecciones de las direcciones de la web antigua que
     Google aún muestra (ver vercel.json). */
  var deepLink = { cat: "", ir: "" }, deepLinkScrolled = false;
  try {
    var qs = new URLSearchParams(location.search);
    deepLink.cat = (qs.get("cat") || "").toLowerCase();
    deepLink.ir = (qs.get("ir") || "").toLowerCase();
  } catch (e) { /* navegador muy antiguo: se queda en la portada */ }

  function plain(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  // Se llama tras cada pintado del catálogo, porque al cargar los productos
  // de la base de datos los filtros se rehacen y vuelven a "Todo".
  function applyDeepLink() {
    if (!deepLink.cat && !deepLink.ir) return;
    if (deepLink.cat) {
      // La palabra se busca en el identificador o el nombre de cada filtro,
      // así sirve aunque la tienda renombre sus categorías.
      var want = plain(deepLink.cat), match = null;
      document.querySelectorAll(".cat-filters .filter").forEach(function (b) {
        var f = b.getAttribute("data-filter");
        if (!match && f !== "all" && (plain(f).indexOf(want) >= 0 || plain(b.textContent).indexOf(want) >= 0)) match = f;
      });
      if (match) setFilter(match);
    }
    if (deepLinkScrolled) return;
    deepLinkScrolled = true;
    var target = document.getElementById(deepLink.ir || "catalogo");
    if (target) setTimeout(function () { target.scrollIntoView({ behavior: "smooth", block: "start" }); }, 120);
    // Deja la dirección limpia en la barra del navegador
    if (history.replaceState) history.replaceState(null, "", location.pathname + (target ? "#" + target.id : ""));
  }

  loadCatalog();
  // Por si la base de datos tarda en responder: se lleva ya a la sección
  // y el filtro se vuelve a aplicar cuando lleguen los productos.
  setTimeout(applyDeepLink, 2500);

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
