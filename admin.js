/* =========================================================
   Luque & Merino — Panel de administración
   ========================================================= */
(function () {
  "use strict";

  var cfg = window.LYM_SUPABASE || {};
  var TABLE = cfg.table || "lym_products";
  var CATS = "lym_categories";

  // Si la librería de Supabase no cargó (sin conexión, CDN bloqueado…),
  // avisamos en lugar de romper la página.
  if (!window.supabase || !cfg.url) {
    var lm = document.getElementById("loginMsg");
    if (lm) lm.textContent = "No se pudo conectar con el servidor. Revisa tu conexión y recarga la página.";
    var lb = document.getElementById("loginBtn");
    if (lb) lb.disabled = true;
    return;
  }
  var sb = window.supabase.createClient(cfg.url, cfg.key);

  var el = function (id) { return document.getElementById(id); };
  var state = { products: [], categories: [], filterCat: "all", search: "" };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function slugify(s) {
    return String(s || "").toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function catLabel(slug) {
    var c = state.categories.find(function (x) { return x.slug === slug; });
    return c ? c.label : (window.LYM_CATEGORIES && window.LYM_CATEGORIES[slug]) || slug || "—";
  }

  // Convierte lo que se escribe (32.90, 32,90, "32,90 €"…) a número.
  // Si no es numérico (p. ej. "Presupuesto"), devuelve null.
  function parsePrice(str) {
    if (str == null) return null;
    var s = String(str).replace(/[€\s]/g, "").trim();
    if (!s || !/[0-9]/.test(s)) return null;
    if (s.indexOf(",") >= 0 && s.indexOf(".") >= 0) {
      s = s.replace(/\./g, "").replace(",", ".");   // 1.234,56 → 1234.56
    } else if (s.indexOf(",") >= 0) {
      s = s.replace(",", ".");                        // 32,90 → 32.90
    }
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  // Formatea un número como euros españoles: 32.9 → "32,90 €"
  function formatEuro(n) {
    return new Intl.NumberFormat("es-ES", {
      style: "currency", currency: "EUR",
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(n);
  }
  // Deja el precio "normal" bien formateado (o tal cual si es texto tipo "Presupuesto").
  function normalizePrice(str) {
    var n = parsePrice(str);
    return n != null ? formatEuro(n) : String(str || "").trim();
  }

  /* ============ AUTENTICACIÓN ============ */
  function showLogin() { el("loginView").classList.remove("hidden"); el("appView").classList.add("hidden"); }
  function showApp(user) {
    el("loginView").classList.add("hidden");
    el("appView").classList.remove("hidden");
    el("userEmail").textContent = user && user.email ? user.email : "";
    loadAll();
  }

  sb.auth.getSession().then(function (res) {
    if (res.data && res.data.session) showApp(res.data.session.user);
    else showLogin();
  });

  el("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = el("loginMsg"); msg.textContent = ""; msg.className = "msg msg--err";
    var btn = el("loginBtn"); btn.disabled = true; btn.textContent = "Entrando…";
    sb.auth.signInWithPassword({
      email: el("email").value.trim(),
      password: el("password").value
    }).then(function (res) {
      btn.disabled = false; btn.textContent = "Entrar";
      if (res.error) {
        msg.textContent = /invalid login/i.test(res.error.message)
          ? "Correo o contraseña incorrectos."
          : res.error.message;
        return;
      }
      showApp(res.data.user);
    });
  });

  el("logoutBtn").addEventListener("click", function () {
    sb.auth.signOut().then(function () { location.reload(); });
  });

  /* ============ CARGA DE DATOS ============ */
  function loadAll() {
    Promise.all([
      sb.from(CATS).select("*").order("sort_order", { ascending: true }),
      sb.from(TABLE).select("*").order("sort_order", { ascending: true })
    ]).then(function (r) {
      state.categories = (r[0] && r[0].data) || [];
      if (r[1] && r[1].error) { alert("Error cargando productos: " + r[1].error.message); return; }
      state.products = (r[1] && r[1].data) || [];
      fillCategorySelect();
      renderCatbar();
      renderList();
    });
  }

  function fillCategorySelect() {
    var sel = el("pcategory");
    sel.innerHTML = state.categories.map(function (c) {
      return '<option value="' + esc(c.slug) + '">' + esc(c.label) + '</option>';
    }).join("");

    var img = el("pimage");
    img.innerHTML = (window.LYM_IMAGES || []).map(function (f) {
      return '<option value="' + esc(f) + '">' + esc(f) + '</option>';
    }).join("");
  }

  /* ============ BARRA DE CATEGORÍAS ============ */
  function renderCatbar() {
    var bar = el("catbar");
    var counts = {}; state.products.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    var nFeatured = state.products.filter(function (p) { return p.is_featured; }).length;
    var nOffers = state.products.filter(function (p) { return p.is_offer; }).length;

    function pill(key, label, n) {
      return '<button class="cpill' + (state.filterCat === key ? " is-active" : "") +
        '" data-cat="' + esc(key) + '">' + label + ' <span class="n">' + n + '</span></button>';
    }

    var html = pill("all", "Todos", state.products.length);
    html += pill("featured", "⭐ Destacados", nFeatured);
    html += pill("offers", "🏷️ Ofertas", nOffers);
    state.categories.forEach(function (c) {
      html += pill(c.slug, esc(c.label), counts[c.slug] || 0);
    });
    bar.innerHTML = html;
    bar.querySelectorAll(".cpill").forEach(function (b) {
      b.addEventListener("click", function () {
        state.filterCat = b.getAttribute("data-cat");
        renderCatbar(); renderList();
      });
    });
  }

  /* ============ LISTADO DE PRODUCTOS ============ */
  function renderList() {
    var wrap = el("list");
    var q = state.search.trim().toLowerCase();
    var items = state.products.filter(function (p) {
      var okCat;
      if (state.filterCat === "all") okCat = true;
      else if (state.filterCat === "featured") okCat = !!p.is_featured;
      else if (state.filterCat === "offers") okCat = !!p.is_offer;
      else okCat = p.category === state.filterCat;
      var okSearch = !q || ((p.name || "") + " " + (p.description || "")).toLowerCase().indexOf(q) >= 0;
      return okCat && okSearch;
    });
    el("count").textContent = items.length + " producto" + (items.length === 1 ? "" : "s");
    el("empty").classList.toggle("hidden", state.products.length !== 0);

    wrap.innerHTML = items.map(function (p) {
      var tags = "";
      if (p.is_featured) tags += '<span class="tag tag--offer">⭐ Destacado</span>';
      if (p.is_offer) tags += '<span class="tag tag--offer">🏷️ Oferta' + (p.discount_pct ? " -" + esc(p.discount_pct) + "%" : "") + '</span>';
      if (!p.active) tags += '<span class="tag tag--off">Oculto</span>';
      var price = (p.is_offer && p.old_price)
        ? '<span class="card__old">' + esc(p.old_price) + '</span>' + esc(p.price)
        : esc(p.price);
      return '' +
        '<article class="card' + (p.active ? "" : " is-off") + '">' +
          '<div class="card__img"><img src="img/' + esc(p.image || "cama.svg") + '" alt="" /></div>' +
          '<div class="card__body">' +
            '<span class="card__cat">' + esc(catLabel(p.category)) + '</span>' +
            '<h3 class="card__name">' + esc(p.name) + '</h3>' +
            '<p class="card__desc">' + esc(p.description || "") + '</p>' +
            '<div class="tags">' + tags + '</div>' +
            '<div class="card__price">' + price + '</div>' +
            '<div class="card__actions" style="margin-top:8px">' +
              '<button class="btn btn--ghost btn--sm" data-edit="' + esc(p.id) + '">✎ Editar</button>' +
              '<button class="btn btn--danger btn--sm" data-del="' + esc(p.id) + '">🗑 Eliminar</button>' +
            '</div>' +
          '</div>' +
        '</article>';
    }).join("");

    wrap.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openForm(b.getAttribute("data-edit")); });
    });
    wrap.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () { removeProduct(b.getAttribute("data-del")); });
    });
  }

  el("search").addEventListener("input", function () { state.search = this.value; renderList(); });

  /* ============ FORMULARIO (alta / edición) ============ */
  function toggleOffer() {
    el("offerFields").classList.toggle("hidden", !el("poffer").checked);
    updateOfferPreview();
  }
  el("poffer").addEventListener("change", toggleOffer);

  // Vista previa en vivo del cálculo de la oferta.
  function updateOfferPreview() {
    var box = el("offerPreview");
    if (!box) return;
    if (!el("poffer").checked) { box.textContent = ""; return; }
    var base = parsePrice(el("pprice").value);
    var pct = parseInt(el("pdiscount").value, 10);
    if (base == null) { box.textContent = "Escribe un precio numérico para calcular la oferta."; return; }
    if (!pct || pct <= 0) { box.textContent = "Precio normal: " + formatEuro(base) + " · escribe el % de descuento."; return; }
    var sale = base * (1 - pct / 100);
    box.innerHTML = "Antes <s>" + formatEuro(base) + "</s> → <strong>" + formatEuro(sale) + "</strong> (−" + pct + "%)";
  }
  el("pprice").addEventListener("input", updateOfferPreview);
  el("pdiscount").addEventListener("input", updateOfferPreview);

  function openForm(id) {
    el("formMsg").textContent = "";
    var p = id ? state.products.find(function (x) { return String(x.id) === String(id); }) : null;
    el("modalTitle").textContent = p ? "Editar producto" : "Nuevo producto";
    el("pid").value = p ? p.id : "";
    el("pname").value = p ? p.name : "";
    fillCategorySelect();
    el("pcategory").value = p ? p.category : (state.categories[0] && state.categories[0].slug) || "";
    el("pimage").value = p ? (p.image || "cama.svg") : "cama.svg";
    el("pdesc").value = p ? (p.description || "") : "";
    // El campo "precio normal" muestra siempre el precio SIN descuento.
    // En una oferta guardada, ese precio base es el "precio anterior".
    el("pprice").value = p ? ((p.is_offer && p.old_price) ? p.old_price : (p.price || "")) : "";
    el("porder").value = p ? (p.sort_order != null ? p.sort_order : 100) : 100;
    el("pactive").checked = p ? !!p.active : true;
    el("pfeatured").checked = p ? !!p.is_featured : false;
    el("poffer").checked = p ? !!p.is_offer : false;
    el("pdiscount").value = p && p.discount_pct != null ? p.discount_pct : "";
    toggleOffer();
    el("overlay").classList.remove("hidden");
  }
  function closeForm() { el("overlay").classList.add("hidden"); }

  el("addBtn").addEventListener("click", function () { openForm(null); });
  el("cancelBtn").addEventListener("click", closeForm);
  el("overlay").addEventListener("click", function (e) { if (e.target === el("overlay")) closeForm(); });

  el("productForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = el("formMsg"); msg.textContent = "";
    var name = el("pname").value.trim();
    if (!name) { msg.textContent = "El nombre es obligatorio."; return; }

    var isOffer = el("poffer").checked;
    var baseNum = parsePrice(el("pprice").value);
    var pct = el("pdiscount").value ? parseInt(el("pdiscount").value, 10) : null;

    // Precio "normal" siempre bien formateado (o texto tal cual, p. ej. "Presupuesto").
    var priceStr = normalizePrice(el("pprice").value);
    var oldStr = null, discount = null;

    if (isOffer) {
      if (baseNum == null) { msg.textContent = "Para una oferta, el precio debe ser un número (ej. 32,90)."; return; }
      if (!pct || pct <= 0 || pct >= 100) { msg.textContent = "Indica un descuento entre 1 y 99 %."; return; }
      // El precio anterior es el que había escrito; el nuevo se calcula solo.
      oldStr = formatEuro(baseNum);
      priceStr = formatEuro(baseNum * (1 - pct / 100));
      discount = pct;
    }

    var payload = {
      name: name,
      category: el("pcategory").value,
      image: el("pimage").value,
      description: el("pdesc").value.trim(),
      price: priceStr,
      sort_order: parseInt(el("porder").value, 10) || 100,
      active: el("pactive").checked,
      is_featured: el("pfeatured").checked,
      is_offer: isOffer,
      discount_pct: discount,
      old_price: oldStr
    };

    var btn = el("saveBtn"); btn.disabled = true; btn.textContent = "Guardando…";
    var id = el("pid").value;
    var op = id
      ? sb.from(TABLE).update(payload).eq("id", id)
      : sb.from(TABLE).insert(payload);

    op.then(function (res) {
      btn.disabled = false; btn.textContent = "Guardar";
      if (res.error) { msg.textContent = "No se pudo guardar: " + res.error.message; return; }
      closeForm(); loadAll();
    });
  });

  function removeProduct(id) {
    var p = state.products.find(function (x) { return String(x.id) === String(id); });
    if (!confirm('¿Eliminar "' + (p ? p.name : "este producto") + '"?\nEsta acción no se puede deshacer.')) return;
    sb.from(TABLE).delete().eq("id", id).then(function (res) {
      if (res.error) { alert("No se pudo eliminar: " + res.error.message); return; }
      loadAll();
    });
  }

  /* ============ AÑADIR CATEGORÍA ============ */
  el("addCatBtn").addEventListener("click", function () {
    var label = prompt("Nombre de la nueva categoría (ej. Alfombras):");
    if (!label) return;
    label = label.trim(); if (!label) return;
    var slug = slugify(label);
    if (!slug) { alert("Nombre no válido."); return; }
    if (state.categories.some(function (c) { return c.slug === slug; })) {
      alert("Esa categoría ya existe."); return;
    }
    var maxOrder = state.categories.reduce(function (m, c) { return Math.max(m, c.sort_order || 0); }, 0);
    sb.from(CATS).insert({ slug: slug, label: label, sort_order: maxOrder + 10 }).then(function (res) {
      if (res.error) { alert("No se pudo crear la categoría: " + res.error.message); return; }
      loadAll();
    });
  });

})();
